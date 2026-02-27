/**
 * Create Stripe Checkout Session
 *
 * POST /api/stripe/create-checkout
 *
 * Creates a Stripe Checkout Session for the selected plan and returns the URL
 * for the frontend to redirect the user to.
 *
 * If the user already has an active Stripe subscription, it updates the
 * existing subscription (upgrade/downgrade) instead of creating a new checkout.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { requireEnv } from '../lib/env.js';


const JWT_SECRET = requireEnv('JWT_SECRET');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface JWTPayload {
  userId: string;
  email: string;
}

// Price mapping in cents (CAD)
const PLAN_PRICES: Record<string, { monthly: number; annual: number }> = {
  basic:     { monthly: 799,  annual: 7668  }, // $7.99/mo or $6.39/mo * 12
  pro:       { monthly: 1499, annual: 14388 }, // $14.99/mo or $11.99/mo * 12
  unlimited: { monthly: 2499, annual: 23988 }, // $24.99/mo or $19.99/mo * 12
};

const ONETIME_PRICE = 1999; // $19.99 one-time

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Authenticate user (cookie or header)
  const authHeader = req.headers.authorization;
  const token = req.cookies?.['auth_token'] || (authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null);
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as JWTPayload;

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    const frontendUrl = process.env.VITE_APP_URL || process.env.FRONTEND_URL || '';

    const { plan = 'pro', billing = 'monthly' } = req.body || {};

    // Validate plan
    if (plan === 'onetime') {
      // One-time payment for Quick Clean
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: decoded.email,
        line_items: [
          {
            price_data: {
              currency: 'cad',
              product: process.env.STRIPE_PRODUCT_ID!,
              unit_amount: ONETIME_PRICE,
            },
            quantity: 1,
          },
        ],
        metadata: {
          user_id: decoded.userId,
          plan: 'onetime',
          billing: 'onetime',
        },
        success_url: `${frontendUrl}/dashboard?upgraded=true`,
        cancel_url: `${frontendUrl}/pricing`,
      });

      return res.status(200).json({ url: session.url });
    }

    // Subscription plans
    const planPrices = PLAN_PRICES[plan];
    if (!planPrices) {
      return res.status(400).json({ error: `Invalid plan: ${plan}` });
    }

    const isAnnual = billing === 'annual';
    const interval: 'month' | 'year' = isAnnual ? 'year' : 'month';
    const unitAmount = isAnnual ? planPrices.annual : planPrices.monthly;

    // Check if user already has an active Stripe subscription
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id, stripe_customer_id, plan, status')
      .eq('user_id', decoded.userId)
      .single();

    if (existingSub?.stripe_subscription_id && existingSub.status === 'active') {
      // User has an active Stripe subscription — update it instead of creating new checkout
      const stripeSubscription = await stripe.subscriptions.retrieve(existingSub.stripe_subscription_id);

      if (stripeSubscription.status === 'active' || stripeSubscription.status === 'trialing') {
        // Get the current subscription item to replace
        const currentItem = stripeSubscription.items.data[0];

        // Create a new price for the target plan
        const newPrice = await stripe.prices.create({
          currency: 'cad',
          product: process.env.STRIPE_PRODUCT_ID!,
          recurring: { interval },
          unit_amount: unitAmount,
        });

        // Update the subscription with the new price
        const updatedSubscription = await stripe.subscriptions.update(
          existingSub.stripe_subscription_id,
          {
            items: [
              {
                id: currentItem.id,
                price: newPrice.id,
              },
            ],
            metadata: {
              user_id: decoded.userId,
              plan,
              billing,
            },
            proration_behavior: 'always_invoice',
          }
        );

        // Update the DB immediately (webhook will also fire, but this gives instant feedback)
        const periodEnd = (updatedSubscription as any).current_period_end;
        let currentPeriodEnd: string;
        if (typeof periodEnd === 'number') {
          currentPeriodEnd = new Date(periodEnd * 1000).toISOString();
        } else if (typeof periodEnd === 'string') {
          currentPeriodEnd = periodEnd;
        } else {
          currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        }

        const PLAN_DETAILS: Record<string, { price: number; emailLimit: number }> = {
          basic:     { price: 7.99,  emailLimit: 2 },
          pro:       { price: 14.99, emailLimit: 3 },
          unlimited: { price: 24.99, emailLimit: 5 },
        };
        const ANNUAL_PRICES: Record<string, number> = {
          basic: 6.39, pro: 11.99, unlimited: 19.99,
        };

        const planInfo = PLAN_DETAILS[plan] || PLAN_DETAILS.pro;
        const displayPrice = isAnnual ? (ANNUAL_PRICES[plan] || planInfo.price) : planInfo.price;

        await supabase
          .from('subscriptions')
          .update({
            plan,
            price: displayPrice,
            period: isAnnual ? 'annual' : 'monthly',
            email_limit: planInfo.emailLimit,
            next_billing_date: currentPeriodEnd,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', decoded.userId);

        return res.status(200).json({
          updated: true,
          plan,
          billing,
          message: `Subscription updated to ${plan} (${billing})`,
        });
      }
    }

    // No active Stripe subscription — create a new checkout session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'cad',
            product: process.env.STRIPE_PRODUCT_ID!,
            recurring: {
              interval,
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      metadata: {
        user_id: decoded.userId,
        plan,
        billing,
      },
      subscription_data: {
        metadata: {
          user_id: decoded.userId,
          plan,
          billing,
        },
      },
      success_url: `${frontendUrl}/dashboard?upgraded=true`,
      cancel_url: `${frontendUrl}/pricing`,
    };

    // Use existing Stripe customer if available, otherwise use email
    if (existingSub?.stripe_customer_id) {
      sessionParams.customer = existingSub.stripe_customer_id;
    } else {
      sessionParams.customer_email = decoded.email;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return res.status(200).json({ url: session.url });
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    console.error('Error creating checkout session:', error);
    return res.status(500).json({
      error: 'Failed to create checkout session',
    });
  }
}
