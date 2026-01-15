import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import {
  comparePassword,
  getClientIP,
  getUserAgent
} from '../lib/auth-utils.js';
import { sendAccountLockedEmail } from '../../src/lib/email.js';
import { rateLimit, RateLimitPresets } from '../lib/rate-limiter.js';
import { issueCSRFToken } from '../lib/csrf.js';
import { verifyTurnstile } from '../lib/turnstile.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-this';
const MAX_LOGIN_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10);
const LOCKOUT_DURATION_MINUTES = parseInt(process.env.LOCKOUT_DURATION_MINUTES || '30', 10);

// Rate limit: 30 requests per minute
const limiter = rateLimit(RateLimitPresets.STANDARD);

/**
 * Hash a refresh token for secure storage
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate a refresh token for a user
 */
async function generateRefreshToken(userId: string, ipAddress: string, userAgent: string, rememberMe: boolean = false): Promise<string> {
  // Determine expiry based on Remember Me option
  const expiryDays = rememberMe ? 30 : 7;
  const expiryTime = rememberMe ? '30d' : '7d';

  // Generate refresh token
  const refreshToken = jwt.sign(
    { userId },
    JWT_REFRESH_SECRET,
    { expiresIn: expiryTime }
  );

  // Hash the token for storage
  const tokenHash = hashToken(refreshToken);

  // Store in database
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

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

/**
 * Check if account is locked and unlock if lockout period has passed
 */
async function checkAndUnlockAccount(userId: string): Promise<{ locked: boolean; lockedUntil?: Date }> {
  const { data: user } = await supabase
    .from('users')
    .select('locked_until')
    .eq('id', userId)
    .single();

  if (!user || !user.locked_until) {
    return { locked: false };
  }

  const lockedUntil = new Date(user.locked_until);
  const now = new Date();

  if (lockedUntil > now) {
    return { locked: true, lockedUntil };
  }

  // Unlock account if lockout period has passed
  await supabase
    .from('users')
    .update({
      locked_until: null,
      failed_login_attempts: 0
    })
    .eq('id', userId);

  return { locked: false };
}

/**
 * Record login attempt in the database
 */
async function recordLoginAttempt(
  userId: string | null,
  email: string,
  ipAddress: string,
  userAgent: string,
  successful: boolean,
  failureReason?: string
) {
  await supabase
    .from('login_attempts')
    .insert([{
      user_id: userId,
      email,
      ip_address: ipAddress,
      user_agent: userAgent,
      successful,
      failure_reason: failureReason
    }]);
}

/**
 * Handle failed login attempt
 */
async function handleFailedLogin(userId: string, email: string, ipAddress: string, userAgent: string, reason: string) {
  // Record the failed attempt
  await recordLoginAttempt(userId, email, ipAddress, userAgent, false, reason);

  // Increment failed login attempts
  const { data: user } = await supabase
    .from('users')
    .select('failed_login_attempts, first_name')
    .eq('id', userId)
    .single();

  if (!user) return;

  const newAttempts = (user.failed_login_attempts || 0) + 1;

  if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
    // Lock the account
    const lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);

    await supabase
      .from('users')
      .update({
        failed_login_attempts: newAttempts,
        locked_until: lockedUntil.toISOString()
      })
      .eq('id', userId);

    // Send account locked email
    const { data: userData } = await supabase
      .from('users')
      .select('email, first_name')
      .eq('id', userId)
      .single();

    if (userData) {
      await sendAccountLockedEmail({
        to: userData.email,
        firstName: userData.first_name || 'there',
        lockedUntil
      });
    }
  } else {
    // Just increment the counter
    await supabase
      .from('users')
      .update({ failed_login_attempts: newAttempts })
      .eq('id', userId);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Apply rate limiting
  if (limiter(req, res)) return;

  const ipAddress = getClientIP(req);
  const userAgent = getUserAgent(req);

  try {
    const { email, password, rememberMe, captchaToken } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Verify Turnstile CAPTCHA
    const captchaValid = await verifyTurnstile(captchaToken, req);
    if (!captchaValid) {
      return res.status(400).json({
        error: 'CAPTCHA verification failed. Please try again.',
        code: 'CAPTCHA_FAILED'
      });
    }

    // Get user by email
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !user) {
      // Record failed attempt with null user_id (user not found)
      await recordLoginAttempt(null, email, ipAddress, userAgent, false, 'user_not_found');
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check if account is locked
    const lockStatus = await checkAndUnlockAccount(user.id);
    if (lockStatus.locked) {
      const minutesLeft = Math.ceil((lockStatus.lockedUntil!.getTime() - Date.now()) / (1000 * 60));
      await recordLoginAttempt(user.id, email, ipAddress, userAgent, false, 'account_locked');
      return res.status(403).json({
        error: `Account is temporarily locked due to multiple failed login attempts. Please try again in ${minutesLeft} minute(s).`,
        lockedUntil: lockStatus.lockedUntil
      });
    }

    // Check if account is active (not suspended/deleted)
    const { data: isActiveResult, error: activeError } = await supabase
      .rpc('is_user_active', { p_user_id: user.id });

    if (activeError || !isActiveResult) {
      await recordLoginAttempt(user.id, email, ipAddress, userAgent, false, `account_${user.status}`);

      // Provide specific error message based on account status
      if (user.status === 'suspended') {
        return res.status(403).json({
          error: user.suspended_until
            ? `Account suspended until ${new Date(user.suspended_until).toLocaleString()}. Reason: ${user.suspension_reason || 'Policy violation'}`
            : `Account suspended. Reason: ${user.suspension_reason || 'Policy violation'}. Please contact support.`,
          code: 'ACCOUNT_SUSPENDED'
        });
      } else if (user.status === 'deleted') {
        return res.status(403).json({
          error: 'This account has been deleted.',
          code: 'ACCOUNT_DELETED'
        });
      } else if (user.status === 'pending_verification') {
        return res.status(403).json({
          error: 'Please verify your email address before logging in.',
          code: 'EMAIL_NOT_VERIFIED'
        });
      }

      return res.status(403).json({
        error: 'Account is not active. Please contact support.',
        code: 'ACCOUNT_INACTIVE'
      });
    }

    // Verify password
    const passwordMatch = await comparePassword(password, user.password_hash);

    if (!passwordMatch) {
      await handleFailedLogin(user.id, email, ipAddress, userAgent, 'invalid_password');
      const attemptsLeft = MAX_LOGIN_ATTEMPTS - (user.failed_login_attempts || 0) - 1;

      if (attemptsLeft > 0 && attemptsLeft <= 2) {
        return res.status(401).json({
          error: `Invalid email or password. ${attemptsLeft} attempt(s) remaining before account lockout.`
        });
      }

      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Successful login - reset failed attempts and update last login
    await supabase
      .from('users')
      .update({
        failed_login_attempts: 0,
        locked_until: null,
        last_login_at: new Date().toISOString(),
        last_login_ip: ipAddress
      })
      .eq('id', user.id);

    // Record successful login
    await recordLoginAttempt(user.id, email, ipAddress, userAgent, true, undefined);

    // Generate JWT (short-lived access token - 15 minutes)
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        emailVerified: user.email_verified
      },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    // Generate refresh token (7 or 30 days based on Remember Me)
    const refreshToken = await generateRefreshToken(user.id, ipAddress, userAgent, rememberMe || false);

    // Issue CSRF token for security
    const csrfToken = issueCSRFToken(res);

    return res.status(200).json({
      token,
      refreshToken,
      csrfToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        emailVerified: user.email_verified
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
