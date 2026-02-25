import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchWithAuth } from '../lib/api';

export const useEmailAccounts = () => {
  const { user, refreshToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addEmailAccount = async (email: string, provider: string = 'Gmail') => {
    if (!user) {
      throw new Error('User must be authenticated');
    }

    // Email accounts are created server-side during OAuth callback.
    // This is a no-op placeholder — the actual creation happens in
    // api/gmail/callback.ts or api/outlook/callback.ts.
    return { email, provider };
  };

  const removeEmailAccount = async (accountId: string, email?: string, provider?: string) => {
    if (!user) {
      throw new Error('User must be authenticated');
    }

    try {
      setLoading(true);
      setError(null);

      // Use the server-side disconnect endpoints which revoke OAuth tokens
      // and delete the account row with proper authentication
      const endpoint = provider?.toLowerCase() === 'outlook'
        ? '/api/outlook/disconnect'
        : '/api/gmail/disconnect';

      const response = await fetchWithAuth(endpoint, {
        method: 'POST',
        body: JSON.stringify({ email }),
      }, refreshToken);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to disconnect email account');
      }

      return true;
    } catch (err: any) {
      console.error('Error removing email account:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const syncEmailAccount = async (
    accountId: string,
    email?: string,
    options: { fullSync?: boolean } = {}
  ) => {
    if (!user) {
      throw new Error('User must be authenticated');
    }

    const { fullSync = false } = options;

    try {
      setLoading(true);
      setError(null);

      if (!email) {
        throw new Error('Email address is required for sync');
      }

      // Call the server-side sync API
      const response = await fetchWithAuth('/api/emails/sync', {
        method: 'POST',
        body: JSON.stringify({ email, fullSync }),
      }, refreshToken);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync emails');
      }

      return data;
    } catch (err: any) {
      console.error('Error syncing email account:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    addEmailAccount,
    removeEmailAccount,
    syncEmailAccount,
    loading,
    error
  };
};
