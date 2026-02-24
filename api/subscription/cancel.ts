/**
 * Cancel Subscription Endpoint
 *
 * POST /api/subscription/cancel
 *
 * Cancels the user's subscription by updating the status to 'cancelled'.
 * The subscription remains active until the next_billing_date.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import jwt from 'jsonwebtoken';
import { requireEnv } from '../lib/env.js';
import { csrfProtection } from '../lib/csrf.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const JWT_SECRET = requireEnv('JWT_SECRET');

interface JWTPayload {
  userId: string;
  email: string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', process.env.VITE_APP_URL || '');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!csrfProtection(req, res)) return;

  // Get token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);

  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    // Get current subscription
    const { data: subscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', decoded.userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching subscription:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch subscription' });
    }

    if (!subscription) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    if (subscription.status === 'cancelled') {
      return res.status(400).json({ error: 'Subscription is already cancelled' });
    }

    // If user has a Stripe subscription, cancel it via Stripe API
    // The webhook will handle the DB update when Stripe confirms the cancellation
    if (subscription.stripe_subscription_id) {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

      // Cancel at period end so user keeps access until billing period ends
      await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        cancel_at_period_end: true,
      });

      // Log the activity
      await supabase
        .from('activity_log')
        .insert({
          user_id: decoded.userId,
          action_type: 'subscription_change',
          description: `Cancelled ${subscription.plan} subscription (effective at period end)`,
          metadata: {
            previous_plan: subscription.plan,
            cancelled_at: new Date().toISOString(),
            access_until: subscription.next_billing_date,
            stripe_subscription_id: subscription.stripe_subscription_id
          }
        });

      // Update local status to reflect pending cancellation
      const { data: updatedSubscription, error: updateError } = await supabase
        .from('subscriptions')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', decoded.userId)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating subscription status:', updateError);
      }

      return res.status(200).json({
        success: true,
        message: 'Subscription will be cancelled at the end of the billing period',
        subscription: {
          ...updatedSubscription,
          accessUntil: subscription.next_billing_date
        }
      });
    }

    // No Stripe subscription — just update the DB directly (legacy/free cancellation)
    const { data: updatedSubscription, error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', decoded.userId)
      .select()
      .single();

    if (updateError) {
      console.error('Error cancelling subscription:', updateError);
      return res.status(500).json({ error: 'Failed to cancel subscription' });
    }

    // Log the activity
    await supabase
      .from('activity_log')
      .insert({
        user_id: decoded.userId,
        action_type: 'subscription_change',
        description: `Cancelled ${subscription.plan} subscription`,
        metadata: {
          previous_plan: subscription.plan,
          cancelled_at: new Date().toISOString(),
          access_until: subscription.next_billing_date
        }
      });

    return res.status(200).json({
      success: true,
      message: 'Subscription cancelled successfully',
      subscription: {
        ...updatedSubscription,
        accessUntil: subscription.next_billing_date
      }
    });

  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    console.error('Error in subscription/cancel:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
