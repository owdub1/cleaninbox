-- Gmail Integration Schema
-- Run this migration to add Gmail OAuth and cleanup tracking tables

-- 1. Update email_accounts table with new columns
ALTER TABLE email_accounts
ADD COLUMN IF NOT EXISTS connection_status VARCHAR(20) DEFAULT 'disconnected',
ADD COLUMN IF NOT EXISTS gmail_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS oauth_token_id UUID;

-- Add check constraint for connection_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'email_accounts_connection_status_check'
  ) THEN
    ALTER TABLE email_accounts
    ADD CONSTRAINT email_accounts_connection_status_check
    CHECK (connection_status IN ('disconnected', 'connected', 'error', 'expired'));
  END IF;
END $$;

-- 2. Gmail OAuth Tokens table (encrypted storage)
CREATE TABLE IF NOT EXISTS gmail_oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_account_id UUID REFERENCES email_accounts(id) ON DELETE CASCADE,
  gmail_email VARCHAR(255) NOT NULL,
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT NOT NULL,
  token_expiry TIMESTAMP WITH TIME ZONE NOT NULL,
  scopes TEXT[] DEFAULT ARRAY['gmail.readonly', 'gmail.modify'],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, gmail_email)
);

-- 3. Email Senders table (cache sender statistics)
CREATE TABLE IF NOT EXISTS email_senders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_account_id UUID NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
  sender_email VARCHAR(255) NOT NULL,
  sender_name VARCHAR(255),
  email_count INTEGER DEFAULT 0,
  unread_count INTEGER DEFAULT 0,
  first_email_date TIMESTAMP WITH TIME ZONE,
  last_email_date TIMESTAMP WITH TIME ZONE,
  unsubscribe_link TEXT,
  has_unsubscribe BOOLEAN DEFAULT FALSE,
  is_newsletter BOOLEAN DEFAULT FALSE,
  is_promotional BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(email_account_id, sender_email)
);

-- 4. Cleanup Actions table (history and undo tracking)
CREATE TABLE IF NOT EXISTS cleanup_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_account_id UUID NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
  action_type VARCHAR(20) NOT NULL,
  sender_email VARCHAR(255) NOT NULL,
  sender_name VARCHAR(255),
  emails_affected INTEGER DEFAULT 0,
  gmail_message_ids TEXT[], -- Store message IDs for potential undo
  status VARCHAR(20) DEFAULT 'completed',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  undone_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT cleanup_actions_type_check CHECK (action_type IN ('delete', 'archive', 'unsubscribe', 'block')),
  CONSTRAINT cleanup_actions_status_check CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'undone'))
);

-- Enable Row Level Security
ALTER TABLE gmail_oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_senders ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleanup_actions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (makes script idempotent)
DROP POLICY IF EXISTS "Users can view their own OAuth tokens" ON gmail_oauth_tokens;
DROP POLICY IF EXISTS "Users can insert their own OAuth tokens" ON gmail_oauth_tokens;
DROP POLICY IF EXISTS "Users can update their own OAuth tokens" ON gmail_oauth_tokens;
DROP POLICY IF EXISTS "Users can delete their own OAuth tokens" ON gmail_oauth_tokens;

DROP POLICY IF EXISTS "Users can view their own email senders" ON email_senders;
DROP POLICY IF EXISTS "Users can insert their own email senders" ON email_senders;
DROP POLICY IF EXISTS "Users can update their own email senders" ON email_senders;
DROP POLICY IF EXISTS "Users can delete their own email senders" ON email_senders;

DROP POLICY IF EXISTS "Users can view their own cleanup actions" ON cleanup_actions;
DROP POLICY IF EXISTS "Users can insert their own cleanup actions" ON cleanup_actions;
DROP POLICY IF EXISTS "Users can update their own cleanup actions" ON cleanup_actions;

-- RLS Policies for gmail_oauth_tokens
CREATE POLICY "Users can view their own OAuth tokens"
  ON gmail_oauth_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own OAuth tokens"
  ON gmail_oauth_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own OAuth tokens"
  ON gmail_oauth_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own OAuth tokens"
  ON gmail_oauth_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for email_senders
CREATE POLICY "Users can view their own email senders"
  ON email_senders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email senders"
  ON email_senders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email senders"
  ON email_senders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own email senders"
  ON email_senders FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for cleanup_actions
CREATE POLICY "Users can view their own cleanup actions"
  ON cleanup_actions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cleanup actions"
  ON cleanup_actions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cleanup actions"
  ON cleanup_actions FOR UPDATE
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_gmail_oauth_tokens_user_id ON gmail_oauth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_gmail_oauth_tokens_email_account_id ON gmail_oauth_tokens(email_account_id);
CREATE INDEX IF NOT EXISTS idx_email_senders_user_id ON email_senders(user_id);
CREATE INDEX IF NOT EXISTS idx_email_senders_email_account_id ON email_senders(email_account_id);
CREATE INDEX IF NOT EXISTS idx_email_senders_email_count ON email_senders(email_count DESC);
CREATE INDEX IF NOT EXISTS idx_cleanup_actions_user_id ON cleanup_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_cleanup_actions_email_account_id ON cleanup_actions(email_account_id);
CREATE INDEX IF NOT EXISTS idx_cleanup_actions_created_at ON cleanup_actions(created_at DESC);

-- Update trigger for gmail_oauth_tokens
CREATE OR REPLACE FUNCTION update_gmail_oauth_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_gmail_oauth_tokens_updated_at ON gmail_oauth_tokens;
CREATE TRIGGER trigger_gmail_oauth_tokens_updated_at
  BEFORE UPDATE ON gmail_oauth_tokens
  FOR EACH ROW EXECUTE FUNCTION update_gmail_oauth_tokens_updated_at();

-- Update trigger for email_senders
CREATE OR REPLACE FUNCTION update_email_senders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_email_senders_updated_at ON email_senders;
CREATE TRIGGER trigger_email_senders_updated_at
  BEFORE UPDATE ON email_senders
  FOR EACH ROW EXECUTE FUNCTION update_email_senders_updated_at();
