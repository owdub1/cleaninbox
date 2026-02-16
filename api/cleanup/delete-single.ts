/**
 * Delete Single Email Endpoint
 *
 * POST /api/cleanup/delete-single
 *
 * Deletes a single email by message ID.
 * Requires authenticated user with connected Gmail account.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, AuthenticatedRequest } from '../lib/auth-middleware.js';
import { rateLimit } from '../lib/rate-limiter.js';
import { getValidAccessToken } from '../lib/gmail.js';
import { getValidOutlookAccessToken } from '../lib/outlook.js';
import { trashMessage } from '../lib/gmail-api.js';
import { trashMessage as outlookTrashMessage } from '../lib/outlook-api.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Rate limit: 30 single deletes per minute
const limiter = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 30,
  message: 'Too many delete requests. Please wait before trying again.'
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

  const { accountEmail, messageId, senderEmail } = req.body;

  // Validate input
  if (!accountEmail) {
    return res.status(400).json({
      error: 'Account email is required',
      code: 'MISSING_ACCOUNT_EMAIL'
    });
  }

  if (!messageId) {
    return res.status(400).json({
      error: 'Message ID is required',
      code: 'MISSING_MESSAGE_ID'
    });
  }

  try {
    // Get email account
    const { data: account, error: accountError } = await supabase
      .from('email_accounts')
      .select('id, gmail_email, provider, connection_status')
      .eq('user_id', user.userId)
      .eq('email', accountEmail)
      .single();

    if (accountError || !account) {
      return res.status(404).json({
        error: 'Email account not found',
        code: 'ACCOUNT_NOT_FOUND'
      });
    }

    if (account.connection_status !== 'connected') {
      return res.status(400).json({
        error: 'Email account is not connected',
        code: 'NOT_CONNECTED'
      });
    }

    // Get valid access token based on provider
    const isOutlook = account.provider === 'Outlook';
    const { accessToken } = isOutlook
      ? await getValidOutlookAccessToken(user.userId, accountEmail)
      : await getValidAccessToken(user.userId, account.gmail_email || accountEmail);

    // Trash the message
    if (isOutlook) {
      await outlookTrashMessage(accessToken, messageId);
    } else {
      await trashMessage(accessToken, messageId);
    }

    // Delete from local emails table
    const { error: deleteError } = await supabase
      .from('emails')
      .delete()
      .eq('email_account_id', account.id)
      .eq('gmail_message_id', messageId);

    if (deleteError) {
      console.warn('Failed to delete email from local DB:', deleteError);
    }

    // Update sender cache (decrement count and recalculate last_email_date)
    if (senderEmail) {
      // Get the latest remaining email date for this sender from the database
      const { data: remainingEmails } = await supabase
        .from('emails')
        .select('received_at')
        .eq('email_account_id', account.id)
        .eq('sender_email', senderEmail)
        .order('received_at', { ascending: false })
        .limit(1);

      if (remainingEmails && remainingEmails.length > 0) {
        // Update count and last_email_date from actual remaining emails
        const { count } = await supabase
          .from('emails')
          .select('*', { count: 'exact', head: true })
          .eq('email_account_id', account.id)
          .eq('sender_email', senderEmail);

        await supabase
          .from('email_senders')
          .update({
            email_count: count || 0,
            last_email_date: remainingEmails[0].received_at,
            updated_at: new Date().toISOString()
          })
          .eq('email_account_id', account.id)
          .eq('sender_email', senderEmail);
      } else {
        // No remaining emails - delete the sender record
        await supabase
          .from('email_senders')
          .delete()
          .eq('email_account_id', account.id)
          .eq('sender_email', senderEmail);
      }
    }

    // Log cleanup action
    await supabase
      .from('cleanup_actions')
      .insert({
        user_id: user.userId,
        email_account_id: account.id,
        action_type: 'delete_single',
        sender_email: senderEmail || 'unknown',
        emails_affected: 1,
        gmail_message_ids: [messageId],
        status: 'completed',
        completed_at: new Date().toISOString()
      });

    // Update user stats (increment emails_processed)
    const { data: currentStats } = await supabase
      .from('user_stats')
      .select('emails_processed, unsubscribed')
      .eq('user_id', user.userId)
      .single();

    await supabase
      .from('user_stats')
      .upsert({
        user_id: user.userId,
        emails_processed: (currentStats?.emails_processed || 0) + 1,
        unsubscribed: currentStats?.unsubscribed || 0,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    return res.status(200).json({
      success: true,
      messageId,
      message: 'Email moved to trash'
    });

  } catch (error: any) {
    console.error('Delete single email error:', error);

    // Handle token errors
    if (error.message.includes('not connected')) {
      return res.status(401).json({
        error: 'Email connection expired. Please reconnect.',
        code: 'TOKEN_EXPIRED'
      });
    }

    return res.status(500).json({
      error: 'Failed to delete email',
      code: 'DELETE_ERROR'
    });
  }
}
