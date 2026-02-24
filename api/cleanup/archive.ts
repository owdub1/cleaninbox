/**
 * Archive Emails Endpoint
 *
 * POST /api/cleanup/archive
 *
 * Archives all emails from specified sender(s) by removing the INBOX label.
 * Uses local database for message IDs (fast) then archives in Gmail.
 * Requires authenticated user with connected Gmail account.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, AuthenticatedRequest } from '../lib/auth-middleware.js';
import { rateLimit } from '../lib/rate-limiter.js';
import { csrfProtection } from '../lib/csrf.js';
import { getValidAccessToken } from '../lib/gmail.js';
import { getValidOutlookAccessToken } from '../lib/outlook.js';
import { batchArchiveMessages, archiveEmailsFromSender } from '../lib/gmail-api.js';
import { batchArchiveMessages as outlookBatchArchiveMessages } from '../lib/outlook-api.js';
import { checkFreeTrialOrPaid } from '../lib/free-trial.js';
import { withSentry } from '../lib/sentry.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Rate limit: 10 archive actions per minute
const limiter = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 10,
  message: 'Too many cleanup requests. Please wait before trying again.'
});

async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting
  if (await limiter(req, res)) return;
  if (!csrfProtection(req, res)) return;

  // Require authentication
  const user = requireAuth(req as AuthenticatedRequest, res);
  if (!user) return;

  const { accountEmail, senderEmails, senderNames } = req.body;

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

  // senderNames is optional but if provided must match senderEmails length
  const hasSenderNames = senderNames && Array.isArray(senderNames) && senderNames.length === senderEmails.length;

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

    // Free trial enforcement: count emails first, then check limit
    let freeTrialRemaining: number | undefined;
    {
      let totalEmailCount = 0;
      for (const senderEmail of senderEmails) {
        const { count } = await supabase
          .from('emails')
          .select('*', { count: 'exact', head: true })
          .eq('email_account_id', account.id)
          .eq('sender_email', senderEmail);
        totalEmailCount += count || 0;
      }

      const trialCheck = await checkFreeTrialOrPaid(supabase, user.userId, user.email, totalEmailCount);
      if (!trialCheck.isPaid) {
        freeTrialRemaining = trialCheck.remaining;
      }
      if (!trialCheck.allowed) {
        return res.status(403).json({
          error: `Free trial limit reached. You have ${trialCheck.remaining} actions remaining but this requires ${totalEmailCount}.`,
          code: 'FREE_TRIAL_EXCEEDED',
          freeTrialRemaining: trialCheck.remaining,
        });
      }
    }

    // Get valid access token based on provider
    const isOutlook = account.provider === 'Outlook';
    const { accessToken } = isOutlook
      ? await getValidOutlookAccessToken(user.userId, accountEmail)
      : await getValidAccessToken(user.userId, account.gmail_email || accountEmail);

    // Process each sender
    const results = [];
    let totalArchived = 0;

    for (let i = 0; i < senderEmails.length; i++) {
      const senderEmail = senderEmails[i];
      const senderName = hasSenderNames ? senderNames[i] : null;

      try {
        // Build query to get message IDs from local database
        let emailQuery = supabase
          .from('emails')
          .select('gmail_message_id')
          .eq('email_account_id', account.id)
          .eq('sender_email', senderEmail);

        // If sender name is provided, filter by it (for name+email grouping)
        if (senderName) {
          emailQuery = emailQuery.eq('sender_name', senderName);
        }

        const { data: localEmails, error: emailError } = await emailQuery;

        if (emailError) {
          console.error(`Error fetching emails for ${senderEmail}:`, emailError);
        }

        let archivedCount = 0;
        let messageIds: string[] = [];

        // If we have local emails, use them for archiving (fast path)
        if (localEmails && localEmails.length > 0) {
          messageIds = localEmails.map(e => e.gmail_message_id);
          console.log(`Archiving ${messageIds.length} emails for ${senderEmail}${senderName ? ` (${senderName})` : ''} from local DB`);

          // Archive using stored message IDs
          const { success } = isOutlook
            ? await outlookBatchArchiveMessages(accessToken, messageIds)
            : await batchArchiveMessages(accessToken, messageIds);
          archivedCount = success.length;

          // Note: We don't delete archived emails from local DB - they're still useful for reference
          // But we could update a flag if needed
        } else {
          // Fallback: no local emails found, use Gmail API directly
          console.log(`No local emails found for ${senderEmail}, falling back to Gmail API`);
          const result = await archiveEmailsFromSender(accessToken, senderEmail);
          archivedCount = result.archivedCount;
          messageIds = result.messageIds;
        }

        // Log cleanup action
        await supabase
          .from('cleanup_actions')
          .insert({
            user_id: user.userId,
            email_account_id: account.id,
            action_type: 'archive',
            sender_email: senderEmail,
            sender_name: senderName || senderEmail,
            emails_affected: archivedCount,
            gmail_message_ids: messageIds,
            status: 'completed',
            completed_at: new Date().toISOString()
          });

        totalArchived += archivedCount;
        results.push({
          senderEmail,
          senderName,
          archivedCount,
          success: true
        });

      } catch (senderError: any) {
        console.error(`Failed to archive from ${senderEmail}:`, senderError);

        // Log failed action
        await supabase
          .from('cleanup_actions')
          .insert({
            user_id: user.userId,
            email_account_id: account.id,
            action_type: 'archive',
            sender_email: senderEmail,
            sender_name: senderName || senderEmail,
            emails_affected: 0,
            status: 'failed',
            error_message: senderError.message
          });

        results.push({
          senderEmail,
          senderName,
          archivedCount: 0,
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
          emails_processed: (currentStats.emails_processed || 0) + totalArchived,
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
          processed_emails: (currentAccount.processed_emails || 0) + totalArchived,
          updated_at: new Date().toISOString()
        })
        .eq('id', account.id);
    }

    return res.status(200).json({
      success: true,
      totalArchived,
      results,
      ...(freeTrialRemaining !== undefined && { freeTrialRemaining }),
    });

  } catch (error: any) {
    console.error('Archive emails error:', error);

    // Handle token errors
    if (error.message.includes('not connected')) {
      return res.status(401).json({
        error: 'Email connection expired. Please reconnect.',
        code: 'TOKEN_EXPIRED'
      });
    }

    return res.status(500).json({
      error: 'Failed to archive emails',
      code: 'ARCHIVE_ERROR'
    });
  }
}

export default withSentry(handler);
