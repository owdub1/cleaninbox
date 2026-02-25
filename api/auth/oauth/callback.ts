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
import { requireEnv } from '../../lib/env.js';
import { setAuthCookies } from '../../lib/auth-cookies.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const JWT_SECRET = requireEnv('JWT_SECRET');
const JWT_REFRESH_SECRET = requireEnv('JWT_REFRESH_SECRET');
const API_URL = process.env.API_URL || 'https://cleaninbox.ca';
const APP_URL = process.env.VITE_APP_URL || 'https://cleaninbox.ca';

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

  const data = await response.json() as { access_token: string };
  return data;
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

  const data = await response.json() as GoogleProfile;
  return data;
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

  // Try to store in database (optional - don't fail if table doesn't exist)
  try {
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
  } catch (err) {
    console.warn('Could not store refresh token in database:', err);
  }

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
  if (await limiter(req, res)) return;

  const { code, state, error: oauthError } = req.query;
  const ipAddress = getClientIP(req);
  const userAgent = getUserAgent(req);

  // Handle OAuth errors from Google
  if (oauthError) {
    console.error('Google OAuth error:', oauthError);
    return res.redirect(`${APP_URL}/oauth/callback?error=oauth_denied&reason=${encodeURIComponent(String(oauthError))}`);
  }

  // Validate required parameters
  if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
    console.error('Missing OAuth parameters:', { code: !!code, state: !!state });
    return res.redirect(`${APP_URL}/oauth/callback?error=invalid_callback&reason=missing_params`);
  }

  try {
    // Verify state parameter (CSRF protection)
    if (!verifyAuthState(state)) {
      console.error('State verification failed');
      return res.redirect(`${APP_URL}/oauth/callback?error=invalid_state&reason=csrf_failed`);
    }

    // Check OAuth credentials are configured
    if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET) {
      console.error('OAuth credentials not configured');
      return res.redirect(`${APP_URL}/oauth/callback?error=oauth_config_error&reason=no_credentials`);
    }

    // Exchange authorization code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Get user profile from Google
    const profile = await getGoogleProfile(tokens.access_token);

    if (!profile.email) {
      console.error('No email in Google profile');
      return res.redirect(`${APP_URL}/oauth/callback?error=no_email&reason=profile_missing_email`);
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

      // Check if account is active (try RPC first, fallback to direct check)
      let isActive = true;
      try {
        const { data: isActiveResult, error: rpcError } = await supabase
          .rpc('is_user_active', { p_user_id: user.id });

        if (!rpcError && isActiveResult !== null) {
          isActive = isActiveResult;
        }
      } catch (rpcErr) {
        // RPC might not exist - check status directly
        console.warn('is_user_active RPC failed, checking status directly:', rpcErr);
        isActive = !user.status || user.status === 'active';
      }

      if (!isActive) {
        console.error('Account not active:', user.status);
        if (user.status === 'suspended') {
          return res.redirect(`${APP_URL}/oauth/callback?error=account_suspended&reason=status_suspended`);
        } else if (user.status === 'deleted') {
          return res.redirect(`${APP_URL}/oauth/callback?error=account_deleted&reason=status_deleted`);
        }
        return res.redirect(`${APP_URL}/oauth/callback?error=account_inactive&reason=status_inactive`);
      }

      // Try to update OAuth provider connection (optional - don't fail if table doesn't exist)
      try {
        const { data: existingOAuth } = await supabase
          .from('oauth_providers')
          .select('id')
          .eq('user_id', user.id)
          .eq('provider', 'google')
          .single();

        if (existingOAuth) {
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
      } catch (oauthErr) {
        // oauth_providers table might not exist - continue anyway
        console.warn('Could not update oauth_providers:', oauthErr);
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
          status: 'active'
          // Note: oauth_only column might not exist, so we don't set it
        }])
        .select()
        .single();

      if (createError) {
        console.error('Failed to create user:', createError);
        return res.redirect(`${APP_URL}/oauth/callback?error=signup_failed`);
      }

      user = newUser;

      // Create OAuth provider connection (optional)
      try {
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
      } catch (oauthErr) {
        console.warn('Could not create oauth_providers entry:', oauthErr);
      }

      // Record login attempt (optional)
      try {
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
      } catch (loginErr) {
        console.warn('Could not record login attempt:', loginErr);
      }
    }

    // Generate JWT access token (short-lived, refresh token handles session persistence)
    const accessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        emailVerified: true
      },
      JWT_SECRET,
      { expiresIn: (process.env.ACCESS_TOKEN_EXPIRY || '15m') as jwt.SignOptions['expiresIn'] }
    );

    // Generate refresh token (7 days)
    const refreshToken = await generateRefreshToken(user.id, ipAddress, userAgent);

    // Set HTTP-only auth cookies (no tokens in URL)
    setAuthCookies(res, { accessToken, refreshToken });

    return res.redirect(`${APP_URL}/oauth/callback?success=true`);

  } catch (error: any) {
    console.error('Google OAuth callback error:', error);
    return res.redirect(`${APP_URL}/oauth/callback?error=callback_failed`);
  }
}
