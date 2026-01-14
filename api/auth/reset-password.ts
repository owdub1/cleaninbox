import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { isExpired, validatePassword, hashPassword } from '../lib/auth-utils.js';
import { sendPasswordChangedEmail } from '../../src/lib/email.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        error: 'Password does not meet requirements',
        errors: passwordValidation.errors
      });
    }

    // Find the reset token
    const { data: resetToken, error: tokenError } = await supabase
      .from('password_reset_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (tokenError || !resetToken) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Check if token was already used
    if (resetToken.used) {
      return res.status(400).json({ error: 'This reset link has already been used' });
    }

    // Check if token is expired
    if (isExpired(new Date(resetToken.expires_at))) {
      return res.status(400).json({ error: 'This reset link has expired. Please request a new one.' });
    }

    // Get the user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, first_name')
      .eq('id', resetToken.user_id)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Hash the new password
    const passwordHash = await hashPassword(password, 10);

    // Check if password was used recently (last 5 passwords)
    const { data: passwordUsed } = await supabase
      .rpc('is_password_used_recently', {
        p_user_id: user.id,
        p_password_hash: passwordHash,
        p_history_limit: 5
      });

    if (passwordUsed) {
      return res.status(400).json({
        error: 'Password was used recently. Please choose a different password that you haven\'t used before.'
      });
    }

    // Start transaction-like operations
    // 1. Mark token as used
    const { error: updateTokenError } = await supabase
      .from('password_reset_tokens')
      .update({ used: true, used_at: new Date().toISOString() })
      .eq('id', resetToken.id);

    if (updateTokenError) {
      console.error('Error marking token as used:', updateTokenError);
      return res.status(500).json({ error: 'Failed to reset password' });
    }

    // 2. Update user's password
    const { error: updatePasswordError } = await supabase
      .from('users')
      .update({
        password_hash: passwordHash,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updatePasswordError) {
      console.error('Error updating password:', updatePasswordError);
      return res.status(500).json({ error: 'Failed to reset password' });
    }

    // 2a. Add password to history
    await supabase
      .rpc('add_password_to_history', {
        p_user_id: user.id,
        p_password_hash: passwordHash,
        p_max_history: 10
      });

    // 3. Revoke all existing refresh tokens for security
    await supabase
      .from('refresh_tokens')
      .update({ revoked: true, revoked_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('revoked', false);

    // 4. Reset failed login attempts
    await supabase
      .from('users')
      .update({
        failed_login_attempts: 0,
        locked_until: null
      })
      .eq('id', user.id);

    // Send confirmation email
    await sendPasswordChangedEmail(user.email, user.first_name || 'there');

    return res.status(200).json({
      message: 'Password reset successfully',
      email: user.email
    });

  } catch (error: any) {
    console.error('Reset password error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
