-- Migration: Add decrement_sender_count function for orphan detection
-- This function decrements the email count for a sender and removes the sender if count reaches 0

CREATE OR REPLACE FUNCTION decrement_sender_count(
  p_account_id UUID,
  p_sender_email VARCHAR,
  p_sender_name VARCHAR,
  p_count INTEGER
) RETURNS VOID AS $$
BEGIN
  UPDATE email_senders
  SET email_count = GREATEST(0, email_count - p_count),
      updated_at = NOW()
  WHERE email_account_id = p_account_id
    AND sender_email = p_sender_email
    AND sender_name = p_sender_name;

  -- Delete sender if count reaches 0
  DELETE FROM email_senders
  WHERE email_account_id = p_account_id
    AND sender_email = p_sender_email
    AND sender_name = p_sender_name
    AND email_count <= 0;
END;
$$ LANGUAGE plpgsql;
