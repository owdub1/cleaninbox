-- Subscriptions table for tracking user subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan VARCHAR(50) NOT NULL, -- 'basic', 'pro', 'unlimited'
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'cancelled', 'expired'
  price DECIMAL(10, 2) NOT NULL,
  period VARCHAR(20) NOT NULL, -- 'monthly', 'yearly'
  email_limit INTEGER NOT NULL,
  next_billing_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS is disabled for now (we disabled it earlier)
-- ALTER TABLE subscriptions DISABLE ROW LEVEL SECURITY;
