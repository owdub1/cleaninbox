# CleanInbox — Launch Checklist

## Bugs & Code Fixes (Do Before Launch)

These are actual problems in the code that should be fixed.

### Security Fixes
- [ ] **Sanitize email HTML** — `EmailViewModal.tsx` uses `dangerouslySetInnerHTML` to display email content. If a spammy email has malicious code in it, it could run in your user's browser. Fix: add a library like DOMPurify to clean the HTML before displaying it.
- [ ] **CAPTCHA fails silently** — if the Turnstile secret key isn't set, CAPTCHA is just skipped instead of blocking the request. In production, if the env var is missing, signups/logins would have no bot protection.
- [ ] **Free trial check fails open** — if the database call to check free trial limits fails (e.g. Supabase is briefly down), the code says "allow it anyway." This means a database hiccup would let free users do unlimited cleanups. It should block instead.
- [ ] **Remove localhost URLs from production** — several API files fall back to `http://localhost:5173` if the `VITE_APP_URL` env var isn't set. If that var is ever missing in Vercel, OAuth redirects and emails would point to localhost. Files: `signup.ts`, `forgot-password.ts`, `gmail/callback.ts`, `outlook/callback.ts`, `subscription/get.ts`.
- [ ] **Remove localhost from CORS whitelist** — `api/subscription/get.ts` has hardcoded `localhost:5173` and `localhost:3000` in allowed origins. Remove these for production.
- [ ] **npm audit vulnerabilities** — 30 vulnerabilities (23 high), including an XSS issue in react-router-dom. Run `npm audit fix` and test that nothing breaks.

### Code Cleanup
- [ ] **Remove console.logs from API code** — there are 200+ `console.log` statements scattered across the API files. These are debug messages that clutter logs and could accidentally leak info. Remove them or replace critical ones with Sentry error tracking.
- [ ] **Delete unused CleanInbox.tsx** — `src/pages/CleanInbox.tsx` exists but isn't used anywhere. The real page is `EmailCleanup.tsx`. It's just dead code sitting there.
- [ ] **Add a 404 page** — if someone visits a URL that doesn't exist (like `/asdfasdf`), there's no "page not found" screen. Add a catch-all route.

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
- [ ] Try a POST request without CSRF token → should get rejected (403)
- [ ] Hit a rate-limited endpoint many times fast → should get blocked (429)
- [ ] CAPTCHA shows on signup and login
- [ ] Visit securityheaders.com with your production URL → check for A or A+ rating

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
- [ ] `PASSWORD_RESET_TOKEN_EXPIRY` (should be `1h`)
- [ ] `EMAIL_VERIFICATION_TOKEN_EXPIRY` (should be `24h`)
- [ ] Stripe webhook URL in Stripe Dashboard points to your production domain

### Final Deploy
- [ ] Deploy to Vercel from `main`
- [ ] Test the live URL end-to-end (signup → connect Gmail → archive an email → done)

---

## Good-to-Have (Won't Block Launch, But Do Soon)

### Security Improvements
- [ ] **Revoke refresh tokens on logout** — right now, logging out just clears the browser. The old login token still works until it naturally expires. Low risk since tokens expire on their own, but better to kill them right away. (There's a TODO comment in `AuthContext.tsx` for this.)
- [ ] **Set up Sentry monitoring** — add `VITE_SENTRY_DSN` and `SENTRY_DSN` env vars so you get emailed when errors happen in production. The code is already wired up — you just need the Sentry account and the DSN values.
- [ ] **Check past-due subscriptions** — if someone's payment fails and their subscription goes to "past_due" status, they might still be able to use cleanup features. Add a check for this.

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
