-- Fix Admin Subscription to Unlimited
-- Run this in Supabase SQL Editor

-- First, let's see your user record and any existing subscriptions
SELECT 'USER RECORD:' as info;
SELECT id, email, first_name, last_name, created_at FROM users WHERE email = 'christopher1collin@gmail.com';

SELECT 'EXISTING SUBSCRIPTIONS:' as info;
SELECT * FROM subscriptions;

-- Delete any existing subscription for your account (to avoid duplicates)
DELETE FROM subscriptions
WHERE user_id IN (SELECT id FROM users WHERE email = 'christopher1collin@gmail.com');

-- Insert the correct unlimited subscription (without stripe_subscription_id)
INSERT INTO subscriptions (user_id, plan, status, price, period, next_billing_date, created_at, updated_at)
SELECT
  id,
  'unlimited',
  'active',
  0,
  'monthly',
  (CURRENT_DATE + INTERVAL '1 month')::date,
  NOW(),
  NOW()
FROM users
WHERE email = 'christopher1collin@gmail.com';

-- Verify the subscription was created
SELECT 'VERIFICATION:' as info;
SELECT
  u.email,
  s.plan,
  s.status,
  s.price,
  s.period,
  s.next_billing_date
FROM subscriptions s
JOIN users u ON s.user_id = u.id
WHERE u.email = 'christopher1collin@gmail.com';
