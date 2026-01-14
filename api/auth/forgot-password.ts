import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { generateToken, getExpirationDate, getClientIP, getUserAgent } from '../lib/auth-utils.js';
import { sendPasswordResetEmail } from '../../src/lib/email.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const APP_URL = process.env.VITE_APP_URL || 'http://localhost:5173';
const PASSWORD_RESET_EXPIRY = process.env.PASSWORD_RESET_TOKEN_EXPIRY || '1h';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find the user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, first_name')
      .eq('email', email)
      .single();

    // Always return success to avoid email enumeration attacks
    const successResponse = {
      message: 'If an account exists with this email, a password reset link will be sent.'
    };

    if (userError || !user) {
      // Don't reveal if user exists or not for security
      return res.status(200).json(successResponse);
    }

    // Check how many recent password reset requests
    const { data: recentResets } = await supabase
      .from('password_reset_tokens')
      .select('id')
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()); // Last hour

    if (recentResets && recentResets.length >= 3) {
      // Rate limit: max 3 requests per hour
      console.warn(`Password reset rate limit exceeded for user ${user.id}`);
      return res.status(200).json(successResponse); // Still return success for security
    }

    // Invalidate any existing unused tokens for this user
    await supabase
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('user_id', user.id)
      .eq('used', false);

    // Generate new reset token
    const token = generateToken();
    const expiresAt = getExpirationDate(PASSWORD_RESET_EXPIRY);
    const ipAddress = getClientIP(req);
    const userAgent = getUserAgent(req);

    // Store the token
    const { error: tokenError } = await supabase
      .from('password_reset_tokens')
      .insert([{
        user_id: user.id,
        token,
        expires_at: expiresAt.toISOString(),
        ip_address: ipAddress,
        user_agent: userAgent
      }]);

    if (tokenError) {
      console.error('Error creating reset token:', tokenError);
      return res.status(500).json({ error: 'Failed to send password reset email' });
    }

    // Send password reset email
    const resetUrl = `${APP_URL}/reset-password?token=${token}`;
    const emailSent = await sendPasswordResetEmail({
      to: user.email,
      firstName: user.first_name || 'there',
      resetUrl
    });

    if (!emailSent) {
      console.error('Failed to send password reset email');
      // Don't fail the request, token is still valid
    }

    return res.status(200).json({
      message: 'Password reset email sent successfully',
      expiresAt: expiresAt.toISOString()
    });

  } catch (error: any) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
