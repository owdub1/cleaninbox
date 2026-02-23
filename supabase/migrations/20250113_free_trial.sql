-- Free Trial Usage table
-- Keyed by email (not user_id) so it persists after account deletion
CREATE TABLE IF NOT EXISTS free_trial_usage (
  email TEXT PRIMARY KEY,
  actions_used INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE free_trial_usage ENABLE ROW LEVEL SECURITY;

-- Only service role can access (backend only)
-- No RLS policies needed since we use service_role key from serverless functions

-- Atomic check-and-increment RPC function
-- Returns: { allowed: boolean, actions_used: number, limit: number }
CREATE OR REPLACE FUNCTION check_and_increment_trial(
  p_email TEXT,
  p_count INTEGER,
  p_limit INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_current INTEGER;
  v_new INTEGER;
BEGIN
  -- Upsert to ensure row exists, then lock it
  INSERT INTO free_trial_usage (email, actions_used, updated_at)
  VALUES (p_email, 0, NOW())
  ON CONFLICT (email) DO NOTHING;

  -- Lock the row and get current value
  SELECT actions_used INTO v_current
  FROM free_trial_usage
  WHERE email = p_email
  FOR UPDATE;

  -- Check if increment would exceed limit
  IF v_current + p_count > p_limit THEN
    RETURN json_build_object(
      'allowed', false,
      'actions_used', v_current,
      'limit', p_limit
    );
  END IF;

  -- Increment
  v_new := v_current + p_count;
  UPDATE free_trial_usage
  SET actions_used = v_new, updated_at = NOW()
  WHERE email = p_email;

  RETURN json_build_object(
    'allowed', true,
    'actions_used', v_new,
    'limit', p_limit
  );
END;
$$;
