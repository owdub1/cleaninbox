import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { API_URL } from '../lib/api';

// Map OAuth error codes to user-friendly messages
const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  oauth_denied: 'Google sign-in was cancelled. Please try again.',
  invalid_callback: 'Invalid sign-in callback. Please try again.',
  invalid_state: 'Session expired or invalid. Please try signing in again.',
  oauth_config_error: 'Google sign-in is not configured. Please use email and password.',
  no_email: 'Could not get email from Google. Please try again.',
  account_suspended: 'Your account has been suspended. Please contact support.',
  account_deleted: 'Your account has been deleted.',
  account_inactive: 'Your account is not active. Please contact support.',
  signup_failed: 'Failed to create account. Please try again.',
  token_exchange_failed: 'Could not verify with Google. Please try again.',
  profile_fetch_failed: 'Could not get your Google profile. Please try again.',
  callback_failed: 'Sign-in failed. Please try again.'
};

/**
 * OAuth Callback Page
 *
 * After the backend sets auth cookies and redirects here with ?success=true,
 * this page calls /api/auth/refresh to establish the session, saves the user
 * to localStorage, and navigates to the dashboard.
 */
const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for error in query parameters
    const errorCode = searchParams.get('error');

    if (errorCode) {
      const errorMessage = OAUTH_ERROR_MESSAGES[errorCode] || 'An error occurred during sign-in.';
      setError(errorMessage);
      return;
    }

    // Check for success — cookies were already set by the backend
    const success = searchParams.get('success');

    if (success === 'true') {
      // Explicitly call refresh to establish session before navigating
      const establishSession = async () => {
        try {
          const response = await fetch(`${API_URL}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
          });

          if (response.ok) {
            const data = await response.json();
            // Save user to localStorage so AuthContext picks it up immediately
            localStorage.setItem('auth_user', JSON.stringify(data.user));
            // Full page reload to reinitialize AuthContext with the saved user
            window.location.href = '/dashboard';
          } else {
            console.error('OAuth session refresh failed:', response.status);
            setError(`Sign-in almost complete but session setup failed (${response.status}). Please try logging in again.`);
          }
        } catch (err) {
          console.error('OAuth session refresh error:', err);
          setError('Network error during sign-in. Please try again.');
        }
      };

      establishSession();
    } else {
      // Missing success param — something went wrong
      setError('Sign-in incomplete. Please try again.');
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2000);
    }
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-800">
      <div className="text-center">
        {error ? (
          <>
            <div className="text-red-500 dark:text-red-400 text-lg mb-2">{error}</div>
            <a
              href="/login"
              className="inline-block mt-4 px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600"
            >
              Back to Login
            </a>
          </>
        ) : (
          <>
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Completing sign in...</p>
          </>
        )}
      </div>
    </div>
  );
};

export default OAuthCallback;
