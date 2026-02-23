-- Create Mock Account for CleanInbox
-- This script creates a demo account with sample data

-- First, clean up if the account already exists
DELETE FROM email_accounts WHERE user_id IN (SELECT id FROM users WHERE email = 'demo@cleaninbox.com');
DELETE FROM subscriptions WHERE user_id IN (SELECT id FROM users WHERE email = 'demo@cleaninbox.com');
DELETE FROM user_stats WHERE user_id IN (SELECT id FROM users WHERE email = 'demo@cleaninbox.com');
DELETE FROM users WHERE email = 'demo@cleaninbox.com';

-- Create the mock user
-- Password: demo1234 (hashed with bcrypt, 10 rounds)
INSERT INTO users (email, password_hash, first_name, last_name)
VALUES (
  'demo@cleaninbox.com',
  '$2b$10$D.djcvmiUPFFEOag4q.lROb9sC6MCIAwfs09WzOEmmq6uARvQN.E2',
  'Demo',
  'User'
);

-- Get the user_id for subsequent inserts
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get the user ID
  SELECT id INTO v_user_id FROM users WHERE email = 'demo@cleaninbox.com';

  -- Create user stats (trigger should create this, but we'll update it)
  INSERT INTO user_stats (user_id, emails_processed, unsubscribed)
  VALUES (v_user_id, 1850, 132)
  ON CONFLICT (user_id) DO UPDATE
  SET emails_processed = 1850, unsubscribed = 132;

  -- Create subscription
  INSERT INTO subscriptions (user_id, plan, status, price, period, email_limit, next_billing_date)
  VALUES (
    v_user_id,
    'Free',
    'active',
    0.00,
    'monthly',
    1000,
    NOW() + INTERVAL '30 days'
  );

  -- Create mock email accounts
  INSERT INTO email_accounts (user_id, email, provider, total_emails, processed_emails, unsubscribed, last_synced)
  VALUES
    (v_user_id, 'demo@gmail.com', 'gmail', 1523, 1200, 87, NOW()),
    (v_user_id, 'demo@outlook.com', 'outlook', 892, 650, 45, NOW() - INTERVAL '2 hours');

END $$;

-- Display results
SELECT
  'Mock account created!' as status,
  'demo@cleaninbox.com' as email,
  'demo1234' as password,
  'Free' as plan;
