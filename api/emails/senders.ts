/**
 * Email Senders Endpoint
 *
 * GET /api/emails/senders
 *
 * Returns list of email senders with statistics for the user's connected accounts.
 * Requires authenticated user.
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

export interface SenderResponse {
  id: string;
  email: string;
  name: string;
  emailCount: number;
  unreadCount: number;
  firstEmailDate: string;
  lastEmailDate: string;
  unsubscribeLink: string | null;
  hasUnsubscribe: boolean;
  isNewsletter: boolean;
  isPromotional: boolean;
  emailAccountId: string;
  accountEmail: string;
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

  // Query parameters
  const {
    email, // Filter by specific email account
    sortBy = 'count', // 'count', 'name', 'date'
    sortDirection = 'desc',
    limit = '500',
    offset = '0',
    filter // 'newsletter', 'promotional', 'unsubscribable'
  } = req.query;

  try {
    // Build query
    let query = supabase
      .from('email_senders')
      .select(`
        id,
        sender_email,
        sender_name,
        email_count,
        unread_count,
        first_email_date,
        last_email_date,
        unsubscribe_link,
        has_unsubscribe,
        is_newsletter,
        is_promotional,
        email_account_id,
        email_accounts!inner(email, connection_status)
      `)
      .eq('user_id', user.userId);

    // Filter by specific email account
    if (email && typeof email === 'string') {
      const { data: accountData } = await supabase
        .from('email_accounts')
        .select('id')
        .eq('user_id', user.userId)
        .eq('email', email)
        .single();

      if (accountData) {
        query = query.eq('email_account_id', accountData.id);
      }
    }

    // Apply filters
    if (filter === 'newsletter') {
      query = query.eq('is_newsletter', true);
    } else if (filter === 'promotional') {
      query = query.eq('is_promotional', true);
    } else if (filter === 'unsubscribable') {
      query = query.eq('has_unsubscribe', true);
    }

    // Apply sorting
    const sortColumn = sortBy === 'name' ? 'sender_name' :
                       sortBy === 'date' ? 'last_email_date' :
                       'email_count';
    const ascending = sortDirection === 'asc';

    query = query
      .order(sortColumn, { ascending })
      .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

    const { data: senders, error } = await query;

    if (error) {
      throw error;
    }

    // Transform response
    const response: SenderResponse[] = (senders || []).map((sender: any) => ({
      id: sender.id,
      email: sender.sender_email,
      name: sender.sender_name || sender.sender_email,
      emailCount: sender.email_count,
      unreadCount: sender.unread_count,
      firstEmailDate: sender.first_email_date,
      lastEmailDate: sender.last_email_date,
      unsubscribeLink: sender.unsubscribe_link,
      hasUnsubscribe: sender.has_unsubscribe,
      isNewsletter: sender.is_newsletter,
      isPromotional: sender.is_promotional,
      emailAccountId: sender.email_account_id,
      accountEmail: sender.email_accounts?.email || ''
    }));

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('email_senders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.userId);

    return res.status(200).json({
      senders: response,
      pagination: {
        total: totalCount || response.length,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      }
    });

  } catch (error: any) {
    console.error('Fetch senders error:', error);
    return res.status(500).json({
      error: 'Failed to fetch email senders',
      code: 'FETCH_ERROR'
    });
  }
}
