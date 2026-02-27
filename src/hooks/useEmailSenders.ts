import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchWithAuth } from '../lib/api';

export interface Sender {
  id: string;
  email: string;
  name: string;
  emailCount: number;
  unreadCount: number;
  firstEmailDate: string;
  lastEmailDate: string;
  unsubscribeLink: string | null;
  mailtoUnsubscribeLink?: string | null;
  hasUnsubscribe: boolean;
  hasOneClickUnsubscribe?: boolean;
  isNewsletter: boolean;
  isPromotional: boolean;
  emailAccountId: string;
  accountEmail: string;
  // New fields for name+email grouping
  hasMultipleNames?: boolean;
  relatedSenderNames?: string[];
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
  const { isAuthenticated, refreshToken } = useAuth();
  const [senders, setSenders] = useState<Sender[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncPhase, setSyncPhase] = useState<'idle' | 'initial' | 'full'>('idle');
  const syncing = syncPhase !== 'idle';
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number } | null>(null);
  const phase1CountRef = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    limit: options.limit || 0,
    offset: 0,
  });
  const [hasFetched, setHasFetched] = useState(false);
  const hasSendersRef = useRef(false);

  // Keep ref in sync with senders state (avoids adding senders to useCallback deps)
  hasSendersRef.current = senders.length > 0;

  // Destructure options to avoid dependency on object reference
  const { email: optEmail, sortBy: optSortBy, sortDirection: optSortDirection, filter: optFilter, limit: optLimit } = options;

  /**
   * Fetch senders from the API
   */
  const fetchSenders = useCallback(async (
    fetchOptions?: Partial<UseSendersOptions>
  ): Promise<Sender[]> => {
    if (!isAuthenticated) {
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
      // Only show loading state on initial fetch (no senders yet)
      // During refresh/post-sync, keep existing senders visible
      if (!hasSendersRef.current) {
        setLoading(true);
      }
      setError(null);

      const params = new URLSearchParams();
      if (email) params.set('email', email);
      if (sortBy) params.set('sortBy', sortBy);
      if (sortDirection) params.set('sortDirection', sortDirection);
      if (filter) params.set('filter', filter);
      if (limit) params.set('limit', limit.toString());

      const response = await fetchWithAuth(
        `/api/emails/senders?${params.toString()}`,
        { method: 'GET' },
        refreshToken
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
  }, [isAuthenticated, refreshToken, optEmail, optSortBy, optSortDirection, optFilter, optLimit]);

  /**
   * Sync emails from Gmail
   * @param email - Email account to sync
   * @param options - Sync options
   * @param options.maxMessages - Max messages to fetch (default 1000)
   * @param options.fullSync - If true, fetches all emails for accurate counts (slower)
   * @param options.repair - If true, recalculates sender stats from existing emails (fixes corrupted data)
   * Returns object with success status and optional error details
   */
  const syncEmails = useCallback(async (
    email: string,
    options: { maxMessages?: number; fullSync?: boolean; repair?: boolean } = {}
  ): Promise<{ success: boolean; limitReached?: boolean; nextSyncAvailable?: string; upgradeMessage?: string; syncMessage?: string; addedEmails?: number; syncMethod?: string; orphansFixed?: number }> => {
    const { maxMessages = 1000, fullSync = false, repair = false } = options;

    if (!isAuthenticated) {
      setError('Authentication required');
      return { success: false };
    }

    // Detect first-time sync: we've fetched senders but found none
    const isFirstTimeSync = hasFetched && !hasSendersRef.current && !fullSync && !repair;
    phase1CountRef.current = 0;

    // Start polling sync progress every 2s
    const pollInterval = setInterval(async () => {
      try {
        const resp = await fetchWithAuth(
          `/api/emails/sync-progress?email=${encodeURIComponent(email)}`,
          { method: 'GET' },
          refreshToken
        );
        if (resp.ok) {
          const data = await resp.json();
          if (data.total) {
            setSyncProgress({
              current: data.current || 0,
              total: data.total,
            });
          }
        } else {
          console.warn('Sync progress poll failed:', resp.status);
        }
      } catch (e) {
        console.warn('Sync progress poll error:', e);
      }
    }, 2000);

    try {
      setError(null);

      // === Two-phase sync for first-time users ===
      if (isFirstTimeSync) {
        // Phase 1: Fetch 500 most recent emails quickly
        setSyncPhase('initial');

        const phase1Response = await fetchWithAuth('/api/emails/sync', {
          method: 'POST',
          body: JSON.stringify({ email, initialBatch: true }),
        }, refreshToken);

        const phase1Data = await phase1Response.json();

        if (phase1Response.ok && phase1Data.totalSenders > 0) {
          // Partial senders are now in DB — fetch and display them
          await fetchSenders();
        }

        // Store Phase 1 count so Phase 2 progress can continue from where Phase 1 left off.
        // Only use offset if Phase 2 will fetch MORE emails than Phase 1 (i.e., plan limit > initial batch).
        // If they're the same (e.g., free tier: limit=100, batch=100), Phase 2 replaces Phase 1 data entirely.
        const phase1Count = phase1Data.totalEmails || 0;
        phase1CountRef.current = phase1Count;

        // Phase 2: Full sync to rebuild everything with accurate totals
        setSyncPhase('full');

        const phase2Response = await fetchWithAuth('/api/emails/sync', {
          method: 'POST',
          body: JSON.stringify({ email, fullSync: true }),
        }, refreshToken);

        const phase2Data = await phase2Response.json();

        if (!phase2Response.ok) {
          if (phase2Response.status === 429 && phase2Data.code === 'SYNC_LIMIT_REACHED') {
            // Phase 1 data is still visible, just can't complete full sync yet
            setError(phase2Data.error);
            return {
              success: false,
              limitReached: true,
              nextSyncAvailable: phase2Data.nextSyncAvailable,
              upgradeMessage: phase2Data.upgradeMessage
            };
          }
          // Phase 2 failed but Phase 1 data stays visible
          // last_synced is still null, so full sync retries next time
          console.error('Phase 2 sync failed:', phase2Data.error);
        }

        // Refresh senders with complete data
        await fetchSenders();

        return {
          success: phase2Response.ok,
          syncMessage: phase2Data.message,
          addedEmails: phase2Data.addedEmails || phase2Data.totalEmails,
          syncMethod: 'two-phase',
        };
      }

      // === Standard single-request sync (incremental or manual full) ===
      setSyncPhase('full');

      const response = await fetchWithAuth('/api/emails/sync', {
        method: 'POST',
        body: JSON.stringify({ email, maxMessages, fullSync, repair }),
      }, refreshToken);

      const data = await response.json();

      if (!response.ok) {
        // Handle sync limit reached (429)
        if (response.status === 429 && data.code === 'SYNC_LIMIT_REACHED') {
          setError(data.error);
          return {
            success: false,
            limitReached: true,
            nextSyncAvailable: data.nextSyncAvailable,
            upgradeMessage: data.upgradeMessage
          };
        }
        throw new Error(data.error || 'Failed to sync emails');
      }

      // Refresh senders after sync - fetch ALL senders (not just this account)
      // The frontend filters by selectedAccountEmail, so we need all accounts' data
      await fetchSenders();

      return {
        success: true,
        syncMessage: data.message,
        addedEmails: data.addedEmails,
        syncMethod: data.syncMethod,
        orphansFixed: data.orphansFixed,
      };
    } catch (err: any) {
      console.error('Sync emails error:', err);
      setError(err.message);
      return { success: false };
    } finally {
      clearInterval(pollInterval);
      setSyncProgress(null);
      setSyncPhase('idle');
    }
  }, [isAuthenticated, hasFetched, refreshToken, fetchSenders]);

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
   * Also updates the sender's email count if the API returns a different total
   * @param senderEmail - The sender's email address
   * @param accountEmail - The user's Gmail account email
   * @param limit - Maximum number of emails to fetch
   * @param senderName - Optional sender name for name+email filtering
   */
  const fetchEmailsBySender = useCallback(async (
    senderEmail: string,
    accountEmail: string,
    limit: number = 50,
    senderName?: string
  ): Promise<EmailMessage[]> => {
    if (!isAuthenticated) {
      console.error('Authentication required to fetch emails');
      return [];
    }

    try {
      const params = new URLSearchParams({
        senderEmail,
        accountEmail,
        limit: limit.toString()
      });

      // Add sender name for name+email filtering (differentiates "TestFlight" from "Apple")
      if (senderName) {
        params.set('senderName', senderName);
      }

      const response = await fetchWithAuth(
        `/api/emails/by-sender?${params.toString()}`,
        { method: 'GET' },
        refreshToken
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch emails');
      }

      // Update the sender's email count in local state if it differs
      // Now uses composite key (email + name) for matching
      if (data.total) {
        setSenders(prevSenders =>
          prevSenders.map(sender =>
            sender.email === senderEmail &&
            (!senderName || sender.name === senderName) &&
            sender.emailCount !== data.total
              ? { ...sender, emailCount: data.total }
              : sender
          )
        );
      }

      return data.emails || [];
    } catch (err: any) {
      console.error('Fetch emails by sender error:', err);
      return [];
    }
  }, [isAuthenticated, refreshToken]);

  // Auto-fetch on mount if enabled (only once)
  useEffect(() => {
    if (options.autoFetch && isAuthenticated && !hasFetched) {
      setHasFetched(true);
      fetchSenders();
    }
  }, [options.autoFetch, isAuthenticated, hasFetched, fetchSenders]);

  /**
   * Update a sender's email count locally (for immediate UI feedback)
   * @param senderEmail - The sender's email address
   * @param senderName - The sender's display name
   * @param delta - Amount to change count by (negative to decrement)
   */
  const updateSenderCount = useCallback((
    senderEmail: string,
    senderName: string,
    delta: number
  ) => {
    setSenders(prevSenders =>
      prevSenders.map(sender =>
        sender.email === senderEmail && sender.name === senderName
          ? { ...sender, emailCount: Math.max(0, sender.emailCount + delta) }
          : sender
      ).filter(sender => sender.emailCount > 0) // Remove senders with 0 emails
    );
  }, []);

  /**
   * Update a sender's lastEmailDate locally (for immediate UI feedback after email deletion)
   * @param senderEmail - The sender's email address
   * @param senderName - The sender's display name
   * @param newLastEmailDate - The new lastEmailDate, or null to remove the sender
   */
  const updateSenderLastEmailDate = useCallback((
    senderEmail: string,
    senderName: string,
    newLastEmailDate: string | null
  ) => {
    setSenders(prevSenders => {
      if (newLastEmailDate === null) {
        // No emails left - remove sender
        return prevSenders.filter(s =>
          !(s.email === senderEmail && s.name === senderName)
        );
      }
      return prevSenders.map(sender =>
        sender.email === senderEmail && sender.name === senderName
          ? { ...sender, lastEmailDate: newLastEmailDate }
          : sender
      );
    });
  }, []);

  /**
   * Remove multiple senders from the local state (for optimistic UI after bulk deletion)
   * @param senderKeys - Array of sender identifiers (email + name pairs)
   */
  const removeSenders = useCallback((
    senderKeys: Array<{ email: string; name: string }>
  ) => {
    setSenders(prevSenders =>
      prevSenders.filter(sender =>
        !senderKeys.some(key => key.email === sender.email && key.name === sender.name)
      )
    );
  }, []);

  return {
    senders,
    loading,
    syncing,
    syncPhase,
    syncProgress,
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
    updateSenderCount,
    updateSenderLastEmailDate,
    removeSenders,
  };
};
