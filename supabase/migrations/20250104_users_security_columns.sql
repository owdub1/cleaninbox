-- Add security columns to users table
-- This migration adds email verification, account lockout, and audit columns

-- Add email verification columns
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP WITH TIME ZONE;

-- Add account lockout columns
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;

-- Add audit columns
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_login_ip VARCHAR(45);

-- Add index for faster email verification checks
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON public.users(email_verified);

-- Add index for locked accounts
CREATE INDEX IF NOT EXISTS idx_users_locked_until ON public.users(locked_until) WHERE locked_until IS NOT NULL;

-- Comments for documentation
COMMENT ON COLUMN users.email_verified IS 'Whether the user has verified their email address';
COMMENT ON COLUMN users.email_verified_at IS 'Timestamp when the email was verified';
COMMENT ON COLUMN users.locked_until IS 'Timestamp until which the account is locked (NULL if not locked)';
COMMENT ON COLUMN users.failed_login_attempts IS 'Number of consecutive failed login attempts';
COMMENT ON COLUMN users.last_login_at IS 'Timestamp of the user''s last successful login';
COMMENT ON COLUMN users.last_login_ip IS 'IP address of the user''s last successful login';

-- Update existing users to have email_verified = true (optional: grandfathering)
-- Comment out if you want existing users to verify their emails
UPDATE public.users
SET email_verified = TRUE, email_verified_at = created_at
WHERE email_verified IS NULL OR email_verified = FALSE;
