/**
 * Dashboard Stats Endpoint
 *
 * GET /api/dashboard/stats
 *
 * Returns user dashboard statistics.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, AuthenticatedRequest } from '../lib/auth-middleware.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', process.env.VITE_APP_URL || 'http://localhost:5173');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = requireAuth(req as AuthenticatedRequest, res);
  if (!user) return;

  try {
    // Get email accounts
    const { data: accounts } = await supabase
      .from('email_accounts')
      .select('id')
      .eq('user_id', user.userId);

    // Get total emails synced from activity_log (all time)
    // Parse from description: "Synced X emails from Y senders"
    const { data: syncLogs } = await supabase
      .from('activity_log')
      .select('description')
      .eq('user_id', user.userId)
      .eq('action_type', 'email_sync');

    const totalScanned = syncLogs?.reduce((sum, log) => {
      // Extract number from "Synced 952 emails from 296 senders"
      const match = log.description?.match(/Synced ([\d,]+) emails/);
      if (match) {
        const count = parseInt(match[1].replace(/,/g, ''), 10);
        return sum + count;
      }
      return sum;
    }, 0) || 0;

    // Get unsubscribed count from user_stats
    const { data: stats } = await supabase
      .from('user_stats')
      .select('unsubscribed')
      .eq('user_id', user.userId)
      .single();

    return res.status(200).json({
      emailsProcessed: totalScanned,
      unsubscribed: stats?.unsubscribed || 0,
      emailAccounts: accounts?.length || 0
    });

  } catch (error: any) {
    console.error('Dashboard stats error:', error);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
}
