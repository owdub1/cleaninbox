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
  mailtoUnsubscribeLink: string | null;
  hasUnsubscribe: boolean;
  hasOneClickUnsubscribe: boolean;
  isNewsletter: boolean;
  isPromotional: boolean;
  emailAccountId: string;
  accountEmail: string;
  // New fields for name+email grouping
  hasMultipleNames?: boolean;
  relatedSenderNames?: string[];
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
    limit, // Optional: cap number of senders returned. Omit to fetch all.
    offset = '0',
    filter, // 'newsletter', 'promotional', 'unsubscribable'
    search // Search term to filter senders by email or name
  } = req.query;

  try {
    // Apply sorting
    const sortColumn = sortBy === 'name' ? 'sender_name' :
                       sortBy === 'date' ? 'last_email_date' :
                       'email_count';
    const ascending = sortDirection === 'asc';

    // Supabase/PostgREST has a default max of 1000 rows per request.
    // Paginate internally in 1000-row chunks to fetch all senders.
    const requestedLimit = limit ? parseInt(limit as string) : Infinity;
    const startOffset = parseInt(offset as string);
    const PAGE_SIZE = 1000;
    let senders: any[] = [];

    // Cache account ID lookup (used in each page query)
    let accountId: string | null = null;
    if (email && typeof email === 'string') {
      const { data: accountData } = await supabase
        .from('email_accounts')
        .select('id')
        .eq('user_id', user.userId)
        .eq('email', email)
        .single();
      accountId = accountData?.id || null;
    }

    const searchTerm = (search && typeof search === 'string' && search.trim())
      ? search.trim().toLowerCase() : null;

    for (let page = 0; requestedLimit === Infinity || page * PAGE_SIZE < requestedLimit; page++) {
      const pageStart = startOffset + page * PAGE_SIZE;
      const pageEnd = requestedLimit === Infinity
        ? pageStart + PAGE_SIZE - 1
        : Math.min(pageStart + PAGE_SIZE - 1, startOffset + requestedLimit - 1);

      // Rebuild query for each page (Supabase query builder is mutable)
      let pageQuery = supabase
        .from('email_senders')
        .select(`
          id, sender_email, sender_name, email_count, unread_count,
          first_email_date, last_email_date, unsubscribe_link,
          mailto_unsubscribe_link, has_unsubscribe, has_one_click_unsubscribe,
          is_newsletter, is_promotional, email_account_id,
          email_accounts!inner(email, connection_status)
        `)
        .eq('user_id', user.userId);

      if (accountId) pageQuery = pageQuery.eq('email_account_id', accountId);
      if (filter === 'newsletter') pageQuery = pageQuery.eq('is_newsletter', true);
      else if (filter === 'promotional') pageQuery = pageQuery.eq('is_promotional', true);
      else if (filter === 'unsubscribable') pageQuery = pageQuery.eq('has_unsubscribe', true);
      if (searchTerm) pageQuery = pageQuery.or(`sender_email.ilike.%${searchTerm}%,sender_name.ilike.%${searchTerm}%`);

      pageQuery = pageQuery.order(sortColumn, { ascending }).range(pageStart, pageEnd);

      const { data, error } = await pageQuery;
      if (error) throw error;

      senders.push(...(data || []));

      // If we got fewer rows than requested, no more pages
      if (!data || data.length < PAGE_SIZE) break;
    }

    // Build a map of email -> list of names to identify senders with multiple names
    const emailToNames = new Map<string, string[]>();
    for (const sender of (senders || [])) {
      const email = sender.sender_email;
      const name = sender.sender_name || sender.sender_email;
      if (!emailToNames.has(email)) {
        emailToNames.set(email, []);
      }
      const names = emailToNames.get(email)!;
      if (!names.includes(name)) {
        names.push(name);
      }
    }

    // Transform response with hasMultipleNames and relatedSenderNames
    const response: SenderResponse[] = (senders || []).map((sender: any) => {
      const email = sender.sender_email;
      const name = sender.sender_name || sender.sender_email;
      const allNames = emailToNames.get(email) || [name];
      const hasMultipleNames = allNames.length > 1;
      const relatedSenderNames = hasMultipleNames
        ? allNames.filter(n => n !== name)
        : [];

      return {
        id: sender.id,
        email: sender.sender_email,
        name,
        emailCount: sender.email_count,
        unreadCount: sender.unread_count,
        firstEmailDate: sender.first_email_date,
        lastEmailDate: sender.last_email_date,
        unsubscribeLink: sender.unsubscribe_link,
        mailtoUnsubscribeLink: sender.mailto_unsubscribe_link || null,
        hasUnsubscribe: sender.has_unsubscribe,
        hasOneClickUnsubscribe: sender.has_one_click_unsubscribe ?? false,
        isNewsletter: sender.is_newsletter,
        isPromotional: sender.is_promotional,
        emailAccountId: sender.email_account_id,
        accountEmail: sender.email_accounts?.email || '',
        hasMultipleNames,
        relatedSenderNames,
      };
    });

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('email_senders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.userId);

    return res.status(200).json({
      senders: response,
      pagination: {
        total: totalCount || response.length,
        limit: limit ? parseInt(limit as string) : response.length,
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
