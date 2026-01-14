# 🚀 Quick Setup Instructions

## Step 1: Get Your API Keys

### A. Supabase Service Role Key

1. Open this link: https://supabase.com/dashboard/project/clryyrrhbadvfdgtwvad/settings/api
2. Scroll down to **"Project API keys"**
3. Find the key labeled **"service_role"** (NOT "anon")
4. Click the **eye icon** to reveal the key
5. Click **Copy**
6. Open `.env.local` and paste it after `SUPABASE_SERVICE_ROLE_KEY=`

**Important:** This is a SECRET key - never commit it to git or expose it to the frontend!

### B. Resend API Key (Optional but Recommended)

1. Go to: https://resend.com
2. Click **"Sign up"** or **"Login"**
3. After logging in, go to: https://resend.com/api-keys
4. Click **"Create API Key"**
5. Name it: "CleanInbox Production"
6. Click **Create**
7. Copy the key (starts with `re_`)
8. Open `.env.local` and paste it after `RESEND_API_KEY=`

**Note:** Without this, emails won't send but auth will still work.

---

## Step 2: Run SQL Schemas in Supabase

### Quick Method (Copy-Paste)

1. Go to Supabase SQL Editor: https://supabase.com/dashboard/project/clryyrrhbadvfdgtwvad/sql/new
2. Copy the contents of `update-users-security-columns.sql` (see below)
3. Paste into SQL editor
4. Click **"Run"**
5. Wait for success ✅
6. Copy the contents of `security-tables-schema.sql` (see below)
7. Paste into SQL editor
8. Click **"Run"**
9. Wait for success ✅

### SQL File 1: update-users-security-columns.sql

```sql
-- Add security columns to users table
-- This migration adds email verification, account lockout, and audit columns

-- Add email verification columns
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP WITH TIME ZONE;

-- Add account lockout columns
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;

-- Add audit columns
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_login_ip VARCHAR(45);

-- Add index for faster email verification checks
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON public.users(email_verified);

-- Add index for locked accounts
CREATE INDEX IF NOT EXISTS idx_users_locked_until ON public.users(locked_until) WHERE locked_until IS NOT NULL;

-- Comments for documentation
COMMENT ON COLUMN users.email_verified IS 'Whether the user has verified their email address';
COMMENT ON COLUMN users.email_verified_at IS 'Timestamp when the email was verified';
COMMENT ON COLUMN users.locked_until IS 'Timestamp until which the account is locked (NULL if not locked)';
COMMENT ON COLUMN users.failed_login_attempts IS 'Number of consecutive failed login attempts';
COMMENT ON COLUMN users.last_login_at IS 'Timestamp of the user''s last successful login';
COMMENT ON COLUMN users.last_login_ip IS 'IP address of the user''s last successful login';

-- Update existing users to have email_verified = true (optional: grandfathering)
-- Comment out if you want existing users to verify their emails
UPDATE public.users
SET email_verified = TRUE, email_verified_at = created_at
WHERE email_verified IS NULL OR email_verified = FALSE;
```

### SQL File 2: security-tables-schema.sql

**This is a long file. I'll read it and you can copy-paste from the actual file.**

After running both SQL files, you should see:
- ✅ Users table updated with new columns
- ✅ 4 new tables created (email_verification_tokens, password_reset_tokens, login_attempts, refresh_tokens)
- ✅ Helper functions created

---

## Step 3: Verify Everything Works

```bash
# 1. Restart your dev server
npm run dev

# 2. Test registration
# Go to: http://localhost:5173/register
# Create an account with a strong password

# 3. Check Supabase tables
# Go to: https://supabase.com/dashboard/project/clryyrrhbadvfdgtwvad/editor
# You should see new data in:
# - users (your new user)
# - email_verification_tokens (verification token)
# - login_attempts (if you tried logging in)

# 4. Check email (if Resend is configured)
# You should receive a verification email

# 5. Test login
# Try logging in with the account you just created
```

---

## Troubleshooting

### "Missing Supabase environment variables"
- Make sure you pasted the keys in `.env.local`
- Restart your dev server: `Ctrl+C` then `npm run dev`

### SQL error: "relation already exists"
- This is OK! It means the table was already created
- The `IF NOT EXISTS` clause prevents errors

### Emails not sending
- This is expected if you haven't set up Resend yet
- Check browser console - it should log "Email would be sent"
- Authentication still works, just without emails

### "Could not find table"
- Make sure you ran BOTH SQL files
- Check the Supabase Table Editor to verify tables exist

---

## Next Steps After Setup

1. Test the full registration flow
2. Test the login flow with wrong passwords (to see lockout)
3. Test the forgot password flow
4. Add your production domain to Resend (for sending emails)
5. Update `VITE_APP_URL` in production environment

---

## Security Checklist

- [ ] Service role key added to `.env.local`
- [ ] `.env.local` is in `.gitignore` (DO NOT COMMIT)
- [ ] Both SQL schemas executed successfully
- [ ] Dev server restarted
- [ ] Registration tested
- [ ] Login tested
- [ ] Resend API key added (optional)
- [ ] Email sending tested (optional)

---

Need help? Check `AUTH_SETUP_GUIDE.md` for detailed documentation!
