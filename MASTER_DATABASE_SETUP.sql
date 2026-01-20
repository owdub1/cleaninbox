-- ========================================
-- MASTER DATABASE SETUP FOR CLEANINBOX
-- ========================================
-- Run this script in Supabase SQL Editor to set up all required tables
-- for the authentication system
--
-- IMPORTANT: Run this AFTER you have the basic users table created
-- ========================================

-- ========================================
-- STEP 1: Update Users Table (Add Security Columns)
-- ========================================

-- Add security-related columns to users table if they don't exist
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_login_ip VARCHAR(45);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS oauth_only BOOLEAN DEFAULT FALSE;

-- Make password_hash nullable for OAuth-only accounts
ALTER TABLE public.users ALTER COLUMN password_hash DROP NOT NULL;

-- ========================================
-- STEP 2: Security Tables
-- ========================================

-- Email Verification Tokens Table
CREATE TABLE IF NOT EXISTS public.email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON public.email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON public.email_verification_tokens(user_id);

-- Password Reset Tokens Table
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE,
  ip_address VARCHAR(45),
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON public.password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON public.password_reset_tokens(user_id);

-- Login Attempts Table (for brute force protection)
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  user_agent TEXT,
  successful BOOLEAN NOT NULL,
  failure_reason VARCHAR(100),
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_user_id ON public.login_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON public.login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_address ON public.login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_attempts_attempted_at ON public.login_attempts(attempted_at);

-- Refresh Tokens Table
CREATE TABLE IF NOT EXISTS public.refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON public.refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON public.refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON public.refresh_tokens(expires_at);

-- ========================================
-- STEP 3: Password History Table
-- ========================================

CREATE TABLE IF NOT EXISTS public.password_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_history_user_id ON public.password_history(user_id);
CREATE INDEX IF NOT EXISTS idx_password_history_created_at ON public.password_history(created_at);

-- ========================================
-- STEP 4: OAuth Providers Table
-- ========================================

CREATE TABLE IF NOT EXISTS public.oauth_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  provider_user_id VARCHAR(255) NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  profile_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(provider, provider_user_id)
);

CREATE INDEX IF NOT EXISTS idx_oauth_providers_user_id ON public.oauth_providers(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_providers_provider ON public.oauth_providers(provider);

-- ========================================
-- STEP 5: Disable RLS (Using Service Role Key)
-- ========================================

ALTER TABLE email_verification_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts DISABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE password_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_providers DISABLE ROW LEVEL SECURITY;

-- ========================================
-- STEP 6: Database Functions
-- ========================================

-- Function: Clean up expired tokens
CREATE OR REPLACE FUNCTION public.cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM public.email_verification_tokens
  WHERE expires_at < NOW() - INTERVAL '7 days';

  DELETE FROM public.password_reset_tokens
  WHERE expires_at < NOW() - INTERVAL '7 days';

  DELETE FROM public.login_attempts
  WHERE attempted_at < NOW() - INTERVAL '90 days';

  DELETE FROM public.refresh_tokens
  WHERE revoked = TRUE AND revoked_at < NOW() - INTERVAL '30 days';

  DELETE FROM public.refresh_tokens
  WHERE expires_at < NOW() AND revoked = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Revoke all refresh tokens for a user
CREATE OR REPLACE FUNCTION public.revoke_user_refresh_tokens(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.refresh_tokens
  SET revoked = TRUE, revoked_at = NOW()
  WHERE user_id = p_user_id AND revoked = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if account is locked
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
    UPDATE public.users
    SET locked_until = NULL, failed_login_attempts = 0
    WHERE id = p_user_id;
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Add password to history
CREATE OR REPLACE FUNCTION public.add_password_to_history(
  p_user_id UUID,
  p_password_hash VARCHAR,
  p_max_history INT DEFAULT 10
) RETURNS VOID AS $$
BEGIN
  -- Insert new password hash
  INSERT INTO public.password_history (user_id, password_hash)
  VALUES (p_user_id, p_password_hash);

  -- Keep only the most recent passwords (up to p_max_history)
  DELETE FROM public.password_history
  WHERE id IN (
    SELECT id FROM public.password_history
    WHERE user_id = p_user_id
    ORDER BY created_at DESC
    OFFSET p_max_history
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if password was used recently
CREATE OR REPLACE FUNCTION public.is_password_used_recently(
  p_user_id UUID,
  p_password_hash VARCHAR,
  p_history_limit INT DEFAULT 5
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM (
      SELECT password_hash FROM public.password_history
      WHERE user_id = p_user_id
      ORDER BY created_at DESC
      LIMIT p_history_limit
    ) recent_passwords
    WHERE password_hash = p_password_hash
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Update OAuth providers timestamp
CREATE OR REPLACE FUNCTION update_oauth_providers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS oauth_providers_updated_at ON public.oauth_providers;
CREATE TRIGGER oauth_providers_updated_at
  BEFORE UPDATE ON public.oauth_providers
  FOR EACH ROW
  EXECUTE FUNCTION update_oauth_providers_updated_at();

-- Function: Find or create OAuth user
CREATE OR REPLACE FUNCTION public.find_or_create_oauth_user(
  p_email VARCHAR,
  p_first_name VARCHAR,
  p_last_name VARCHAR,
  p_provider VARCHAR,
  p_provider_user_id VARCHAR,
  p_profile_data JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Check if user exists by email
  SELECT id INTO v_user_id FROM public.users WHERE email = p_email;

  IF v_user_id IS NULL THEN
    -- Create new user (OAuth-only, no password)
    INSERT INTO public.users (email, first_name, last_name, email_verified, oauth_only)
    VALUES (p_email, p_first_name, p_last_name, TRUE, TRUE)
    RETURNING id INTO v_user_id;
  END IF;

  -- Check if OAuth provider connection exists
  IF NOT EXISTS (
    SELECT 1 FROM public.oauth_providers
    WHERE user_id = v_user_id AND provider = p_provider
  ) THEN
    -- Create OAuth provider connection
    INSERT INTO public.oauth_providers (user_id, provider, provider_user_id, profile_data)
    VALUES (v_user_id, p_provider, p_provider_user_id, p_profile_data);
  ELSE
    -- Update existing OAuth provider connection
    UPDATE public.oauth_providers
    SET provider_user_id = p_provider_user_id,
        profile_data = p_profile_data,
        updated_at = NOW()
    WHERE user_id = v_user_id AND provider = p_provider;
  END IF;

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- STEP 7: Add Comments
-- ========================================

COMMENT ON TABLE email_verification_tokens IS 'Stores tokens for email verification during signup';
COMMENT ON TABLE password_reset_tokens IS 'Stores tokens for password reset requests';
COMMENT ON TABLE login_attempts IS 'Tracks all login attempts for security monitoring and brute force protection';
COMMENT ON TABLE refresh_tokens IS 'Stores refresh tokens for JWT session management';
COMMENT ON TABLE password_history IS 'Stores password hashes to prevent password reuse';
COMMENT ON TABLE oauth_providers IS 'Links users to OAuth provider accounts (Google, GitHub, etc.)';

COMMENT ON FUNCTION cleanup_expired_tokens IS 'Cleanup function to remove old tokens and attempts - should be run via cron';
COMMENT ON FUNCTION revoke_user_refresh_tokens IS 'Revokes all active refresh tokens for a user (useful for forced logout)';
COMMENT ON FUNCTION is_account_locked IS 'Checks if a user account is currently locked due to failed login attempts';
COMMENT ON FUNCTION add_password_to_history IS 'Adds a password hash to user history and maintains max history limit';
COMMENT ON FUNCTION is_password_used_recently IS 'Checks if a password hash was used in recent history';
COMMENT ON FUNCTION find_or_create_oauth_user IS 'Finds existing user by email or creates new OAuth user';

-- ========================================
-- VERIFICATION
-- ========================================

-- Run this to verify all tables were created:
DO $$
DECLARE
  missing_tables TEXT[] := ARRAY[]::TEXT[];
  tbl_name TEXT;
BEGIN
  -- Check for required tables
  FOR tbl_name IN
    SELECT unnest(ARRAY[
      'users',
      'email_verification_tokens',
      'password_reset_tokens',
      'login_attempts',
      'refresh_tokens',
      'password_history',
      'oauth_providers'
    ])
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND information_schema.tables.table_name = tbl_name
    ) THEN
      missing_tables := array_append(missing_tables, tbl_name);
    END IF;
  END LOOP;

  IF array_length(missing_tables, 1) > 0 THEN
    RAISE NOTICE 'WARNING: Missing tables: %', array_to_string(missing_tables, ', ');
  ELSE
    RAISE NOTICE 'SUCCESS: All required tables exist!';
  END IF;
END $$;

-- ========================================
-- SETUP COMPLETE!
-- ========================================
-- Next steps:
-- 1. Configure environment variables for OAuth (Google/GitHub client IDs)
-- 2. Test signup, login, OAuth flows
-- 3. Monitor login_attempts table for security
-- 4. Set up cron job to run cleanup_expired_tokens() monthly
-- ========================================
