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

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// More relaxed rate limit for sync operations
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 5, // 5 syncs per minute
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

  const { email, maxMessages = 1000 } = req.body;

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
      .select('id, gmail_email, connection_status')
      .eq('user_id', user.userId)
      .eq('email', email)
      .single();

    if (accountError || !account) {
      return res.status(404).json({
        error: 'Email account not found',
        code: 'ACCOUNT_NOT_FOUND'
      });
    }

    if (account.connection_status !== 'connected') {
      return res.status(400).json({
        error: 'Gmail account is not connected',
        code: 'NOT_CONNECTED'
      });
    }

    // Get valid access token (refreshes if needed)
    const { accessToken } = await getValidAccessToken(
      user.userId,
      account.gmail_email || email
    );

    // Fetch sender statistics from Gmail
    const senderStats = await fetchSenderStats(accessToken, Math.min(maxMessages, 2000));

    // Update sender cache in database
    const sendersToUpsert = senderStats.map((sender: SenderStats) => ({
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

    // Upsert senders in batches
    const BATCH_SIZE = 100;
    for (let i = 0; i < sendersToUpsert.length; i += BATCH_SIZE) {
      const batch = sendersToUpsert.slice(i, i + BATCH_SIZE);
      await supabase
        .from('email_senders')
        .upsert(batch, {
          onConflict: 'email_account_id,sender_email'
        });
    }

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
