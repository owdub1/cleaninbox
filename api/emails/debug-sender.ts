/**
 * Debug endpoint to check Gmail for specific sender
 * GET /api/emails/debug-sender?email=<account>&sender=<sender>
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, AuthenticatedRequest } from '../lib/auth-middleware.js';
import { getValidAccessToken } from '../lib/gmail.js';
import { listMessages, getMessage } from '../lib/gmail-api.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = requireAuth(req as AuthenticatedRequest, res);
  if (!user) return;

  const { email, sender } = req.query;

  if (!email || !sender) {
    return res.status(400).json({ error: 'email and sender query params required' });
  }

  try {
    // Get email account
    const { data: account } = await supabase
      .from('email_accounts')
      .select('id, gmail_email')
      .eq('user_id', user.userId)
      .eq('email', email)
      .single();

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Get access token
    const { accessToken } = await getValidAccessToken(user.userId, account.gmail_email || email as string);

    // Search Gmail for emails from this sender
    const searchQuery = `from:${sender}`;
    console.log('Searching Gmail with query:', searchQuery);

    const response = await listMessages(accessToken, {
      maxResults: 20,
      q: searchQuery,
    });

    const messages = response.messages || [];
    console.log('Found', messages.length, 'messages from', sender);

    // Get details for found messages
    const details = [];
    for (const msg of messages.slice(0, 5)) {
      try {
        const detail = await getMessage(accessToken, msg.id, 'metadata', ['From', 'Subject', 'Date']);
        const fromHeader = detail.payload?.headers?.find(h => h.name === 'From')?.value;
        const subjectHeader = detail.payload?.headers?.find(h => h.name === 'Subject')?.value;
        const dateHeader = detail.payload?.headers?.find(h => h.name === 'Date')?.value;
        details.push({
          id: msg.id,
          from: fromHeader,
          subject: subjectHeader,
          date: dateHeader,
          labels: detail.labelIds,
          internalDate: detail.internalDate ? new Date(parseInt(detail.internalDate)).toISOString() : null,
        });
      } catch (err: any) {
        details.push({ id: msg.id, error: err.message });
      }
    }

    // Check database for this sender
    const { data: dbSender } = await supabase
      .from('email_senders')
      .select('*')
      .eq('email_account_id', account.id)
      .ilike('sender_email', `%${sender}%`);

    // Get emails from database for this sender
    const { data: dbEmails } = await supabase
      .from('emails')
      .select('gmail_message_id, subject, received_at, sender_email, sender_name')
      .eq('email_account_id', account.id)
      .ilike('sender_email', `%${sender}%`)
      .order('received_at', { ascending: false })
      .limit(10);

    return res.status(200).json({
      query: searchQuery,
      gmailMessageCount: messages.length,
      gmailMessages: details,
      databaseSenders: dbSender || [],
      databaseEmails: dbEmails || [],
    });

  } catch (error: any) {
    console.error('Debug error:', error);
    return res.status(500).json({ error: error.message });
  }
}
