import { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchWithAuth } from '../lib/api';

export const useOutlookConnection = () => {
  const { isAuthenticated, refreshToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Start Outlook OAuth flow - returns the authorization URL
   */
  const connectOutlook = useCallback(async (): Promise<string | null> => {
    if (!isAuthenticated) {
      setError('Authentication required');
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetchWithAuth(
        '/api/outlook/connect',
        { method: 'GET' },
        refreshToken
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start Outlook connection');
      }

      return data.authUrl;
    } catch (err: any) {
      console.error('Outlook connect error:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, refreshToken]);

  /**
   * Disconnect Outlook account
   */
  const disconnectOutlook = useCallback(async (email: string): Promise<boolean> => {
    if (!isAuthenticated) {
      setError('Authentication required');
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetchWithAuth(
        '/api/outlook/disconnect',
        {
          method: 'POST',
          body: JSON.stringify({ email }),
        },
        refreshToken
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to disconnect Outlook');
      }

      return true;
    } catch (err: any) {
      console.error('Outlook disconnect error:', err);
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, refreshToken]);

  return {
    connectOutlook,
    disconnectOutlook,
    loading,
    error,
  };
};
