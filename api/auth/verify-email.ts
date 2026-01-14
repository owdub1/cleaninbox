import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { isExpired } from '../lib/auth-utils.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Token can come from query param (email link) or request body
    const token = req.method === 'GET'
      ? req.query.token as string
      : req.body.token;

    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    // Find the verification token
    const { data: verificationToken, error: tokenError } = await supabase
      .from('email_verification_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (tokenError || !verificationToken) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    // Check if token was already used
    if (verificationToken.used) {
      return res.status(400).json({ error: 'This verification link has already been used' });
    }

    // Check if token is expired
    if (isExpired(new Date(verificationToken.expires_at))) {
      return res.status(400).json({ error: 'This verification link has expired. Please request a new one.' });
    }

    // Get the user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, email_verified, first_name, last_name')
      .eq('id', verificationToken.user_id)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already verified
    if (user.email_verified) {
      return res.status(200).json({
        message: 'Email already verified',
        email: user.email,
        alreadyVerified: true
      });
    }

    // Start a transaction-like operation
    // 1. Mark token as used
    const { error: updateTokenError } = await supabase
      .from('email_verification_tokens')
      .update({ used: true, used_at: new Date().toISOString() })
      .eq('id', verificationToken.id);

    if (updateTokenError) {
      console.error('Error marking token as used:', updateTokenError);
      return res.status(500).json({ error: 'Failed to verify email' });
    }

    // 2. Update user's email_verified status
    const { error: updateUserError } = await supabase
      .from('users')
      .update({
        email_verified: true,
        email_verified_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateUserError) {
      console.error('Error updating user:', updateUserError);
      return res.status(500).json({ error: 'Failed to verify email' });
    }

    // Generate JWT token
    const jwtToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        emailVerified: true
      },
      JWT_SECRET
    );

    return res.status(200).json({
      message: 'Email verified successfully',
      verified: true,
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        emailVerified: true
      }
    });

  } catch (error: any) {
    console.error('Email verification error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
