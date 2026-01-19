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
const PLAN_LIMITS = {
  free: {
    name: 'Free',
    emailLimit: 1,
    emailProcessingLimit: 100,
    features: [
      'Process up to 100 emails/month',
      'Connect 1 email account',
      'Standard unsubscribe speed',
      'Email support'
    ]
  },
  basic: {
    name: 'Basic',
    emailLimit: 1,
    emailProcessingLimit: 1000,
    features: [
      'Process up to 1,000 emails/month',
      'Connect 1 email account',
      'Standard unsubscribe speed',
      'Email support',
      'Basic analytics'
    ]
  },
  pro: {
    name: 'Pro',
    emailLimit: 3,
    emailProcessingLimit: 5000,
    features: [
      'Process up to 5,000 emails/month',
      'Connect up to 3 email accounts',
      'Faster unsubscribe speed',
      'Priority email support',
      'Advanced analytics',
      'Scheduled cleanup'
    ]
  },
  unlimited: {
    name: 'Unlimited',
    emailLimit: 999999,
    emailProcessingLimit: 999999999,
    features: [
      'Unlimited email processing',
      'Connect unlimited email accounts',
      'Fastest unsubscribe speed',
      'Priority phone & email support',
      'Advanced analytics',
      'Scheduled cleanup',
      'Custom domain support',
      'Email cleanup service (since account creation)'
    ]
  }
};

interface JWTPayload {
  userId: string;
  email: string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', process.env.VITE_APP_URL || 'http://localhost:5173');
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
