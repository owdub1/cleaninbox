import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-this';

/**
 * Hash a refresh token for secure storage
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    // Verify the refresh token
    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    // Hash the token to look it up in database
    const tokenHash = hashToken(refreshToken);

    // Check if refresh token exists and is valid
    const { data: tokenRecord, error: tokenError } = await supabase
      .from('refresh_tokens')
      .select('*')
      .eq('token_hash', tokenHash)
      .eq('user_id', decoded.userId)
      .single();

    if (tokenError || !tokenRecord) {
      return res.status(401).json({ error: 'Refresh token not found' });
    }

    // Check if token is revoked
    if (tokenRecord.revoked) {
      return res.status(401).json({ error: 'Refresh token has been revoked' });
    }

    // Check if token is expired
    if (new Date(tokenRecord.expires_at) < new Date()) {
      return res.status(401).json({ error: 'Refresh token has expired' });
    }

    // Get user details
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, email_verified, subscription, locked_until, status, suspended_until, suspension_reason')
      .eq('id', decoded.userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user account is active (not suspended/deleted)
    const { data: isActiveResult } = await supabase
      .rpc('is_user_active', { p_user_id: user.id });

    if (!isActiveResult) {
      // Provide specific error message based on account status
      if (user.status === 'suspended') {
        return res.status(403).json({
          error: user.suspended_until
            ? `Account suspended until ${new Date(user.suspended_until).toLocaleString()}.`
            : 'Account suspended. Please contact support.',
          code: 'ACCOUNT_SUSPENDED'
        });
      } else if (user.status === 'deleted') {
        return res.status(403).json({
          error: 'This account has been deleted.',
          code: 'ACCOUNT_DELETED'
        });
      } else if (user.status === 'pending_verification') {
        return res.status(403).json({
          error: 'Please verify your email address.',
          code: 'EMAIL_NOT_VERIFIED'
        });
      }

      return res.status(403).json({
        error: 'Account is not active.',
        code: 'ACCOUNT_INACTIVE'
      });
    }

    // Check if user account is locked (brute force protection)
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(403).json({
        error: 'Account is locked',
        lockedUntil: user.locked_until
      });
    }

    // Generate new access token (7 days - long-lived for better UX)
    const newAccessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        emailVerified: user.email_verified
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Optionally rotate refresh token (best practice for security)
    // For now, we'll keep the same refresh token
    // In a more secure implementation, you would:
    // 1. Revoke the old refresh token
    // 2. Generate a new refresh token
    // 3. Return both new access and refresh tokens

    return res.status(200).json({
      token: newAccessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        emailVerified: user.email_verified,
        subscription: user.subscription
      }
    });

  } catch (error: any) {
    console.error('Token refresh error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
