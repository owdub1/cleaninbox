-- Outlook Integration Schema Migration
-- Run this on Supabase SQL Editor

-- 1. Create outlook_oauth_tokens table (mirrors gmail_oauth_tokens)
CREATE TABLE IF NOT EXISTS outlook_oauth_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_account_id UUID NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
  outlook_email TEXT NOT NULL,
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT NOT NULL,
  token_expiry TIMESTAMPTZ NOT NULL,
  scopes TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, outlook_email)
);

-- 2. Add outlook_email column to email_accounts (nullable, only set for Outlook accounts)
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS outlook_email TEXT;

-- 3. Add delta_link column to email_accounts (for Outlook incremental sync token)
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS delta_link TEXT;

-- 4. Enable RLS on outlook_oauth_tokens
ALTER TABLE outlook_oauth_tokens ENABLE ROW LEVEL SECURITY;

-- 5. RLS policies for outlook_oauth_tokens (same pattern as gmail_oauth_tokens)
CREATE POLICY "Users can view their own Outlook tokens"
  ON outlook_oauth_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Outlook tokens"
  ON outlook_oauth_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Outlook tokens"
  ON outlook_oauth_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Outlook tokens"
  ON outlook_oauth_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- 6. Service role bypass for outlook_oauth_tokens (needed for server-side operations)
CREATE POLICY "Service role full access to Outlook tokens"
  ON outlook_oauth_tokens FOR ALL
  USING (auth.role() = 'service_role');

-- 7. Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_outlook_oauth_tokens_user_email
  ON outlook_oauth_tokens(user_id, outlook_email);

CREATE INDEX IF NOT EXISTS idx_email_accounts_outlook_email
  ON email_accounts(outlook_email) WHERE outlook_email IS NOT NULL;
