# CleanInbox — What's Left To Do

Everything is organized into 3 simple sections. Start at the top and work your way down.

---

## 1. Launch Day (do these to go live)

These are the only things standing between you and a live, working app.

- [ ] **Switch Stripe to live mode** — Swap the test payment keys for real ones so customers get charged real money.
- [ ] **Deploy to Vercel** — Push the final code live.
- [ ] **Test the live site** — Go through the whole flow one time: sign up → connect Gmail → delete some emails → pay for a plan → done.

---

## 2. Do Soon After Launch

Nice to have. None of these block launch, but do them when you get a chance.

- [ ] **Set up Sentry error monitoring** — Right now if something breaks, you won't know unless a user tells you. Sentry emails you automatically. The code is already set up — just create a free account and add 2 keys.
- [ ] **Google app verification** — Remove the scary "unverified app" warning users see when connecting Gmail. Requires: (1) record a screen recording of the app, (2) upload to YouTube as Unlisted, (3) submit for review in Google Cloud Console. Takes 1-4 weeks. Users can still use the app in the meantime — they just click through the warning.
- [ ] **Microsoft app verification** — Same idea for Outlook. Create a free Microsoft Partner Network account and verify your publisher identity.
- [ ] **Rotate Upstash Redis keys** — Very low risk (only used for rate limiting), but good practice. Do it in the Upstash dashboard whenever.

---

## 3. Future Improvements

Build these whenever you want. No rush.

- [ ] **"Add to Home Screen" (PWA)** — Let phone users install the app like a native app.
- [ ] **Better server health check** — Make the server verify the database and Stripe are working, not just that it's alive.
- [ ] **Automated tests** — Write test files so bugs get caught automatically before they reach users.
- [ ] **"Match my system" dark mode** — Auto-switch light/dark based on the user's phone or computer settings.
- [ ] **Two-factor authentication (2FA)** — Extra security step when logging in.
- [ ] **View and revoke active sessions** — Let users see where they're logged in and log out of other devices.
- [ ] **Scheduled auto-cleanup** — Automatic cleanup on a schedule (daily/weekly).
- [ ] **Admin dashboard** — A private page for you to manage users and subscriptions.
- [ ] **Email analytics** — Charts showing trends like unsubscribe stats, email volume over time.

---

## Already Done (for reference)

Everything below has been completed. You don't need to do anything here — it's just a record of what was done.

<details>
<summary>Click to expand (85+ items completed)</summary>

### Security Fixes
- [x] Sanitize email HTML
- [x] CAPTCHA blocks bots properly
- [x] Free trial check blocks on failure
- [x] Removed localhost URLs from production
- [x] Removed localhost from CORS whitelist
- [x] Fixed npm security vulnerabilities
- [x] Removed .env files from git
- [x] Removed hardcoded secret fallbacks
- [x] Removed frontend discount code
- [x] Account deletion revokes Google/Microsoft access
- [x] Access tokens expire every 15 minutes
- [x] Cookie settings prevent cross-site attacks
- [x] Rate limits on login and password reset
- [x] Unsubscribe links can't hit internal servers
- [x] Plan limits enforced on the server
- [x] Refresh token rotation
- [x] Random encryption salts
- [x] Email code moved out of frontend
- [x] HTTP-only cookies for tokens
- [x] OAuth tokens removed from URL
- [x] Security headers on Railway
- [x] Stripe webhook errors sanitized
- [x] Revoke all sessions on logout
- [x] Failed payments show clear message

### Keys Rotated
- [x] JWT_SECRET, JWT_REFRESH_SECRET, RESEND_API_KEY
- [x] GMAIL_CLIENT_SECRET, GMAIL_TOKEN_ENCRYPTION_KEY
- [x] OUTLOOK_TOKEN_ENCRYPTION_KEY, OUTLOOK_CLIENT_SECRET
- [x] STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
- [x] Supabase keys

### Code & Content
- [x] Removed debug console.logs
- [x] Deleted unused files
- [x] Added 404 page
- [x] Fixed Terms of Service, Privacy Policy, How It Works, Pricing, Contact, Home page accuracy

### Testing Passed
- [x] Sign up, verify email, log in, password reset, delete account
- [x] Connect Gmail, sync emails, delete, unsubscribe, disconnect
- [x] Connect Outlook (blocked on free plan as expected)
- [x] Free trial limit works (6th action blocked)
- [x] Buy Pro, upgrade to Unlimited, cancel subscription, buy Quick Clean
- [x] Payment history, declined cards, prorated upgrades
- [x] CAPTCHA, rate limiting, security headers, full audit

### Environment & Deploy
- [x] All env vars configured (database, tokens, email, Stripe, CAPTCHA, rate limiter)
- [x] Stripe webhook pointing to production
- [x] CAPTCHA swapped to real Cloudflare Turnstile keys
- [x] Google Search Console domain verified

### SEO & User Experience
- [x] Social sharing previews (OG/Twitter cards)
- [x] Page descriptions for Google
- [x] Favicon and logo
- [x] robots.txt and sitemap.xml
- [x] Rich Google search results (JSON-LD structured data)
- [x] Canonical URLs
- [x] Faster page loading (code splitting)
- [x] Loading skeleton placeholders
- [x] Screen reader support (accessibility)
- [x] Google sign-in buttons follow branding guidelines

### Legal & Privacy
- [x] "Export My Data" button on Dashboard
- [x] Cookie banner fits on phones
- [x] Unsubscribe header in outgoing emails

### Bugs Fixed During Testing
- [x] CAPTCHA reset after failed login
- [x] Lockout message and form disable
- [x] Upgrade button goes to pricing page
- [x] Success banner auto-dismisses
- [x] Quick Clean in payment history
- [x] No duplicate charges
- [x] Quick Clean shows "Expires" not "Next Billing"
- [x] Subscription buttons hidden for Quick Clean
- [x] Free plan banner doesn't flash on refresh
- [x] From email set to support@cleaninbox.ca

</details>
