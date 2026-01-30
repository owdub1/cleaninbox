-- Add history_id column to email_accounts for Gmail History API
-- This tracks the last known historyId for fast deletion detection

ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS history_id VARCHAR(50);
