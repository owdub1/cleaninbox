import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { generateToken, getExpirationDate, getClientIP, getUserAgent } from '../lib/auth-utils.js';
import { sendPasswordResetEmail } from '../../src/lib/email.js';
import { rateLimit, RateLimitPresets } from '../lib/rate-limiter.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const APP_URL = process.env.VITE_APP_URL || 'http://localhost:5173';
const PASSWORD_RESET_EXPIRY = process.env.PASSWORD_RESET_TOKEN_EXPIRY || '1h';

// Rate limit: 3 requests per hour
const limiter = rateLimit(RateLimitPresets.PASSWORD_RESET);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Apply rate limiting
  if (await limiter(req, res)) return;

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
