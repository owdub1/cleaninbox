-- Activity log table for tracking user actions
CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL, -- 'email_sync', 'unsubscribe', 'delete', 'archive', 'account_connect', 'account_disconnect', 'subscription_change'
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}', -- Additional data like email count, sender name, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries by user
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON public.activity_log(user_id);

-- Index for faster queries by date
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON public.activity_log(created_at DESC);

-- Disable RLS for now (matches project's current approach)
ALTER TABLE public.activity_log DISABLE ROW LEVEL SECURITY;
