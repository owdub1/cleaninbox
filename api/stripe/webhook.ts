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
import {
  sendSubscriptionConfirmedEmail,
  sendSubscriptionCancelledEmail,
  sendPaymentFailedEmail,
} from '../lib/email.js';
import { withSentry } from '../lib/sentry.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
if (!WEBHOOK_SECRET) {
  throw new Error('STRIPE_WEBHOOK_SECRET environment variable is required');
}

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function handler(
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
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);

        // Send confirmation email
        const checkoutEmail = session.customer_email || session.customer_details?.email;
        const checkoutPlan = session.metadata?.plan || 'pro';
        if (checkoutEmail) {
          const planNames: Record<string, string> = {
            basic: 'Basic', pro: 'Pro', unlimited: 'Unlimited', onetime: 'Quick Clean',
          };
          await sendSubscriptionConfirmedEmail(
            checkoutEmail,
            planNames[checkoutPlan] || 'Pro',
            checkoutPlan === 'onetime'
          ).catch(err => console.error('Failed to send confirmation email:', err));
        }
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

        // Send cancellation email
        const deletedUserId = subscription.metadata?.user_id || await getUserIdBySubscription(subscription.id);
        if (deletedUserId) {
          const { data: deletedUser } = await supabase
            .from('users')
            .select('email')
            .eq('id', deletedUserId)
            .single();
          if (deletedUser?.email) {
            const periodEnd = (subscription as any).current_period_end;
            const accessUntil = typeof periodEnd === 'number'
              ? new Date(periodEnd * 1000).toISOString()
              : typeof periodEnd === 'string' ? periodEnd : null;
            await sendSubscriptionCancelledEmail(deletedUser.email, accessUntil)
              .catch(err => console.error('Failed to send cancellation email:', err));
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);

        // Send payment failed email
        const failedSubId = (invoice as any).subscription as string;
        if (failedSubId) {
          const { data: failedSub } = await supabase
            .from('subscriptions')
            .select('user_id')
            .eq('stripe_subscription_id', failedSubId)
            .single();
          if (failedSub?.user_id) {
            const { data: failedUser } = await supabase
              .from('users')
              .select('email')
              .eq('id', failedSub.user_id)
              .single();
            if (failedUser?.email) {
              await sendPaymentFailedEmail(failedUser.email)
                .catch(err => console.error('Failed to send payment failed email:', err));
            }
          }
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        await handleChargeRefunded(charge);
        break;
      }

      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute;
        await handleDisputeCreated(dispute);
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
    });
  }
}

// Plan details for webhook processing
const PLAN_DETAILS: Record<string, { price: number; emailLimit: number; period: string }> = {
  basic:     { price: 7.99,  emailLimit: 2, period: 'monthly' },
  pro:       { price: 14.99, emailLimit: 3, period: 'monthly' },
  unlimited: { price: 24.99, emailLimit: 5, period: 'monthly' },
  onetime:   { price: 19.99, emailLimit: 1, period: 'onetime' },
};

// Annual prices (per month display price)
const ANNUAL_PRICES: Record<string, number> = {
  basic: 6.39,
  pro: 11.99,
  unlimited: 19.99,
};

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id;
  if (!userId) {
    console.error('No user_id in checkout session metadata');
    return;
  }

  const plan = session.metadata?.plan || 'pro';
  const billing = session.metadata?.billing || 'monthly';
  const customerId = session.customer as string;

  const planInfo = PLAN_DETAILS[plan] || PLAN_DETAILS.pro;
  const isAnnual = billing === 'annual';
  const price = isAnnual ? (ANNUAL_PRICES[plan] || planInfo.price) : planInfo.price;
  const period = plan === 'onetime' ? 'onetime' : (isAnnual ? 'annual' : 'monthly');

  if (plan === 'onetime') {
    // One-time payment: no Stripe subscription, 30-day access
    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: userId,
        plan: 'onetime',
        status: 'active',
        price: planInfo.price,
        period: 'onetime',
        email_limit: planInfo.emailLimit,
        stripe_customer_id: customerId,
        stripe_subscription_id: null,
        next_billing_date: periodEnd,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (error) {
      console.error('Error upserting onetime subscription:', error);
      throw error;
    }

    await supabase
      .from('activity_log')
      .insert({
        user_id: userId,
        action_type: 'subscription_change',
        description: 'Purchased Quick Clean (one-time)',
        metadata: {
          plan: 'onetime',
          stripe_customer_id: customerId,
        },
      });

    return;
  }

  // Subscription plans
  const subscriptionId = session.subscription as string;

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
      plan,
      status: 'active',
      price,
      period,
      email_limit: planInfo.emailLimit,
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
  const planName = plan.charAt(0).toUpperCase() + plan.slice(1);
  await supabase
    .from('activity_log')
    .insert({
      user_id: userId,
      action_type: 'subscription_change',
      description: `Upgraded to ${planName} plan${isAnnual ? ' (annual)' : ''}`,
      metadata: {
        plan,
        billing,
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

async function getUserIdBySubscription(stripeSubscriptionId: string): Promise<string | null> {
  const { data } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', stripeSubscriptionId)
    .single();
  return data?.user_id || null;
}

async function updateSubscriptionStatus(userId: string, subscription: Stripe.Subscription) {
  const statusMap: Record<string, string> = {
    active: 'active',
    past_due: 'past_due',
    canceled: 'cancelled',
    unpaid: 'past_due',
    trialing: 'active',
  };

  let status = statusMap[subscription.status] || subscription.status;

  // If Stripe subscription is active but set to cancel at period end,
  // keep our local status as 'cancelled' so the UI reflects the pending cancellation
  if (subscription.status === 'active' && subscription.cancel_at_period_end) {
    status = 'cancelled';
  }
  const periodEnd = (subscription as any).current_period_end;
  let currentPeriodEnd: string;
  if (typeof periodEnd === 'number') {
    currentPeriodEnd = new Date(periodEnd * 1000).toISOString();
  } else if (typeof periodEnd === 'string') {
    currentPeriodEnd = periodEnd;
  } else {
    currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  }

  // Read plan from Stripe subscription metadata if available
  const plan = subscription.metadata?.plan;
  const billing = subscription.metadata?.billing;

  const updateData: Record<string, any> = {
    status,
    next_billing_date: currentPeriodEnd,
    updated_at: new Date().toISOString(),
  };

  // Update plan details if metadata is present
  if (plan && PLAN_DETAILS[plan]) {
    const planInfo = PLAN_DETAILS[plan];
    const isAnnual = billing === 'annual';
    updateData.plan = plan;
    updateData.price = isAnnual ? (ANNUAL_PRICES[plan] || planInfo.price) : planInfo.price;
    updateData.period = isAnnual ? 'annual' : 'monthly';
    updateData.email_limit = planInfo.emailLimit;
  }

  const { error } = await supabase
    .from('subscriptions')
    .update(updateData)
    .eq('user_id', userId);

  if (error) {
    console.error('Error updating subscription status:', error);
    throw error;
  }
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  // Find the user by Stripe customer ID
  const customerId = charge.customer as string;
  if (!customerId) return;

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!sub) {
    console.error('Could not find user for refunded charge, customer:', customerId);
    return;
  }

  // If fully refunded, cancel the subscription
  if (charge.refunded) {
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', sub.user_id);

    if (error) {
      console.error('Error updating subscription after refund:', error);
      throw error;
    }

    await supabase
      .from('activity_log')
      .insert({
        user_id: sub.user_id,
        action_type: 'subscription_change',
        description: 'Subscription cancelled due to refund',
        metadata: { charge_id: charge.id },
      });
  }
}

async function handleDisputeCreated(dispute: Stripe.Dispute) {
  // Find the user by Stripe customer ID from the charge
  const charge = dispute.charge;
  const chargeId = typeof charge === 'string' ? charge : charge?.id;
  if (!chargeId) return;

  // Retrieve the charge to get the customer ID
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const fullCharge = await stripe.charges.retrieve(chargeId);
  const customerId = fullCharge.customer as string;
  if (!customerId) return;

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!sub) {
    console.error('Could not find user for disputed charge, customer:', customerId);
    return;
  }

  // Immediately revoke access on dispute
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', sub.user_id);

  if (error) {
    console.error('Error updating subscription after dispute:', error);
    throw error;
  }

  await supabase
    .from('activity_log')
    .insert({
      user_id: sub.user_id,
      action_type: 'subscription_change',
      description: 'Subscription cancelled due to payment dispute',
      metadata: { dispute_id: dispute.id, charge_id: chargeId },
    });
}

export default withSentry(handler);
