import { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../lib/api';

interface ConnectionStatus {
  isConnected: boolean;
  email: string | null;
  status: 'disconnected' | 'connected' | 'error' | 'expired';
}

export const useGmailConnection = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Start Gmail OAuth flow - returns the authorization URL
   */
  const connectGmail = useCallback(async (): Promise<string | null> => {
    if (!token) {
      setError('Authentication required');
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/api/gmail/connect`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start Gmail connection');
      }

      return data.authUrl;
    } catch (err: any) {
      console.error('Gmail connect error:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  /**
   * Disconnect Gmail account
   */
  const disconnectGmail = useCallback(async (email: string): Promise<boolean> => {
    if (!token) {
      setError('Authentication required');
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/api/gmail/disconnect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to disconnect Gmail');
      }

      return true;
    } catch (err: any) {
      console.error('Gmail disconnect error:', err);
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [token]);

  /**
   * Handle OAuth callback query parameters
   * Call this when the user returns from Google OAuth
   */
  const handleOAuthCallback = useCallback((): {
    success: boolean;
    email?: string;
    error?: string;
  } => {
    const params = new URLSearchParams(window.location.search);

    // Check for error
    const errorParam = params.get('error');
    if (errorParam) {
      const errorMessages: Record<string, string> = {
        oauth_denied: 'Gmail access was denied. Please try again.',
        invalid_callback: 'Invalid OAuth callback. Please try again.',
        invalid_state: 'Session expired. Please try connecting again.',
        email_already_connected: 'This Gmail account is already connected to another user.',
        callback_failed: 'Connection failed. Please try again.',
      };
      return {
        success: false,
        error: errorMessages[errorParam] || 'An error occurred during connection.',
      };
    }

    // Check for success
    const connected = params.get('connected');
    const email = params.get('email');

    if (connected === 'true' && email) {
      return {
        success: true,
        email: decodeURIComponent(email),
      };
    }

    return { success: false };
  }, []);

  /**
   * Clear URL parameters after handling callback
   */
  const clearCallbackParams = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete('connected');
    url.searchParams.delete('email');
    url.searchParams.delete('error');
    window.history.replaceState({}, '', url.toString());
  }, []);

  return {
    connectGmail,
    disconnectGmail,
    handleOAuthCallback,
    clearCallbackParams,
    loading,
    error,
  };
};
