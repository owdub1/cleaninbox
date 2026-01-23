import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../lib/api';

export interface Sender {
  id: string;
  email: string;
  name: string;
  emailCount: number;
  unreadCount: number;
  firstEmailDate: string;
  lastEmailDate: string;
  unsubscribeLink: string | null;
  hasUnsubscribe: boolean;
  isNewsletter: boolean;
  isPromotional: boolean;
  emailAccountId: string;
  accountEmail: string;
}

export interface EmailMessage {
  id: string;
  threadId: string;
  subject: string;
  snippet: string;
  date: string;
  isUnread: boolean;
}

interface SendersResponse {
  senders: Sender[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

interface UseSendersOptions {
  email?: string;
  sortBy?: 'count' | 'name' | 'date';
  sortDirection?: 'asc' | 'desc';
  filter?: 'newsletter' | 'promotional' | 'unsubscribable';
  limit?: number;
  autoFetch?: boolean;
}

export const useEmailSenders = (options: UseSendersOptions = {}) => {
  const { token } = useAuth();
  const [senders, setSenders] = useState<Sender[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    limit: options.limit || 500,
    offset: 0,
  });
  const [hasFetched, setHasFetched] = useState(false);

  // Destructure options to avoid dependency on object reference
  const { email: optEmail, sortBy: optSortBy, sortDirection: optSortDirection, filter: optFilter, limit: optLimit } = options;

  /**
   * Fetch senders from the API
   */
  const fetchSenders = useCallback(async (
    fetchOptions?: Partial<UseSendersOptions>
  ): Promise<Sender[]> => {
    if (!token) {
      setError('Authentication required');
      return [];
    }

    // Use fetchOptions if provided, otherwise fall back to hook options
    const email = fetchOptions?.email ?? optEmail;
    const sortBy = fetchOptions?.sortBy ?? optSortBy;
    const sortDirection = fetchOptions?.sortDirection ?? optSortDirection;
    const filter = fetchOptions?.filter ?? optFilter;
    const limit = fetchOptions?.limit ?? optLimit;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (email) params.set('email', email);
      if (sortBy) params.set('sortBy', sortBy);
      if (sortDirection) params.set('sortDirection', sortDirection);
      if (filter) params.set('filter', filter);
      if (limit) params.set('limit', limit.toString());

      const response = await fetch(
        `${API_URL}/api/emails/senders?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data: SendersResponse = await response.json();

      if (!response.ok) {
        // Don't retry on rate limit - just show error
        if (response.status === 429) {
          throw new Error('Too many requests. Please wait a moment and try again.');
        }
        throw new Error((data as any).error || 'Failed to fetch senders');
      }

      setSenders(data.senders);
      setPagination(data.pagination);

      return data.senders;
    } catch (err: any) {
      console.error('Fetch senders error:', err);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [token, optEmail, optSortBy, optSortDirection, optFilter, optLimit]);

  /**
   * Sync emails from Gmail
   */
  const syncEmails = useCallback(async (
    email: string,
    maxMessages: number = 1000
  ): Promise<boolean> => {
    if (!token) {
      setError('Authentication required');
      return false;
    }

    try {
      setSyncing(true);
      setError(null);

      const response = await fetch(`${API_URL}/api/emails/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, maxMessages }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync emails');
      }

      // Refresh senders after sync
      await fetchSenders({ email });

      return true;
    } catch (err: any) {
      console.error('Sync emails error:', err);
      setError(err.message);
      return false;
    } finally {
      setSyncing(false);
    }
  }, [token, fetchSenders]);

  /**
   * Get senders grouped by year
   */
  const getSendersByYear = useCallback((): Record<string, Sender[]> => {
    const grouped: Record<string, Sender[]> = {};

    for (const sender of senders) {
      const year = new Date(sender.lastEmailDate).getFullYear().toString();
      if (!grouped[year]) {
        grouped[year] = [];
      }
      grouped[year].push(sender);
    }

    // Sort years descending
    const sortedYears = Object.keys(grouped).sort((a, b) => parseInt(b) - parseInt(a));
    const result: Record<string, Sender[]> = {};
    for (const year of sortedYears) {
      result[year] = grouped[year];
    }

    return result;
  }, [senders]);

  /**
   * Search senders by name or email
   */
  const searchSenders = useCallback((query: string): Sender[] => {
    const lowerQuery = query.toLowerCase();
    return senders.filter(sender =>
      sender.name.toLowerCase().includes(lowerQuery) ||
      sender.email.toLowerCase().includes(lowerQuery)
    );
  }, [senders]);

  /**
   * Sort senders locally
   */
  const sortSenders = useCallback((
    sortBy: 'count' | 'name' | 'date',
    direction: 'asc' | 'desc'
  ): Sender[] => {
    const sorted = [...senders];

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'count':
          comparison = a.emailCount - b.emailCount;
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'date':
          comparison = new Date(a.lastEmailDate).getTime() - new Date(b.lastEmailDate).getTime();
          break;
      }

      return direction === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [senders]);

  /**
   * Get senders that have unsubscribe options
   */
  const getUnsubscribableSenders = useCallback((): Sender[] => {
    return senders.filter(sender => sender.hasUnsubscribe);
  }, [senders]);

  /**
   * Get senders sorted by email count (descending)
   */
  const getSendersByEmailCount = useCallback((limit?: number): Sender[] => {
    const sorted = [...senders].sort((a, b) => b.emailCount - a.emailCount);
    return limit ? sorted.slice(0, limit) : sorted;
  }, [senders]);

  /**
   * Get senders with emails older than specified days
   */
  const getSendersOlderThan = useCallback((days: number): Sender[] => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    return senders.filter(sender => new Date(sender.lastEmailDate) < cutoffDate);
  }, [senders]);

  /**
   * Fetch individual emails from a specific sender
   */
  const fetchEmailsBySender = useCallback(async (
    senderEmail: string,
    accountEmail: string,
    limit: number = 20
  ): Promise<EmailMessage[]> => {
    if (!token) {
      console.error('Authentication required to fetch emails');
      return [];
    }

    try {
      const params = new URLSearchParams({
        senderEmail,
        accountEmail,
        limit: limit.toString()
      });

      const response = await fetch(
        `${API_URL}/api/emails/by-sender?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch emails');
      }

      return data.emails || [];
    } catch (err: any) {
      console.error('Fetch emails by sender error:', err);
      return [];
    }
  }, [token]);

  // Auto-fetch on mount if enabled (only once)
  useEffect(() => {
    if (options.autoFetch && token && !hasFetched) {
      setHasFetched(true);
      fetchSenders();
    }
  }, [options.autoFetch, token, hasFetched, fetchSenders]);

  return {
    senders,
    loading,
    syncing,
    error,
    pagination,
    fetchSenders,
    syncEmails,
    getSendersByYear,
    searchSenders,
    sortSenders,
    getUnsubscribableSenders,
    getSendersByEmailCount,
    getSendersOlderThan,
    fetchEmailsBySender,
  };
};
