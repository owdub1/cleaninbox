/**
 * List Stripe Invoices
 *
 * GET /api/stripe/invoices
 *
 * Returns the authenticated user's invoice history from Stripe.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

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

  if (req.method !== 'GET') {
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

    // Collect all Stripe customer IDs for this user
    const customerIds = new Set<string>();

    // 1. Look up by stripe_customer_id in subscriptions table
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', decoded.userId)
      .single();

    if (subscription?.stripe_customer_id) {
      customerIds.add(subscription.stripe_customer_id);
    }

    // 2. Also look up all Stripe customers by email for historical payments
    const customers = await stripe.customers.list({
      email: decoded.email,
      limit: 10,
    });
    for (const customer of customers.data) {
      customerIds.add(customer.id);
    }

    // DEBUG: Return diagnostic info temporarily
    const debug = {
      email: decoded.email,
      userId: decoded.userId,
      stripeCustomerIdFromDb: subscription?.stripe_customer_id || null,
      stripeCustomersByEmail: customers.data.map(c => c.id),
      totalCustomerIds: customerIds.size,
      customerIdsList: Array.from(customerIds),
    };

    if (customerIds.size === 0) {
      return res.status(200).json({ invoices: [], debug });
    }

    // Fetch invoices from all customer records
    const allInvoices: Stripe.Invoice[] = [];
    for (const customerId of customerIds) {
      const invoices = await stripe.invoices.list({
        customer: customerId,
        limit: 50,
      });
      allInvoices.push(...invoices.data);
    }

    // Sort by date, newest first
    allInvoices.sort((a, b) => b.created - a.created);

    const mapped = allInvoices.map((inv) => ({
      id: inv.id,
      number: inv.number,
      amount_paid: inv.amount_paid,
      currency: inv.currency,
      status: inv.status,
      created: inv.created,
      invoice_pdf: inv.invoice_pdf,
      hosted_invoice_url: inv.hosted_invoice_url,
    }));

    return res.status(200).json({ invoices: mapped, debug });
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    console.error('Error fetching invoices:', error);
    return res.status(500).json({ error: 'Failed to fetch invoices' });
  }
}
