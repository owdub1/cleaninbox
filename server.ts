import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

// CleanInbox API Server - v1.1

// Import API handlers
import signup from './api/auth/signup.js';
import login from './api/auth/login.js';
import verifyEmail from './api/auth/verify-email.js';
import resendVerification from './api/auth/resend-verification.js';
import forgotPassword from './api/auth/forgot-password.js';
import resetPassword from './api/auth/reset-password.js';
import refresh from './api/auth/refresh.js';

// Google OAuth routes (for Sign-In with Google)
import googleOAuth from './api/auth/oauth/google.js';
import googleOAuthCallback from './api/auth/oauth/callback.js';

// Gmail OAuth routes
import gmailConnect from './api/gmail/connect.js';
import gmailCallback from './api/gmail/callback.js';
import gmailDisconnect from './api/gmail/disconnect.js';

// Outlook OAuth routes
import outlookConnect from './api/outlook/connect.js';
import outlookCallback from './api/outlook/callback.js';
import outlookDisconnect from './api/outlook/disconnect.js';

// Email routes
import emailsSync from './api/emails/sync.js';
import emailsSenders from './api/emails/senders.js';
import emailsBySender from './api/emails/by-sender.js';
import emailsGet from './api/emails/get.js';
import emailsDebugSender from './api/emails/debug-sender.js';

// Cleanup routes
import cleanupDelete from './api/cleanup/delete.js';
import cleanupDeleteSingle from './api/cleanup/delete-single.js';
import cleanupArchive from './api/cleanup/archive.js';
import cleanupUnsubscribe from './api/cleanup/unsubscribe.js';

// Subscription routes
import subscriptionGet from './api/subscription/get.js';
import subscriptionCancel from './api/subscription/cancel.js';

// Stripe routes
import stripeCreateCheckout from './api/stripe/create-checkout.js';
import stripeWebhook from './api/stripe/webhook.js';
import stripePortal from './api/stripe/portal.js';
import stripeInvoices from './api/stripe/invoices.js';

// Activity routes
import activityGet from './api/activity/get.js';
import activityLog from './api/activity/log.js';

// User routes
import userUpdateProfile from './api/user/update-profile.js';
import userDeleteAccount from './api/user/delete-account.js';
import userFreeActions from './api/user/free-actions.js';
import userDashboardData from './api/user/dashboard-data.js';

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://cleaninbox.vercel.app',
  process.env.FRONTEND_URL || ''
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    // Check exact origin match (parse URL to avoid substring attacks)
    try {
      const originUrl = new URL(origin);
      const originBase = `${originUrl.protocol}//${originUrl.host}`;

      // Allow Vercel preview deployments (must end with .vercel.app)
      if (originUrl.host.endsWith('.vercel.app') || originUrl.host === 'cleaninbox.ca' || originUrl.host === 'www.cleaninbox.ca') {
        return callback(null, true);
      }

      if (allowedOrigins.some(allowed => {
        try { return originBase === new URL(allowed).origin; } catch { return originBase === allowed; }
      })) {
        callback(null, true);
      } else {
        console.warn('CORS blocked origin:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    } catch {
      console.warn('CORS blocked invalid origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Wrapper to convert Vercel handlers to Express handlers
const wrapHandler = (handler: any) => {
  return async (req: Request, res: Response) => {
    try {
      await handler(req, res);
    } catch (error: any) {
      console.error('Handler error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Internal server error',
          message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    }
  };
};

// Stripe webhook must be registered BEFORE express.json() to get the raw body
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), wrapHandler(stripeWebhook));

// Middleware
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'cleaninbox-api'
  });
});

// Auth routes
app.post('/api/auth/signup', wrapHandler(signup));
app.post('/api/auth/login', wrapHandler(login));
app.post('/api/auth/verify-email', wrapHandler(verifyEmail));
app.get('/api/auth/verify-email', wrapHandler(verifyEmail));
app.post('/api/auth/resend-verification', wrapHandler(resendVerification));
app.post('/api/auth/forgot-password', wrapHandler(forgotPassword));
app.post('/api/auth/reset-password', wrapHandler(resetPassword));
app.post('/api/auth/refresh', wrapHandler(refresh));

// Google OAuth routes (Sign-In with Google)
app.get('/api/auth/oauth/google', wrapHandler(googleOAuth));
app.get('/api/auth/oauth/callback', wrapHandler(googleOAuthCallback));

// Gmail OAuth routes
app.get('/api/gmail/connect', wrapHandler(gmailConnect));
app.get('/api/gmail/callback', wrapHandler(gmailCallback));
app.post('/api/gmail/disconnect', wrapHandler(gmailDisconnect));

// Outlook OAuth routes
app.get('/api/outlook/connect', wrapHandler(outlookConnect));
app.get('/api/outlook/callback', wrapHandler(outlookCallback));
app.post('/api/outlook/disconnect', wrapHandler(outlookDisconnect));

// Email routes
app.post('/api/emails/sync', wrapHandler(emailsSync));
app.get('/api/emails/senders', wrapHandler(emailsSenders));
app.get('/api/emails/by-sender', wrapHandler(emailsBySender));
app.get('/api/emails/get', wrapHandler(emailsGet));
app.get('/api/emails/debug-sender', wrapHandler(emailsDebugSender));

// Cleanup routes
app.post('/api/cleanup/delete', wrapHandler(cleanupDelete));
app.post('/api/cleanup/delete-single', wrapHandler(cleanupDeleteSingle));
app.post('/api/cleanup/archive', wrapHandler(cleanupArchive));
app.post('/api/cleanup/unsubscribe', wrapHandler(cleanupUnsubscribe));

// Subscription routes
app.get('/api/subscription/get', wrapHandler(subscriptionGet));
app.post('/api/subscription/cancel', wrapHandler(subscriptionCancel));

// Stripe routes (webhook registered above before express.json middleware)
app.post('/api/stripe/create-checkout', wrapHandler(stripeCreateCheckout));
app.post('/api/stripe/portal', wrapHandler(stripePortal));
app.get('/api/stripe/invoices', wrapHandler(stripeInvoices));

// Activity routes
app.get('/api/activity/get', wrapHandler(activityGet));
app.post('/api/activity/log', wrapHandler(activityLog));

// User routes
app.post('/api/user/update-profile', wrapHandler(userUpdateProfile));
app.post('/api/user/delete-account', wrapHandler(userDeleteAccount));
app.get('/api/user/free-actions', wrapHandler(userFreeActions));
app.get('/api/user/dashboard-data', wrapHandler(userDashboardData));

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req: Request, res: Response) => {
  console.log('404 for:', req.method, req.path);
  res.status(404).json({
    error: 'Not found',
    path: req.path
  });
});

// Error handler
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('Global error handler:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 CleanInbox API running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔒 CORS enabled for: ${allowedOrigins.join(', ')}`);
  console.log(`📋 Routes registered: /api/auth/refresh, /api/emails/sync, /api/gmail/connect`);
});

// Graceful shutdown handler
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

export default app;
