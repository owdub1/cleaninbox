import { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../lib/api';

export const useOutlookConnection = () => {
  const { isAuthenticated } = useAuth();
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

      const response = await fetch(`${API_URL}/api/outlook/connect`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

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
  }, [isAuthenticated]);

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

      const response = await fetch(`${API_URL}/api/outlook/disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });

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
  }, [isAuthenticated]);

  return {
    connectOutlook,
    disconnectOutlook,
    loading,
    error,
  };
};
