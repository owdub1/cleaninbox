# CleanInbox — Launch Checklist

## Must-Do Before Launch

### Test Core Flows
- [ ] **Signup** — create account, verify email, login
- [ ] **Login** — correct password works, wrong password fails, account locks after 5 bad attempts
- [ ] **Password reset** — request email, click link, set new password
- [ ] **Gmail connect** — OAuth flow, emails sync, sender list appears
- [ ] **Outlook connect** — OAuth flow, emails sync, sender list appears
- [ ] **Archive emails** — emails actually move in Gmail/Outlook
- [ ] **Delete emails** — emails actually get deleted in Gmail/Outlook
- [ ] **Unsubscribe** — unsubscribe action works for senders with unsubscribe links
- [ ] **Free user limits** — cleanup actions stop after 5 (user sees upgrade prompt)
- [ ] **Disconnect** — Gmail/Outlook disconnect revokes access properly

### Test Payments
- [ ] **Monthly plan checkout** — Stripe checkout → subscription active → features unlocked
- [ ] **Annual plan checkout** — same as above with annual pricing
- [ ] **Quick Clean (one-time)** — $19.99 → 30-day access granted
- [ ] **Upgrade plan** — e.g. Basic → Pro, prorated correctly
- [ ] **Cancel subscription** — user can cancel, access continues until period ends
- [ ] **Payment failure** — use Stripe test card `4000000000000341` → proper error shown

### Verify Security
- [ ] **CSRF protection** — API rejects POST requests without CSRF token
- [ ] **Rate limiting** — rapid requests get blocked (429 response)
- [ ] **CAPTCHA** — signup/login show Turnstile challenge
- [ ] **Security headers** — check at securityheaders.com after deploy

### Verify Environment Variables (in Vercel)
- [ ] `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `JWT_SECRET` + `JWT_REFRESH_SECRET`
- [ ] `RESEND_API_KEY` + `FROM_EMAIL`
- [ ] `VITE_APP_URL` (set to production domain)
- [ ] `VITE_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY`
- [ ] `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` + `STRIPE_PRODUCT_ID`
- [ ] `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`

### Legal & Compliance
- [ ] `/terms-of-service` page loads and reads correctly
- [ ] `/privacy-policy` page loads and reads correctly
- [ ] Cookie consent banner appears for new visitors
- [ ] Footer links all work (Terms, Privacy, Contact)

### Final Deploy
- [ ] Deploy to Vercel from `main`
- [ ] Test the live production URL end-to-end
- [ ] Stripe webhook endpoint registered and pointing to production URL

---

## Good-to-Have (Not Blocking Launch)

### Security Improvements
- [ ] **Revoke refresh tokens on logout** — right now logout just clears the browser, the old token still technically works until it expires. Low risk since tokens expire on their own, but better to kill them immediately.
- [ ] **Set up Sentry** — add `VITE_SENTRY_DSN` and `SENTRY_DSN` env vars so you get notified when errors happen in production

### SEO & Marketing
- [ ] Add Open Graph meta tags (so links look good when shared on social media)
- [ ] Add Twitter Card meta tags
- [ ] Add meta descriptions to pages
- [ ] Add a proper favicon/logo

### Future Features
- [ ] Two-factor authentication (2FA)
- [ ] View/revoke active sessions
- [ ] Scheduled auto-cleanup (daily/weekly)
- [ ] Admin dashboard for managing users & subscriptions
- [ ] Email analytics (trends, unsubscribe effectiveness)
