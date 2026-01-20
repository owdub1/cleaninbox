# Database Setup Verification for CleanInbox

This document tracks all database tables used by the authentication system and ensures Supabase integration is complete.

## ✅ Database Tables Used by Authentication

### Core Tables

#### 1. **users** (Main user table)
- **Source**: `supabase-schema.sql` or `custom-auth-schema.sql`
- **Writes**:
  - ✅ Signup: Creates new user
  - ✅ Login: Updates `last_login_at`, `last_login_ip`, `failed_login_attempts`, `locked_until`
  - ✅ Email verification: Sets `email_verified = true`
  - ✅ Password reset: Updates `password_hash`
  - ✅ OAuth: Creates user if doesn't exist via `find_or_create_oauth_user()`
- **Critical columns**:
  - `id`, `email`, `password_hash`, `first_name`, `last_name`
  - `email_verified`, `failed_login_attempts`, `locked_until`
  - `last_login_at`, `last_login_ip`
  - `oauth_only` (for OAuth-only accounts)

#### 2. **login_attempts** (Security monitoring)
- **Source**: `security-tables-schema.sql`
- **Writes**:
  - ✅ Every login attempt (successful or failed)
  - Records: `user_id`, `email`, `ip_address`, `user_agent`, `successful`, `failure_reason`
- **Purpose**: Track login patterns, detect brute force attacks
- **Retention**: 90 days (auto-cleanup)

#### 3. **refresh_tokens** (Session management)
- **Source**: `security-tables-schema.sql`
- **Writes**:
  - ✅ Login: Creates new refresh token
  - ✅ OAuth login: Creates 30-day refresh token
  - ✅ Refresh endpoint: Validates existing tokens
  - ✅ Password reset: Revokes all tokens for user
- **Stores**: Hashed tokens (SHA-256), not plaintext
- **Expiry**: 7 days (normal) or 30 days (Remember Me / OAuth)

#### 4. **email_verification_tokens** (Email verification)
- **Source**: `security-tables-schema.sql`
- **Writes**:
  - ✅ Signup: Creates verification token
  - ✅ Resend verification: Creates new token
- **Used by**: `/api/auth/verify-email`
- **Expiry**: 24 hours

#### 5. **password_reset_tokens** (Password recovery)
- **Source**: `security-tables-schema.sql`
- **Writes**:
  - ✅ Forgot password: Creates reset token
- **Used by**: `/api/auth/reset-password`
- **Expiry**: 1 hour

#### 6. **password_history** (Prevent password reuse)
- **Source**: `password-history-schema.sql`
- **Writes**:
  - ✅ Signup: Stores initial password hash
  - ✅ Password reset: Stores new password hash
- **Function**: `add_password_to_history()` - Stores up to 10 hashes
- **Function**: `is_password_used_recently()` - Checks last 5 passwords

#### 7. **oauth_providers** (OAuth connections)
- **Source**: `oauth-providers-schema.sql`
- **Writes**:
  - ✅ Google login: Creates/updates provider link
  - ✅ GitHub login: Creates/updates provider link
- **Stores**: `provider`, `provider_user_id`, `profile_data` (picture, etc.)
- **Function**: `find_or_create_oauth_user()` - Find existing user or create new one

---

## 🔧 Required Database Setup Steps

### Step 1: Run Core Schema (if not done)
```sql
-- Run in Supabase SQL Editor
-- File: supabase-schema.sql or custom-auth-schema.sql
```

### Step 2: Run Security Tables Schema
```sql
-- File: security-tables-schema.sql
-- Creates: login_attempts, refresh_tokens, email_verification_tokens, password_reset_tokens
```

### Step 3: Update Users Table Security Columns
```sql
-- File: update-users-security-columns.sql
-- Adds: failed_login_attempts, locked_until, last_login_at, last_login_ip
```

### Step 4: Run Password History Schema
```sql
-- File: password-history-schema.sql
-- Creates: password_history table + helper functions
```

### Step 5: Run OAuth Providers Schema
```sql
-- File: oauth-providers-schema.sql
-- Creates: oauth_providers table + find_or_create_oauth_user() function
-- Adds: oauth_only column to users table
```

---

## 🧪 Database Verification Queries

Run these in Supabase SQL Editor to verify setup:

### Check all required tables exist:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'users',
  'login_attempts',
  'refresh_tokens',
  'email_verification_tokens',
  'password_reset_tokens',
  'password_history',
  'oauth_providers'
)
ORDER BY table_name;
```

### Check required user columns exist:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'users'
AND column_name IN (
  'email_verified',
  'failed_login_attempts',
  'locked_until',
  'last_login_at',
  'last_login_ip',
  'oauth_only'
);
```

### Check required functions exist:
```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'add_password_to_history',
  'is_password_used_recently',
  'find_or_create_oauth_user',
  'cleanup_expired_tokens',
  'revoke_user_refresh_tokens',
  'is_account_locked'
);
```

---

## 📊 What Gets Written to Database

### When a user signs up (email/password):
1. **users** table: New user record
2. **password_history** table: Initial password hash
3. **email_verification_tokens** table: Verification token
4. **refresh_tokens** table: Session refresh token (created at login)

### When a user logs in (email/password):
1. **login_attempts** table: Login attempt record (success/fail)
2. **users** table: Updates `last_login_at`, `last_login_ip`, resets `failed_login_attempts`
3. **refresh_tokens** table: New refresh token (7 or 30 days)

### When a user signs in with Google/GitHub:
1. **users** table: Creates user if doesn't exist (via `find_or_create_oauth_user()`)
2. **oauth_providers** table: Links provider to user account
3. **refresh_tokens** table: Creates 30-day refresh token
4. **users** table: Updates `last_login_at`, `last_login_ip`

### When a user resets password:
1. **password_reset_tokens** table: Creates reset token (forgot password)
2. **password_reset_tokens** table: Marks token as used (reset complete)
3. **password_history** table: Checks if password was used recently
4. **users** table: Updates `password_hash`
5. **password_history** table: Stores new password hash
6. **refresh_tokens** table: Revokes all existing tokens

---

## ⚠️ IMPORTANT: Rate Limiting Limitation

**Current Issue**: Rate limiting uses **in-memory storage** (not Supabase).

**Location**: `/api/lib/rate-limiter.ts`

**Problem**:
- Serverless functions have no persistent memory
- Rate limits reset on cold starts
- Not shared across multiple Vercel instances

**Solution Options**:
1. **Use Vercel KV (Redis)** - Recommended for production
2. **Use Supabase as rate limit store** - Create `rate_limits` table
3. **Use Upstash Redis** - Free tier available
4. **Keep in-memory** - Only for development/testing

**Note**: For production, you MUST implement persistent rate limiting or use a service like Cloudflare that provides built-in rate limiting.

---

## 🧹 Maintenance

### Cleanup Old Data (run monthly via Supabase cron)
```sql
-- Clean up expired tokens and old attempts
SELECT cleanup_expired_tokens();
```

This will:
- Delete expired email verification tokens (>7 days old)
- Delete expired password reset tokens (>7 days old)
- Delete old login attempts (>90 days old)
- Delete revoked refresh tokens (>30 days old)
- Delete expired refresh tokens

---

## ✅ Quick Verification Checklist

Before going live, verify:

- [ ] All 7 tables exist in Supabase
- [ ] All 6 database functions exist
- [ ] Users table has all required columns
- [ ] Test signup creates records in: `users`, `password_history`, `email_verification_tokens`
- [ ] Test login creates records in: `login_attempts`, `refresh_tokens`
- [ ] Test OAuth creates records in: `users`, `oauth_providers`, `refresh_tokens`
- [ ] Test password reset creates/updates records in: `password_reset_tokens`, `password_history`
- [ ] All environment variables configured (OAuth keys, JWT secrets, etc.)

---

## 🔍 Monitoring Queries

### See recent login attempts:
```sql
SELECT email, successful, failure_reason, attempted_at
FROM login_attempts
ORDER BY attempted_at DESC
LIMIT 20;
```

### See active refresh tokens:
```sql
SELECT u.email, rt.expires_at, rt.created_at
FROM refresh_tokens rt
JOIN users u ON rt.user_id = u.id
WHERE rt.revoked = false AND rt.expires_at > NOW()
ORDER BY rt.created_at DESC;
```

### See OAuth connections:
```sql
SELECT u.email, op.provider, op.created_at
FROM oauth_providers op
JOIN users u ON op.user_id = u.id
ORDER BY op.created_at DESC;
```

### See password change history:
```sql
SELECT u.email, ph.created_at
FROM password_history ph
JOIN users u ON ph.user_id = u.id
ORDER BY ph.created_at DESC
LIMIT 20;
```
