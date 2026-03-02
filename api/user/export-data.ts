import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, AuthenticatedRequest } from '../lib/auth-middleware.js';

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

  try {
    // Fetch all user data in parallel
    const [profileResult, accountsResult, sendersResult, subscriptionResult, statsResult, activityResult] = await Promise.all([
      supabase
        .from('users')
        .select('id, email, first_name, last_name, created_at, email_verified')
        .eq('id', user.userId)
        .single(),
      supabase
        .from('email_accounts')
        .select('email, provider, connection_status, last_synced, total_emails, processed_emails, unsubscribed, created_at')
        .eq('user_id', user.userId),
      fetchAllSenders(user.userId),
      supabase
        .from('subscriptions')
        .select('plan, status, stripe_subscription_id, current_period_start, current_period_end, created_at')
        .eq('user_id', user.userId)
        .single(),
      supabase
        .from('user_stats')
        .select('unsubscribed, emails_processed')
        .eq('user_id', user.userId)
        .single(),
      supabase
        .from('activity_log')
        .select('action, details, created_at')
        .eq('user_id', user.userId)
        .order('created_at', { ascending: false })
        .limit(500),
    ]);

    const exportData = {
      exported_at: new Date().toISOString(),
      profile: profileResult.data || null,
      email_accounts: accountsResult.data || [],
      email_senders: sendersResult,
      subscription: subscriptionResult.data || null,
      stats: statsResult.data || null,
      activity_log: activityResult.data || [],
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="cleaninbox-data-${new Date().toISOString().split('T')[0]}.json"`);
    return res.status(200).json(exportData);
  } catch (error: any) {
    console.error('Data export error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Paginate senders to avoid Supabase 1000-row limit
async function fetchAllSenders(userId: string) {
  const allSenders: any[] = [];
  const pageSize = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from('email_senders')
      .select('sender_name, sender_email, email_count, last_email_date, has_unsubscribe, is_newsletter, is_promotional, account_email')
      .eq('user_id', userId)
      .order('id')
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error('Error fetching senders page:', error);
      break;
    }

    if (!data || data.length === 0) break;
    allSenders.push(...data);
    if (data.length < pageSize) break;
    offset += pageSize;
  }

  return allSenders;
}
