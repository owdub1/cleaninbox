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
    // Fetch email accounts for this user
    const { data: emailAccounts, error: accountsError } = await supabase
      .from('email_accounts')
      .select('id, email, provider, connection_status, last_synced, total_emails, processed_emails, unsubscribed')
      .eq('user_id', user.userId)
      .neq('connection_status', 'disconnected');

    if (accountsError) {
      console.error('Error fetching email accounts:', accountsError);
    }

    // Fetch user stats
    const { data: userStats, error: statsError } = await supabase
      .from('user_stats')
      .select('unsubscribed, emails_processed')
      .eq('user_id', user.userId)
      .single();

    if (statsError && statsError.code !== 'PGRST116') {
      console.error('Error fetching user stats:', statsError);
    }

    return res.status(200).json({
      emailAccounts: emailAccounts || [],
      stats: userStats || { unsubscribed: 0, emails_processed: 0 }
    });
  } catch (error: any) {
    console.error('Dashboard data error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
