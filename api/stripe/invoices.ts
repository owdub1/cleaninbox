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

    // Find all Stripe customers for this email to get complete payment history
    const customers = await stripe.customers.list({
      email: decoded.email,
      limit: 10,
    });

    if (customers.data.length === 0) {
      return res.status(200).json({ invoices: [] });
    }

    // Fetch invoices from all customer records
    const allInvoices: Stripe.Invoice[] = [];
    for (const customer of customers.data) {
      const invoices = await stripe.invoices.list({
        customer: customer.id,
        limit: 50,
      });
      allInvoices.push(...invoices.data);
    }

    // Also fetch one-time payments (checkout sessions with mode=payment)
    for (const customer of customers.data) {
      const charges = await stripe.charges.list({
        customer: customer.id,
        limit: 50,
      });
      // Add charges that aren't tied to an invoice (one-time payments)
      for (const charge of charges.data) {
        if (!(charge as any).invoice && charge.paid) {
          allInvoices.push({
            id: charge.id,
            number: null,
            amount_paid: charge.amount,
            currency: charge.currency,
            status: 'paid',
            created: charge.created,
            invoice_pdf: charge.receipt_url,
            hosted_invoice_url: charge.receipt_url,
          } as any);
        }
      }
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

    return res.status(200).json({ invoices: mapped });
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    console.error('Error fetching invoices:', error);
    return res.status(500).json({ error: 'Failed to fetch invoices' });
  }
}
