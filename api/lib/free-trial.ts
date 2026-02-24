/**
 * Free Trial Helpers
 *
 * Server-side enforcement of free trial action limits.
 * Keyed by email (not user_id) so limits persist after account deletion.
 */

import { SupabaseClient } from '@supabase/supabase-js';

export const FREE_TRIAL_LIMIT = 5;

/**
 * Get the current free trial usage for an email address.
 * Returns 0 if no record exists yet.
 */
export async function getFreeTrialUsage(
  supabase: SupabaseClient,
  email: string
): Promise<number> {
  const { data } = await supabase
    .from('free_trial_usage')
    .select('actions_used')
    .eq('email', email.toLowerCase())
    .single();

  return data?.actions_used ?? 0;
}

/**
 * Atomically check and increment free trial usage.
 * Uses a Postgres RPC function to prevent race conditions.
 *
 * @returns { allowed: boolean, actions_used: number, limit: number }
 */
export async function tryIncrementFreeTrialUsage(
  supabase: SupabaseClient,
  email: string,
  count: number
): Promise<{ allowed: boolean; actions_used: number; limit: number }> {
  const { data, error } = await supabase.rpc('check_and_increment_trial', {
    p_email: email.toLowerCase(),
    p_count: count,
    p_limit: FREE_TRIAL_LIMIT,
  });

  if (error) {
    console.error('Free trial RPC error:', error);
    // Fail closed - block the action if the RPC fails
    return { allowed: false, actions_used: 0, limit: FREE_TRIAL_LIMIT };
  }

  return data as { allowed: boolean; actions_used: number; limit: number };
}

/**
 * Check if user is paid. Read-only check (does NOT increment).
 * Use this when you want to check before an action and increment separately on success.
 */
export async function isUserPaid(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan, status, next_billing_date, stripe_subscription_id')
    .eq('user_id', userId)
    .single();

  if (!subscription) return false;
  if (subscription.plan.toLowerCase() === 'free') return false;
  if (subscription.status !== 'active' && subscription.status !== 'trialing') return false;

  // For plans without a Stripe subscription (e.g. onetime), check if expired
  if (!subscription.stripe_subscription_id && subscription.next_billing_date) {
    if (new Date(subscription.next_billing_date) < new Date()) {
      return false;
    }
  }

  return true;
}

/**
 * Check if user is paid. If not, enforce free trial limits.
 *
 * @returns { isPaid: boolean, allowed: boolean, remaining: number }
 *   - isPaid: true if user has active paid subscription
 *   - allowed: true if action should proceed
 *   - remaining: free trial actions remaining (only meaningful for free users)
 */
export async function checkFreeTrialOrPaid(
  supabase: SupabaseClient,
  userId: string,
  userEmail: string,
  actionCount: number
): Promise<{ isPaid: boolean; allowed: boolean; remaining: number }> {
  // Check subscription status
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan, status, next_billing_date, stripe_subscription_id')
    .eq('user_id', userId)
    .single();

  let isPaid = !!subscription &&
    subscription.plan.toLowerCase() !== 'free' &&
    (subscription.status === 'active' || subscription.status === 'trialing');

  // For plans without a Stripe subscription (e.g. onetime), check if expired
  if (isPaid && subscription && !subscription.stripe_subscription_id && subscription.next_billing_date) {
    if (new Date(subscription.next_billing_date) < new Date()) {
      isPaid = false;
    }
  }

  if (isPaid) {
    return { isPaid: true, allowed: true, remaining: -1 };
  }

  // Free user - check and increment trial
  const result = await tryIncrementFreeTrialUsage(supabase, userEmail, actionCount);

  return {
    isPaid: false,
    allowed: result.allowed,
    remaining: Math.max(0, result.limit - result.actions_used),
  };
}
