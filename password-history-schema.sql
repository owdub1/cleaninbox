-- Password History Table
-- Stores previous password hashes to prevent password reuse
-- This enhances security by ensuring users can't cycle through the same passwords

CREATE TABLE IF NOT EXISTS public.password_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_password_history_user_id ON public.password_history(user_id);
CREATE INDEX IF NOT EXISTS idx_password_history_created_at ON public.password_history(created_at);

-- Disable RLS (using service role key in API)
ALTER TABLE password_history DISABLE ROW LEVEL SECURITY;

-- Helper function to check if password was used recently
-- Returns TRUE if password hash exists in user's recent password history
CREATE OR REPLACE FUNCTION public.is_password_used_recently(
  p_user_id UUID,
  p_password_hash VARCHAR,
  p_history_limit INT DEFAULT 5
)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM (
    SELECT password_hash
    FROM public.password_history
    WHERE user_id = p_user_id
    ORDER BY created_at DESC
    LIMIT p_history_limit
  ) recent_passwords
  WHERE password_hash = p_password_hash;

  RETURN v_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add password to history and cleanup old entries
-- Keeps only the last N passwords (default: 10)
CREATE OR REPLACE FUNCTION public.add_password_to_history(
  p_user_id UUID,
  p_password_hash VARCHAR,
  p_max_history INT DEFAULT 10
)
RETURNS void AS $$
BEGIN
  -- Add new password to history
  INSERT INTO public.password_history (user_id, password_hash)
  VALUES (p_user_id, p_password_hash);

  -- Delete old entries beyond max_history
  DELETE FROM public.password_history
  WHERE id IN (
    SELECT id
    FROM public.password_history
    WHERE user_id = p_user_id
    ORDER BY created_at DESC
    OFFSET p_max_history
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON TABLE password_history IS 'Stores previous password hashes to prevent password reuse';
COMMENT ON FUNCTION is_password_used_recently IS 'Checks if a password hash exists in the user''s recent password history';
COMMENT ON FUNCTION add_password_to_history IS 'Adds a password to history and cleans up old entries beyond the maximum limit';
