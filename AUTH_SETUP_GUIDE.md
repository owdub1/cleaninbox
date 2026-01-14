# CleanInbox Authentication System - Setup Guide

## 🎉 What's Been Implemented

### ✅ Core Auth Features (COMPLETE)
- **User Registration** with email verification
- **Login** with brute force protection
- **Password Reset** flow (forgot password)
- **Account Lockout** after 5 failed attempts (30-min lockout)
- **Protected Routes** with authentication checks
- **Email Verification** requirement for sensitive features
- **Password Strength Validation** (8+ chars, uppercase, lowercase, numbers, special chars)

### ✅ Security Features
- ✅ Bcrypt password hashing (10 rounds)
- ✅ JWT tokens (15-minute expiry)
- ✅ Input sanitization & validation
- ✅ Email format validation
- ✅ Protection against email enumeration attacks
- ✅ Login attempt tracking (IP address, user agent)
- ✅ Auto-unlock after lockout period
- ✅ Failed attempt counter with warnings

### ✅ Database Schema (SQL Files Created)
- `security-tables-schema.sql` - All security tables
- `update-users-security-columns.sql` - User table updates

### ✅ API Endpoints Created
| Endpoint | Purpose | Security |
|----------|---------|----------|
| `/api/auth/signup` | User registration | ✅ Validation, email verification |
| `/api/auth/login` | User login | ✅ Brute force protection, lockout |
| `/api/auth/verify-email` | Email verification | ✅ Token expiration |
| `/api/auth/resend-verification` | Resend verification | ✅ Rate limiting |
| `/api/auth/forgot-password` | Request password reset | ✅ Rate limiting (3/hour) |
| `/api/auth/reset-password` | Reset password | ✅ Strong password validation |

### ✅ Frontend Components
- `ProtectedRoute` - Route guard component
- `PasswordStrength` - Real-time password strength indicator
- Updated `Register` page with validation
- Updated `Login` page
- Protected: Dashboard, EmailCleanup, CleanInbox, Checkout

### ✅ Email Templates (Beautiful HTML)
- Welcome + Email Verification
- Password Reset
- Account Locked Notification
- Password Changed Confirmation

---

## 🚀 Quick Start - Next Steps

### 1. Apply Database Schemas

Run these SQL files in your Supabase SQL editor (in order):

```sql
-- 1. First, update the users table
-- Copy and run: update-users-security-columns.sql

-- 2. Then, create security tables
-- Copy and run: security-tables-schema.sql
```

### 2. Get Your Supabase Service Role Key

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to Settings > API
4. Copy the `service_role` key (NOT the anon key)
5. Add to `.env.local`:
   ```
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

### 3. Set Up Email Service (Resend - FREE)

1. Sign up at [Resend.com](https://resend.com) (free tier: 3,000 emails/month)
2. Get your API key from the dashboard
3. Add to `.env.local`:
   ```
   RESEND_API_KEY=re_your_api_key_here
   ```
4. Verify your sending domain (or use their test domain)

**Note:** Without this, users can still register but won't receive emails.

### 4. Test the Authentication Flow

```bash
# 1. Start your dev server
npm run dev

# 2. Try registering a new account
# Go to: http://localhost:5173/register

# 3. Check your email for verification link

# 4. Try logging in with wrong password 5 times
# Observe account lockout behavior

# 5. Test forgot password flow
```

---

## 📋 Current Environment Variables

Your `.env.local` file now includes:

```bash
# ✅ Already Set
VITE_SUPABASE_URL=https://clryyrrhbadvfdgtwvad.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
JWT_SECRET=fx3IssQ/owhGh0EkkpdeDI8jVliQ28MQeUD5nNQhmq+GwwJ...
JWT_REFRESH_SECRET=IvmZoeMeixHgx+SKD+2k+WO1XVA9t9/zkOP76W5548...

# ❌ TODO: Add These
SUPABASE_SERVICE_ROLE_KEY=        # From Supabase Dashboard
RESEND_API_KEY=                    # From Resend.com
```

---

## 🔒 Security Features Explained

### 1. Brute Force Protection
- Tracks failed login attempts per user
- Locks account after 5 failed attempts
- 30-minute automatic lockout
- Email notification on lockout
- Countdown shown to user ("X attempts remaining")

### 2. Email Verification
- Token-based verification (24-hour expiry)
- Resend verification option
- Blocks access to sensitive features until verified
- `ProtectedRoute` component with `requireEmailVerification` prop

### 3. Password Security
- Minimum 8 characters
- Requires: uppercase, lowercase, number, special character
- Blocks common passwords
- Real-time strength indicator
- Bcrypt hashing with 10 rounds

### 4. Password Reset
- Secure token generation (crypto.randomBytes)
- 1-hour token expiry
- Rate limited (3 requests/hour)
- Tracks IP and user agent
- Revokes all sessions on password change

### 5. Login Attempt Tracking
- Records all login attempts (successful & failed)
- Stores: IP address, user agent, timestamp, reason
- Useful for security auditing
- Auto-cleanup function included

---

## 🎨 User Experience Flow

### New User Registration
1. User fills out registration form
2. Password strength indicator shows real-time feedback
3. Form validates all requirements
4. Account created → Email sent
5. User receives welcome email with verification link
6. User clicks link → Email verified
7. User can now access all features

### Existing User Login
1. User enters credentials
2. System checks account lock status
3. If locked: Shows countdown timer
4. If wrong password: Shows attempts remaining (when ≤2)
5. On success: Records login, resets failed attempts
6. JWT token issued (15-min expiry)

### Forgot Password
1. User enters email
2. System generates secure reset token
3. Email sent with reset link (1-hour expiry)
4. User clicks link, enters new password
5. Password validated for strength
6. All sessions revoked for security
7. Confirmation email sent

---

## 📁 Files Created/Modified

### New Files (15)
```
api/
  lib/
    auth-utils.ts              # Shared auth utilities
  auth/
    verify-email.ts            # Email verification endpoint
    resend-verification.ts     # Resend verification endpoint
    forgot-password.ts         # Password reset request
    reset-password.ts          # Password reset submission

src/
  lib/
    email.ts                   # Email service with templates
  components/
    auth/
      ProtectedRoute.tsx       # Route protection component
      PasswordStrength.tsx     # Password strength indicator

SQL files:
  security-tables-schema.sql             # Security tables
  update-users-security-columns.sql      # User table updates

Config:
  .env.local.example                     # Environment template
  AUTH_SETUP_GUIDE.md                    # This file
```

### Modified Files (5)
```
api/auth/signup.ts           # ✅ Email verification added
api/auth/login.ts            # ✅ Brute force protection added
src/context/AuthContext.tsx  # ✅ emailVerified field added
src/pages/Register.tsx       # ✅ Stronger validation + password strength
src/App.tsx                  # ✅ Protected routes wrapped
.env.local                   # ✅ JWT secrets added
```

---

## 🔧 Optional Enhancements (Not Yet Implemented)

### High Priority
- [ ] **Refresh Tokens** - Longer session management
- [ ] **Rate Limiting Middleware** - Global rate limiting
- [ ] **CAPTCHA Integration** - Bot protection (Cloudflare Turnstile)
- [ ] **CSRF Protection** - Double-submit cookie pattern

### Medium Priority
- [ ] **Email Verification Pages** - Dedicated UI pages
- [ ] **Password Reset Pages** - Dedicated UI pages
- [ ] **Session Management** - View/revoke active sessions
- [ ] **2FA/MFA** - Two-factor authentication

### Low Priority
- [ ] **OAuth Integration** - Google, GitHub login
- [ ] **Remember Me** - Extended sessions
- [ ] **Password History** - Prevent password reuse
- [ ] **IP Whitelist/Blacklist** - Advanced security

---

## 🐛 Testing Checklist

Before deploying to production:

### Registration Flow
- [ ] Register with weak password (should fail)
- [ ] Register with strong password (should succeed)
- [ ] Check email received
- [ ] Click verification link
- [ ] Try accessing protected route before verification
- [ ] Try accessing protected route after verification

### Login Flow
- [ ] Login with correct credentials
- [ ] Login with wrong password (5 times)
- [ ] Observe account lockout
- [ ] Wait 30 minutes, try login again
- [ ] Check if lock auto-cleared

### Password Reset
- [ ] Request password reset
- [ ] Check email received
- [ ] Click reset link
- [ ] Try weak password (should fail)
- [ ] Set strong password (should succeed)
- [ ] Login with new password
- [ ] Verify old password doesn't work

### Security
- [ ] Try SQL injection in email field
- [ ] Try XSS in name fields
- [ ] Request password reset 4 times (should be rate limited)
- [ ] Check login_attempts table for tracking

---

## 📊 Database Tables Overview

### `users`
```sql
- email_verified (boolean)
- email_verified_at (timestamp)
- locked_until (timestamp)
- failed_login_attempts (int)
- last_login_at (timestamp)
- last_login_ip (varchar)
```

### `email_verification_tokens`
```sql
- token (unique)
- user_id (foreign key)
- expires_at (timestamp)
- used (boolean)
```

### `password_reset_tokens`
```sql
- token (unique)
- user_id (foreign key)
- expires_at (timestamp)
- used (boolean)
- ip_address (varchar)
- user_agent (text)
```

### `login_attempts`
```sql
- user_id (foreign key, nullable)
- email (varchar)
- ip_address (varchar)
- successful (boolean)
- failure_reason (varchar)
- attempted_at (timestamp)
```

### `refresh_tokens`
```sql
- token_hash (unique)
- user_id (foreign key)
- expires_at (timestamp)
- revoked (boolean)
```

---

## 💡 Tips & Best Practices

1. **Environment Variables**
   - Never commit `.env.local` to git
   - Use `.env.local.example` as template
   - Add all secrets to Vercel environment variables

2. **Email Service**
   - Test with real email addresses first
   - Check spam folder if emails not received
   - Monitor Resend dashboard for delivery stats

3. **Password Reset**
   - Tokens expire in 1 hour
   - Rate limited to prevent abuse
   - Always revokes all sessions on password change

4. **Account Lockout**
   - 30-minute auto-unlock
   - Lockout resets on successful login
   - Email sent to user on lockout

5. **Database Maintenance**
   - Run cleanup function monthly: `SELECT cleanup_expired_tokens();`
   - Monitor login_attempts table size
   - Archive old login attempts (>90 days)

---

## 🆘 Troubleshooting

### "Missing Supabase environment variables"
- Check `.env.local` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Restart dev server after adding env vars

### "Could not find table 'email_verification_tokens'"
- Run `security-tables-schema.sql` in Supabase SQL editor
- Check table was created in `public` schema

### Emails not sending
- Check `RESEND_API_KEY` is set correctly
- Verify your domain in Resend dashboard
- Check Resend dashboard for error logs
- Emails will log to console if API key is missing

### "Account locked" but it shouldn't be
- Check `locked_until` column in users table
- Run: `UPDATE users SET locked_until = NULL WHERE id = 'user-id';`
- Or wait for auto-unlock (30 minutes)

### Password strength indicator not showing
- Make sure `PasswordStrength` component is imported
- Check password field value is being passed correctly
- Inspect browser console for errors

---

## 📞 Support

If you encounter issues:

1. Check browser console for errors
2. Check API endpoint logs in Vercel
3. Check Supabase logs for database errors
4. Review this guide's troubleshooting section
5. Check the example `.env.local.example` file

---

## 🎯 Summary

Your authentication system now has:
- ✅ Secure registration with email verification
- ✅ Brute force protection with account lockout
- ✅ Password reset flow
- ✅ Strong password requirements
- ✅ Protected routes
- ✅ Beautiful email templates
- ✅ Security best practices implemented

**Next steps:** Add `SUPABASE_SERVICE_ROLE_KEY` and `RESEND_API_KEY` to `.env.local`, then test!
