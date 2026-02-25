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
- [x] **CSRF protection on POST endpoints** — fixed in `00cd8ba` (12 sensitive endpoints + frontend sends token header)
- [x] **Tighten rate limits** — fixed in `00cd8ba` (login 5/15min, password reset 3/hr)
- [x] **SSRF protection on unsubscribe** — fixed in `00cd8ba` (block private IPs, non-HTTP schemes)
- [x] **Server-side email account limits** — fixed in `00cd8ba` (Gmail/Outlook callbacks check plan limits)
- [x] **Refresh token rotation** — fixed in `00cd8ba` (old token revoked, new token issued on each refresh)
- [x] **Random encryption salts** — fixed in `00cd8ba` (replaced hardcoded 'gmail-salt'/'outlook-salt' with random 16-byte salts)
- [x] **Move email.ts out of frontend** — fixed in `00cd8ba` (merged src/lib/email.ts into api/lib/email.ts)
- [x] **HTTP-only cookies for tokens** — fixed in `c509e0c` (full auth rewrite: localStorage → HTTP-only cookies)
- [x] **Remove OAuth tokens from URL fragment** — fixed in `c509e0c` (OAuth callback now uses `?success=true`, no tokens in URL)

### Key Rotation (Secrets Were Exposed in Git History)
- [x] **JWT_SECRET** — rotated
- [x] **JWT_REFRESH_SECRET** — rotated
- [x] **RESEND_API_KEY** — rotated
- [x] **GMAIL_CLIENT_SECRET** — rotated
- [x] **GMAIL_TOKEN_ENCRYPTION_KEY** — rotated
- [ ] **Supabase keys** — `VITE_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` should be rotated. Lower risk (protected by Row Level Security), but the old keys are in git history. Requires contacting Supabase support or creating a new project.
- [ ] **Stripe keys** — currently in test/sandbox mode so no risk. When switching to live mode, use fresh keys (don't reuse test keys).
- [ ] **Outlook keys** — not set up yet. When you add Outlook support, set `OUTLOOK_CLIENT_SECRET` and `OUTLOOK_TOKEN_ENCRYPTION_KEY` on Vercel.

### Code Cleanup
- [x] **Remove console.logs from API code** — removed all `console.log` from 10 API files. Kept `console.error` and `console.warn` for real error handling.
- [x] **Delete unused CleanInbox.tsx** — deleted `src/pages/CleanInbox.tsx` and its redirect route from `App.tsx`.
- [x] **Add a 404 page** — added `src/pages/NotFound.tsx` with catch-all `*` route in `App.tsx`.

---

## Test These Before Launch

Go through each of these on the live production site. Check them off as you go.

### Account Flows
- [ ] Sign up with a new email → verification email arrives → click link → account verified
- [ ] Log in with correct password → works
- [ ] Log in with wrong password 5 times → account locks for 30 minutes
- [ ] Request password reset → email arrives → click link → set new password → can log in
- [ ] Delete account → all data gone

### Email Features
- [ ] Connect Gmail → OAuth flow completes → emails sync → senders appear
- [ ] Connect Outlook → same as above
- [ ] Archive emails → they actually move in Gmail/Outlook
- [ ] Delete emails → they actually get deleted
- [ ] Unsubscribe from a sender → works
- [ ] As a free user, do 5 cleanup actions → 6th is blocked with upgrade prompt
- [ ] Disconnect Gmail/Outlook → access revoked

### Payments
- [ ] Buy a monthly plan → Stripe checkout → subscription shows as active → cleanup limits removed
- [ ] Buy an annual plan → same
- [ ] Buy Quick Clean (one-time $19.99) → 30-day access granted
- [ ] Upgrade from Basic to Pro → price prorated correctly
- [ ] Cancel subscription → access continues until end of billing period
- [ ] Use Stripe test card `4000000000000341` → payment fails → proper error shown

### Security Checks
- [x] Try a POST request without CSRF token → should get rejected (403) — confirmed
- [x] Hit a rate-limited endpoint many times fast → should get blocked (429) — confirmed (forgot-password, 4th request blocked)
- [x] CAPTCHA shows on signup and login — confirmed (using Turnstile test keys, swap for real keys before launch)
- [x] Visit securityheaders.com with your production URL → check for A or A+ rating — Grade A confirmed

### Pages & Legal
- [ ] `/terms-of-service` loads and reads correctly
- [ ] `/privacy-policy` loads and reads correctly
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

### Final Deploy
- [ ] Deploy to Vercel from `main`
- [ ] Test the live URL end-to-end (signup → connect Gmail → archive an email → done)

---

## Good-to-Have (Won't Block Launch, But Do Soon)

### Security Improvements
- [x] **Revoke refresh tokens on logout** — fixed in `c509e0c` (new `api/auth/logout.ts` endpoint revokes all refresh tokens + clears cookies)
- [ ] **Set up Sentry monitoring** — add `VITE_SENTRY_DSN` and `SENTRY_DSN` env vars so you get emailed when errors happen in production. The code is already wired up — you just need the Sentry account and the DSN values.
- [x] **Check past-due subscriptions** — fixed in `e3a7b33` (past-due users see "payment failed" messaging, 402 `PAYMENT_PAST_DUE` on cleanup endpoints, red banner + badge on Dashboard)

### User Experience
- [ ] **Add skeleton loaders** — some pages might flash empty before data loads. Add loading animations to the pricing page and dashboard.
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
