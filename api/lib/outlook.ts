/**
 * Outlook OAuth and Token Management Utilities
 *
 * Handles:
 * - Microsoft OAuth URL generation
 * - Token exchange and refresh
 * - AES-256-GCM encryption for stored tokens
 * - JWT state parameter for CSRF protection
 */

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import { requireEnv } from './env.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Environment variables
const OUTLOOK_CLIENT_ID = process.env.OUTLOOK_CLIENT_ID;
const OUTLOOK_CLIENT_SECRET = process.env.OUTLOOK_CLIENT_SECRET;
const OUTLOOK_TOKEN_ENCRYPTION_KEY = process.env.OUTLOOK_TOKEN_ENCRYPTION_KEY;
const JWT_SECRET = requireEnv('JWT_SECRET');
const API_URL = process.env.API_URL || 'https://cleaninbox.ca';
const APP_URL = process.env.VITE_APP_URL || process.env.FRONTEND_URL || 'https://cleaninbox.ca';

// Microsoft OAuth scopes
const OUTLOOK_SCOPES = [
  'offline_access',
  'User.Read',
  'Mail.Read',
  'Mail.ReadWrite',
  'Mail.Send'
];

export interface OutlookTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export interface OutlookProfile {
  id: string;
  email: string;
  displayName?: string;
}

/**
 * Encrypt a string using AES-256-GCM
 */
export function encryptToken(plaintext: string): string {
  if (!OUTLOOK_TOKEN_ENCRYPTION_KEY) {
    throw new Error('OUTLOOK_TOKEN_ENCRYPTION_KEY is not configured');
  }

  const key = crypto.scryptSync(OUTLOOK_TOKEN_ENCRYPTION_KEY, 'outlook-salt', 32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt a string using AES-256-GCM
 */
export function decryptToken(encryptedData: string): string {
  if (!OUTLOOK_TOKEN_ENCRYPTION_KEY) {
    throw new Error('OUTLOOK_TOKEN_ENCRYPTION_KEY is not configured');
  }

  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];

  const key = crypto.scryptSync(OUTLOOK_TOKEN_ENCRYPTION_KEY, 'outlook-salt', 32);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Generate OAuth state parameter with JWT for CSRF protection
 */
export function generateOutlookOAuthState(userId: string): string {
  return jwt.sign(
    { userId, purpose: 'outlook_oauth' },
    JWT_SECRET,
    { expiresIn: '10m' }
  );
}

/**
 * Verify and decode OAuth state parameter
 */
export function verifyOutlookOAuthState(state: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(state, JWT_SECRET) as any;
    if (decoded.purpose !== 'outlook_oauth') {
      return null;
    }
    return { userId: decoded.userId };
  } catch {
    return null;
  }
}

/**
 * Generate Microsoft OAuth authorization URL
 */
export function getOutlookAuthUrl(state: string): string {
  if (!OUTLOOK_CLIENT_ID) {
    throw new Error('OUTLOOK_CLIENT_ID is not configured');
  }

  const redirectUri = `${API_URL}/api/outlook/callback`;

  const params = new URLSearchParams({
    client_id: OUTLOOK_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: OUTLOOK_SCOPES.join(' '),
    response_mode: 'query',
    prompt: 'consent',
    state: state
  });

  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeOutlookCodeForTokens(code: string): Promise<OutlookTokens> {
  if (!OUTLOOK_CLIENT_ID || !OUTLOOK_CLIENT_SECRET) {
    throw new Error('Outlook OAuth credentials not configured');
  }

  const redirectUri = `${API_URL}/api/outlook/callback`;

  const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: OUTLOOK_CLIENT_ID,
      client_secret: OUTLOOK_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code for tokens: ${error}`);
  }

  return await response.json() as OutlookTokens;
}

/**
 * Refresh an access token using refresh token
 */
export async function refreshOutlookAccessToken(refreshToken: string): Promise<OutlookTokens> {
  if (!OUTLOOK_CLIENT_ID || !OUTLOOK_CLIENT_SECRET) {
    throw new Error('Outlook OAuth credentials not configured');
  }

  const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: OUTLOOK_CLIENT_ID,
      client_secret: OUTLOOK_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      scope: OUTLOOK_SCOPES.join(' '),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh access token: ${error}`);
  }

  const tokens = await response.json() as OutlookTokens;
  // Microsoft may or may not return a new refresh_token; preserve original if not
  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token || refreshToken,
    expires_in: tokens.expires_in,
    token_type: tokens.token_type,
    scope: tokens.scope
  };
}

/**
 * Get Outlook user profile from access token
 */
export async function getOutlookProfile(accessToken: string): Promise<OutlookProfile> {
  const response = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Outlook user profile');
  }

  const data = await response.json() as {
    id: string;
    mail?: string;
    userPrincipalName: string;
    displayName?: string;
  };

  return {
    id: data.id,
    email: (data.mail || data.userPrincipalName).toLowerCase(),
    displayName: data.displayName,
  };
}

/**
 * Store encrypted OAuth tokens in database
 */
export async function storeOutlookOAuthTokens(
  userId: string,
  emailAccountId: string,
  outlookEmail: string,
  tokens: OutlookTokens
): Promise<{ id: string }> {
  const encryptedAccessToken = encryptToken(tokens.access_token);
  const encryptedRefreshToken = encryptToken(tokens.refresh_token);
  const tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000);

  const { data, error } = await supabase
    .from('outlook_oauth_tokens')
    .upsert({
      user_id: userId,
      email_account_id: emailAccountId,
      outlook_email: outlookEmail,
      access_token_encrypted: encryptedAccessToken,
      refresh_token_encrypted: encryptedRefreshToken,
      token_expiry: tokenExpiry.toISOString(),
      scopes: OUTLOOK_SCOPES,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,outlook_email'
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to store OAuth tokens: ${error.message}`);
  }

  return data;
}

/**
 * Get valid access token for user, refreshing if necessary
 */
export async function getValidOutlookAccessToken(
  userId: string,
  outlookEmail: string
): Promise<{ accessToken: string; tokenId: string }> {
  const { data: tokenData, error } = await supabase
    .from('outlook_oauth_tokens')
    .select('*')
    .eq('user_id', userId)
    .eq('outlook_email', outlookEmail)
    .single();

  if (error || !tokenData) {
    throw new Error('Outlook not connected');
  }

  const tokenExpiry = new Date(tokenData.token_expiry);
  const now = new Date();

  // If token is still valid (with 5 minute buffer)
  if (tokenExpiry.getTime() > now.getTime() + 5 * 60 * 1000) {
    return {
      accessToken: decryptToken(tokenData.access_token_encrypted),
      tokenId: tokenData.id
    };
  }

  // Token expired, refresh it
  const refreshToken = decryptToken(tokenData.refresh_token_encrypted);
  const newTokens = await refreshOutlookAccessToken(refreshToken);

  const encryptedAccessToken = encryptToken(newTokens.access_token);
  const encryptedRefreshToken = encryptToken(newTokens.refresh_token);
  const newExpiry = new Date(Date.now() + newTokens.expires_in * 1000);

  await supabase
    .from('outlook_oauth_tokens')
    .update({
      access_token_encrypted: encryptedAccessToken,
      refresh_token_encrypted: encryptedRefreshToken,
      token_expiry: newExpiry.toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', tokenData.id);

  return {
    accessToken: newTokens.access_token,
    tokenId: tokenData.id
  };
}

/**
 * Delete OAuth tokens for a user's Outlook account
 */
export async function deleteOutlookOAuthTokens(
  userId: string,
  outlookEmail: string
): Promise<void> {
  // Delete from database (Microsoft doesn't have a simple token revocation endpoint)
  const { error } = await supabase
    .from('outlook_oauth_tokens')
    .delete()
    .eq('user_id', userId)
    .eq('outlook_email', outlookEmail);

  if (error) {
    throw new Error(`Failed to delete OAuth tokens: ${error.message}`);
  }
}
