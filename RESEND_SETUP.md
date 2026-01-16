# Resend Email Setup Guide for CleanInbox

## Step 1: Create Resend Account

1. **Go to Resend:** https://resend.com/signup
2. **Sign up** with your email
3. **Verify your email** (check inbox/spam)
4. **Log in** to Resend dashboard

## Step 2: Get Your API Key

1. In Resend dashboard, click **"API Keys"** in the left sidebar
2. Click **"Create API Key"**
3. Give it a name: `CleanInbox Production`
4. Select permission: **"Full Access"** (or "Sending access" minimum)
5. Click **"Create"**
6. **COPY THE KEY** - it starts with `re_` and looks like: `re_123abc456def789ghi`
   - ⚠️ **Important:** You can only see this once! Save it somewhere safe.

## Step 3: Add API Key to Railway

1. **Go to Railway:** https://railway.app/dashboard
2. **Select your project:** `cleaninbox`
3. **Click on your service** (should be named `cleaninbox`)
4. **Click the "Variables" tab** at the top
5. **Click "+ New Variable"**
6. Add these variables:

   **Variable 1:**
   - **Variable Name:** `RESEND_API_KEY`
   - **Value:** Paste your API key (re_xxxxx...)

   **Variable 2 (Optional but recommended):**
   - **Variable Name:** `FROM_EMAIL`
   - **Value:** `CleanInbox <noreply@cleaninbox.com>`
     (Or use your own domain if you have one)

7. **Click "Add"** for each variable
8. Railway will automatically redeploy your service (takes ~30 seconds)

## Step 4: Test Email Sending

After Railway redeploys, test password reset:

1. Go to: https://cleaninbox.vercel.app/forgot-password
2. Enter your email address
3. Click "Send Reset Link"
4. **Check your email** (including spam folder)
5. You should receive a password reset email

## Step 5: Verify Custom Domain (Optional - For Production)

By default, Resend sends from `onboarding@resend.dev`. For a professional look:

1. In Resend dashboard, go to **"Domains"**
2. Click **"Add Domain"**
3. Enter your domain: `cleaninbox.com`
4. Add the DNS records Resend provides to your domain registrar:
   - **SPF record** (TXT)
   - **DKIM record** (TXT)
   - **Return-Path record** (CNAME)
5. Wait for verification (usually 5-10 minutes)
6. Once verified, update Railway variable:
   - `FROM_EMAIL` = `CleanInbox <noreply@cleaninbox.com>`

## Troubleshooting

### Email not arriving?

1. **Check spam folder**
2. **Check Railway logs:**
   - Railway dashboard → Your service → "Deployments" tab
   - Click latest deployment → "View Logs"
   - Look for "Email sent successfully" or errors
3. **Check Resend dashboard:**
   - Go to "Logs" section
   - See if emails are being sent
   - Check for bounces or errors

### Still not working?

1. **Verify API key is correct** in Railway variables
2. **Check email quota:**
   - Free plan: 100 emails/day
   - Pro plan: 50,000 emails/month
3. **Contact me** with the Railway logs

## Free Tier Limits

- **100 emails per day**
- **1 domain verification**
- **1 API key**

This is perfect for testing and small production use!

## Next Steps After Setup

Once emails are working:
1. ✅ Test signup verification emails
2. ✅ Test password reset emails
3. ✅ Test account locked notifications (after 5 failed logins)
4. Consider upgrading to Pro if you need more than 100 emails/day

---

**Questions?** Let me know if you get stuck on any step!
