# CleanInbox — Launch Checklist

## Bugs & Code Fixes (Do Before Launch)

These are actual problems in the code that should be fixed.

### Security Fixes
- [x] **Sanitize email HTML** — fixed in `0b69bb7`
- [x] **CAPTCHA fails silently** — fixed in `0b69bb7`
- [x] **Free trial check fails open** — fixed in `0b69bb7`
- [x] **Remove localhost URLs from production** — fixed in `0b69bb7`
- [x] **Remove localhost from CORS whitelist** — fixed in `0b69bb7`
- [x] **npm audit vulnerabilities** — fixed in `0b69bb7`
- [x] **Remove .env files from git** — fixed in `9fb7dbd`
- [x] **Remove hardcoded JWT secret fallbacks** — fixed in `9fb7dbd` (17 files now use `requireEnv()`)
- [x] **Remove frontend discount code** — fixed in `9fb7dbd` (removed `clean25` from Checkout.tsx)
- [x] **Harden account deletion** — fixed in `9fb7dbd` (Gmail/Outlook tokens revoked before DB deletion)
- [x] **Shorten access token expiry** — fixed in `00cd8ba` (7 days → 15 minutes, env-configurable)
- [x] **CSRF protection on POST endpoints** — removed in `b891757` (SameSite=Strict + CORS already prevents CSRF)
- [x] **Tighten rate limits** — fixed in `00cd8ba` (login 5/15min, password reset 3/hr)
- [x] **SSRF protection on unsubscribe** — fixed in `00cd8ba` (block private IPs, non-HTTP schemes)
- [x] **Server-side email account limits** — fixed in `00cd8ba` (Gmail/Outlook callbacks check plan limits)
- [x] **Refresh token rotation** — fixed in `00cd8ba` (old token revoked, new token issued on each refresh)
- [x] **Random encryption salts** — fixed in `00cd8ba` (replaced hardcoded 'gmail-salt'/'outlook-salt' with random 16-byte salts)
- [x] **Move email.ts out of frontend** — fixed in `00cd8ba` (merged src/lib/email.ts into api/lib/email.ts)
- [x] **HTTP-only cookies for tokens** — fixed in `c509e0c` (full auth rewrite: localStorage → HTTP-only cookies)
- [x] **Remove OAuth tokens from URL fragment** — fixed in `c509e0c` (OAuth callback now uses `?success=true`, no tokens in URL)
- [x] **Railway security headers** — fixed in `50d0c38` (added security headers middleware to Express server)
- [x] **Stripe webhook error sanitization** — fixed in `50d0c38` (no longer leaks err.message)

### Key Rotation (Secrets Were Exposed)
- [x] **JWT_SECRET** — rotated
- [x] **JWT_REFRESH_SECRET** — rotated
- [x] **RESEND_API_KEY** — rotated
- [x] **GMAIL_CLIENT_SECRET** — rotated
- [x] **GMAIL_TOKEN_ENCRYPTION_KEY** — rotated
- [x] **OUTLOOK_TOKEN_ENCRYPTION_KEY** — rotated
- [x] **STRIPE_SECRET_KEY** — rotated
- [x] **STRIPE_WEBHOOK_SECRET** — rotated
- [x] **OUTLOOK_CLIENT_SECRET** — rotated
- [ ] **Supabase keys** — `VITE_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` should be rotated. Lower risk (protected by Row Level Security), but old keys were exposed. Requires contacting Supabase support or creating a new project.
- [ ] **Upstash Redis keys** — low priority, rate limiting only

### Code Cleanup
- [x] **Remove console.logs from API code** — removed all `console.log` from 10 API files. Kept `console.error` and `console.warn` for real error handling.
- [x] **Delete unused CleanInbox.tsx** — deleted `src/pages/CleanInbox.tsx` and its redirect route from `App.tsx`.
- [x] **Add a 404 page** — added `src/pages/NotFound.tsx` with catch-all `*` route in `App.tsx`.

### Content Accuracy Fixes
- [x] **Terms of Service** — fixed "[Your Jurisdiction]" placeholder → Province of Quebec, Canada. Hardcoded "Last Updated" date.
- [x] **Privacy Policy** — fixed "not stored" claim (metadata IS stored), "E2E encryption" → "TLS/SSL", hardcoded date, added sub-processor disclosures (Supabase, Stripe, Resend, Upstash, Cloudflare, Google, Microsoft).
- [x] **How It Works** — fixed "No email data stored" → "No email bodies or attachments stored". Added delete as primary action alongside unsubscribe.
- [x] **Pricing page** — aligned features with PLAN_LIMITS. Fixed FAQ "next billing cycle" → "upgrades take effect immediately".
- [x] **Contact page** — updated "Gmail only, Outlook coming soon" → "Gmail and Outlook".
- [x] **Home page** — "No Data Retention" → "You Control Your Data".
- [x] **PLAN_LIMITS** — removed fake features (Scheduled cleanup, Custom domain support, Priority phone support).

---

## Test These Before Launch

Go through each of these on the live production site. Check them off as you go.

### Account Flows
- [x] Sign up with a new email → verification email arrives → click link → account verified
- [x] Log in with correct password → works
- [x] Log in with wrong password 5+ times → rate limiter blocks with "try again in 30 minutes" + form disabled
- [x] Request password reset → email arrives → click link → set new password → can log in
- [x] Delete account → all data gone, logged out, can't log back in

### Email Features
- [x] Connect Gmail → OAuth flow completes → emails sync → senders appear
- [x] Connect Outlook → account limit enforced on free plan (blocks 2nd account)
- [x] Delete emails → they actually get deleted in Gmail
- [x] Unsubscribe from a sender → works (tested previously)
- [x] As a free user, do 5 cleanup actions → 6th is blocked with upgrade prompt
- [x] Disconnect Gmail → access revoked

### Payments
- [x] Declined credit cards show proper error messages (tested 4000000000000002 + 4000000000009995)
- [x] Buy Pro plan (monthly) → Stripe checkout → subscription shows as active
- [x] Upgrade from Pro to Unlimited → price prorated correctly (CA$7.99 proration invoice)
- [x] Cancel subscription → access continues until end of billing period, shows "Access Until" date
- [x] Buy Quick Clean (one-time $19.99) → 30-day access granted, shows "Expires" label
- [x] Quick Clean shows in payment history
- [x] Quick Clean dashboard hides Manage Billing/Cancel buttons
- [x] Payment history shows all invoices with PDF links

### Bugs Fixed During Testing
- [x] **CAPTCHA not resetting after failed login** — fixed with key remount approach (`e04337e`)
- [x] **Lockout UX** — shows "try again in 30 minutes" + disables form (`f329572`)
- [x] **Upgrade button went to Unlimited** — now goes to pricing page (`b4e466c`)
- [x] **Success banner not auto-dismissing** — separated timer into own useEffect (`7369385`)
- [x] **Quick Clean missing from payment history** — added checkout session fetch (`0342595`)
- [x] **Duplicate charges in payment history** — removed charge query, use checkout sessions only (`0342595`)
- [x] **Quick Clean showing "Next Billing"** — shows "Expires" instead (`8795669`)
- [x] **Manage Billing/Cancel for Quick Clean** — hidden for one-time plans (`8795669`)
- [x] **Free plan banner flash on hard refresh** — hidden while subscription loading (`f22dbb8`)
- [x] **From email** — changed to support@cleaninbox.ca (`b58a46b`)

### Security Checks
- [x] Try a POST request without CSRF token → should get rejected (403) — confirmed
- [x] Hit a rate-limited endpoint many times fast → should get blocked (429) — confirmed (forgot-password, 4th request blocked)
- [x] CAPTCHA shows on signup and login — confirmed (using Turnstile test keys, swap for real keys before launch)
- [x] Visit securityheaders.com with your production URL → check for A or A+ rating — Grade A confirmed
- [x] Full security audit — all measures intact after restructuring (`50d0c38`)

### Pages & Legal
- [x] All static pages audited for accuracy and fixed
- [x] `/terms-of-service` loads correctly with proper jurisdiction
- [x] `/privacy-policy` loads correctly with accurate claims
- [ ] Cookie consent banner appears for first-time visitors
- [ ] All footer links work (Terms, Privacy, Contact)
- [ ] Contact form sends a message successfully

### Environment Variables (Verify in Vercel Dashboard)
- [ ] `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `JWT_SECRET` + `JWT_REFRESH_SECRET`
- [ ] `RESEND_API_KEY` + `FROM_EMAIL`
- [ ] `VITE_APP_URL` (set to your real domain, NOT localhost)
- [ ] `VITE_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY`
- [ ] `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` + `STRIPE_PRODUCT_ID`
- [ ] `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
- [ ] `ACCESS_TOKEN_EXPIRY` (optional, defaults to `15m`)
- [ ] `PASSWORD_RESET_TOKEN_EXPIRY` (should be `1h`)
- [ ] `EMAIL_VERIFICATION_TOKEN_EXPIRY` (should be `24h`)
- [ ] Stripe webhook URL in Stripe Dashboard points to your production domain

### Not Tested (Hard to Simulate)
- [ ] Annual billing (same checkout flow as monthly, different interval)
- [ ] Failed payment renewal / past-due messaging (requires Stripe to fail a renewal)
- [ ] Account lockout full retest (rate limiter window needs to expire first)

### Final Deploy
- [ ] Switch Stripe from sandbox to live mode with fresh keys
- [ ] Swap Turnstile test keys for real production keys
- [ ] Deploy to Vercel from `main`
- [ ] Test the live URL end-to-end (signup → connect Gmail → delete emails → done)

---

## Good-to-Have (Won't Block Launch, But Do Soon)

### Security Improvements
- [x] **Revoke refresh tokens on logout** — fixed in `c509e0c` (new `api/auth/logout.ts` endpoint revokes all refresh tokens + clears cookies)
- [ ] **Set up Sentry monitoring** — add `VITE_SENTRY_DSN` and `SENTRY_DSN` env vars so you get emailed when errors happen in production. The code is already wired up — you just need the Sentry account and the DSN values.
- [x] **Check past-due subscriptions** — fixed in `e3a7b33` (past-due users see "payment failed" messaging, 402 `PAYMENT_PAST_DUE` on cleanup endpoints, red banner + badge on Dashboard)

### User Experience
- [x] **Add skeleton loaders** — dashboard shows pulsing grey placeholders while data loads (`d6852cd`)
- [ ] **Improve accessibility** — add `aria-label` attributes to buttons (especially icon-only buttons), `alt` text on images, and make sure everything works with keyboard navigation.

### SEO & Marketing
- [ ] Add Open Graph meta tags (so links look nice when shared on Twitter/Facebook/Slack)
- [ ] Add Twitter Card meta tags
- [ ] Add meta descriptions to each page
- [ ] Add a proper favicon and logo

### Future Features
- [ ] Two-factor authentication (2FA)
- [ ] View and revoke active login sessions
- [ ] Scheduled auto-cleanup (daily/weekly)
- [ ] Admin dashboard for managing users and subscriptions
- [ ] Email analytics (trends, unsubscribe stats)
