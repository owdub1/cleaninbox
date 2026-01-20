# User Table Security - Best Practices & Implementation

This document explains how CleanInbox securely stores user data, passwords, tokens, and manages account security.

---

## 🔐 Password Security

### How Passwords Are Stored

**NEVER store plaintext passwords.** CleanInbox uses **bcrypt** for password hashing.

#### Implementation Details

**Location**: `/api/lib/auth-utils.ts`

```typescript
import bcrypt from 'bcrypt';

// Hash a password with 10 rounds (2^10 = 1,024 iterations)
export async function hashPassword(password: string, rounds: number = 10): Promise<string> {
  return await bcrypt.hash(password, rounds);
}

// Verify a password against its hash
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}
```

#### Why bcrypt?

- **Adaptive cost**: Can increase rounds as hardware improves
- **Built-in salt**: Each hash is unique even for identical passwords
- **Slow by design**: 10 rounds = ~100-150ms per hash (prevents brute force)
- **Industry standard**: Recommended by OWASP for password storage

#### Database Storage

**Column**: `users.password_hash` (VARCHAR 255)
**Example hash**: `$2b$10$N9qo8uLOickgx2ZMRZoMye/IFPLAfn9s`

```sql
-- Password hash is NEVER stored in plaintext
INSERT INTO users (email, password_hash)
VALUES ('user@example.com', '$2b$10$...');  -- bcrypt hash
```

#### Password Validation Rules

**Location**: `/api/lib/auth-utils.ts`

```typescript
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 8) errors.push('Must be at least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('Must contain uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('Must contain lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('Must contain number');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('Must contain special character');

  return { valid: errors.length === 0, errors };
}
```

**Requirements**:
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character

#### Password History (Prevent Reuse)

**Table**: `password_history`
**Function**: `is_password_used_recently(user_id, password_hash, limit=5)`

```sql
-- Check if new password was used in last 5 passwords
SELECT is_password_used_recently('user-uuid', '$2b$10$new-hash', 5);
-- Returns TRUE if password was recently used (block change)
-- Returns FALSE if password is new (allow change)
```

**Storage limit**: Up to 10 most recent password hashes per user
**Reuse prevention**: Last 5 passwords cannot be reused

---

## 🎫 Token Security

CleanInbox uses **two types of tokens**: access tokens (JWT) and refresh tokens.

### Access Tokens (JWT)

**Type**: JSON Web Token (JWT)
**Storage**: Browser memory only (NOT localStorage or cookies)
**Expiry**: 15 minutes
**Algorithm**: HS256 (HMAC-SHA256)
**Secret**: 64-byte random key stored in `JWT_SECRET` env var

#### Structure

```json
{
  "userId": "uuid-here",
  "email": "user@example.com",
  "emailVerified": true,
  "iat": 1234567890,
  "exp": 1234568790
}
```

#### Why Short-Lived?

- **Minimize damage if stolen**: Only valid for 15 minutes
- **Auto-refresh**: Frontend refreshes token every 13 minutes
- **No revocation needed**: Expires quickly on its own

#### Generation

**Location**: `/api/auth/login.ts`, `/api/auth/refresh.ts`

```typescript
import jwt from 'jsonwebtoken';

const accessToken = jwt.sign(
  { userId, email, emailVerified },
  process.env.JWT_SECRET!,
  { expiresIn: '15m' }
);
```

### Refresh Tokens

**Type**: Cryptographically secure random token (32 bytes)
**Storage**: Hashed with SHA-256 in database
**Expiry**: 7 days (normal) or 30 days (Remember Me / OAuth)
**Database table**: `refresh_tokens`

#### How They Work

1. **Generate secure random token** (32 bytes = 256 bits)
2. **Hash with SHA-256** before storing in database
3. **Return plaintext token** to client (stored in httpOnly cookie)
4. **Client sends token** when access token expires
5. **Server validates hash** and issues new access token

#### Implementation

**Location**: `/api/lib/auth-utils.ts`

```typescript
import crypto from 'crypto';

// Generate a secure random token
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');  // 64 hex chars
}

// Hash a token with SHA-256
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
```

**Database storage**:

```sql
-- NEVER store plaintext tokens
INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
VALUES (
  'user-uuid',
  'abc123...',  -- SHA-256 hash (NOT the original token)
  NOW() + INTERVAL '7 days'
);
```

#### Why Hash Refresh Tokens?

- **Database compromise protection**: If database is breached, attackers cannot use hashed tokens
- **One-way encryption**: SHA-256 cannot be reversed to get original token
- **Fast lookup**: Hashing is fast (~1ms), allows quick validation

#### Token Expiry

| Token Type | Normal Login | Remember Me | OAuth Login |
|------------|--------------|-------------|-------------|
| Access Token | 15 minutes | 15 minutes | 15 minutes |
| Refresh Token | 7 days | 30 days | 30 days |

#### Token Revocation

**Scenario**: User changes password, admin suspends account, user logs out all devices

```sql
-- Revoke all refresh tokens for a user
UPDATE refresh_tokens
SET revoked = TRUE, revoked_at = NOW()
WHERE user_id = 'user-uuid' AND revoked = FALSE;
```

**Function**: `revoke_user_refresh_tokens(user_id)`

---

## 🔒 Email Verification & Password Reset Tokens

### Email Verification Tokens

**Table**: `email_verification_tokens`
**Expiry**: 24 hours
**Storage**: Plaintext (single-use, short-lived)
**Generation**: 32-byte random string

```sql
INSERT INTO email_verification_tokens (user_id, token, expires_at)
VALUES ('user-uuid', 'random-token', NOW() + INTERVAL '24 hours');
```

**Why plaintext?**
- Single-use only (marked as `used=TRUE` after verification)
- Short expiry (24 hours)
- Low risk compared to session tokens

### Password Reset Tokens

**Table**: `password_reset_tokens`
**Expiry**: 1 hour (strict!)
**Storage**: Plaintext (single-use, very short-lived)
**Generation**: 32-byte random string

```sql
INSERT INTO password_reset_tokens (user_id, token, expires_at, ip_address)
VALUES ('user-uuid', 'random-token', NOW() + INTERVAL '1 hour', '123.45.67.89');
```

**Security measures**:
- ✅ 1-hour expiry (very short window)
- ✅ Single-use only (`used=TRUE` after first use)
- ✅ Revokes all sessions after password change
- ✅ Records IP address for audit trail
- ✅ Old tokens deleted when new one issued

---

## 👤 User Account States

CleanInbox uses an `account_status` enum to track user account lifecycle.

### Account Status Types

| Status | Description | Can Login? | Email Sent? |
|--------|-------------|-----------|-------------|
| `pending_verification` | New signup, email not verified | ❌ No | ✅ Verification email |
| `active` | Fully verified and active | ✅ Yes | - |
| `suspended` | Temporarily or permanently suspended | ❌ No | ✅ Suspension notice |
| `deleted` | Soft-deleted (can be restored) | ❌ No | - |

### Transition Flow

```
User Signs Up
    ↓
pending_verification
    ↓ (clicks email link)
active
    ↓ (violates ToS)
suspended
    ↓ (admin reviews)
active OR deleted
```

### Database Schema

```sql
ALTER TABLE users ADD COLUMN status account_status DEFAULT 'pending_verification';
ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMP WITH TIME ZONE;
```

**Important**: When user verifies email, TWO fields are updated:

```sql
UPDATE users
SET
  email_verified = TRUE,
  email_verified_at = NOW(),
  status = 'active'
WHERE id = 'user-uuid';
```

---

## 🚫 Account Suspension

### Suspension Types

1. **Temporary Suspension** (e.g., 24 hours for spam)
2. **Indefinite Suspension** (pending review)
3. **Permanent Suspension** (ToS violation)

### Database Fields

```sql
ALTER TABLE users ADD COLUMN suspended_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN suspended_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN suspension_reason TEXT;
```

### Suspend a User

**Function**: `suspend_user(user_id, duration_hours, reason)`

```sql
-- Suspend for 24 hours
SELECT suspend_user(
  'user-uuid',
  24,  -- hours
  'Spam detected'
);

-- Indefinite suspension (manual review required)
SELECT suspend_user(
  'user-uuid',
  NULL,  -- no expiry
  'ToS violation: inappropriate content'
);
```

**What happens**:
1. `status` → `suspended`
2. `suspended_at` → NOW()
3. `suspended_until` → NOW() + duration (or NULL)
4. `suspension_reason` → reason text
5. **All refresh tokens revoked** (logs user out everywhere)

### Auto-Unsuspend

**Function**: `is_user_active(user_id)` automatically unsuspends expired temporary suspensions.

```sql
-- Called at login - auto-unsuspends if suspension expired
SELECT is_user_active('user-uuid');
-- Returns TRUE if user can login
-- Returns FALSE if suspended/deleted/pending
```

### Unsuspend a User (Manual)

```sql
SELECT unsuspend_user('user-uuid');
```

**What happens**:
1. `status` → `active`
2. `suspended_at` → NULL
3. `suspended_until` → NULL
4. `suspension_reason` → NULL

---

## 🗑️ Account Deletion

CleanInbox uses **soft deletion** (not hard deletion).

### Why Soft Delete?

- ✅ **Recoverable**: User can restore account within 30 days
- ✅ **Audit trail**: Keep records for compliance/legal
- ✅ **Data integrity**: Preserve foreign key relationships
- ✅ **Analytics**: Understand churn patterns

### Database Fields

```sql
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN deletion_reason TEXT;
```

### Soft Delete a User

**Function**: `soft_delete_user(user_id, reason)`

```sql
SELECT soft_delete_user(
  'user-uuid',
  'User requested account deletion'
);
```

**What happens**:
1. `status` → `deleted`
2. `deleted_at` → NOW()
3. `deletion_reason` → reason text
4. **All refresh tokens revoked** (logs user out everywhere)
5. User data **REMAINS in database** (not physically deleted)

### Exclude Deleted Users from Queries

```sql
-- Only get active users (exclude deleted)
SELECT * FROM users
WHERE deleted_at IS NULL;

-- Or use status filter
SELECT * FROM users
WHERE status != 'deleted';
```

### Restore a Deleted User

**Function**: `restore_user(user_id)`

```sql
SELECT restore_user('user-uuid');
```

**What happens**:
1. `status` → `active` (if email verified) or `pending_verification`
2. `deleted_at` → NULL
3. `deletion_reason` → NULL
4. User can log in again

### Hard Delete (GDPR Compliance)

For **permanent deletion** (GDPR "right to be forgotten"):

```sql
-- This PHYSICALLY removes user data from database
DELETE FROM users WHERE id = 'user-uuid';
-- Cascades to all related tables (password_history, login_attempts, etc.)
```

**Only use for**:
- GDPR deletion requests
- Users deleted > 30 days ago
- Legal compliance

---

## 🔍 Security Monitoring

### Login Attempts Table

**Table**: `login_attempts`
**Retention**: 90 days (auto-cleanup)

```sql
CREATE TABLE login_attempts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  email VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  user_agent TEXT,
  successful BOOLEAN NOT NULL,
  failure_reason VARCHAR(100),
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Every login attempt is logged**, including:
- ✅ Successful logins
- ❌ Failed logins (wrong password)
- ❌ Account not found
- ❌ Account locked
- ❌ Email not verified

### Brute Force Protection

**Mechanism**: Account lockout after 5 failed attempts

```sql
ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN locked_until TIMESTAMP WITH TIME ZONE;
```

**Logic** (in `/api/auth/login.ts`):

1. User enters wrong password
2. Increment `failed_login_attempts`
3. If `failed_login_attempts >= 5`:
   - Set `locked_until = NOW() + 30 minutes`
   - Reject login with "Account locked" error
4. On successful login:
   - Reset `failed_login_attempts = 0`
   - Clear `locked_until = NULL`

### Monitoring Queries

```sql
-- See recent failed login attempts
SELECT email, ip_address, failure_reason, attempted_at
FROM login_attempts
WHERE successful = FALSE
ORDER BY attempted_at DESC
LIMIT 20;

-- Find accounts with multiple failed attempts
SELECT email, COUNT(*) as failed_attempts
FROM login_attempts
WHERE successful = FALSE
  AND attempted_at > NOW() - INTERVAL '1 hour'
GROUP BY email
HAVING COUNT(*) >= 3
ORDER BY failed_attempts DESC;

-- Find suspicious IPs (multiple accounts)
SELECT ip_address, COUNT(DISTINCT email) as unique_emails
FROM login_attempts
WHERE attempted_at > NOW() - INTERVAL '24 hours'
GROUP BY ip_address
HAVING COUNT(DISTINCT email) >= 5
ORDER BY unique_emails DESC;
```

---

## 🔑 Roles & Permissions

### Role-Based Access Control (RBAC)

**Enum**: `user_role` with values: `user`, `admin`, `moderator`

```sql
ALTER TABLE users ADD COLUMN role user_role DEFAULT 'user';
```

### Role Capabilities

| Role | Can Access Dashboard | Can Manage Users | Can View Logs | Can Delete Data |
|------|---------------------|------------------|---------------|-----------------|
| `user` | ✅ Own data only | ❌ | ❌ | ✅ Own account |
| `moderator` | ✅ Own data | ⚠️ Suspend users | ✅ | ❌ |
| `admin` | ✅ All data | ✅ Full control | ✅ | ✅ |

### Check User Role

**Function**: `is_admin(user_id)`

```sql
-- Check if user is admin
SELECT is_admin('user-uuid');
-- Returns TRUE or FALSE
```

### Promote User to Admin

**Function**: `promote_user_to_admin(user_id)`

```sql
-- Promote user to admin role
SELECT promote_user_to_admin('user-uuid');
```

### Middleware Protection (API)

**Location**: `/api/middleware/auth.ts` (to be implemented)

```typescript
export function requireAdmin(req: VercelRequest, res: VercelResponse, next: Function) {
  const { userId } = req.user;  // From JWT

  const { data: user } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();

  if (user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
}
```

---

## 📊 Timestamp Tracking

### Standard Timestamps

Every user has:

```sql
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()  -- When user signed up
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()  -- Last profile update
```

**Auto-update trigger** ensures `updated_at` is always current:

```sql
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Security Timestamps

```sql
email_verified_at TIMESTAMP WITH TIME ZONE        -- When email was verified
last_login_at TIMESTAMP WITH TIME ZONE            -- Last successful login
last_password_change_at TIMESTAMP WITH TIME ZONE  -- Last password change
suspended_at TIMESTAMP WITH TIME ZONE             -- When account was suspended
deleted_at TIMESTAMP WITH TIME ZONE               -- When account was deleted
```

### Use Cases

**Force password reset after 90 days**:

```sql
SELECT id, email, last_password_change_at
FROM users
WHERE last_password_change_at < NOW() - INTERVAL '90 days'
  AND status = 'active';
```

**Find accounts created but never verified**:

```sql
SELECT id, email, created_at
FROM users
WHERE email_verified = FALSE
  AND created_at < NOW() - INTERVAL '7 days';
```

**Auto-delete soft-deleted accounts after 30 days**:

```sql
DELETE FROM users
WHERE status = 'deleted'
  AND deleted_at < NOW() - INTERVAL '30 days';
```

---

## ✅ Security Checklist

### Password Security
- ✅ bcrypt hashing with 10 rounds
- ✅ Password strength validation (8+ chars, uppercase, lowercase, number, special)
- ✅ Password history (prevent reuse of last 5 passwords)
- ✅ Secure password reset flow (1-hour expiry, single-use tokens)

### Token Security
- ✅ Short-lived access tokens (15 minutes)
- ✅ Hashed refresh tokens (SHA-256 in database)
- ✅ Secure random token generation (crypto.randomBytes)
- ✅ Token revocation on password change
- ✅ Auto-refresh mechanism (every 13 minutes)

### Account Security
- ✅ Email verification required
- ✅ Brute force protection (5 attempts → 30min lockout)
- ✅ Login attempt logging (90-day retention)
- ✅ IP address tracking
- ✅ Account status management (active, suspended, deleted)
- ✅ Soft delete (30-day recovery window)

### Role & Access Control
- ✅ Role-based access control (user, admin, moderator)
- ✅ Account suspension with reason tracking
- ✅ Admin functions for user management
- ✅ Granular permission support (future JSONB column)

### Monitoring & Compliance
- ✅ Comprehensive audit trail (login_attempts)
- ✅ Timestamp tracking for all security events
- ✅ Auto-cleanup of expired tokens (monthly cron)
- ✅ GDPR compliance (hard delete capability)

---

## 🛠️ Next Steps

### 1. Update Authentication Endpoints

**`/api/auth/login.ts`** - Add status check:

```typescript
// Check if user is active before allowing login
const { data: isActive } = await supabase.rpc('is_user_active', { p_user_id: user.id });

if (!isActive) {
  return res.status(403).json({
    error: user.status === 'suspended'
      ? 'Account suspended'
      : user.status === 'deleted'
      ? 'Account deleted'
      : 'Email verification required'
  });
}
```

**`/api/auth/verify-email.ts`** - Update status and timestamp:

```typescript
await supabase
  .from('users')
  .update({
    email_verified: true,
    email_verified_at: new Date().toISOString(),
    status: 'active'
  })
  .eq('id', userId);
```

### 2. Create Admin Panel

Build admin routes to:
- View all users
- Suspend/unsuspend accounts
- Delete/restore accounts
- Promote users to admin/moderator
- View login attempt logs

### 3. Implement Rate Limiting in Production

Current rate limiting is **in-memory** (resets on serverless cold starts).

**Production solution**: Use Vercel KV (Redis)

```typescript
import kv from '@vercel/kv';

// Store rate limit in Redis instead of memory
await kv.set(`ratelimit:${ip}`, attempts, { ex: 60 });
```

### 4. Set Up Monitoring Alerts

**Monitor for**:
- Multiple failed login attempts from single IP
- Spike in account suspensions
- Unusual login patterns (new country, new device)
- High number of password reset requests

### 5. Schedule Cleanup Cron Job

**Run monthly** via Supabase cron:

```sql
SELECT cleanup_expired_tokens();  -- Removes old tokens, attempts, etc.
```

---

## 📚 References

- **OWASP Password Storage Cheat Sheet**: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- **NIST Password Guidelines**: https://pages.nist.gov/800-63-3/sp800-63b.html
- **bcrypt Documentation**: https://github.com/kelektiv/node.bcrypt.js
- **JWT Best Practices**: https://tools.ietf.org/html/rfc8725

---

**Last Updated**: User table enhancements implemented
**Version**: 2.0
