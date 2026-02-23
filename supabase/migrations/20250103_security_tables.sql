-- Security Tables Schema for CleanInbox Authentication System
-- This file contains all security-related tables for email verification,
-- password resets, login tracking, and refresh tokens

-- ========================================
-- Email Verification Tokens Table
-- ========================================
CREATE TABLE IF NOT EXISTS public.email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON public.email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON public.email_verification_tokens(user_id);

-- ========================================
-- Password Reset Tokens Table
-- ========================================
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE,
  ip_address VARCHAR(45), -- IPv6 max length
  user_agent TEXT
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON public.password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON public.password_reset_tokens(user_id);

-- ========================================
-- Login Attempts Table (for brute force protection)
-- ========================================
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE, -- NULL if user not found
  email VARCHAR(255) NOT NULL, -- Store email even if user doesn't exist
  ip_address VARCHAR(45) NOT NULL,
  user_agent TEXT,
  successful BOOLEAN NOT NULL,
  failure_reason VARCHAR(100), -- 'invalid_credentials', 'account_locked', 'email_not_verified', etc.
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_login_attempts_user_id ON public.login_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON public.login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_address ON public.login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_attempts_attempted_at ON public.login_attempts(attempted_at);

-- ========================================
-- Refresh Tokens Table
-- ========================================
CREATE TABLE IF NOT EXISTS public.refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) UNIQUE NOT NULL, -- Store hash, not actual token
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON public.refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON public.refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON public.refresh_tokens(expires_at);

-- ========================================
-- Row Level Security (RLS)
-- ========================================

-- Disable RLS for now (we're using service role key in API)
-- In production, you may want to enable RLS and create appropriate policies

ALTER TABLE email_verification_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts DISABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens DISABLE ROW LEVEL SECURITY;

-- ========================================
-- Cleanup Functions
-- ========================================

-- Function to clean up expired tokens (run via cron job)
CREATE OR REPLACE FUNCTION public.cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
  -- Delete expired email verification tokens older than 7 days
  DELETE FROM public.email_verification_tokens
  WHERE expires_at < NOW() - INTERVAL '7 days';

  -- Delete expired password reset tokens older than 7 days
  DELETE FROM public.password_reset_tokens
  WHERE expires_at < NOW() - INTERVAL '7 days';

  -- Delete old login attempts older than 90 days
  DELETE FROM public.login_attempts
  WHERE attempted_at < NOW() - INTERVAL '90 days';

  -- Delete revoked refresh tokens older than 30 days
  DELETE FROM public.refresh_tokens
  WHERE revoked = TRUE AND revoked_at < NOW() - INTERVAL '30 days';

  -- Delete expired refresh tokens
  DELETE FROM public.refresh_tokens
  WHERE expires_at < NOW() AND revoked = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- Helper Functions
-- ========================================

-- Function to revoke all refresh tokens for a user
CREATE OR REPLACE FUNCTION public.revoke_user_refresh_tokens(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.refresh_tokens
  SET revoked = TRUE, revoked_at = NOW()
  WHERE user_id = p_user_id AND revoked = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if account is locked
CREATE OR REPLACE FUNCTION public.is_account_locked(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_locked_until TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT locked_until INTO v_locked_until
  FROM public.users
  WHERE id = p_user_id;

  IF v_locked_until IS NULL THEN
    RETURN FALSE;
  END IF;

  IF v_locked_until > NOW() THEN
    RETURN TRUE;
  ELSE
    -- Unlock account if lockout period has passed
    UPDATE public.users
    SET locked_until = NULL, failed_login_attempts = 0
    WHERE id = p_user_id;
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- Comments for documentation
-- ========================================

COMMENT ON TABLE email_verification_tokens IS 'Stores tokens for email verification during signup';
COMMENT ON TABLE password_reset_tokens IS 'Stores tokens for password reset requests';
COMMENT ON TABLE login_attempts IS 'Tracks all login attempts for security monitoring and brute force protection';
COMMENT ON TABLE refresh_tokens IS 'Stores refresh tokens for JWT session management';
COMMENT ON FUNCTION cleanup_expired_tokens IS 'Cleanup function to remove old tokens and attempts - should be run via cron';
COMMENT ON FUNCTION revoke_user_refresh_tokens IS 'Revokes all active refresh tokens for a user (useful for forced logout)';
COMMENT ON FUNCTION is_account_locked IS 'Checks if a user account is currently locked due to failed login attempts';
