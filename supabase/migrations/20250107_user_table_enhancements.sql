-- ========================================
-- USER TABLE ENHANCEMENTS
-- ========================================
-- Run this script in Supabase SQL Editor to add role management,
-- account status tracking, soft deletes, and enhanced timestamps
--
-- SAFE TO RUN: Uses "IF NOT EXISTS" and "ADD COLUMN IF NOT EXISTS"
-- ========================================

-- ========================================
-- STEP 1: Create ENUM Types
-- ========================================

-- User roles (basic RBAC)
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('user', 'admin', 'moderator');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Account status tracking
DO $$ BEGIN
  CREATE TYPE account_status AS ENUM (
    'pending_verification',  -- Newly signed up, email not verified
    'active',                -- Fully active account
    'suspended',             -- Temporarily suspended (can be unsuspended)
    'deleted'                -- Soft deleted (can potentially be restored)
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ========================================
-- STEP 2: Add New Columns to Users Table
-- ========================================

-- Role and status
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'user';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status account_status DEFAULT 'pending_verification';

-- Suspension tracking
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS suspension_reason TEXT;

-- Soft delete tracking
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

-- Enhanced timestamp tracking
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_password_change_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Optional: Granular permissions (for future use)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb;

-- ========================================
-- STEP 3: Update Existing Data
-- ========================================

-- Set status to 'active' for users who already verified their email
UPDATE public.users
SET status = 'active'
WHERE email_verified = TRUE AND status = 'pending_verification';

-- Set email_verified_at for users who already verified
UPDATE public.users
SET email_verified_at = created_at
WHERE email_verified = TRUE AND email_verified_at IS NULL;

-- ========================================
-- STEP 4: Create Auto-Update Trigger for updated_at
-- ========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at ON public.users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- STEP 5: Create Helper Functions
-- ========================================

-- Function: Suspend a user account
CREATE OR REPLACE FUNCTION public.suspend_user(
  p_user_id UUID,
  p_duration_hours INT DEFAULT NULL,  -- NULL = indefinite suspension
  p_reason TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  UPDATE public.users
  SET
    status = 'suspended',
    suspended_at = NOW(),
    suspended_until = CASE
      WHEN p_duration_hours IS NOT NULL THEN NOW() + (p_duration_hours || ' hours')::INTERVAL
      ELSE NULL
    END,
    suspension_reason = p_reason
  WHERE id = p_user_id;

  -- Revoke all active sessions
  PERFORM revoke_user_refresh_tokens(p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Unsuspend a user account
CREATE OR REPLACE FUNCTION public.unsuspend_user(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.users
  SET
    status = 'active',
    suspended_at = NULL,
    suspended_until = NULL,
    suspension_reason = NULL
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Soft delete a user account
CREATE OR REPLACE FUNCTION public.soft_delete_user(
  p_user_id UUID,
  p_reason TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  UPDATE public.users
  SET
    status = 'deleted',
    deleted_at = NOW(),
    deletion_reason = p_reason
  WHERE id = p_user_id;

  -- Revoke all active sessions
  PERFORM revoke_user_refresh_tokens(p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Restore a soft-deleted user account
CREATE OR REPLACE FUNCTION public.restore_user(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.users
  SET
    status = CASE
      WHEN email_verified = TRUE THEN 'active'::account_status
      ELSE 'pending_verification'::account_status
    END,
    deleted_at = NULL,
    deletion_reason = NULL
  WHERE id = p_user_id AND status = 'deleted';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if user is active and allowed to login
CREATE OR REPLACE FUNCTION public.is_user_active(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_status account_status;
  v_suspended_until TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT status, suspended_until INTO v_status, v_suspended_until
  FROM public.users
  WHERE id = p_user_id;

  -- User must have 'active' status
  IF v_status != 'active' THEN
    -- Check if temporary suspension has expired
    IF v_status = 'suspended' AND v_suspended_until IS NOT NULL AND v_suspended_until < NOW() THEN
      -- Auto-unsuspend
      PERFORM unsuspend_user(p_user_id);
      RETURN TRUE;
    END IF;

    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Promote user to admin
CREATE OR REPLACE FUNCTION public.promote_user_to_admin(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.users
  SET role = 'admin'
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if user has admin privileges
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_role user_role;
BEGIN
  SELECT role INTO v_role FROM public.users WHERE id = p_user_id;
  RETURN v_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- STEP 6: Create Indexes for Performance
-- ========================================

CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON public.users(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_suspended_until ON public.users(suspended_until) WHERE suspended_until IS NOT NULL;

-- ========================================
-- STEP 7: Add Comments
-- ========================================

COMMENT ON TYPE user_role IS 'User roles for basic role-based access control';
COMMENT ON TYPE account_status IS 'Account status tracking: pending_verification, active, suspended, deleted';

COMMENT ON COLUMN users.role IS 'User role: user (default), admin, moderator';
COMMENT ON COLUMN users.status IS 'Account status: pending_verification (new), active, suspended, deleted';
COMMENT ON COLUMN users.suspended_at IS 'When the account was suspended';
COMMENT ON COLUMN users.suspended_until IS 'When the suspension expires (NULL = indefinite)';
COMMENT ON COLUMN users.suspension_reason IS 'Why the account was suspended';
COMMENT ON COLUMN users.deleted_at IS 'When the account was soft-deleted (NULL = not deleted)';
COMMENT ON COLUMN users.deletion_reason IS 'Why the account was deleted';
COMMENT ON COLUMN users.email_verified_at IS 'When the email was verified';
COMMENT ON COLUMN users.last_password_change_at IS 'When the password was last changed';
COMMENT ON COLUMN users.permissions IS 'Optional JSONB array for granular permissions (future use)';

COMMENT ON FUNCTION suspend_user IS 'Suspend a user account with optional duration and reason';
COMMENT ON FUNCTION unsuspend_user IS 'Remove suspension from a user account';
COMMENT ON FUNCTION soft_delete_user IS 'Soft delete a user account (can be restored)';
COMMENT ON FUNCTION restore_user IS 'Restore a soft-deleted user account';
COMMENT ON FUNCTION is_user_active IS 'Check if user is active and allowed to login (auto-unsuspends expired suspensions)';
COMMENT ON FUNCTION promote_user_to_admin IS 'Promote a user to admin role';
COMMENT ON FUNCTION is_admin IS 'Check if a user has admin privileges';

-- ========================================
-- VERIFICATION
-- ========================================

-- Check that all new columns exist
DO $$
DECLARE
  missing_columns TEXT[] := ARRAY[]::TEXT[];
  col_name TEXT;
BEGIN
  FOR col_name IN
    SELECT unnest(ARRAY[
      'role',
      'status',
      'suspended_at',
      'suspended_until',
      'suspension_reason',
      'deleted_at',
      'deletion_reason',
      'email_verified_at',
      'last_password_change_at',
      'permissions'
    ])
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = col_name
    ) THEN
      missing_columns := array_append(missing_columns, col_name);
    END IF;
  END LOOP;

  IF array_length(missing_columns, 1) > 0 THEN
    RAISE NOTICE 'WARNING: Missing columns in users table: %', array_to_string(missing_columns, ', ');
  ELSE
    RAISE NOTICE 'SUCCESS: All user table enhancement columns exist!';
  END IF;
END $$;

-- Check that all new functions exist
DO $$
DECLARE
  missing_functions TEXT[] := ARRAY[]::TEXT[];
  func_name TEXT;
BEGIN
  FOR func_name IN
    SELECT unnest(ARRAY[
      'suspend_user',
      'unsuspend_user',
      'soft_delete_user',
      'restore_user',
      'is_user_active',
      'promote_user_to_admin',
      'is_admin'
    ])
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.routines
      WHERE routine_schema = 'public'
      AND routine_name = func_name
    ) THEN
      missing_functions := array_append(missing_functions, func_name);
    END IF;
  END LOOP;

  IF array_length(missing_functions, 1) > 0 THEN
    RAISE NOTICE 'WARNING: Missing functions: %', array_to_string(missing_functions, ', ');
  ELSE
    RAISE NOTICE 'SUCCESS: All user management functions exist!';
  END IF;
END $$;

-- ========================================
-- SETUP COMPLETE!
-- ========================================
-- Your users table now has:
-- ✅ Role-based access control (user, admin, moderator)
-- ✅ Account status tracking (pending, active, suspended, deleted)
-- ✅ Soft delete capability
-- ✅ Suspension management (temporary or indefinite)
-- ✅ Enhanced timestamp tracking
-- ✅ Helper functions for user management
--
-- Next steps:
-- 1. Update login endpoints to check is_user_active()
-- 2. Update email verification to set status='active' and email_verified_at
-- 3. Create admin panel to manage users (suspend, delete, promote)
-- 4. Implement permission checking in API middleware
-- ========================================
