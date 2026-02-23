/**
 * Emails by Sender Endpoint
 *
 * GET /api/emails/by-sender?senderEmail=xxx&senderName=xxx&accountEmail=xxx
 *
 * Returns individual emails from a specific sender (filtered by name + email).
 * Queries from local database for fast response (no Gmail API calls).
 * Requires authenticated user with connected Gmail account.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, AuthenticatedRequest } from '../lib/auth-middleware.js';
import { rateLimit, RateLimitPresets } from '../lib/rate-limiter.js';

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
  if (await limiter(req, res)) return;

  // Require authentication
  const user = requireAuth(req as AuthenticatedRequest, res);
  if (!user) return;

  const { senderEmail, senderName, accountEmail, limit = '50' } = req.query;

  if (!senderEmail || typeof senderEmail !== 'string') {
    return res.status(400).json({ error: 'senderEmail is required' });
  }

  if (!accountEmail || typeof accountEmail !== 'string') {
    return res.status(400).json({ error: 'accountEmail is required' });
  }

  try {
    // Get the email account
    const { data: account, error: accountError } = await supabase
      .from('email_accounts')
      .select('id')
      .eq('user_id', user.userId)
      .eq('email', accountEmail)
      .single();

    if (accountError || !account) {
      return res.status(404).json({ error: 'Email account not found' });
    }

    // Query emails from local database (fast, no Gmail API call)
    let query = supabase
      .from('emails')
      .select('gmail_message_id, thread_id, subject, snippet, received_at, is_unread')
      .eq('email_account_id', account.id)
      .eq('sender_email', senderEmail);

    // Filter by sender name if provided (for name+email grouping)
    if (senderName && typeof senderName === 'string') {
      query = query.eq('sender_name', senderName);
    }

    const { data: emailRecords, error: emailsError } = await query
      .order('received_at', { ascending: false })
      .limit(Math.min(parseInt(limit as string), 100));

    if (emailsError) {
      console.error('Error fetching emails from DB:', emailsError);
      return res.status(500).json({ error: 'Failed to fetch emails' });
    }

    // Transform to EmailMessage format
    const emails: EmailMessage[] = (emailRecords || []).map(email => ({
      id: email.gmail_message_id,
      threadId: email.thread_id || '',
      subject: email.subject || '(No Subject)',
      snippet: email.snippet || '',
      date: email.received_at,
      isUnread: email.is_unread || false
    }));

    const nameFilter = senderName ? ` (name: ${senderName})` : '';
    console.log(`by-sender: ${senderEmail}${nameFilter} - returned ${emails.length} emails from local DB`);

    // Get total count for this sender (may be more than returned)
    let countQuery = supabase
      .from('emails')
      .select('*', { count: 'exact', head: true })
      .eq('email_account_id', account.id)
      .eq('sender_email', senderEmail);

    if (senderName && typeof senderName === 'string') {
      countQuery = countQuery.eq('sender_name', senderName);
    }

    const { count: totalCount } = await countQuery;

    return res.status(200).json({
      emails,
      total: totalCount || emails.length
    });

  } catch (error: any) {
    console.error('Fetch emails by sender error:', error);
    return res.status(500).json({
      error: 'Failed to fetch emails',
      message: error.message
    });
  }
}
