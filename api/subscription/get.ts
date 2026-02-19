/**
 * Get User Subscription Endpoint
 *
 * GET /api/subscription/get
 *
 * Returns the user's current subscription details from the database.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// Plan definitions with limits
// syncIntervalMinutes: minimum minutes between syncs (0 = no limit)
export const PLAN_LIMITS = {
  free: {
    name: 'Free',
    emailLimit: 1,
    emailProcessingLimit: 100,
    syncIntervalMinutes: 1440, // 24 hours - 1 sync per day
    features: [
      'Import up to 100 emails total',
      'Connect 1 email account',
      'Sync once per day',
      'Standard unsubscribe speed',
      'Email support'
    ]
  },
  basic: {
    name: 'Basic',
    emailLimit: 2,
    emailProcessingLimit: 5000,
    syncIntervalMinutes: 240, // 4 hours - 6 syncs per day
    features: [
      'Import up to 5,000 emails total',
      'Connect up to 2 email accounts',
      'Sync every 4 hours',
      'Standard unsubscribe speed',
      'Email support',
      'Basic analytics'
    ]
  },
  pro: {
    name: 'Pro',
    emailLimit: 3,
    emailProcessingLimit: 15000,
    syncIntervalMinutes: 60, // 1 hour - 24 syncs per day
    features: [
      'Import up to 15,000 emails total',
      'Connect up to 3 email accounts',
      'Sync every hour',
      'Faster unsubscribe speed',
      'Priority email support',
      'Advanced analytics',
      'Scheduled cleanup'
    ]
  },
  unlimited: {
    name: 'Unlimited',
    emailLimit: 5,
    emailProcessingLimit: 999999999,
    syncIntervalMinutes: 0, // No limit
    features: [
      'Unlimited email importing',
      'Connect up to 5 email accounts',
      'Unlimited syncing',
      'Fastest unsubscribe speed',
      'Priority phone & email support',
      'Advanced analytics',
      'Scheduled cleanup',
      'Custom domain support',
      'Email cleanup service (since account creation)'
    ]
  },
  onetime: {
    name: 'Quick Clean',
    emailLimit: 1,
    emailProcessingLimit: 3000,
    syncIntervalMinutes: 60,
    features: [
      'Process up to 3,000 emails',
      'Connect 1 email account',
      'Standard unsubscribe speed',
      'One-time payment',
      'Basic analytics',
      'Valid for 30 days'
    ]
  }
};

interface JWTPayload {
  userId: string;
  email: string;
}

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://cleaninbox.vercel.app',
  'https://www.cleaninbox.com',
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.VITE_APP_URL,
  process.env.FRONTEND_URL,
].filter(Boolean);

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Set CORS headers - check if origin is allowed
  const origin = req.headers.origin || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);

  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    // Get subscription from database
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', decoded.userId)
      .single();

    if (subError && subError.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" - that's OK, user just doesn't have a subscription
      console.error('Error fetching subscription:', subError);
    }

    // If no subscription found, return free plan
    if (!subscription) {
      const freePlan = PLAN_LIMITS.free;
      return res.status(200).json({
        subscription: {
          plan: 'free',
          planName: freePlan.name,
          status: 'active',
          price: 0,
          period: 'monthly',
          emailLimit: freePlan.emailLimit,
          emailProcessingLimit: freePlan.emailProcessingLimit,
          syncIntervalMinutes: freePlan.syncIntervalMinutes,
          features: freePlan.features,
          nextBillingDate: null
        }
      });
    }

    // Get plan limits
    const planKey = subscription.plan.toLowerCase() as keyof typeof PLAN_LIMITS;
    const planLimits = PLAN_LIMITS[planKey] || PLAN_LIMITS.free;

    return res.status(200).json({
      subscription: {
        plan: subscription.plan,
        planName: planLimits.name,
        status: subscription.status,
        price: subscription.price,
        period: subscription.period,
        emailLimit: planLimits.emailLimit,
        emailProcessingLimit: planLimits.emailProcessingLimit,
        syncIntervalMinutes: planLimits.syncIntervalMinutes,
        features: planLimits.features,
        nextBillingDate: subscription.next_billing_date
      }
    });

  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    console.error('Error in subscription/get:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
