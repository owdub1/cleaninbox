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
import { fetchSenderStats, SenderStats, EmailRecord, SyncResult } from '../lib/gmail-api.js';
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
    // - First sync (no last_synced): Full sync to get all historical emails
    // - Stale sync (>30 days): Full sync to refresh data
    // - Subsequent syncs: Quick incremental sync (only new emails)
    const isFirstSync = !account.last_synced;

    // Check if last sync was more than 30 days ago
    const STALE_SYNC_DAYS = 30;
    const isStaleSync = account.last_synced &&
      (Date.now() - new Date(account.last_synced).getTime()) > (STALE_SYNC_DAYS * 24 * 60 * 60 * 1000);

    const isFullSync = isFirstSync || isStaleSync || fullSync;
    const isIncrementalSync = !isFullSync;
    const lastSyncDate = isIncrementalSync ? new Date(account.last_synced) : undefined;

    if (isStaleSync) {
      console.log(`Last sync was over ${STALE_SYNC_DAYS} days ago - forcing full sync to refresh`);
    }

    // Fetch sender statistics from Gmail
    const emailLimit = planLimits.emailProcessingLimit;
    // Full sync (first time or recovery): fetch up to plan limit for accurate counts
    // Incremental: just recent changes (500 max for speed)
    const messagesToFetch = isFullSync
      ? Math.min(10000, emailLimit)  // Full sync: up to 10k or plan limit
      : 500;  // Incremental: just recent changes

    const syncType = isFirstSync ? 'FIRST' : isStaleSync ? 'STALE' : isIncrementalSync ? 'Incremental' : 'FULL';
    console.log(`${syncType} sync starting... (plan: ${planKey}, fetching: ${messagesToFetch})`);
    const syncResult: SyncResult = await fetchSenderStats(
      accessToken,
      messagesToFetch,
      lastSyncDate
    );

    // Filter out user's own email address (sent/replied emails show up with user as sender)
    const userEmail = (account.gmail_email || email).toLowerCase();
    const senderStats = syncResult.senders.filter((sender: SenderStats) =>
      sender.email.toLowerCase() !== userEmail
    );
    const emailRecords = syncResult.emails.filter((email: EmailRecord) =>
      email.sender_email.toLowerCase() !== userEmail
    );
    console.log('Fetched senders:', senderStats.length, '(filtered from', syncResult.senders.length, ') Total emails:', senderStats.reduce((sum, s) => sum + s.count, 0));

    // Safety check: Don't delete existing data if full sync returned nothing
    // This prevents data loss when Gmail API returns 0 messages due to auth issues, API errors, or empty response
    if (isFullSync && senderStats.length === 0) {
      console.warn('Full sync returned 0 senders - keeping existing data to prevent data loss');
      return res.status(200).json({
        success: true,
        totalSenders: 0,
        totalEmails: account.total_emails || 0,
        message: 'No emails found - existing data preserved',
        warning: 'Gmail returned no emails. Check if account has proper permissions.'
      });
    }

    // For incremental sync, we need to add to existing counts, not replace
    // For full sync, we replace the data
    let sendersToUpsert;

    // Helper to create composite key for sender lookup
    const getSenderKey = (email: string, name: string) => `${email}|||${name}`;

    if (isIncrementalSync && senderStats.length > 0) {
      // Get existing sender data to merge with (now keyed by email + name)
      const { data: existingSenders } = await supabase
        .from('email_senders')
        .select('sender_email, sender_name, email_count, unread_count, first_email_date')
        .eq('email_account_id', account.id);

      const existingMap = new Map(
        (existingSenders || []).map(s => [getSenderKey(s.sender_email, s.sender_name || s.sender_email), s])
      );

      sendersToUpsert = senderStats.map((sender: SenderStats) => {
        const existing = existingMap.get(getSenderKey(sender.email, sender.name));
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

    // Upsert senders in batches (now using composite key: email_account_id, sender_email, sender_name)
    const BATCH_SIZE = 100;
    console.log('Upserting', sendersToUpsert.length, 'senders to database...');

    // For full sync, delete existing senders first to avoid constraint issues
    if (isFullSync) {
      const { error: deleteSendersError } = await supabase
        .from('email_senders')
        .delete()
        .eq('email_account_id', account.id);
      if (deleteSendersError) {
        console.warn('Failed to clear old senders:', deleteSendersError);
      } else {
        console.log('Cleared existing senders for full sync');
      }
    }

    // For incremental sync, delete existing senders that we're about to update
    // This avoids upsert constraint issues with composite keys
    if (isIncrementalSync && sendersToUpsert.length > 0) {
      // Extract the sender keys we need to delete
      const senderKeysToDelete = sendersToUpsert.map(s => ({
        email: s.sender_email,
        name: s.sender_name
      }));

      // Delete in batches - filter by email_account_id and sender combinations
      for (let i = 0; i < senderKeysToDelete.length; i += BATCH_SIZE) {
        const batch = senderKeysToDelete.slice(i, i + BATCH_SIZE);
        // Delete each sender that we're about to re-insert
        for (const sender of batch) {
          const { error: deleteError } = await supabase
            .from('email_senders')
            .delete()
            .eq('email_account_id', account.id)
            .eq('sender_email', sender.email)
            .eq('sender_name', sender.name);
          if (deleteError) {
            console.warn('Failed to delete sender for update:', deleteError);
          }
        }
      }
      console.log('Deleted existing senders for incremental update');
    }

    // Insert senders in batches (we've cleared the ones we're updating)
    let insertedSenders = 0;
    let failedSenders = 0;
    let lastInsertError: any = null;
    for (let i = 0; i < sendersToUpsert.length; i += BATCH_SIZE) {
      const batch = sendersToUpsert.slice(i, i + BATCH_SIZE);
      const { error: senderError, data: insertedData } = await supabase.from('email_senders').insert(batch).select('id');
      if (senderError) {
        console.error('Sender insert error:', senderError);
        if (batch.length > 0) {
          console.error('First item in failed batch:', JSON.stringify(batch[0], null, 2));
        }
        failedSenders += batch.length;
        lastInsertError = senderError;
      } else {
        insertedSenders += insertedData?.length || batch.length;
      }
    }
    console.log(`Sender insert complete: ${insertedSenders} inserted, ${failedSenders} failed`);

    // Store individual emails in the emails table
    if (emailRecords.length > 0) {
      console.log('Storing', emailRecords.length, 'individual emails...');

      // For full sync, delete existing emails first to ensure clean state
      if (isFullSync) {
        const { error: deleteError } = await supabase
          .from('emails')
          .delete()
          .eq('email_account_id', account.id);
        if (deleteError) {
          console.warn('Failed to clear old emails:', deleteError);
        }
      }

      // Prepare email records with account ID
      const emailsToUpsert = emailRecords.map((email: EmailRecord) => ({
        gmail_message_id: email.gmail_message_id,
        email_account_id: account.id,
        sender_email: email.sender_email,
        sender_name: email.sender_name,
        subject: email.subject,
        snippet: email.snippet,
        received_at: email.received_at,
        is_unread: email.is_unread,
        thread_id: email.thread_id,
        labels: email.labels,
      }));

      // Insert emails in batches
      // For full sync: we deleted existing ones above
      // For incremental sync: duplicates are expected and will be rejected by unique constraint
      let insertedCount = 0;
      let duplicateCount = 0;
      for (let i = 0; i < emailsToUpsert.length; i += BATCH_SIZE) {
        const batch = emailsToUpsert.slice(i, i + BATCH_SIZE);
        const { error: emailInsertError, data } = await supabase
          .from('emails')
          .insert(batch)
          .select('gmail_message_id');

        if (emailInsertError) {
          // For incremental sync, duplicate key errors are expected - ignore them
          if (isIncrementalSync && emailInsertError.code === '23505') {
            // Unique violation - this is expected for incremental sync
            // Insert emails one by one to handle partial duplicates
            for (const email of batch) {
              const { error: singleError } = await supabase
                .from('emails')
                .insert(email);
              if (singleError) {
                if (singleError.code === '23505') {
                  duplicateCount++;
                } else {
                  console.error('Single email insert error:', singleError);
                }
              } else {
                insertedCount++;
              }
            }
          } else {
            console.error('Email insert error:', emailInsertError);
            if (batch.length > 0) {
              console.error('First item in failed batch:', JSON.stringify(batch[0], null, 2));
            }
          }
        } else {
          insertedCount += batch.length;
        }
      }
      if (isIncrementalSync) {
        console.log(`Email storage complete: ${insertedCount} new, ${duplicateCount} duplicates skipped`);
      } else {
        console.log('Email storage complete');
      }
    }

    // Update email account stats
    // For incremental sync, use the merged counts from sendersToUpsert
    // For full sync, use the raw senderStats counts
    const totalEmails = isIncrementalSync
      ? sendersToUpsert.reduce((sum: number, s: any) => sum + s.email_count, 0)
      : senderStats.reduce((sum: number, s: SenderStats) => sum + s.count, 0);
    const newEmailsCount = senderStats.reduce((sum: number, s: SenderStats) => sum + s.count, 0);

    await supabase
      .from('email_accounts')
      .update({
        total_emails: totalEmails,
        last_synced: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', account.id);

    // Log to activity_log for Recent Activity display
    const description = isIncrementalSync
      ? `Incremental sync: ${newEmailsCount.toLocaleString()} new emails from ${senderStats.length} senders`
      : `Full sync: ${totalEmails.toLocaleString()} emails from ${senderStats.length} senders`;
    await supabase
      .from('activity_log')
      .insert({
        user_id: user.userId,
        action_type: 'email_sync',
        description,
        metadata: { totalEmails, newEmails: newEmailsCount, totalSenders: senderStats.length, email, syncType: isIncrementalSync ? 'incremental' : 'full' }
      });

    // Check if sender inserts failed
    if (failedSenders > 0 && insertedSenders === 0) {
      console.error('All sender inserts failed:', lastInsertError);
      return res.status(500).json({
        success: false,
        error: 'Failed to save sender data to database',
        details: lastInsertError?.message || 'Unknown database error',
        code: 'SENDER_INSERT_FAILED'
      });
    }

    return res.status(200).json({
      success: true,
      totalSenders: insertedSenders,
      totalEmails,
      message: 'Email sync completed successfully',
      ...(failedSenders > 0 ? { warning: `${failedSenders} senders failed to save` } : {})
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
