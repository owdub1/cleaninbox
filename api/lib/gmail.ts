/**
 * Gmail OAuth and Token Management Utilities
 *
 * Handles:
 * - Gmail OAuth URL generation
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
const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const GMAIL_TOKEN_ENCRYPTION_KEY = process.env.GMAIL_TOKEN_ENCRYPTION_KEY;
const JWT_SECRET = requireEnv('JWT_SECRET');
// API_URL is where Google redirects to (backend)
const API_URL = process.env.API_URL || 'https://cleaninbox.ca';
// APP_URL is where we redirect users after OAuth (frontend)
const APP_URL = process.env.VITE_APP_URL || process.env.FRONTEND_URL || 'https://cleaninbox.ca';

// Gmail OAuth scopes
const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
];

export interface GmailTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export interface GmailProfile {
  id: string;
  email: string;
  name?: string;
  picture?: string;
}

/**
 * Encrypt a string using AES-256-GCM with random salt
 */
export function encryptToken(plaintext: string): string {
  if (!GMAIL_TOKEN_ENCRYPTION_KEY) {
    throw new Error('GMAIL_TOKEN_ENCRYPTION_KEY is not configured');
  }

  // Generate random 16-byte salt for key derivation
  const salt = crypto.randomBytes(16);

  // Derive 32-byte key from the encryption key + random salt
  const key = crypto.scryptSync(GMAIL_TOKEN_ENCRYPTION_KEY, salt, 32);

  // Generate random IV (12 bytes for GCM)
  const iv = crypto.randomBytes(12);

  // Create cipher
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  // Encrypt
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Get auth tag
  const authTag = cipher.getAuthTag();

  // Format: salt:iv:authTag:ciphertext
  return salt.toString('hex') + ':' + iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt a string using AES-256-GCM with embedded salt
 */
export function decryptToken(encryptedData: string): string {
  if (!GMAIL_TOKEN_ENCRYPTION_KEY) {
    throw new Error('GMAIL_TOKEN_ENCRYPTION_KEY is not configured');
  }

  const parts = encryptedData.split(':');
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted data format');
  }

  const salt = Buffer.from(parts[0], 'hex');
  const iv = Buffer.from(parts[1], 'hex');
  const authTag = Buffer.from(parts[2], 'hex');
  const encrypted = parts[3];

  // Derive key using the stored salt
  const key = crypto.scryptSync(GMAIL_TOKEN_ENCRYPTION_KEY, salt, 32);

  // Create decipher
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  // Decrypt
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Generate OAuth state parameter with JWT for CSRF protection
 */
export function generateOAuthState(userId: string): string {
  return jwt.sign(
    { userId, purpose: 'gmail_oauth' },
    JWT_SECRET,
    { expiresIn: '10m' }
  );
}

/**
 * Verify and decode OAuth state parameter
 */
export function verifyOAuthState(state: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(state, JWT_SECRET) as any;
    if (decoded.purpose !== 'gmail_oauth') {
      return null;
    }
    return { userId: decoded.userId };
  } catch {
    return null;
  }
}

/**
 * Generate Gmail OAuth authorization URL
 */
export function getGmailAuthUrl(state: string): string {
  if (!GMAIL_CLIENT_ID) {
    throw new Error('GMAIL_CLIENT_ID is not configured');
  }

  // Use API_URL (Railway) for the OAuth callback
  const redirectUri = `${API_URL}/api/gmail/callback`;

  const params = new URLSearchParams({
    client_id: GMAIL_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GMAIL_SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state: state
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<GmailTokens> {
  if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET) {
    throw new Error('Gmail OAuth credentials not configured');
  }

  // Use API_URL (Railway) for the OAuth callback - must match getGmailAuthUrl
  const redirectUri = `${API_URL}/api/gmail/callback`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: GMAIL_CLIENT_ID,
      client_secret: GMAIL_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code for tokens: ${error}`);
  }

  return await response.json() as GmailTokens;
}

/**
 * Refresh an access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<GmailTokens> {
  if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET) {
    throw new Error('Gmail OAuth credentials not configured');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: GMAIL_CLIENT_ID,
      client_secret: GMAIL_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh access token: ${error}`);
  }

  const tokens = await response.json() as Partial<GmailTokens>;
  // Refresh response doesn't include refresh_token, preserve the original
  return {
    access_token: tokens.access_token!,
    refresh_token: refreshToken,
    expires_in: tokens.expires_in!,
    token_type: tokens.token_type!,
    scope: tokens.scope!
  };
}

/**
 * Get Gmail user profile from access token
 */
export async function getGmailProfile(accessToken: string): Promise<GmailProfile> {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Gmail user profile');
  }

  const data = await response.json() as { id: string; email: string; name?: string; picture?: string };

  return {
    id: data.id,
    email: data.email,
    name: data.name,
    picture: data.picture,
  };
}

/**
 * Revoke Gmail OAuth tokens
 */
export async function revokeTokens(accessToken: string): Promise<void> {
  const response = await fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  if (!response.ok) {
    // Token might already be revoked, log but don't throw
    console.warn('Failed to revoke token:', await response.text());
  }
}

/**
 * Store encrypted OAuth tokens in database
 */
export async function storeOAuthTokens(
  userId: string,
  emailAccountId: string,
  gmailEmail: string,
  tokens: GmailTokens
): Promise<{ id: string }> {
  const encryptedAccessToken = encryptToken(tokens.access_token);
  const encryptedRefreshToken = encryptToken(tokens.refresh_token);
  const tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000);

  const { data, error } = await supabase
    .from('gmail_oauth_tokens')
    .upsert({
      user_id: userId,
      email_account_id: emailAccountId,
      gmail_email: gmailEmail,
      access_token_encrypted: encryptedAccessToken,
      refresh_token_encrypted: encryptedRefreshToken,
      token_expiry: tokenExpiry.toISOString(),
      scopes: GMAIL_SCOPES,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,gmail_email'
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
export async function getValidAccessToken(
  userId: string,
  gmailEmail: string
): Promise<{ accessToken: string; tokenId: string }> {
  // Get stored tokens
  const { data: tokenData, error } = await supabase
    .from('gmail_oauth_tokens')
    .select('*')
    .eq('user_id', userId)
    .eq('gmail_email', gmailEmail)
    .single();

  if (error || !tokenData) {
    throw new Error('Gmail not connected');
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
  const newTokens = await refreshAccessToken(refreshToken);

  // Store new tokens
  const encryptedAccessToken = encryptToken(newTokens.access_token);
  const newExpiry = new Date(Date.now() + newTokens.expires_in * 1000);

  await supabase
    .from('gmail_oauth_tokens')
    .update({
      access_token_encrypted: encryptedAccessToken,
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
 * Delete OAuth tokens for a user's Gmail account
 */
export async function deleteOAuthTokens(
  userId: string,
  gmailEmail: string
): Promise<void> {
  // Get tokens first to revoke them
  const { data: tokenData } = await supabase
    .from('gmail_oauth_tokens')
    .select('access_token_encrypted')
    .eq('user_id', userId)
    .eq('gmail_email', gmailEmail)
    .single();

  if (tokenData) {
    // Revoke the token with Google
    try {
      const accessToken = decryptToken(tokenData.access_token_encrypted);
      await revokeTokens(accessToken);
    } catch (err) {
      console.warn('Failed to revoke token:', err);
    }
  }

  // Delete from database
  const { error } = await supabase
    .from('gmail_oauth_tokens')
    .delete()
    .eq('user_id', userId)
    .eq('gmail_email', gmailEmail);

  if (error) {
    throw new Error(`Failed to delete OAuth tokens: ${error.message}`);
  }
}
