-- Migration: Group Senders by Name + Email with Individual Email Storage
-- Run this migration to add the emails table and update email_senders constraint

-- Phase 1: Add emails table to store individual emails
CREATE TABLE IF NOT EXISTS emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gmail_message_id VARCHAR(255) NOT NULL,
  email_account_id UUID NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
  sender_email VARCHAR(255) NOT NULL,
  sender_name VARCHAR(255) NOT NULL,
  subject TEXT,
  snippet TEXT,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_unread BOOLEAN DEFAULT FALSE,
  thread_id VARCHAR(255),
  labels TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(email_account_id, gmail_message_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_emails_account_sender_email ON emails(email_account_id, sender_email);
CREATE INDEX IF NOT EXISTS idx_emails_account_sender_name ON emails(email_account_id, sender_name);
CREATE INDEX IF NOT EXISTS idx_emails_account_received ON emails(email_account_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_emails_account_sender_combo ON emails(email_account_id, sender_email, sender_name);

-- Enable RLS
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;

-- RLS Policies for emails (need to join through email_accounts to get user_id)
DROP POLICY IF EXISTS "Users can view their own emails" ON emails;
DROP POLICY IF EXISTS "Users can insert their own emails" ON emails;
DROP POLICY IF EXISTS "Users can update their own emails" ON emails;
DROP POLICY IF EXISTS "Users can delete their own emails" ON emails;

CREATE POLICY "Users can view their own emails"
  ON emails FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM email_accounts
      WHERE email_accounts.id = emails.email_account_id
      AND email_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own emails"
  ON emails FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM email_accounts
      WHERE email_accounts.id = emails.email_account_id
      AND email_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own emails"
  ON emails FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM email_accounts
      WHERE email_accounts.id = emails.email_account_id
      AND email_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own emails"
  ON emails FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM email_accounts
      WHERE email_accounts.id = emails.email_account_id
      AND email_accounts.user_id = auth.uid()
    )
  );

-- Phase 2: Update email_senders constraint to include sender_name
-- First normalize NULL/empty sender names to use sender_email
UPDATE email_senders
SET sender_name = sender_email
WHERE sender_name IS NULL OR sender_name = '';

-- Drop old unique constraint (if exists)
ALTER TABLE email_senders
DROP CONSTRAINT IF EXISTS email_senders_email_account_id_sender_email_key;

-- Add new unique constraint including sender_name
ALTER TABLE email_senders
ADD CONSTRAINT email_senders_email_account_id_sender_email_sender_name_key
UNIQUE(email_account_id, sender_email, sender_name);

-- Add index for the new composite lookup
CREATE INDEX IF NOT EXISTS idx_email_senders_account_email_name
ON email_senders(email_account_id, sender_email, sender_name);
