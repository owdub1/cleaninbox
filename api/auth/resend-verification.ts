import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { generateToken, getExpirationDate } from '../lib/auth-utils.js';
import { sendVerificationEmail } from '../lib/email.js';
import { rateLimit, RateLimitPresets } from '../lib/rate-limiter.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const APP_URL = process.env.VITE_APP_URL || '';
const EMAIL_VERIFICATION_EXPIRY = process.env.EMAIL_VERIFICATION_TOKEN_EXPIRY || '24h';

// Rate limit: 5 requests per hour
const limiter = rateLimit(RateLimitPresets.EMAIL_VERIFICATION);

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
      .select('id, email, first_name, email_verified')
      .eq('email', email)
      .single();

    if (userError || !user) {
      // Don't reveal if user exists or not for security
      return res.status(200).json({
        message: 'If an account exists with this email, a verification email will be sent.'
      });
    }

    // Check if already verified
    if (user.email_verified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    // Invalidate any existing verification tokens for this user
    await supabase
      .from('email_verification_tokens')
      .update({ used: true })
      .eq('user_id', user.id)
      .eq('used', false);

    // Generate new verification token
    const token = generateToken();
    const expiresAt = getExpirationDate(EMAIL_VERIFICATION_EXPIRY);

    // Store the token
    const { error: tokenError } = await supabase
      .from('email_verification_tokens')
      .insert([{
        user_id: user.id,
        token,
        expires_at: expiresAt.toISOString()
      }]);

    if (tokenError) {
      console.error('Error creating verification token:', tokenError);
      return res.status(500).json({ error: 'Failed to send verification email' });
    }

    // Send verification email
    const verificationUrl = `${APP_URL}/verify-email?token=${token}`;
    const emailSent = await sendVerificationEmail({
      to: user.email,
      firstName: user.first_name || 'there',
      verificationUrl
    });

    if (!emailSent) {
      console.error('Failed to send verification email');
      // Don't fail the request, token is still valid
    }

    return res.status(200).json({
      message: 'Verification email sent successfully',
      expiresAt: expiresAt.toISOString()
    });

  } catch (error: any) {
    console.error('Resend verification error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
