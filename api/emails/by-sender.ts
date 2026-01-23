/**
 * Emails by Sender Endpoint
 *
 * GET /api/emails/by-sender?senderEmail=xxx&accountEmail=xxx
 *
 * Returns individual emails from a specific sender.
 * Requires authenticated user with connected Gmail account.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, AuthenticatedRequest } from '../lib/auth-middleware.js';
import { rateLimit, RateLimitPresets } from '../lib/rate-limiter.js';
import { getValidAccessToken } from '../lib/gmail.js';
import { listMessages, getMessage } from '../lib/gmail-api.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const limiter = rateLimit(RateLimitPresets.RELAXED);

export interface EmailMessage {
  id: string;
  threadId: string;
  subject: string;
  snippet: string;
  date: string;
  isUnread: boolean;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting
  if (limiter(req, res)) return;

  // Require authentication
  const user = requireAuth(req as AuthenticatedRequest, res);
  if (!user) return;

  const { senderEmail, accountEmail, limit = '20' } = req.query;

  if (!senderEmail || typeof senderEmail !== 'string') {
    return res.status(400).json({ error: 'senderEmail is required' });
  }

  if (!accountEmail || typeof accountEmail !== 'string') {
    return res.status(400).json({ error: 'accountEmail is required' });
  }

  try {
    // Get valid access token
    const { accessToken } = await getValidAccessToken(user.userId, accountEmail);

    // Fetch messages from this sender
    const messageList = await listMessages(accessToken, {
      q: `from:${senderEmail}`,
      maxResults: Math.min(parseInt(limit as string), 50)
    });

    if (!messageList.messages || messageList.messages.length === 0) {
      return res.status(200).json({ emails: [] });
    }

    // Fetch details for each message (in batches to avoid rate limits)
    const emails: EmailMessage[] = [];
    const BATCH_SIZE = 10;

    for (let i = 0; i < messageList.messages.length; i += BATCH_SIZE) {
      const batch = messageList.messages.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.all(
        batch.map(async (msg) => {
          try {
            const fullMessage = await getMessage(accessToken, msg.id, 'metadata');

            // Extract subject from headers
            const subjectHeader = fullMessage.payload?.headers?.find(
              h => h.name.toLowerCase() === 'subject'
            );
            const subject = subjectHeader?.value || '(No Subject)';

            return {
              id: fullMessage.id,
              threadId: fullMessage.threadId,
              subject,
              snippet: fullMessage.snippet || '',
              date: new Date(parseInt(fullMessage.internalDate)).toISOString(),
              isUnread: fullMessage.labelIds?.includes('UNREAD') || false
            };
          } catch (err) {
            console.warn(`Failed to fetch message ${msg.id}:`, err);
            return null;
          }
        })
      );

      emails.push(...batchResults.filter(Boolean) as EmailMessage[]);

      // Small delay between batches
      if (i + BATCH_SIZE < messageList.messages.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Sort by date (newest first)
    emails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Get accurate count from Gmail's estimate
    const actualCount = messageList.resultSizeEstimate || emails.length;

    // Update the sender's email count in the database if it differs
    // This corrects the count when we have more accurate data from Gmail
    if (actualCount > 0) {
      const { data: account } = await supabase
        .from('email_accounts')
        .select('id')
        .eq('user_id', user.userId)
        .eq('email', accountEmail)
        .single();

      if (account) {
        await supabase
          .from('email_senders')
          .update({
            email_count: actualCount,
            updated_at: new Date().toISOString()
          })
          .eq('email_account_id', account.id)
          .eq('sender_email', senderEmail);
      }
    }

    return res.status(200).json({
      emails,
      total: actualCount
    });

  } catch (error: any) {
    console.error('Fetch emails by sender error:', error);
    return res.status(500).json({
      error: 'Failed to fetch emails',
      message: error.message
    });
  }
}
