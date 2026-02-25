/**
 * Create Stripe Customer Portal Session
 *
 * POST /api/stripe/portal
 *
 * Creates a Stripe Customer Portal session so users can manage billing,
 * update payment methods, and cancel subscriptions.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { requireEnv } from '../lib/env.js';
import { csrfProtection } from '../lib/csrf.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const JWT_SECRET = requireEnv('JWT_SECRET');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface JWTPayload {
  userId: string;
  email: string;
}

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

  if (!csrfProtection(req, res)) return;

  // Authenticate user (cookie or header)
  const authHeader = req.headers.authorization;
  const token = req.cookies?.['auth_token'] || (authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null);
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    // Get the user's stripe_customer_id from subscriptions table
    const { data: subscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', decoded.userId)
      .single();

    if (fetchError || !subscription?.stripe_customer_id) {
      return res.status(400).json({ error: 'No billing account found. Please subscribe first.' });
    }

    const frontendUrl = process.env.VITE_APP_URL || process.env.FRONTEND_URL || '';

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${frontendUrl}/dashboard`,
    });

    return res.status(200).json({ url: portalSession.url });
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    console.error('Error creating portal session:', error);
    return res.status(500).json({ error: 'Failed to create billing portal session' });
  }
}
