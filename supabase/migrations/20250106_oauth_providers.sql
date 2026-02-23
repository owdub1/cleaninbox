-- OAuth Providers Schema
-- Stores OAuth provider connections for users (Google, GitHub, etc.)

CREATE TABLE IF NOT EXISTS public.oauth_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL, -- 'google', 'github', etc.
  provider_user_id VARCHAR(255) NOT NULL, -- OAuth provider's user ID
  access_token TEXT, -- Optional: store for API access
  refresh_token TEXT, -- Optional: for token refresh
  token_expires_at TIMESTAMP WITH TIME ZONE,
  profile_data JSONB, -- Store additional profile info (picture, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(provider, provider_user_id) -- Prevent duplicate provider connections
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_oauth_providers_user_id ON public.oauth_providers(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_providers_provider ON public.oauth_providers(provider);

-- Update users table to allow null password for OAuth-only accounts
-- (Run this if your users table requires password_hash)
-- ALTER TABLE public.users ALTER COLUMN password_hash DROP NOT NULL;

-- Add a flag to indicate if user signed up via OAuth
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS oauth_only BOOLEAN DEFAULT FALSE;

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_oauth_providers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS oauth_providers_updated_at ON public.oauth_providers;
CREATE TRIGGER oauth_providers_updated_at
  BEFORE UPDATE ON public.oauth_providers
  FOR EACH ROW
  EXECUTE FUNCTION update_oauth_providers_updated_at();

-- Function to find or create user from OAuth profile
CREATE OR REPLACE FUNCTION public.find_or_create_oauth_user(
  p_email VARCHAR,
  p_first_name VARCHAR,
  p_last_name VARCHAR,
  p_provider VARCHAR,
  p_provider_user_id VARCHAR,
  p_profile_data JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Check if user exists by email
  SELECT id INTO v_user_id FROM public.users WHERE email = p_email;

  IF v_user_id IS NULL THEN
    -- Create new user (OAuth-only, no password)
    INSERT INTO public.users (email, first_name, last_name, email_verified, oauth_only)
    VALUES (p_email, p_first_name, p_last_name, TRUE, TRUE)
    RETURNING id INTO v_user_id;
  END IF;

  -- Check if OAuth provider connection exists
  IF NOT EXISTS (
    SELECT 1 FROM public.oauth_providers
    WHERE user_id = v_user_id AND provider = p_provider
  ) THEN
    -- Create OAuth provider connection
    INSERT INTO public.oauth_providers (user_id, provider, provider_user_id, profile_data)
    VALUES (v_user_id, p_provider, p_provider_user_id, p_profile_data);
  ELSE
    -- Update existing OAuth provider connection
    UPDATE public.oauth_providers
    SET provider_user_id = p_provider_user_id,
        profile_data = p_profile_data,
        updated_at = NOW()
    WHERE user_id = v_user_id AND provider = p_provider;
  END IF;

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;
