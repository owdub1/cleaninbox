# Railway API Deployment Guide

This guide walks you through deploying the CleanInbox API to Railway.

## Prerequisites

- Railway account (sign up at https://railway.app)
- GitHub repository connected to Railway
- Supabase project set up
- Environment variables ready

## Step 1: Install Railway CLI (Optional)

```bash
npm install -g @railway/cli
railway login
```

## Step 2: Create New Railway Project

### Option A: Using Railway Dashboard (Recommended)

1. Go to https://railway.app/new
2. Click "Deploy from GitHub repo"
3. Select your `cleaninbox` repository
4. Railway will automatically detect your project

### Option B: Using Railway CLI

```bash
railway init
railway link
```

## Step 3: Configure Environment Variables

Copy all variables from `.env.railway.example` and add them to Railway:

### Using Railway Dashboard:

1. Go to your Railway project
2. Click on your service
3. Go to "Variables" tab
4. Click "Raw Editor" for bulk import
5. Paste all variables from `.env.railway.example`
6. Replace placeholder values with actual values

### Using Railway CLI:

```bash
# Set variables one by one
railway variables set JWT_SECRET="your-jwt-secret"
railway variables set SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
# ... etc
```

### Critical Variables to Set:

```bash
# Database & Auth
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT Secrets (MUST match your production secrets!)
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-jwt-refresh-secret

# Email
RESEND_API_KEY=re_your-api-key
FROM_EMAIL=CleanInbox <noreply@your-domain.com>

# Frontend URL for CORS
VITE_APP_URL=https://cleaninbox.vercel.app
FRONTEND_URL=https://cleaninbox.vercel.app

# CAPTCHA
TURNSTILE_SECRET_KEY=your-turnstile-secret

# Environment
NODE_ENV=production
```

## Step 4: Configure Build Settings

Railway should auto-detect these from `railway.json`, but verify:

**Build Command:** `npm run build:api`
**Start Command:** `npm run start:api`

## Step 5: Deploy

### Using Railway Dashboard:

Railway automatically deploys when you push to GitHub.

### Using Railway CLI:

```bash
railway up
```

## Step 6: Get Your API URL

After deployment:

1. Go to Railway Dashboard > Your Service
2. Click "Settings" tab
3. Scroll to "Domains"
4. Click "Generate Domain"
5. Copy your Railway URL (e.g., `https://cleaninbox-api.railway.app`)

## Step 7: Update Frontend to Use Railway API

### Update Vercel Environment Variables:

1. Go to Vercel Dashboard > cleaninbox project
2. Settings > Environment Variables
3. Add new variable:
   - **Name:** `VITE_API_URL`
   - **Value:** `https://your-api-name.railway.app` (your Railway URL)
   - **Environment:** Production, Preview, Development

### Update Frontend Code:

The frontend should already be using `import.meta.env.VITE_API_URL` for API calls.

If not, update `src/contexts/AuthContext.tsx`:

```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Use API_URL for all fetch calls
const response = await fetch(`${API_URL}/api/auth/signup`, {
  // ...
});
```

## Step 8: Verify CORS Settings

Ensure `server.ts` includes your Vercel URL in allowed origins:

```typescript
const allowedOrigins = [
  'http://localhost:5173',
  'https://cleaninbox.vercel.app',
  process.env.FRONTEND_URL || ''
].filter(Boolean);
```

## Step 9: Test Your Deployment

### Health Check:

```bash
curl https://your-api-name.railway.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-14T...",
  "service": "cleaninbox-api"
}
```

### Test Signup:

```bash
curl -X POST https://your-api-name.railway.app/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!",
    "captchaToken": "test-token"
  }'
```

## Step 10: Deploy Frontend

After confirming API works:

```bash
# In your cleaninbox directory
vercel --prod
```

Vercel will rebuild with the new `VITE_API_URL` environment variable.

## Monitoring & Logs

### View Logs:

**Railway Dashboard:**
- Go to your service > "Deployments" tab
- Click on latest deployment
- View real-time logs

**Railway CLI:**
```bash
railway logs
```

### Monitor Health:

Set up Railway health checks:
1. Railway Dashboard > Service > Settings
2. Health Check Path: `/health`
3. Health Check Timeout: 30 seconds

## Troubleshooting

### Issue: CORS errors

**Solution:** Verify `FRONTEND_URL` environment variable matches your Vercel URL exactly.

### Issue: Database connection errors

**Solution:** Check `SUPABASE_SERVICE_ROLE_KEY` and `VITE_SUPABASE_URL` are set correctly.

### Issue: JWT errors

**Solution:** Ensure `JWT_SECRET` and `JWT_REFRESH_SECRET` match your production values.

### Issue: Port binding errors

**Solution:** Railway automatically sets `PORT`. Don't override it unless necessary.

### Issue: Build fails

**Solution:**
- Check Railway build logs
- Ensure all TypeScript files compile: `npm run build:api`
- Verify all dependencies are in `package.json`

## Rollback

If deployment fails:

**Railway Dashboard:**
1. Go to Deployments tab
2. Find previous working deployment
3. Click "Redeploy"

**Railway CLI:**
```bash
railway rollback
```

## Cost Estimation

Railway offers:
- **Free Tier:** $5/month credit (great for testing)
- **Pro Plan:** $20/month (recommended for production)

Typical CleanInbox API usage:
- Memory: ~150MB
- CPU: Low (auth endpoints are fast)
- Estimated cost: ~$5-10/month

## Next Steps

After successful deployment:

1. ✅ Set up custom domain (optional)
2. ✅ Configure monitoring/alerts
3. ✅ Set up automatic backups
4. ✅ Review Railway metrics
5. ✅ Update documentation with new API URL

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- CleanInbox Issues: GitHub repository

---

**Last Updated:** 2025-01-14
