-- Migration: Hash password reset and email verification tokens
-- Previously these were stored in plaintext. Now we store SHA-256 hashes
-- (same pattern as refresh_tokens.token_hash).

-- ========================================
-- Password Reset Tokens: add token_hash, drop token
-- ========================================

-- Add the new column
ALTER TABLE public.password_reset_tokens
  ADD COLUMN IF NOT EXISTS token_hash VARCHAR(255);

-- Create index on the new column
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token_hash
  ON public.password_reset_tokens(token_hash);

-- Drop the old plaintext column and its index
DROP INDEX IF EXISTS idx_password_reset_tokens_token;
ALTER TABLE public.password_reset_tokens
  DROP COLUMN IF EXISTS token;

-- ========================================
-- Email Verification Tokens: add token_hash, drop token
-- ========================================

-- Add the new column
ALTER TABLE public.email_verification_tokens
  ADD COLUMN IF NOT EXISTS token_hash VARCHAR(255);

-- Create index on the new column
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token_hash
  ON public.email_verification_tokens(token_hash);

-- Drop the old plaintext column and its index
DROP INDEX IF EXISTS idx_email_verification_tokens_token;
ALTER TABLE public.email_verification_tokens
  DROP COLUMN IF EXISTS token;
