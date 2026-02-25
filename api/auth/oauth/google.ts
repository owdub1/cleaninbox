/**
 * Google OAuth Sign-In Initiation Endpoint
 *
 * GET /api/auth/oauth/google
 *
 * Initiates Google OAuth flow for user sign-in/sign-up.
 * This is separate from Gmail email access - just for authentication.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { rateLimit, RateLimitPresets } from '../../lib/rate-limiter.js';
import { requireEnv } from '../../lib/env.js';

const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const JWT_SECRET = requireEnv('JWT_SECRET');
const API_URL = process.env.API_URL || process.env.VITE_APP_URL || 'https://cleaninbox.ca';

if (!process.env.API_URL) {
  console.warn('API_URL env var not set — OAuth redirect_uri will use fallback:', API_URL);
}

// Minimal scopes for sign-in (just profile and email)
const GOOGLE_AUTH_SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'openid'
];

const limiter = rateLimit(RateLimitPresets.STANDARD);

/**
 * Generate OAuth state parameter with JWT for CSRF protection
 */
function generateAuthState(): string {
  // Include a random nonce for additional security
  const nonce = crypto.randomBytes(16).toString('hex');
  return jwt.sign(
    { purpose: 'google_auth', nonce },
    JWT_SECRET,
    { expiresIn: '10m' }
  );
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting
  if (await limiter(req, res)) return;

  try {
    if (!GMAIL_CLIENT_ID) {
      throw new Error('Google OAuth is not configured');
    }

    // Generate state parameter
    const state = generateAuthState();

    // Build OAuth URL - callback goes to auth callback endpoint
    const redirectUri = `${API_URL}/api/auth/oauth/callback`;

    const params = new URLSearchParams({
      client_id: GMAIL_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: GOOGLE_AUTH_SCOPES.join(' '),
      access_type: 'online', // We don't need refresh token for sign-in
      prompt: 'select_account', // Let user choose account
      state: state
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    // Redirect user directly to Google
    return res.redirect(302, authUrl);

  } catch (error: any) {
    console.error('Google auth error:', error);

    // Redirect to login with error
    const APP_URL = process.env.VITE_APP_URL || '';
    return res.redirect(`${APP_URL}/login?error=oauth_config_error`);
  }
}
