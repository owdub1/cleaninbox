-- Add column to track if full orphan check has been completed for an account
-- This is needed for bootstrap: accounts that synced before the History API feature
-- need a one-time full comparison to catch any deletions that occurred before we
-- started tracking history_id

ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS full_orphan_check_done BOOLEAN DEFAULT FALSE;
