/**
 * Delete Emails Endpoint
 *
 * POST /api/cleanup/delete
 *
 * Deletes all emails from specified sender(s) by moving them to trash.
 * Requires authenticated user with connected Gmail account.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, AuthenticatedRequest } from '../lib/auth-middleware.js';
import { rateLimit } from '../lib/rate-limiter.js';
import { getValidAccessToken } from '../lib/gmail.js';
import { deleteEmailsFromSender } from '../lib/gmail-api.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Rate limit: 10 delete actions per minute
const limiter = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 10,
  message: 'Too many cleanup requests. Please wait before trying again.'
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

  const { accountEmail, senderEmails } = req.body;

  // Validate input
  if (!accountEmail) {
    return res.status(400).json({
      error: 'Account email is required',
      code: 'MISSING_ACCOUNT_EMAIL'
    });
  }

  if (!senderEmails || !Array.isArray(senderEmails) || senderEmails.length === 0) {
    return res.status(400).json({
      error: 'At least one sender email is required',
      code: 'MISSING_SENDER_EMAILS'
    });
  }

  // Limit to 10 senders at once
  if (senderEmails.length > 10) {
    return res.status(400).json({
      error: 'Maximum 10 senders can be processed at once',
      code: 'TOO_MANY_SENDERS'
    });
  }

  try {
    // Get email account
    const { data: account, error: accountError } = await supabase
      .from('email_accounts')
      .select('id, gmail_email, connection_status')
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
        error: 'Gmail account is not connected',
        code: 'NOT_CONNECTED'
      });
    }

    // Get valid access token
    const { accessToken } = await getValidAccessToken(
      user.userId,
      account.gmail_email || accountEmail
    );

    // Process each sender
    const results = [];
    let totalDeleted = 0;

    for (const senderEmail of senderEmails) {
      try {
        // Get sender info from cache
        const { data: senderData } = await supabase
          .from('email_senders')
          .select('sender_name, email_count')
          .eq('email_account_id', account.id)
          .eq('sender_email', senderEmail)
          .single();

        // Delete emails from Gmail
        const { deletedCount, messageIds } = await deleteEmailsFromSender(
          accessToken,
          senderEmail
        );

        // Log cleanup action
        await supabase
          .from('cleanup_actions')
          .insert({
            user_id: user.userId,
            email_account_id: account.id,
            action_type: 'delete',
            sender_email: senderEmail,
            sender_name: senderData?.sender_name || senderEmail,
            emails_affected: deletedCount,
            gmail_message_ids: messageIds,
            status: 'completed',
            completed_at: new Date().toISOString()
          });

        // Update sender cache (set count to 0)
        await supabase
          .from('email_senders')
          .update({
            email_count: 0,
            unread_count: 0,
            updated_at: new Date().toISOString()
          })
          .eq('email_account_id', account.id)
          .eq('sender_email', senderEmail);

        totalDeleted += deletedCount;
        results.push({
          senderEmail,
          deletedCount,
          success: true
        });

      } catch (senderError: any) {
        console.error(`Failed to delete from ${senderEmail}:`, senderError);

        // Log failed action
        await supabase
          .from('cleanup_actions')
          .insert({
            user_id: user.userId,
            email_account_id: account.id,
            action_type: 'delete',
            sender_email: senderEmail,
            emails_affected: 0,
            status: 'failed',
            error_message: senderError.message
          });

        results.push({
          senderEmail,
          deletedCount: 0,
          success: false,
          error: senderError.message
        });
      }
    }

    // Update user stats (increment emails_processed)
    const { data: currentStats } = await supabase
      .from('user_stats')
      .select('emails_processed')
      .eq('user_id', user.userId)
      .single();

    if (currentStats) {
      await supabase
        .from('user_stats')
        .update({
          emails_processed: (currentStats.emails_processed || 0) + totalDeleted,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.userId);
    }

    // Update email account processed count (increment)
    const { data: currentAccount } = await supabase
      .from('email_accounts')
      .select('processed_emails')
      .eq('id', account.id)
      .single();

    if (currentAccount) {
      await supabase
        .from('email_accounts')
        .update({
          processed_emails: (currentAccount.processed_emails || 0) + totalDeleted,
          updated_at: new Date().toISOString()
        })
        .eq('id', account.id);
    }

    return res.status(200).json({
      success: true,
      totalDeleted,
      results
    });

  } catch (error: any) {
    console.error('Delete emails error:', error);

    // Handle token errors
    if (error.message.includes('Gmail not connected')) {
      return res.status(401).json({
        error: 'Gmail connection expired. Please reconnect.',
        code: 'TOKEN_EXPIRED'
      });
    }

    return res.status(500).json({
      error: 'Failed to delete emails',
      code: 'DELETE_ERROR'
    });
  }
}
