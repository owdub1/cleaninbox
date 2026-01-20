# Security Documentation - CleanInbox

This document outlines all security measures implemented in CleanInbox to protect user data and prevent common web application vulnerabilities.

---

## 🔒 Security Features Overview

### ✅ Implemented Security Protections

1. **Rate Limiting** - Prevents brute force and abuse
2. **CSRF Protection** - Prevents cross-site request forgery
3. **XSS Protection** - Prevents cross-site scripting attacks
4. **SQL Injection Prevention** - Automatic with Supabase
5. **Secure Cookies** - HttpOnly, Secure, SameSite flags
6. **HTTPS Enforcement** - Strict Transport Security headers
7. **API Endpoint Protection** - JWT authentication + authorization
8. **Password Security** - bcrypt hashing + strength validation
9. **Account Security** - Brute force protection, lockouts
10. **Security Headers** - CSP, X-Frame-Options, etc.

---

## 1. Rate Limiting

### Implementation

**Location**: `/api/lib/rate-limiter.ts`

**How it works**:
- Tracks requests per IP address or custom key
- In-memory storage (NOTE: resets on serverless cold starts)
- Returns 429 status when limit exceeded

### Current Limits

| Endpoint | Window | Max Requests |
|----------|---------|--------------|
| `/api/auth/signup` | 1 hour | 3 |
| `/api/auth/login` | 1 minute | 30 |
| `/api/auth/forgot-password` | 1 hour | 3 |
| `/api/auth/resend-verification` | 1 hour | 5 |

### Response Headers

```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 25
X-RateLimit-Reset: 2026-01-15T01:30:00.000Z
```

### Production Recommendation

⚠️ **Current limitation**: In-memory rate limiting resets on serverless cold starts.

**For production**, replace with persistent storage:
- **Vercel KV** (Redis) - Recommended
- **Upstash Redis** - Free tier available
- **Cloudflare Workers KV**

### Example Usage

```typescript
import { rateLimit, RateLimitPresets } from '../lib/rate-limiter.js';

const limiter = rateLimit(RateLimitPresets.STANDARD);

export default async function handler(req, res) {
  if (limiter(req, res)) return; // Request blocked if limit exceeded

  // Process request
}
```

---

## 2. CSRF Protection

### Implementation

**Location**: `/api/lib/csrf.ts`

**Method**: Double-submit cookie pattern

**How it works**:
1. Server generates random CSRF token
2. Token stored in HTTP-only cookie
3. Same token sent to client in response body
4. Client includes token in `X-CSRF-Token` header
5. Server validates cookie matches header (constant-time comparison)

### Current Status

✅ **Available** - Code implemented
⚠️ **Not applied to all endpoints yet**

### CSRF Cookie Flags

```
HttpOnly: Yes (prevents JS access)
Secure: Yes (HTTPS only)
SameSite: Strict (prevents CSRF attacks)
Max-Age: 7 days
```

### Applying CSRF Protection

```typescript
import { csrfProtection, issueCSRFToken } from '../lib/csrf.js';

export default async function handler(req, res) {
  // Check CSRF on POST/PUT/DELETE
  if (!csrfProtection(req, res)) return; // Request blocked

  // Issue new CSRF token on login/signup
  const csrfToken = issueCSRFToken(res);

  res.json({ csrfToken, ... });
}
```

### Frontend Integration

```javascript
// Store CSRF token from login/signup response
const csrfToken = response.data.csrfToken;

// Include in subsequent requests
fetch('/api/endpoint', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': csrfToken
  },
  body: JSON.stringify(data)
});
```

---

## 3. XSS Protection

### Implementation

**Location**: `/api/lib/security-middleware.ts` + `/api/lib/auth-utils.ts`

### Input Sanitization

**Enhanced `sanitizeHTML()` function**:
- Escapes HTML entities (`<`, `>`, `&`, `"`, `'`)
- Removes `javascript:` protocol
- Strips event handlers (`onclick=`, etc.)
- Removes `<script>` tags
- Optional max length enforcement

```typescript
import { sanitizeHTML } from '../lib/security-middleware.js';

const cleanInput = sanitizeHTML(userInput, {
  maxLength: 255
});
```

### Specialized Sanitizers

- `sanitizeEmail()` - Email validation + sanitization
- `sanitizeName()` - Names (allows letters, spaces, hyphens, apostrophes)
- `sanitizeURL()` - URL validation (http/https only)

### Where Applied

- ✅ Signup: email, first name, last name
- ✅ Login: email
- ✅ All user inputs are trimmed and escaped

### Content Security Policy (CSP)

**Location**: `vercel.json` headers

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://*.supabase.co https://challenges.cloudflare.com;
  frame-src https://challenges.cloudflare.com;
```

**What this does**:
- Only allows scripts from same origin + Cloudflare Turnstile
- Prevents inline script injection (with exceptions for necessary inline scripts)
- Restricts where resources can be loaded from

---

## 4. SQL Injection Prevention

### Implementation

**Automatic** via Supabase client library

### How Supabase Prevents SQL Injection

1. **Parameterized Queries** - All queries use prepared statements
2. **PostgREST** - API layer prevents direct SQL access
3. **Service Role Key** - Server-side only, never exposed to client

### Example (Secure)

```typescript
// ✅ SAFE - Supabase uses parameterized queries
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('email', userEmail); // userEmail is parameterized
```

### What NOT to do

```typescript
// ❌ NEVER DO THIS
const query = `SELECT * FROM users WHERE email = '${userEmail}'`;
// This is vulnerable to SQL injection!
```

**We never write raw SQL queries** - all database access goes through Supabase client.

---

## 5. Secure Cookies

### Implementation

All cookies set by the application use secure flags.

### CSRF Cookie

**Location**: Set by `/api/lib/csrf.ts`

```
Set-Cookie: csrf-token=xxx; HttpOnly; Secure; SameSite=Strict; Max-Age=604800; Path=/
```

### Cookie Security Flags

| Flag | Purpose | Value |
|------|---------|-------|
| `HttpOnly` | Prevents JavaScript access | ✅ Yes |
| `Secure` | HTTPS only | ✅ Yes |
| `SameSite` | CSRF protection | Strict |
| `Path` | Cookie scope | / |
| `Max-Age` | Expiry time | 7 days |

### What This Protects Against

- **XSS Cookie Theft**: `HttpOnly` prevents `document.cookie` access
- **Man-in-the-Middle**: `Secure` flag ensures HTTPS only
- **CSRF Attacks**: `SameSite=Strict` blocks cross-site requests

### Session Cookies (Future Enhancement)

Currently, JWTs are stored client-side. For enhanced security, consider:
- Refresh tokens in HTTP-only cookies
- Access tokens in memory only (not localStorage)
- Automatic token rotation

---

## 6. HTTPS Enforcement

### Implementation

**Location**: `vercel.json` headers

### Strict-Transport-Security (HSTS)

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

**What this does**:
- Forces HTTPS for 2 years (`max-age=63072000`)
- Applies to all subdomains (`includeSubDomains`)
- Eligible for browser HSTS preload list (`preload`)

### Vercel Auto-HTTPS

Vercel automatically:
- Provides free SSL certificates (Let's Encrypt)
- Redirects HTTP → HTTPS
- Enforces HTTPS on all custom domains

---

## 7. API Endpoint Protection

### Authentication Middleware

**Location**: `/api/lib/auth-middleware.ts`

### Available Middlewares

#### 1. `requireAuth()` - Require valid JWT

```typescript
import { requireAuth } from '../lib/auth-middleware.js';

export default async function handler(req, res) {
  const user = requireAuth(req, res);
  if (!user) return; // Returns 401 if unauthorized

  // User authenticated, proceed
  res.json({ userId: user.userId });
}
```

#### 2. `requireEmailVerification()` - Require verified email

```typescript
import { requireEmailVerification } from '../middleware/auth.js';

export default async function handler(req, res) {
  const user = requireEmailVerification(req, res);
  if (!user) return; // Returns 403 if email not verified

  // User has verified email
}
```

#### 3. `requireAdmin()` - Require admin role

```typescript
import { requireAdmin } from '../middleware/auth.js';

export default async function handler(req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return; // Returns 403 if not admin

  // User is admin
}
```

#### 4. `requireModerator()` - Require moderator or admin

```typescript
import { requireModerator } from '../middleware/auth.js';

export default async function handler(req, res) {
  const moderator = await requireModerator(req, res);
  if (!moderator) return; // Returns 403 if not moderator/admin

  // User is moderator or admin
}
```

#### 5. `optionalAuth()` - Extract user if authenticated

```typescript
import { optionalAuth } from '../middleware/auth.js';

export default async function handler(req, res) {
  const user = optionalAuth(req);

  if (user) {
    // Show personalized content
  } else {
    // Show public content
  }
}
```

### JWT Token Security

- **Algorithm**: HS256 (HMAC with SHA-256)
- **Secret**: 64-byte random key (`JWT_SECRET`)
- **Expiry**: 15 minutes (short-lived)
- **Refresh**: Automatic every 13 minutes via frontend
- **Storage**: Client memory only (not localStorage)

### Authorization Header Format

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 8. Password Security

### Password Hashing

**Algorithm**: bcrypt
**Rounds**: 10 (2^10 = 1,024 iterations)
**Location**: `/api/lib/auth-utils.ts`

```typescript
import { hashPassword, comparePassword } from '../lib/auth-utils.js';

// Hash a password
const hash = await hashPassword('userPassword123', 10);
// Result: $2b$10$N9qo8uLOickgx2ZMRZoMye/IFPLAfn9s...

// Verify a password
const isValid = await comparePassword('userPassword123', hash);
// Result: true
```

### Why bcrypt?

- **Adaptive cost**: Can increase rounds as hardware improves
- **Built-in salt**: Each hash is unique (even for same password)
- **Slow by design**: ~100-150ms per hash (prevents brute force)
- **Industry standard**: Recommended by OWASP

### Password Strength Requirements

- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character
- Blocks common passwords (e.g., "password", "123456")

### Password Strength Indicator

**Location**: `/src/components/auth/PasswordStrength.tsx`

Shows real-time feedback:
- Weak (0-40): Red
- Fair (41-70): Yellow
- Strong (71-100): Green

### Password History

**Table**: `password_history`
**Function**: `is_password_used_recently()`

Prevents reuse of last 5 passwords:

```sql
SELECT is_password_used_recently('user-uuid', '$2b$10$new-hash', 5);
-- Returns TRUE if password was recently used
```

---

## 9. Account Security

### Brute Force Protection

**Mechanism**: Account lockout after failed attempts

| Threshold | Action |
|-----------|--------|
| 5 failed attempts | Lock account for 30 minutes |
| Auto-unlock | After 30 minutes |
| Notification | Email sent to user |

### Login Attempt Tracking

**Table**: `login_attempts`
**Retention**: 90 days (auto-cleanup)

Every login attempt is logged:
- User ID
- Email
- IP address
- User agent
- Success/failure status
- Failure reason

### Account Status Management

**Statuses**:
- `pending_verification` - New account, email not verified
- `active` - Fully verified and active
- `suspended` - Temporarily or permanently suspended
- `deleted` - Soft deleted (can be restored)

### Suspension Features

**Functions**:
- `suspend_user()` - Suspend account (temporary or indefinite)
- `unsuspend_user()` - Remove suspension
- `soft_delete_user()` - Soft delete account
- `restore_user()` - Restore soft-deleted account
- `is_user_active()` - Check if account can login (auto-unsuspends expired suspensions)

---

## 10. Security Headers

### All Responses Include

**Location**: `vercel.json`

#### X-Content-Type-Options
```
X-Content-Type-Options: nosniff
```
Prevents MIME-type sniffing attacks

#### X-Frame-Options
```
X-Frame-Options: DENY
```
Prevents clickjacking attacks (can't embed in iframe)

#### X-XSS-Protection
```
X-XSS-Protection: 1; mode=block
```
Enables browser XSS filtering

#### Referrer-Policy
```
Referrer-Policy: strict-origin-when-cross-origin
```
Controls referrer information sent to other sites

#### Permissions-Policy
```
Permissions-Policy: camera=(), microphone=(), geolocation=()
```
Disables unnecessary browser APIs

---

## 🔐 How to Secure New Endpoints

### Checklist for New API Endpoints

1. **Apply Rate Limiting**
```typescript
import { rateLimit, RateLimitPresets } from '../lib/rate-limiter.js';
const limiter = rateLimit(RateLimitPresets.STANDARD);

export default async function handler(req, res) {
  if (limiter(req, res)) return;
  // ...
}
```

2. **Add CSRF Protection** (for POST/PUT/DELETE)
```typescript
import { csrfProtection } from '../lib/csrf.js';

export default async function handler(req, res) {
  if (!csrfProtection(req, res)) return;
  // ...
}
```

3. **Require Authentication** (if needed)
```typescript
import { requireAuth } from '../lib/auth-middleware.js';

export default async function handler(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;
  // ...
}
```

4. **Validate Input**
```typescript
import { sanitizeHTML, ValidationSchemas } from '../middleware/security.js';

const validation = ValidationSchemas.signup(req.body);
if (!validation.valid) {
  return res.status(400).json({ errors: validation.errors });
}
```

5. **Sanitize User Input**
```typescript
import { sanitizeHTML } from '../lib/security-middleware.js';

const cleanInput = sanitizeHTML(req.body.userInput, {
  maxLength: 500
});
```

---

## 🛡️ Security Best Practices

### Environment Variables

- ✅ Never commit `.env.local` to git
- ✅ Use strong random secrets (`JWT_SECRET`, `JWT_REFRESH_SECRET`)
- ✅ Rotate secrets periodically
- ✅ Set environment variables in Vercel dashboard

### Database Access

- ✅ Use Supabase service role key server-side only
- ✅ Never expose service role key to client
- ✅ Disable Row Level Security (RLS) only when using service role
- ✅ Use `ON DELETE CASCADE` for related records

### Token Management

- ✅ Short-lived access tokens (15 minutes)
- ✅ Longer refresh tokens (7-30 days)
- ✅ Hash refresh tokens before storage (SHA-256)
- ✅ Revoke all tokens on password change
- ✅ Store tokens in memory, not localStorage

### User Input

- ✅ Never trust user input
- ✅ Validate on both client and server
- ✅ Sanitize before storing in database
- ✅ Escape before rendering in HTML
- ✅ Use parameterized queries (automatic with Supabase)

### Error Messages

- ✅ Don't reveal sensitive information
- ✅ Use generic messages for auth failures ("Invalid credentials")
- ✅ Log detailed errors server-side only
- ✅ Never expose stack traces to users

---

## 🔍 Security Testing

### Manual Testing

#### Test XSS Protection
```javascript
// Try to inject script
const maliciousInput = '<script>alert("XSS")</script>';
// Should be escaped to: &lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;
```

#### Test SQL Injection
```javascript
// Try SQL injection
const maliciousEmail = "admin' OR '1'='1";
// Should be parameterized (no SQL injection possible with Supabase)
```

#### Test CSRF
```javascript
// Try request without CSRF token
fetch('/api/endpoint', {
  method: 'POST',
  headers: {
    // Missing: 'X-CSRF-Token'
  }
});
// Should return: 403 CSRF token validation failed
```

#### Test Rate Limiting
```javascript
// Send 31 requests to /api/auth/login
// 31st request should return: 429 Too many requests
```

#### Test Brute Force Protection
```javascript
// Try wrong password 5 times
// 6th attempt should return: 403 Account locked
```

### Automated Security Tools

**Recommended**:
- **OWASP ZAP** - Automated vulnerability scanning
- **Snyk** - Dependency vulnerability scanning
- **npm audit** - Check for vulnerable packages
- **Vercel Security** - Platform-level protection

---

## 📋 Security Audit Checklist

### Before Production

- [ ] All environment secrets set in Vercel
- [ ] HTTPS enforced (automatic with Vercel)
- [ ] Rate limiting configured for all endpoints
- [ ] CSRF protection applied to state-changing endpoints
- [ ] Input validation on all user inputs
- [ ] SQL injection impossible (using Supabase)
- [ ] XSS protection implemented
- [ ] Security headers configured
- [ ] Password policies enforced
- [ ] Brute force protection enabled
- [ ] Session management secure
- [ ] Error messages don't leak sensitive info
- [ ] Dependencies up to date (`npm audit`)

---

## 🆘 Reporting Security Issues

If you discover a security vulnerability, please email:
**security@cleaninbox.com**

**Please DO NOT**:
- Create public GitHub issues for security bugs
- Share vulnerabilities publicly before they're fixed

**We will**:
- Acknowledge your email within 48 hours
- Provide a fix timeline
- Credit you in our security acknowledgments (if you wish)

---

## 📚 References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [Content Security Policy Reference](https://content-security-policy.com/)
- [Vercel Security Best Practices](https://vercel.com/docs/security/security-best-practices)
- [Supabase Security](https://supabase.com/docs/guides/auth/row-level-security)

---

**Last Updated**: Security hardening implementation
**Version**: 2.0
**Next Review**: Quarterly security audit recommended
