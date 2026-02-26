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
import { requireEnv } from '../lib/env.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const JWT_SECRET = requireEnv('JWT_SECRET');

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
    emailLimit: 1,
    emailProcessingLimit: 5000,
    syncIntervalMinutes: 240, // 4 hours - 6 syncs per day
    features: [
      'Import up to 5,000 emails total',
      'Connect 1 email account',
      'Sync every 4 hours',
      'Standard unsubscribe speed',
      'Email support',
      'Basic analytics'
    ]
  },
  pro: {
    name: 'Pro',
    emailLimit: 2,
    emailProcessingLimit: 15000,
    syncIntervalMinutes: 60, // 1 hour - 24 syncs per day
    features: [
      'Import up to 15,000 emails total',
      'Connect up to 2 email accounts',
      'Sync every hour',
      'Faster unsubscribe speed',
      'Priority email support',
      'Advanced analytics',
      'Scheduled cleanup'
    ]
  },
  unlimited: {
    name: 'Unlimited',
    emailLimit: 3,
    emailProcessingLimit: 999999999,
    syncIntervalMinutes: 0, // No limit
    features: [
      'Unlimited email importing',
      'Connect up to 3 email accounts',
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

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS is handled by Express middleware in server.ts (Railway)

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get token from cookie or Authorization header
  const authHeader = req.headers.authorization;
  const token = req.cookies?.['auth_token'] || (authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null);
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as JWTPayload;

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

    // Check if subscription has expired
    const now = new Date();
    const nextBillingDate = subscription.next_billing_date ? new Date(subscription.next_billing_date) : null;
    let effectiveStatus = subscription.status;
    let isExpired = false;

    if (nextBillingDate && nextBillingDate < now) {
      // One-time plans: expire when next_billing_date passes
      if (subscription.plan === 'onetime') {
        isExpired = true;
      }
      // Cancelled subscriptions: expire when period ends
      else if (subscription.status === 'cancelled') {
        isExpired = true;
      }
      // Active subscriptions WITH Stripe: trust Stripe for renewal
      // (don't expire locally — Stripe manages the lifecycle)
    }

    if (isExpired) {
      // Update status to expired in DB
      effectiveStatus = 'expired';
      await supabase
        .from('subscriptions')
        .update({
          status: 'expired',
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', decoded.userId);

      // Return free plan limits
      const freePlan = PLAN_LIMITS.free;
      return res.status(200).json({
        subscription: {
          plan: 'free',
          planName: freePlan.name,
          status: 'expired',
          price: 0,
          period: 'monthly',
          emailLimit: freePlan.emailLimit,
          emailProcessingLimit: freePlan.emailProcessingLimit,
          syncIntervalMinutes: freePlan.syncIntervalMinutes,
          features: freePlan.features,
          nextBillingDate: null,
          expiredPlan: subscription.plan,
        }
      });
    }

    // Check if Quick Clean is expiring within 3 days
    let expiringWarning = false;
    let daysUntilExpiry: number | null = null;
    if (subscription.plan === 'onetime' && nextBillingDate && subscription.status === 'active') {
      const msUntilExpiry = nextBillingDate.getTime() - now.getTime();
      daysUntilExpiry = Math.ceil(msUntilExpiry / (1000 * 60 * 60 * 24));
      if (daysUntilExpiry <= 3 && daysUntilExpiry > 0) {
        expiringWarning = true;
      }
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
        nextBillingDate: subscription.next_billing_date,
        ...(expiringWarning && { expiringWarning: true, daysUntilExpiry }),
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
