import { useState, useEffect, useCallback } from 'react';
import { fetchWithAuth } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export interface Subscription {
  plan: string;
  planName: string;
  status: string;
  price: number;
  period: string;
  emailLimit: number;
  emailProcessingLimit: number;
  syncIntervalMinutes: number;
  features: string[];
  nextBillingDate: string | null;
  expiringWarning?: boolean;
  daysUntilExpiry?: number;
  expiredPlan?: string;
}

const DEFAULT_FREE_SUBSCRIPTION: Subscription = {
  plan: 'free',
  planName: 'Free',
  status: 'active',
  price: 0,
  period: 'monthly',
  emailLimit: 1,
  emailProcessingLimit: 100,
  syncIntervalMinutes: 1440,
  features: [
    'Import up to 100 emails total',
    'Connect 1 email account',
    'Sync once per day',
    'Standard unsubscribe speed',
    'Email support'
  ],
  nextBillingDate: null
};

export function useSubscription() {
  const { isAuthenticated, refreshToken } = useAuth();
  const [subscription, setSubscription] = useState<Subscription>(DEFAULT_FREE_SUBSCRIPTION);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    if (!isAuthenticated) {
      setSubscription(DEFAULT_FREE_SUBSCRIPTION);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetchWithAuth('/api/subscription/get', { method: 'GET' }, refreshToken);

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid
          setSubscription(DEFAULT_FREE_SUBSCRIPTION);
          return;
        }
        throw new Error('Failed to fetch subscription');
      }

      const data = await response.json();
      setSubscription(data.subscription);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching subscription:', err);
      setError(err.message);
      // Use default free subscription on error
      setSubscription(DEFAULT_FREE_SUBSCRIPTION);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const cancelSubscription = useCallback(async (): Promise<{ success: boolean; error?: string; accessUntil?: string }> => {
    if (!isAuthenticated) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const response = await fetchWithAuth('/api/subscription/cancel', { method: 'POST' }, refreshToken);

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to cancel subscription' };
      }

      // Refetch subscription to update state
      await fetchSubscription();

      return {
        success: true,
        accessUntil: data.subscription?.accessUntil
      };
    } catch (err: any) {
      console.error('Error cancelling subscription:', err);
      return { success: false, error: err.message || 'Failed to cancel subscription' };
    }
  }, [fetchSubscription, isAuthenticated]);

  return {
    subscription,
    loading,
    error,
    refetch: fetchSubscription,
    cancelSubscription,
    isPro: subscription.plan.toLowerCase() === 'pro',
    isUnlimited: subscription.plan.toLowerCase() === 'unlimited',
    isPaid: subscription.plan.toLowerCase() !== 'free',
    isCancelled: subscription.status === 'cancelled',
    isExpired: subscription.status === 'expired',
    isExpiring: !!subscription.expiringWarning,
    isPastDue: subscription.status === 'past_due',
  };
}
