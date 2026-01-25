/**
 * Email Sync Endpoint
 *
 * POST /api/emails/sync
 *
 * Fetches emails from Gmail and updates sender statistics.
 * Requires authenticated user with connected Gmail account.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, AuthenticatedRequest } from '../lib/auth-middleware.js';
import { rateLimit } from '../lib/rate-limiter.js';
import { getValidAccessToken } from '../lib/gmail.js';
import { fetchSenderStats, SenderStats } from '../lib/gmail-api.js';
import { PLAN_LIMITS } from '../subscription/get.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// More relaxed rate limit for sync operations (allows syncing multiple accounts)
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 syncs per minute (allows multiple accounts)
  message: 'Too many sync requests. Please wait before syncing again.'
});

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting
  if (limiter(req, res)) return;

  // Require authentication
  const user = requireAuth(req as AuthenticatedRequest, res);
  if (!user) return;

  const { email, maxMessages = 1000, fullSync = false } = req.body;

  if (!email) {
    return res.status(400).json({
      error: 'Email address is required',
      code: 'MISSING_EMAIL'
    });
  }

  try {
    // Get email account
    const { data: account, error: accountError } = await supabase
      .from('email_accounts')
      .select('id, gmail_email, connection_status, last_synced, total_emails')
      .eq('user_id', user.userId)
      .eq('email', email)
      .single();

    if (accountError || !account) {
      return res.status(404).json({
        error: 'Email account not found',
        code: 'ACCOUNT_NOT_FOUND'
      });
    }

    // Check sync frequency limit based on subscription plan
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan')
      .eq('user_id', user.userId)
      .single();

    const planKey = (subscription?.plan?.toLowerCase() || 'free') as keyof typeof PLAN_LIMITS;
    const planLimits = PLAN_LIMITS[planKey] || PLAN_LIMITS.free;
    const syncIntervalMinutes = planLimits.syncIntervalMinutes;

    // Check if enough time has passed since last sync (skip for unlimited plans)
    if (syncIntervalMinutes > 0 && account.last_synced) {
      const lastSyncTime = new Date(account.last_synced).getTime();
      const now = Date.now();
      const minutesSinceLastSync = (now - lastSyncTime) / (1000 * 60);

      if (minutesSinceLastSync < syncIntervalMinutes) {
        const minutesRemaining = Math.ceil(syncIntervalMinutes - minutesSinceLastSync);
        const hoursRemaining = minutesRemaining >= 60 ? Math.ceil(minutesRemaining / 60) : 0;
        const timeMessage = hoursRemaining > 0
          ? `${hoursRemaining} hour${hoursRemaining > 1 ? 's' : ''}`
          : `${minutesRemaining} minute${minutesRemaining > 1 ? 's' : ''}`;

        return res.status(429).json({
          error: `Sync limit reached. You can sync again in ${timeMessage}.`,
          code: 'SYNC_LIMIT_REACHED',
          nextSyncAvailable: new Date(lastSyncTime + syncIntervalMinutes * 60 * 1000).toISOString(),
          plan: planKey,
          upgradeMessage: planKey === 'free'
            ? 'Upgrade to Basic for syncing every 4 hours, or Pro for hourly syncing.'
            : planKey === 'basic'
            ? 'Upgrade to Pro for hourly syncing, or Unlimited for unlimited syncing.'
            : planKey === 'pro'
            ? 'Upgrade to Unlimited for unlimited syncing.'
            : undefined
        });
      }
    }

    // Try to get valid access token (refreshes if needed)
    // This will throw if no valid tokens exist
    let accessToken: string;
    try {
      const tokenResult = await getValidAccessToken(
        user.userId,
        account.gmail_email || email
      );
      accessToken = tokenResult.accessToken;

      // If we got here, tokens are valid - ensure connection_status is correct
      if (account.connection_status !== 'connected') {
        console.log('Auto-fixing connection_status for account:', email);
        await supabase
          .from('email_accounts')
          .update({ connection_status: 'connected', updated_at: new Date().toISOString() })
          .eq('id', account.id);
      }
    } catch (tokenError: any) {
      console.error('Token error for user', user.userId, 'email', account.gmail_email || email, ':', tokenError.message);

      // Check if tokens exist at all
      const { data: tokenCheck, error: checkError } = await supabase
        .from('gmail_oauth_tokens')
        .select('id, gmail_email, token_expiry')
        .eq('user_id', user.userId);

      console.log('Token check result:', { tokenCheck, checkError });

      // Update status to reflect the issue
      await supabase
        .from('email_accounts')
        .update({ connection_status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', account.id);

      return res.status(400).json({
        error: `Gmail connection error: ${tokenError.message}. Please reconnect your Gmail account.`,
        code: 'TOKEN_ERROR',
        debug: {
          gmailEmail: account.gmail_email || email,
          tokensFound: tokenCheck?.length || 0
        }
      });
    }

    // Determine sync mode:
    // - fullSync=true: Fetch ALL emails (no date filter, higher limit) for accurate counts
    // - total_emails=0: Force full sync to fix accounts stuck at 0
    // - incremental: Only fetch emails since last sync (fast)
    // - first sync: Fetch recent emails up to plan limit
    const forceFullSync = fullSync || (account.total_emails === 0 && !!account.last_synced);
    const isIncrementalSync = !forceFullSync && !!account.last_synced;
    const lastSyncDate = isIncrementalSync ? new Date(account.last_synced) : undefined;

    if (forceFullSync && account.total_emails === 0) {
      console.log('Account has 0 emails with last_synced set - forcing full sync to recover');
    }

    // Fetch sender statistics from Gmail
    const emailLimit = planLimits.emailProcessingLimit;
    // Full sync uses a high limit (up to 10000) to get accurate counts
    // Incremental uses 500, regular sync uses plan limit
    const messagesToFetch = forceFullSync
      ? Math.min(10000, emailLimit)  // Full sync: fetch up to 10k for accurate counts
      : isIncrementalSync
        ? 500  // Incremental: just recent changes
        : Math.min(maxMessages, emailLimit);  // First sync: plan limit

    console.log(`${forceFullSync ? 'FULL' : isIncrementalSync ? 'Incremental' : 'Initial'} sync starting... (plan: ${planKey}, fetching: ${messagesToFetch})`);
    const allSenderStats = await fetchSenderStats(
      accessToken,
      messagesToFetch,
      lastSyncDate
    );

    // Filter out user's own email address (sent/replied emails show up with user as sender)
    const userEmail = (account.gmail_email || email).toLowerCase();
    const senderStats = allSenderStats.filter((sender: SenderStats) =>
      sender.email.toLowerCase() !== userEmail
    );
    console.log('Fetched senders:', senderStats.length, '(filtered from', allSenderStats.length, ') Total emails:', senderStats.reduce((sum, s) => sum + s.count, 0));

    // For incremental sync, we need to add to existing counts, not replace
    // For full sync, we replace the data
    let sendersToUpsert;

    if (isIncrementalSync && senderStats.length > 0) {
      // Get existing sender data to merge with
      const { data: existingSenders } = await supabase
        .from('email_senders')
        .select('sender_email, email_count, unread_count, first_email_date')
        .eq('email_account_id', account.id);

      const existingMap = new Map(
        (existingSenders || []).map(s => [s.sender_email, s])
      );

      sendersToUpsert = senderStats.map((sender: SenderStats) => {
        const existing = existingMap.get(sender.email);
        return {
          user_id: user.userId,
          email_account_id: account.id,
          sender_email: sender.email,
          sender_name: sender.name,
          // Add new counts to existing counts for incremental sync
          email_count: (existing?.email_count || 0) + sender.count,
          unread_count: (existing?.unread_count || 0) + sender.unreadCount,
          // Keep earliest first_email_date
          first_email_date: existing?.first_email_date && existing.first_email_date < sender.firstDate
            ? existing.first_email_date
            : sender.firstDate,
          last_email_date: sender.lastDate, // Always update to latest
          unsubscribe_link: sender.unsubscribeLink || null,
          has_unsubscribe: sender.hasUnsubscribe,
          is_newsletter: sender.isNewsletter,
          is_promotional: sender.isPromotional,
          updated_at: new Date().toISOString()
        };
      });
    } else {
      // Full sync - replace all data
      sendersToUpsert = senderStats.map((sender: SenderStats) => ({
        user_id: user.userId,
        email_account_id: account.id,
        sender_email: sender.email,
        sender_name: sender.name,
        email_count: sender.count,
        unread_count: sender.unreadCount,
        first_email_date: sender.firstDate,
        last_email_date: sender.lastDate,
        unsubscribe_link: sender.unsubscribeLink || null,
        has_unsubscribe: sender.hasUnsubscribe,
        is_newsletter: sender.isNewsletter,
        is_promotional: sender.isPromotional,
        updated_at: new Date().toISOString()
      }));
    }

    // Remove user's own email from senders table if it exists (from previous syncs)
    const { error: deleteOwnError } = await supabase
      .from('email_senders')
      .delete()
      .eq('email_account_id', account.id)
      .eq('sender_email', userEmail);
    if (deleteOwnError) {
      console.warn('Could not delete own email from senders:', deleteOwnError);
    }

    // Upsert senders in batches
    const BATCH_SIZE = 100;
    console.log('Upserting', sendersToUpsert.length, 'senders to database...');
    for (let i = 0; i < sendersToUpsert.length; i += BATCH_SIZE) {
      const batch = sendersToUpsert.slice(i, i + BATCH_SIZE);
      const { error: upsertError } = await supabase
        .from('email_senders')
        .upsert(batch, {
          onConflict: 'email_account_id,sender_email'
        });
      if (upsertError) {
        console.error('Upsert error:', upsertError);
      }
    }
    console.log('Upsert complete');

    // Update email account stats
    const totalEmails = senderStats.reduce((sum: number, s: SenderStats) => sum + s.count, 0);
    await supabase
      .from('email_accounts')
      .update({
        total_emails: totalEmails,
        last_synced: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', account.id);

    // Log to activity_log for Recent Activity display
    await supabase
      .from('activity_log')
      .insert({
        user_id: user.userId,
        action_type: 'email_sync',
        description: `Synced ${totalEmails.toLocaleString()} emails from ${senderStats.length} senders`,
        metadata: { totalEmails, totalSenders: senderStats.length, email }
      });

    return res.status(200).json({
      success: true,
      totalSenders: senderStats.length,
      totalEmails,
      message: 'Email sync completed successfully'
    });

  } catch (error: any) {
    console.error('Email sync error:', error);

    // Handle token errors
    if (error.message.includes('Gmail not connected')) {
      // Update account status
      await supabase
        .from('email_accounts')
        .update({
          connection_status: 'expired',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.userId)
        .eq('email', email);

      return res.status(401).json({
        error: 'Gmail connection expired. Please reconnect.',
        code: 'TOKEN_EXPIRED'
      });
    }

    return res.status(500).json({
      error: 'Failed to sync emails',
      code: 'SYNC_ERROR'
    });
  }
}
