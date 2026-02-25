/**
 * Outlook OAuth Disconnect Endpoint
 *
 * POST /api/outlook/disconnect
 *
 * Removes Outlook OAuth tokens and disconnects the email account.
 * Requires authenticated user.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, AuthenticatedRequest } from '../lib/auth-middleware.js';
import { rateLimit, RateLimitPresets } from '../lib/rate-limiter.js';

import { deleteOutlookOAuthTokens } from '../lib/outlook.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const limiter = rateLimit(RateLimitPresets.STANDARD);

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (await limiter(req, res)) return;

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
      .select('id')
      .eq('user_id', user.userId)
      .eq('email', email)
      .single();

    if (accountError || !account) {
      return res.status(404).json({
        error: 'Email account not found',
        code: 'ACCOUNT_NOT_FOUND'
      });
    }

    // Delete OAuth tokens
    await deleteOutlookOAuthTokens(user.userId, email);

    // Update email account status
    await supabase
      .from('email_accounts')
      .update({
        connection_status: 'disconnected',
        oauth_token_id: null,
        delta_link: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', account.id);

    // Delete cached sender data for this account
    await supabase
      .from('email_senders')
      .delete()
      .eq('email_account_id', account.id);

    // Log to activity_log
    await supabase
      .from('activity_log')
      .insert({
        user_id: user.userId,
        action_type: 'account_disconnect',
        description: `Disconnected email account ${email}`,
        metadata: { email, provider: 'Outlook' }
      });

    return res.status(200).json({
      success: true,
      message: 'Outlook account disconnected successfully'
    });

  } catch (error: any) {
    console.error('Outlook disconnect error:', error);
    return res.status(500).json({
      error: 'Failed to disconnect Outlook account',
      code: 'DISCONNECT_ERROR'
    });
  }
}
