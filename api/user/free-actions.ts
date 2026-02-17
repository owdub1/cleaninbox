/**
 * Free Actions Endpoint
 *
 * GET /api/user/free-actions
 *
 * Returns the authenticated user's free trial usage.
 * Paid users get { used: 0, limit: -1, remaining: -1 } (unlimited).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, AuthenticatedRequest } from '../lib/auth-middleware.js';
import { FREE_TRIAL_LIMIT, getFreeTrialUsage } from '../lib/free-trial.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = requireAuth(req as AuthenticatedRequest, res);
  if (!user) return;

  try {
    // Check if user is paid
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan, status')
      .eq('user_id', user.userId)
      .single();

    const isPaid = !!subscription &&
      subscription.plan.toLowerCase() !== 'free' &&
      (subscription.status === 'active' || subscription.status === 'trialing');

    if (isPaid) {
      return res.status(200).json({
        used: 0,
        limit: -1,
        remaining: -1,
        isPaid: true,
      });
    }

    // Free user - get usage
    const used = await getFreeTrialUsage(supabase, user.email);
    const remaining = Math.max(0, FREE_TRIAL_LIMIT - used);

    return res.status(200).json({
      used,
      limit: FREE_TRIAL_LIMIT,
      remaining,
      isPaid: false,
    });

  } catch (error: any) {
    console.error('Free actions error:', error);
    return res.status(500).json({ error: 'Failed to get free trial status' });
  }
}
