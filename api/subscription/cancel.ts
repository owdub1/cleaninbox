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
import jwt from 'jsonwebtoken';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
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

    // Update subscription status to cancelled
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
