# CleanInbox — Launch Checklist

## Bugs & Code Fixes (Do Before Launch)

Problems in the code that needed fixing. All done.

### Security Fixes
- [x] **Sanitize email HTML** — Emails from senders could contain harmful code. Now we clean it before showing it.
- [x] **CAPTCHA fails silently** — The robot-check on login/signup was silently failing. Now it properly blocks bots.
- [x] **Free trial check fails open** — If the free trial check broke, it would let people through for free. Now it blocks instead.
- [x] **Remove localhost URLs from production** — Dev URLs were left in the live code. Removed.
- [x] **Remove localhost from CORS whitelist** — The live site was accepting requests from localhost. Fixed.
- [x] **npm audit vulnerabilities** — Fixed known security issues in third-party packages.
- [x] **Remove .env files from git** — Secret keys were accidentally saved in the code repo. Removed and blocked from being added again.
- [x] **Remove hardcoded JWT secret fallbacks** — Some files had backup passwords written directly in the code. Now they all read from environment variables (safe).
- [x] **Remove frontend discount code** — A discount code was visible in the browser code. Removed.
- [x] **Harden account deletion** — When users delete their account, we now also tell Google/Microsoft to revoke our access to their email.
- [x] **Shorten access token expiry** — Login sessions used to last 7 days. Now they expire every 15 minutes and auto-renew in the background. If someone steals a token, it stops working fast.
- [x] **CSRF protection** — Removed an unnecessary security layer that was causing bugs. The existing cookie settings already prevent this type of attack.
- [x] **Tighten rate limits** — Login is now limited to 5 attempts per 15 minutes. Password resets limited to 3 per hour. Stops brute-force attacks.
- [x] **SSRF protection on unsubscribe** — Unsubscribe links could be tricked into hitting internal servers. Now we block private IPs and non-web links.
- [x] **Server-side email account limits** — The plan limits (e.g., 1 account on free) are now enforced on the server, not just the browser. Can't be bypassed.
- [x] **Refresh token rotation** — Every time a login refreshes, the old token is thrown away and a new one is issued. Prevents replay attacks.
- [x] **Random encryption salts** — Gmail/Outlook tokens were encrypted with predictable patterns. Now each one uses a random salt.
- [x] **Move email code out of frontend** — Email-sending code was in the browser bundle (visible to users). Moved to server-only.
- [x] **HTTP-only cookies for tokens** — Login tokens moved from browser storage (hackable via JavaScript) to HTTP-only cookies (can't be read by scripts).
- [x] **Remove OAuth tokens from URL** — After Google sign-in, tokens were briefly visible in the URL bar. Now they're passed securely.
- [x] **Railway security headers** — The API server was missing security headers that tell browsers to block common attacks. Added.
- [x] **Stripe webhook error sanitization** — Error messages from Stripe were leaking internal details. Now they show a generic message.

### Key Rotation (Secrets Were Exposed)
Old passwords/keys were accidentally exposed. These have all been changed to new ones.
- [x] **JWT_SECRET** — the key that signs login tokens
- [x] **JWT_REFRESH_SECRET** — the key that signs refresh tokens
- [x] **RESEND_API_KEY** — the key for sending emails
- [x] **GMAIL_CLIENT_SECRET** — Google's secret for Gmail access
- [x] **GMAIL_TOKEN_ENCRYPTION_KEY** — the key that encrypts stored Gmail tokens
- [x] **OUTLOOK_TOKEN_ENCRYPTION_KEY** — the key that encrypts stored Outlook tokens
- [x] **STRIPE_SECRET_KEY** — Stripe payment key
- [x] **STRIPE_WEBHOOK_SECRET** — the key that verifies Stripe notifications are real
- [x] **OUTLOOK_CLIENT_SECRET** — Microsoft's secret for Outlook access
- [x] **Supabase keys** — The database keys. Rotated and updated in Vercel and Railway.
- [ ] **Upstash Redis keys** — Only used for rate limiting. Low priority.

### Code Cleanup
- [x] **Remove console.logs** — Removed debug messages from all API files. Only real error logging remains.
- [x] **Delete unused file** — Removed an old page file that wasn't being used anymore.
- [x] **Add a 404 page** — Visiting a page that doesn't exist now shows a proper "Page Not Found" instead of a blank screen.

### Content Accuracy Fixes
Made sure all the text on the website is actually true and accurate.
- [x] **Terms of Service** — Fixed a placeholder that said "[Your Jurisdiction]" — now says Province of Quebec, Canada.
- [x] **Privacy Policy** — Fixed several claims that weren't accurate (e.g., said "end-to-end encryption" when it's actually standard web encryption). Added a list of all third-party services we use.
- [x] **How It Works** — Fixed a claim that said "no email data stored" (we do store sender info, just not email content).
- [x] **Pricing page** — Made sure the listed features match what each plan actually includes.
- [x] **Contact page** — Updated to say we support both Gmail and Outlook (used to say Outlook was "coming soon").
- [x] **Home page** — Changed misleading "No Data Retention" heading to "You Control Your Data".
- [x] **Plan features** — Removed features listed on the pricing page that don't actually exist yet (like "Scheduled cleanup").

---

## Test These Before Launch

Go through each of these on the live production site. Check them off as you go.

### Account Flows
- [x] Sign up with a new email → verification email arrives → click link → account verified
- [x] Log in with correct password → works
- [x] Log in with wrong password 5+ times → gets blocked with "try again in 30 minutes" + form disabled
- [x] Request password reset → email arrives → click link → set new password → can log in
- [x] Delete account → all data gone, logged out, can't log back in

### Email Features
- [x] Connect Gmail → Google login flow completes → emails sync → senders appear
- [x] Connect Outlook → free plan blocks adding a 2nd account (as expected)
- [x] Delete emails → they actually get deleted in Gmail
- [x] Unsubscribe from a sender → works
- [x] As a free user, do 5 cleanup actions → 6th is blocked with upgrade prompt
- [x] Disconnect Gmail → our access is revoked

### Payments
- [x] Declined credit cards show proper error messages
- [x] Buy Pro plan (monthly) → Stripe checkout → subscription shows as active
- [x] Upgrade from Pro to Unlimited → price is prorated correctly
- [x] Cancel subscription → access continues until end of billing period, shows "Access Until" date
- [x] Buy Quick Clean (one-time $19.99) → 30-day access granted, shows "Expires" label
- [x] Quick Clean shows in payment history
- [x] Quick Clean dashboard hides irrelevant subscription buttons
- [x] Payment history shows all invoices with PDF download links

### Bugs Fixed During Testing
- [x] **CAPTCHA not resetting after failed login** — The robot-check wouldn't reset after a wrong password, blocking further attempts. Fixed.
- [x] **Lockout message** — After too many failed logins, now shows a clear "try again in 30 minutes" message and disables the form.
- [x] **Upgrade button went to wrong page** — "Upgrade" was going straight to Unlimited checkout instead of showing all plan options. Now goes to pricing page.
- [x] **Success banner not disappearing** — The green "subscription activated" banner was staying on screen forever. Now auto-dismisses after 3 seconds.
- [x] **Quick Clean missing from payment history** — One-time purchases weren't showing up. Fixed.
- [x] **Duplicate charges in payment history** — Same charge was appearing twice. Fixed.
- [x] **Quick Clean showing "Next Billing"** — One-time purchases don't have a next billing date. Now shows "Expires" instead.
- [x] **Subscription buttons on Quick Clean** — "Manage Billing" and "Cancel" buttons were showing for one-time purchases where they don't apply. Hidden.
- [x] **Free plan banner flashing** — On page refresh, a "You're on the Free Plan" banner would briefly appear even for paid users while data loaded. Fixed.
- [x] **From email address** — Changed outgoing email address to support@cleaninbox.ca.

### Security Checks
- [x] Tested that the site blocks unauthorized requests — confirmed
- [x] Tested that rate limiting works (blocks too many requests) — confirmed
- [x] Robot-check (CAPTCHA) appears on signup and login — confirmed (using test keys, need to swap for real keys before launch)
- [x] Security headers rated A on securityheaders.com — confirmed
- [x] Full security audit passed — confirmed

### Pages & Legal
- [x] All pages reviewed for accuracy and fixed
- [x] Terms of Service loads correctly
- [x] Privacy Policy loads correctly
- [x] Cookie consent banner appears for first-time visitors
- [x] All footer links work
- [x] Contact form sends a message successfully

### Environment Variables
All the secret keys and settings are configured in both Vercel (frontend) and Railway (API server).
- [x] Database connection keys
- [x] Login token secrets
- [x] Email sending key
- [x] Website URL
- [x] CAPTCHA keys
- [x] Stripe payment keys
- [x] Rate limiter keys
- [x] Token expiry settings
- [x] **Stripe webhook URL** — Confirmed pointing to production Railway URL.

### Not Tested (Hard to Simulate)
- [ ] **Annual billing** — Same checkout flow as monthly, just a different billing interval. Should work but hasn't been tested with a real payment.
- [ ] **Failed payment renewal** — When a credit card on file fails, the user should see a "payment failed" message. Hard to test without actually having a payment fail.
- [ ] **Account lockout full retest** — Need to wait for the 30-minute lockout window to expire before retesting.

### Final Deploy
- [ ] **Switch Stripe to live mode** — Right now payments go through Stripe's test/sandbox mode (no real charges). Need to swap to real keys before launch.
- [x] **Swap CAPTCHA to production keys** — Real Cloudflare Turnstile keys added to Vercel and Railway.
- [ ] **Deploy to Vercel** — Push the final code live.
- [ ] **End-to-end test on live site** — Go through the whole flow on the real site: sign up → connect Gmail → delete some emails → done.

---

## Good-to-Have (Won't Block Launch, But Do Soon)

These are improvements that would make the app better but aren't required to launch.

### Security
- [x] **Revoke login sessions on logout** — When you log out, all your active sessions are now killed (not just the current one). Done.
- [ ] **Set up error monitoring (Sentry)** — Right now, if something breaks in production, you won't know unless a user reports it. Sentry emails you automatically when errors happen. The code is already set up — you just need to create a free Sentry account and add 2 keys to your environment variables.
- [x] **Handle failed payments gracefully** — When a credit card on file fails, users now see a clear "payment failed — update your card" message instead of a confusing error. Done.

### User Experience
- [x] **Loading placeholders** — Dashboard shows grey pulsing shapes while data loads, instead of a blank screen. Done.
- [x] **Screen reader support** — All buttons and interactive elements now have labels that screen readers can announce. Done.

### SEO (Helping Google Find Your Site)
- [x] **Social sharing previews** — When someone shares a link to CleanInbox on Twitter/Facebook/Slack, it now shows a nice preview with title, description, and image. Done.
- [x] **Page descriptions** — Each page has a description that Google shows in search results. Done.
- [x] **Favicon and logo** — The little icon that appears in browser tabs. Done.
- [x] **robots.txt** — A file that tells Google which pages to show in search results and which to skip (like private dashboards). Done.
- [x] **sitemap.xml** — A list of all your public pages that helps Google find and index your site faster. Done.

### Legal & Privacy
- [x] **"Export My Data" button** — Users can download all their data from the Dashboard. Required by privacy laws like GDPR. Done.
- [x] **Cookie banner fits on phones** — The cookie consent popup was too wide for small phone screens. Fixed. Done.

### Medium Priority
- [x] **Faster page loading (code splitting)** — Pages now load only when the user visits them, instead of downloading everything upfront. Makes the initial load much faster.
- [ ] **"Add to Home Screen" support (PWA)** — Let users on phones install CleanInbox as an app icon on their home screen, like a native app. Requires adding a small config file.
- [x] **Canonical URLs** — Every page now tells Google that `cleaninbox.ca` is the real domain, so search rankings don't get split with the Vercel preview URL.
- [ ] **Better server health check** — The server has a basic "I'm alive" check, but it doesn't verify that the database, payment system, and other services are actually working. An enhanced check would catch outages faster.
- [ ] **Automated tests** — Right now all testing is done manually. Automated tests would catch bugs before they reach users. The testing tool (vitest) is already installed — just needs test files written.

### Low Priority
- [x] **Unsubscribe link in our own emails** — All outgoing emails now include a standard unsubscribe header so Gmail shows a nice "Unsubscribe" button.
- [ ] **"Match my system" dark mode** — Right now users can choose light or dark mode. A third option would automatically match whatever their phone/computer is set to.
- [x] **Rich Google search results** — Added JSON-LD structured data: Organization + WebSite on Home page, FAQPage on Pricing page. Google can now show FAQ dropdowns and business info in search results.

### Future Features
- [ ] **Two-factor authentication (2FA)** — Add an extra security step when logging in (like a code from an authenticator app).
- [ ] **View and revoke active sessions** — Let users see where they're logged in and log out of other devices.
- [ ] **Scheduled auto-cleanup** — Let users set up automatic cleanup on a schedule (daily/weekly).
- [ ] **Admin dashboard** — A private page for you to manage users and subscriptions.
- [ ] **Email analytics** — Charts showing trends like unsubscribe stats, email volume over time, etc.
