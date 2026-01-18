/**
 * Gmail OAuth Disconnect Endpoint
 *
 * POST /api/gmail/disconnect
 *
 * Revokes Gmail OAuth tokens and disconnects the email account.
 * Requires authenticated user.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, AuthenticatedRequest } from '../lib/auth-middleware.js';
import { rateLimit, RateLimitPresets } from '../lib/rate-limiter.js';
import { deleteOAuthTokens } from '../lib/gmail.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const limiter = rateLimit(RateLimitPresets.STANDARD);

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting
  if (limiter(req, res)) return;

  // Require authentication
  const user = requireAuth(req as AuthenticatedRequest, res);
  if (!user) return;

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      error: 'Email address is required',
      code: 'MISSING_EMAIL'
    });
  }

  try {
    // Verify the email account belongs to this user
    const { data: account, error: accountError } = await supabase
      .from('email_accounts')
      .select('id, gmail_email')
      .eq('user_id', user.userId)
      .eq('email', email)
      .single();

    if (accountError || !account) {
      return res.status(404).json({
        error: 'Email account not found',
        code: 'ACCOUNT_NOT_FOUND'
      });
    }

    // Delete OAuth tokens (this also revokes with Google)
    await deleteOAuthTokens(user.userId, account.gmail_email || email);

    // Update email account status
    await supabase
      .from('email_accounts')
      .update({
        connection_status: 'disconnected',
        oauth_token_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', account.id);

    // Delete cached sender data for this account
    await supabase
      .from('email_senders')
      .delete()
      .eq('email_account_id', account.id);

    return res.status(200).json({
      success: true,
      message: 'Gmail account disconnected successfully'
    });

  } catch (error: any) {
    console.error('Gmail disconnect error:', error);
    return res.status(500).json({
      error: 'Failed to disconnect Gmail account',
      code: 'DISCONNECT_ERROR'
    });
  }
}
