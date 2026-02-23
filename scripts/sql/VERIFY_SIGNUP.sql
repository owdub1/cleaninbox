-- Run these queries in Supabase SQL Editor to verify signup worked

-- 1. Check if your user was created
SELECT
  id,
  email,
  first_name,
  last_name,
  email_verified,
  oauth_only,
  created_at
FROM users
ORDER BY created_at DESC
LIMIT 1;

-- 2. Check if password was stored in history
SELECT
  user_id,
  created_at
FROM password_history
ORDER BY created_at DESC
LIMIT 1;

-- 3. Check if verification email token was created
SELECT
  user_id,
  expires_at,
  used,
  created_at
FROM email_verification_tokens
ORDER BY created_at DESC
LIMIT 1;

-- 4. Check if login attempt was recorded (if you tried logging in)
SELECT
  email,
  successful,
  failure_reason,
  attempted_at
FROM login_attempts
ORDER BY attempted_at DESC
LIMIT 5;

-- 5. Check if refresh token was created (after login)
SELECT
  user_id,
  expires_at,
  revoked,
  created_at
FROM refresh_tokens
ORDER BY created_at DESC
LIMIT 1;
