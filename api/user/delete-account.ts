import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, AuthenticatedRequest } from '../lib/auth-middleware.js';
import { rateLimit, RateLimitPresets } from '../lib/rate-limiter.js';
import { comparePassword } from '../lib/auth-utils.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const limiter = rateLimit(RateLimitPresets.STRICT);

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

  try {
    const { password, confirmText } = req.body || {};

    // Fetch user to check auth method
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', user.userId)
      .single();

    if (fetchError || !userData) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Verify identity: accept password OR "DELETE" confirmation text
    if (password && userData.password_hash) {
      const passwordValid = await comparePassword(password, userData.password_hash);
      if (!passwordValid) {
        return res.status(401).json({
          error: 'Incorrect password',
          code: 'INVALID_PASSWORD'
        });
      }
    } else if (confirmText === 'DELETE') {
      // "Type DELETE to confirm" — works for all users
    } else {
      return res.status(400).json({
        error: 'Please type DELETE to confirm account deletion',
        code: 'MISSING_CONFIRM'
      });
    }

    // Get user's email account IDs for cascading deletes
    const { data: emailAccounts } = await supabase
      .from('email_accounts')
      .select('id')
      .eq('user_id', user.userId);

    const emailAccountIds = emailAccounts?.map(a => a.id) || [];

    // Delete all user data in order
    // 1. Gmail OAuth tokens
    await supabase
      .from('gmail_oauth_tokens')
      .delete()
      .eq('user_id', user.userId);

    // 2. Emails (via email accounts)
    if (emailAccountIds.length > 0) {
      await supabase
        .from('emails')
        .delete()
        .in('email_account_id', emailAccountIds);
    }

    // 3. Email senders
    await supabase
      .from('email_senders')
      .delete()
      .eq('user_id', user.userId);

    // 4. Cleanup actions
    await supabase
      .from('cleanup_actions')
      .delete()
      .eq('user_id', user.userId);

    // 5. Activity log
    await supabase
      .from('activity_log')
      .delete()
      .eq('user_id', user.userId);

    // 6. Email accounts
    await supabase
      .from('email_accounts')
      .delete()
      .eq('user_id', user.userId);

    // 7. User stats
    await supabase
      .from('user_stats')
      .delete()
      .eq('user_id', user.userId);

    // 8. Subscriptions
    await supabase
      .from('subscriptions')
      .delete()
      .eq('user_id', user.userId);

    // 9. Refresh tokens
    await supabase
      .from('refresh_tokens')
      .delete()
      .eq('user_id', user.userId);

    // 10. Password history
    await supabase
      .from('password_history')
      .delete()
      .eq('user_id', user.userId);

    // 11. Delete the user (hard delete)
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', user.userId);

    if (deleteError) {
      console.error('User delete error:', deleteError);
      return res.status(500).json({
        error: 'Failed to delete account',
        code: 'DELETE_ERROR'
      });
    }

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Delete account error:', error);
    return res.status(500).json({
      error: 'Failed to delete account',
      code: 'INTERNAL_ERROR'
    });
  }
}
