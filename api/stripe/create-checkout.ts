/**
 * Create Stripe Checkout Session
 *
 * POST /api/stripe/create-checkout
 *
 * Creates a Stripe Checkout Session for the selected plan and returns the URL
 * for the frontend to redirect the user to.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

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

  // Authenticate user
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    const frontendUrl = process.env.VITE_APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173';

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
              product: 'prod_U01gpSRLbAMbUc',
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

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: decoded.email,
      line_items: [
        {
          price_data: {
            currency: 'cad',
            product: 'prod_U01gpSRLbAMbUc',
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
    });

    return res.status(200).json({ url: session.url });
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    console.error('Error creating checkout session:', error);
    return res.status(500).json({
      error: 'Failed to create checkout session',
      detail: error.message,
    });
  }
}
