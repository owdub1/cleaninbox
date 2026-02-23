-- Custom users table (not using Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update user_stats to reference our custom users table
ALTER TABLE user_stats DROP CONSTRAINT IF EXISTS user_stats_user_id_fkey;
ALTER TABLE user_stats
  ADD CONSTRAINT user_stats_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Update email_accounts to reference our custom users table
ALTER TABLE email_accounts DROP CONSTRAINT IF EXISTS email_accounts_user_id_fkey;
ALTER TABLE email_accounts
  ADD CONSTRAINT email_accounts_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS policies for users table
CREATE POLICY "Users can view their own data"
  ON users FOR SELECT
  USING (id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY "Users can update their own data"
  ON users FOR UPDATE
  USING (id = current_setting('app.current_user_id', true)::uuid);

-- Update RLS policies for user_stats to use custom users
DROP POLICY IF EXISTS "Users can view their own stats" ON user_stats;
DROP POLICY IF EXISTS "Users can insert their own stats" ON user_stats;
DROP POLICY IF EXISTS "Users can update their own stats" ON user_stats;

CREATE POLICY "Users can view their own stats"
  ON user_stats FOR SELECT
  USING (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY "Users can insert their own stats"
  ON user_stats FOR INSERT
  WITH CHECK (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY "Users can update their own stats"
  ON user_stats FOR UPDATE
  USING (user_id = current_setting('app.current_user_id', true)::uuid);

-- Update RLS policies for email_accounts to use custom users
DROP POLICY IF EXISTS "Users can view their own email accounts" ON email_accounts;
DROP POLICY IF EXISTS "Users can insert their own email accounts" ON email_accounts;
DROP POLICY IF EXISTS "Users can update their own email accounts" ON email_accounts;
DROP POLICY IF EXISTS "Users can delete their own email accounts" ON email_accounts;

CREATE POLICY "Users can view their own email accounts"
  ON email_accounts FOR SELECT
  USING (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY "Users can insert their own email accounts"
  ON email_accounts FOR INSERT
  WITH CHECK (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY "Users can update their own email accounts"
  ON email_accounts FOR UPDATE
  USING (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY "Users can delete their own email accounts"
  ON email_accounts FOR DELETE
  USING (user_id = current_setting('app.current_user_id', true)::uuid);

-- Function to auto-create user_stats when user is created
CREATE OR REPLACE FUNCTION public.handle_new_custom_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_stats (user_id, emails_processed, unsubscribed)
  VALUES (NEW.id, 0, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new custom users
DROP TRIGGER IF EXISTS on_custom_user_created ON public.users;
CREATE TRIGGER on_custom_user_created
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_custom_user();
