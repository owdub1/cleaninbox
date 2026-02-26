/**
 * Sync Progress Endpoint
 *
 * GET /api/emails/sync-progress?email=<email>
 *
 * Lightweight endpoint polled every 2s during sync to get real-time progress.
 * Returns { total: number | null, current: number | null }
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

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const limitResult = await limiter(req, res);
  if (limitResult) return;

  const authReq = req as AuthenticatedRequest;
  const authResult = requireAuth(authReq, res);
  if (authResult) return;

  const email = req.query.email as string;
  if (!email) {
    return res.status(400).json({ error: 'email parameter required' });
  }

  const userId = authReq.user!.userId;

  const { data: account } = await supabase
    .from('email_accounts')
    .select('sync_progress_total, sync_progress_current')
    .eq('user_id', userId)
    .eq('email', email)
    .single();

  return res.status(200).json({
    total: account?.sync_progress_total ?? null,
    current: account?.sync_progress_current ?? null,
  });
}

export default handler;
