import { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../lib/api';

interface CleanupResult {
  senderEmail: string;
  success: boolean;
  count?: number;
  error?: string;
}

interface DeleteResult {
  success: boolean;
  totalDeleted: number;
  results: Array<{
    senderEmail: string;
    deletedCount: number;
    success: boolean;
    error?: string;
  }>;
}

interface ArchiveResult {
  success: boolean;
  totalArchived: number;
  results: Array<{
    senderEmail: string;
    archivedCount: number;
    success: boolean;
    error?: string;
  }>;
}

interface UnsubscribeResult {
  success: boolean;
  requiresManualAction?: boolean;
  unsubscribeLink?: string;
  message?: string;
  error?: string;
}

interface DeleteSingleResult {
  success: boolean;
  messageId: string;
  message?: string;
}

export const useCleanupActions = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Delete a single email by message ID
   */
  const deleteSingleEmail = useCallback(async (
    accountEmail: string,
    messageId: string,
    senderEmail?: string
  ): Promise<DeleteSingleResult | null> => {
    if (!token) {
      setError('Authentication required');
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/api/cleanup/delete-single`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountEmail,
          messageId,
          senderEmail,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete email');
      }

      return data as DeleteSingleResult;
    } catch (err: any) {
      console.error('Delete single email error:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  /**
   * Delete all emails from specified senders
   */
  const deleteEmails = useCallback(async (
    accountEmail: string,
    senderEmails: string[]
  ): Promise<DeleteResult | null> => {
    if (!token) {
      setError('Authentication required');
      return null;
    }

    if (senderEmails.length === 0) {
      setError('No senders selected');
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/api/cleanup/delete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountEmail,
          senderEmails,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete emails');
      }

      return data as DeleteResult;
    } catch (err: any) {
      console.error('Delete emails error:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  /**
   * Archive all emails from specified senders
   */
  const archiveEmails = useCallback(async (
    accountEmail: string,
    senderEmails: string[]
  ): Promise<ArchiveResult | null> => {
    if (!token) {
      setError('Authentication required');
      return null;
    }

    if (senderEmails.length === 0) {
      setError('No senders selected');
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/api/cleanup/archive`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountEmail,
          senderEmails,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to archive emails');
      }

      return data as ArchiveResult;
    } catch (err: any) {
      console.error('Archive emails error:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  /**
   * Unsubscribe from a sender
   */
  const unsubscribe = useCallback(async (
    accountEmail: string,
    senderEmail: string,
    unsubscribeLink?: string
  ): Promise<UnsubscribeResult | null> => {
    if (!token) {
      setError('Authentication required');
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/api/cleanup/unsubscribe`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountEmail,
          senderEmail,
          unsubscribeLink,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to unsubscribe');
      }

      return data as UnsubscribeResult;
    } catch (err: any) {
      console.error('Unsubscribe error:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  /**
   * Execute bulk cleanup action
   */
  const bulkCleanup = useCallback(async (
    accountEmail: string,
    senderEmails: string[],
    action: 'delete' | 'archive'
  ): Promise<DeleteResult | ArchiveResult | null> => {
    if (action === 'delete') {
      return deleteEmails(accountEmail, senderEmails);
    } else {
      return archiveEmails(accountEmail, senderEmails);
    }
  }, [deleteEmails, archiveEmails]);

  return {
    deleteSingleEmail,
    deleteEmails,
    archiveEmails,
    unsubscribe,
    bulkCleanup,
    loading,
    error,
  };
};
