/**
 * Google OAuth Callback Endpoint
 *
 * GET /api/auth/oauth/callback
 *
 * Handles the OAuth callback from Google for user sign-in/sign-up.
 * Creates a new user account or logs in existing user.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { rateLimit, RateLimitPresets } from '../../lib/rate-limiter.js';
import { getClientIP, getUserAgent } from '../../lib/auth-utils.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-this';
const API_URL = process.env.API_URL || process.env.RAILWAY_PUBLIC_DOMAIN
  ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
  : 'http://localhost:3001';
const APP_URL = process.env.VITE_APP_URL || 'http://localhost:5173';

const limiter = rateLimit(RateLimitPresets.STANDARD);

interface GoogleProfile {
  id: string;
  email: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  verified_email?: boolean;
}

/**
 * Verify OAuth state parameter
 */
function verifyAuthState(state: string): boolean {
  try {
    const decoded = jwt.verify(state, JWT_SECRET) as any;
    return decoded.purpose === 'google_auth';
  } catch {
    return false;
  }
}

/**
 * Exchange authorization code for tokens
 */
async function exchangeCodeForTokens(code: string): Promise<{ access_token: string }> {
  const redirectUri = `${API_URL}/api/auth/oauth/callback`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: GMAIL_CLIENT_ID!,
      client_secret: GMAIL_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code for tokens: ${error}`);
  }

  return await response.json();
}

/**
 * Get user profile from Google
 */
async function getGoogleProfile(accessToken: string): Promise<GoogleProfile> {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Google user profile');
  }

  return await response.json();
}

/**
 * Hash a token for secure storage
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate refresh token and store in database
 */
async function generateRefreshToken(
  userId: string,
  ipAddress: string,
  userAgent: string
): Promise<string> {
  const refreshToken = jwt.sign(
    { userId },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await supabase
    .from('refresh_tokens')
    .insert([{
      user_id: userId,
      token_hash: tokenHash,
      expires_at: expiresAt.toISOString(),
      ip_address: ipAddress,
      user_agent: userAgent
    }]);

  return refreshToken;
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
  if (limiter(req, res)) return;

  const { code, state, error: oauthError } = req.query;
  const ipAddress = getClientIP(req);
  const userAgent = getUserAgent(req);

  // Handle OAuth errors from Google
  if (oauthError) {
    console.error('Google OAuth error:', oauthError);
    return res.redirect(`${APP_URL}/login?error=oauth_denied`);
  }

  // Validate required parameters
  if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
    return res.redirect(`${APP_URL}/login?error=invalid_callback`);
  }

  try {
    // Verify state parameter (CSRF protection)
    if (!verifyAuthState(state)) {
      return res.redirect(`${APP_URL}/login?error=invalid_state`);
    }

    // Check OAuth credentials are configured
    if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET) {
      throw new Error('Google OAuth credentials not configured');
    }

    // Exchange authorization code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Get user profile from Google
    const profile = await getGoogleProfile(tokens.access_token);

    if (!profile.email) {
      return res.redirect(`${APP_URL}/login?error=no_email`);
    }

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', profile.email.toLowerCase())
      .single();

    let user;

    if (existingUser) {
      // User exists - update last login info
      user = existingUser;

      // Update last login and mark email as verified (if signed up with password previously)
      await supabase
        .from('users')
        .update({
          last_login_at: new Date().toISOString(),
          last_login_ip: ipAddress,
          email_verified: true
        })
        .eq('id', user.id);

      // Check if account is active
      const { data: isActiveResult } = await supabase
        .rpc('is_user_active', { p_user_id: user.id });

      if (!isActiveResult) {
        if (user.status === 'suspended') {
          return res.redirect(`${APP_URL}/login?error=account_suspended`);
        } else if (user.status === 'deleted') {
          return res.redirect(`${APP_URL}/login?error=account_deleted`);
        }
        return res.redirect(`${APP_URL}/login?error=account_inactive`);
      }

      // Check if OAuth provider connection exists for this user
      const { data: existingOAuth } = await supabase
        .from('oauth_providers')
        .select('id')
        .eq('user_id', user.id)
        .eq('provider', 'google')
        .single();

      if (existingOAuth) {
        // Update existing connection
        await supabase
          .from('oauth_providers')
          .update({
            provider_user_id: profile.id,
            profile_data: {
              name: profile.name,
              picture: profile.picture
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', existingOAuth.id);
      } else {
        // Create new connection
        await supabase
          .from('oauth_providers')
          .insert([{
            user_id: user.id,
            provider: 'google',
            provider_user_id: profile.id,
            profile_data: {
              name: profile.name,
              picture: profile.picture
            }
          }]);
      }

    } else {
      // Create new user (OAuth-only account)
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([{
          email: profile.email.toLowerCase(),
          first_name: profile.given_name || profile.name?.split(' ')[0] || null,
          last_name: profile.family_name || profile.name?.split(' ').slice(1).join(' ') || null,
          email_verified: true, // Google emails are verified
          status: 'active',
          oauth_only: true
        }])
        .select()
        .single();

      if (createError) {
        console.error('Failed to create user:', createError);
        return res.redirect(`${APP_URL}/login?error=signup_failed`);
      }

      user = newUser;

      // Create OAuth provider connection
      await supabase
        .from('oauth_providers')
        .insert([{
          user_id: user.id,
          provider: 'google',
          provider_user_id: profile.id,
          profile_data: {
            name: profile.name,
            picture: profile.picture
          }
        }]);

      // Record login attempt
      await supabase
        .from('login_attempts')
        .insert([{
          user_id: user.id,
          email: profile.email,
          ip_address: ipAddress,
          user_agent: userAgent,
          successful: true,
          failure_reason: null
        }]);
    }

    // Generate JWT access token (15 minutes)
    const accessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        emailVerified: true
      },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    // Generate refresh token (7 days)
    const refreshToken = await generateRefreshToken(user.id, ipAddress, userAgent);

    // Redirect to app with tokens in URL hash (fragment)
    // The frontend will extract these and store them
    const redirectUrl = new URL(`${APP_URL}/oauth/callback`);
    redirectUrl.hash = `token=${accessToken}&refreshToken=${refreshToken}&userId=${user.id}&email=${encodeURIComponent(user.email)}&firstName=${encodeURIComponent(user.first_name || '')}&lastName=${encodeURIComponent(user.last_name || '')}`;

    return res.redirect(redirectUrl.toString());

  } catch (error: any) {
    console.error('Google OAuth callback error:', error);
    return res.redirect(`${APP_URL}/login?error=callback_failed`);
  }
}
