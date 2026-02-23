-- Temporarily disable RLS for testing
-- NOTE: This is not secure for production. We need to implement proper auth middleware.

ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats DISABLE ROW LEVEL SECURITY;
ALTER TABLE email_accounts DISABLE ROW LEVEL SECURITY;
