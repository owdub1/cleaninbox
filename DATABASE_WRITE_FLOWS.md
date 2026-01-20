# Database Write Flows - What Actually Happens in Supabase

This document shows **exactly** what gets written to your Supabase database for every user action.

---

## 📝 User Signup (Email/Password)

**Endpoint**: `POST /api/auth/signup`

### Database Writes (in order):

1. **Check users table** ✅
   ```sql
   SELECT id FROM users WHERE email = 'user@example.com'
   ```
   - Purpose: Check if user already exists

2. **INSERT into users table** ✅
   ```sql
   INSERT INTO users (email, password_hash, first_name, last_name, email_verified)
   VALUES ('user@example.com', '$2b$10$...', 'John', 'Doe', FALSE)
   ```
   - Creates new user account
   - `email_verified = FALSE` initially

3. **CALL add_password_to_history()** ✅
   ```sql
   INSERT INTO password_history (user_id, password_hash)
   VALUES ('uuid-here', '$2b$10$...')
   ```
   - Stores initial password hash for reuse prevention

4. **INSERT into email_verification_tokens** ✅
   ```sql
   INSERT INTO email_verification_tokens (user_id, token, expires_at)
   VALUES ('uuid-here', 'random-token', NOW() + INTERVAL '24 hours')
   ```
   - Creates verification token for email confirmation

**Result**: 3 database inserts across 3 tables

---

## 🔐 User Login (Email/Password)

**Endpoint**: `POST /api/auth/login`

### Database Writes (in order):

1. **SELECT from users table** ✅
   ```sql
   SELECT * FROM users WHERE email = 'user@example.com'
   ```
   - Fetch user for authentication

2. **SELECT users.locked_until** ✅
   ```sql
   SELECT locked_until FROM users WHERE id = 'uuid-here'
   ```
   - Check if account is locked

3. **INSERT into login_attempts** ✅
   ```sql
   INSERT INTO login_attempts (user_id, email, ip_address, user_agent, successful)
   VALUES ('uuid-here', 'user@example.com', '123.45.67.89', 'Mozilla...', TRUE)
   ```
   - Records successful login attempt

4. **UPDATE users table** ✅
   ```sql
   UPDATE users
   SET failed_login_attempts = 0,
       locked_until = NULL,
       last_login_at = NOW(),
       last_login_ip = '123.45.67.89'
   WHERE id = 'uuid-here'
   ```
   - Resets failed attempts
   - Records login time and IP

5. **INSERT into refresh_tokens** ✅
   ```sql
   INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip_address, user_agent)
   VALUES ('uuid-here', 'sha256-hash', NOW() + INTERVAL '7 days', '123.45.67.89', 'Mozilla...')
   ```
   - Creates refresh token for session (7 or 30 days)

**Result**: 3 inserts + 1 update across 3 tables

---

## ❌ Failed Login Attempt

**Endpoint**: `POST /api/auth/login` (wrong password)

### Database Writes (in order):

1. **INSERT into login_attempts** ✅
   ```sql
   INSERT INTO login_attempts (user_id, email, ip_address, successful, failure_reason)
   VALUES ('uuid-here', 'user@example.com', '123.45.67.89', FALSE, 'invalid_password')
   ```

2. **SELECT users.failed_login_attempts** ✅
   ```sql
   SELECT failed_login_attempts FROM users WHERE id = 'uuid-here'
   ```

3. **UPDATE users table** ✅
   ```sql
   UPDATE users
   SET failed_login_attempts = failed_login_attempts + 1
   WHERE id = 'uuid-here'
   ```
   - Increments failure counter

4. **IF 5+ failed attempts - UPDATE users table** ✅
   ```sql
   UPDATE users
   SET failed_login_attempts = 5,
       locked_until = NOW() + INTERVAL '30 minutes'
   WHERE id = 'uuid-here'
   ```
   - Locks account for 30 minutes

**Result**: 1 insert + 1-2 updates

---

## 🔄 Token Refresh

**Endpoint**: `POST /api/auth/refresh`

### Database Writes (in order):

1. **SELECT from refresh_tokens** ✅
   ```sql
   SELECT * FROM refresh_tokens
   WHERE token_hash = 'sha256-hash'
   AND expires_at > NOW()
   AND revoked = FALSE
   ```
   - Validates refresh token

2. **SELECT from users** ✅
   ```sql
   SELECT * FROM users WHERE id = 'uuid-here'
   ```
   - Gets user data for new access token

**Result**: No inserts, just reads (access token issued in-memory)

---

## 📧 Email Verification

**Endpoint**: `GET /api/auth/verify-email?token=...`

### Database Writes (in order):

1. **SELECT from email_verification_tokens** ✅
   ```sql
   SELECT * FROM email_verification_tokens
   WHERE token = 'token-here'
   AND expires_at > NOW()
   AND used = FALSE
   ```

2. **UPDATE users table** ✅
   ```sql
   UPDATE users
   SET email_verified = TRUE
   WHERE id = 'uuid-here'
   ```
   - Marks email as verified

3. **UPDATE email_verification_tokens** ✅
   ```sql
   UPDATE email_verification_tokens
   SET used = TRUE, used_at = NOW()
   WHERE token = 'token-here'
   ```
   - Marks token as used

**Result**: 2 updates across 2 tables

---

## 🔑 Password Reset (Forgot Password)

**Endpoint**: `POST /api/auth/forgot-password`

### Database Writes (in order):

1. **SELECT from users** ✅
   ```sql
   SELECT * FROM users WHERE email = 'user@example.com'
   ```

2. **DELETE old reset tokens** ✅
   ```sql
   DELETE FROM password_reset_tokens
   WHERE user_id = 'uuid-here' AND used = FALSE
   ```
   - Removes unused old tokens

3. **INSERT into password_reset_tokens** ✅
   ```sql
   INSERT INTO password_reset_tokens (user_id, token, expires_at, ip_address)
   VALUES ('uuid-here', 'reset-token', NOW() + INTERVAL '1 hour', '123.45.67.89')
   ```

**Result**: 1 delete + 1 insert

---

## 🔑 Password Reset (Complete Reset)

**Endpoint**: `POST /api/auth/reset-password`

### Database Writes (in order):

1. **SELECT from password_reset_tokens** ✅
   ```sql
   SELECT * FROM password_reset_tokens
   WHERE token = 'reset-token'
   AND expires_at > NOW()
   AND used = FALSE
   ```

2. **SELECT from users** ✅
   ```sql
   SELECT * FROM users WHERE id = 'uuid-here'
   ```

3. **CALL is_password_used_recently()** ✅
   ```sql
   SELECT * FROM password_history
   WHERE user_id = 'uuid-here'
   ORDER BY created_at DESC
   LIMIT 5
   ```
   - Checks if new password was used in last 5 passwords

4. **UPDATE password_reset_tokens** ✅
   ```sql
   UPDATE password_reset_tokens
   SET used = TRUE, used_at = NOW()
   WHERE token = 'reset-token'
   ```

5. **UPDATE users table** ✅
   ```sql
   UPDATE users
   SET password_hash = '$2b$10$new-hash'
   WHERE id = 'uuid-here'
   ```
   - Updates to new password

6. **CALL add_password_to_history()** ✅
   ```sql
   INSERT INTO password_history (user_id, password_hash)
   VALUES ('uuid-here', '$2b$10$new-hash')
   ```
   - Stores new password in history

7. **DELETE from refresh_tokens** ✅
   ```sql
   UPDATE refresh_tokens
   SET revoked = TRUE, revoked_at = NOW()
   WHERE user_id = 'uuid-here' AND revoked = FALSE
   ```
   - Revokes all sessions (forces re-login)

**Result**: 2 updates + 1 insert + 1 revoke

---

## 🔐 Google OAuth Login

**Endpoint**: `GET /api/auth/oauth/google/callback?code=...`

### Database Writes (in order):

1. **CALL find_or_create_oauth_user()** ✅
   ```sql
   -- First checks if user exists
   SELECT id FROM users WHERE email = 'user@gmail.com'

   -- If not exists, creates user
   INSERT INTO users (email, first_name, last_name, email_verified, oauth_only)
   VALUES ('user@gmail.com', 'John', 'Doe', TRUE, TRUE)

   -- Creates/updates OAuth link
   INSERT INTO oauth_providers (user_id, provider, provider_user_id, profile_data)
   VALUES ('uuid-here', 'google', 'google-id-12345', '{"picture": "..."}')
   ON CONFLICT (provider, provider_user_id) DO UPDATE
   SET profile_data = EXCLUDED.profile_data
   ```

2. **SELECT from users** ✅
   ```sql
   SELECT * FROM users WHERE id = 'uuid-here'
   ```

3. **UPDATE users table** ✅
   ```sql
   UPDATE users
   SET last_login_at = NOW(), last_login_ip = '123.45.67.89'
   WHERE id = 'uuid-here'
   ```

4. **INSERT into refresh_tokens** ✅
   ```sql
   INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
   VALUES ('uuid-here', 'sha256-hash', NOW() + INTERVAL '30 days')
   ```
   - OAuth users get 30-day sessions by default

**Result**: 1-2 inserts + 1 upsert + 1 update

---

## 🔐 GitHub OAuth Login

**Same flow as Google OAuth**, just different provider name:
- `provider = 'github'`
- `provider_user_id = github-user-id`

---

## 🧹 Cleanup (Monthly Cron Job)

**Function**: `SELECT cleanup_expired_tokens()`

### Database Writes:

1. **DELETE expired email verification tokens** ✅
   ```sql
   DELETE FROM email_verification_tokens
   WHERE expires_at < NOW() - INTERVAL '7 days'
   ```

2. **DELETE expired password reset tokens** ✅
   ```sql
   DELETE FROM password_reset_tokens
   WHERE expires_at < NOW() - INTERVAL '7 days'
   ```

3. **DELETE old login attempts** ✅
   ```sql
   DELETE FROM login_attempts
   WHERE attempted_at < NOW() - INTERVAL '90 days'
   ```

4. **DELETE revoked refresh tokens** ✅
   ```sql
   DELETE FROM refresh_tokens
   WHERE revoked = TRUE AND revoked_at < NOW() - INTERVAL '30 days'
   ```

5. **DELETE expired refresh tokens** ✅
   ```sql
   DELETE FROM refresh_tokens
   WHERE expires_at < NOW() AND revoked = FALSE
   ```

**Result**: Cleans up old/expired data

---

## ✅ Summary: Tables That Get Written To

| Table | Signup | Login | OAuth | Password Reset | Email Verify |
|-------|--------|-------|-------|----------------|--------------|
| **users** | ✅ Insert | ✅ Update | ✅ Insert/Update | ✅ Update | ✅ Update |
| **login_attempts** | ❌ | ✅ Insert | ❌ | ❌ | ❌ |
| **refresh_tokens** | ❌ | ✅ Insert | ✅ Insert | ✅ Revoke | ❌ |
| **password_history** | ✅ Insert | ❌ | ❌ | ✅ Insert | ❌ |
| **email_verification_tokens** | ✅ Insert | ❌ | ❌ | ❌ | ✅ Update |
| **password_reset_tokens** | ❌ | ❌ | ❌ | ✅ Insert | ❌ |
| **oauth_providers** | ❌ | ❌ | ✅ Upsert | ❌ | ❌ |

---

## 🚨 IMPORTANT NOTES

### Rate Limiting is NOT in Database
- Rate limits are stored **in-memory** (JavaScript object)
- **RESETS on serverless cold starts**
- For production, use Vercel KV, Upstash Redis, or Cloudflare rate limiting

### Every Action Writes to Database
- ✅ Yes! Every user action creates database records
- ✅ Signup creates 3 records minimum
- ✅ Login creates 2 records (login_attempts + refresh_tokens)
- ✅ OAuth creates 3-4 records (users + oauth_providers + refresh_tokens)
- ✅ All security events are logged for monitoring

### Database Performance
- All tables have proper indexes for fast lookups
- Foreign keys with ON DELETE CASCADE for automatic cleanup
- Cleanup function prevents database bloat

---

## 🧪 Test Your Setup

Run a test signup/login and check your Supabase tables:

```sql
-- See recent users
SELECT id, email, email_verified, oauth_only, created_at
FROM users
ORDER BY created_at DESC
LIMIT 5;

-- See recent logins
SELECT u.email, la.successful, la.failure_reason, la.attempted_at
FROM login_attempts la
JOIN users u ON la.user_id = u.id
ORDER BY la.attempted_at DESC
LIMIT 10;

-- See active sessions
SELECT u.email, rt.expires_at, rt.created_at
FROM refresh_tokens rt
JOIN users u ON rt.user_id = u.id
WHERE rt.revoked = FALSE AND rt.expires_at > NOW()
ORDER BY rt.created_at DESC;

-- See OAuth connections
SELECT u.email, op.provider, op.created_at
FROM oauth_providers op
JOIN users u ON op.user_id = u.id
ORDER BY op.created_at DESC;
```

If these queries return data after you test the app, **everything is working correctly!** ✅
