-- Add sync progress tracking columns to email_accounts
-- Used by the frontend to poll real-time sync progress (e.g., "Syncing 400 of 7,000 emails...")
-- Both NULL when no sync is in progress. Separate from total_emails/processed_emails (dashboard stats).

ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS sync_progress_total integer;
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS sync_progress_current integer;
