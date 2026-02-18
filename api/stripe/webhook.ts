/**
 * Stripe Webhook Handler
 *
 * POST /api/stripe/webhook
 *
 * Handles Stripe webhook events for subscription lifecycle.
 * IMPORTANT: This endpoint must receive the raw body for signature verification.
 * Do NOT apply express.json() middleware to this route.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'] as string;
  if (!sig) {
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  let event: Stripe.Event;

  try {
    // req.body is the raw Buffer when using express.raw() middleware
    const rawBody = typeof req.body === 'string' ? req.body : Buffer.isBuffer(req.body) ? req.body : JSON.stringify(req.body);
    event = stripe.webhooks.constructEvent(rawBody, sig, WEBHOOK_SECRET);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        // Unhandled event type — that's fine
        break;
    }

    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook event:', error);
    return res.status(500).json({
      error: 'Webhook handler failed',
      detail: error.message,
      eventType: event.type,
    });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id;
  if (!userId) {
    console.error('No user_id in checkout session metadata');
    return;
  }

  const subscriptionId = session.subscription as string;
  const customerId = session.customer as string;

  // Fetch the subscription from Stripe to get period details
  const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId) as any;

  // Handle different API versions — current_period_end may be a timestamp or ISO string
  let currentPeriodEnd: string;
  const periodEnd = stripeSubscription.current_period_end;
  if (typeof periodEnd === 'number') {
    currentPeriodEnd = new Date(periodEnd * 1000).toISOString();
  } else if (typeof periodEnd === 'string') {
    currentPeriodEnd = periodEnd;
  } else {
    // Fallback: 1 month from now
    currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  }

  // Upsert subscription in Supabase
  const { error } = await supabase
    .from('subscriptions')
    .upsert({
      user_id: userId,
      plan: 'pro',
      status: 'active',
      price: 19.99,
      period: 'monthly',
      email_limit: 3,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      next_billing_date: currentPeriodEnd,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    });

  if (error) {
    console.error('Error upserting subscription:', error);
    throw error;
  }

  // Log activity
  await supabase
    .from('activity_log')
    .insert({
      user_id: userId,
      action_type: 'subscription_change',
      description: 'Upgraded to Pro plan',
      metadata: {
        plan: 'pro',
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
      },
    });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.user_id;
  if (!userId) {
    // Try to find user by stripe_subscription_id
    const { data } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', subscription.id)
      .single();

    if (!data) {
      console.error('Could not find user for subscription:', subscription.id);
      return;
    }

    await updateSubscriptionStatus(data.user_id, subscription);
    return;
  }

  await updateSubscriptionStatus(userId, subscription);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.user_id;

  // Try metadata first, then look up by stripe_subscription_id
  let targetUserId = userId;
  if (!targetUserId) {
    const { data } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', subscription.id)
      .single();

    if (!data) {
      console.error('Could not find user for deleted subscription:', subscription.id);
      return;
    }
    targetUserId = data.user_id;
  }

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', targetUserId);

  if (error) {
    console.error('Error updating subscription to cancelled:', error);
    throw error;
  }

  await supabase
    .from('activity_log')
    .insert({
      user_id: targetUserId,
      action_type: 'subscription_change',
      description: 'Subscription cancelled',
      metadata: {
        stripe_subscription_id: subscription.id,
      },
    });
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = (invoice as any).subscription as string;
  if (!subscriptionId) return;

  const { data } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  if (!data) {
    console.error('Could not find user for failed payment, subscription:', subscriptionId);
    return;
  }

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', data.user_id);

  if (error) {
    console.error('Error updating subscription to past_due:', error);
    throw error;
  }

  await supabase
    .from('activity_log')
    .insert({
      user_id: data.user_id,
      action_type: 'subscription_change',
      description: 'Payment failed - subscription past due',
      metadata: {
        stripe_subscription_id: subscriptionId,
        invoice_id: invoice.id,
      },
    });
}

async function updateSubscriptionStatus(userId: string, subscription: Stripe.Subscription) {
  const statusMap: Record<string, string> = {
    active: 'active',
    past_due: 'past_due',
    canceled: 'cancelled',
    unpaid: 'past_due',
    trialing: 'active',
  };

  const status = statusMap[subscription.status] || subscription.status;
  const periodEnd = (subscription as any).current_period_end;
  let currentPeriodEnd: string;
  if (typeof periodEnd === 'number') {
    currentPeriodEnd = new Date(periodEnd * 1000).toISOString();
  } else if (typeof periodEnd === 'string') {
    currentPeriodEnd = periodEnd;
  } else {
    currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  }

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status,
      next_billing_date: currentPeriodEnd,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    console.error('Error updating subscription status:', error);
    throw error;
  }
}
