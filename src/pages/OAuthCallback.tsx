import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
 * After the backend sets auth cookies and redirects here with ?success=true&u=<base64>,
 * this page reads the user profile from the URL, saves it to localStorage,
 * and navigates to the dashboard. No /api/auth/refresh call needed.
 */
const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for error in query parameters
    const errorCode = searchParams.get('error');

    if (errorCode) {
      const errorMessage = OAUTH_ERROR_MESSAGES[errorCode] || 'An error occurred during sign-in.';
      setError(errorMessage);
      return;
    }

    // Check for success
    const success = searchParams.get('success');
    const userDataParam = searchParams.get('u');

    if (success === 'true' && userDataParam) {
      try {
        // Decode user profile from URL parameter (base64url-encoded JSON)
        const userData = JSON.parse(atob(userDataParam));

        // Save CSRF token if provided (for double-submit cookie CSRF protection)
        const csrfToken = searchParams.get('csrf');
        if (csrfToken) {
          localStorage.setItem('csrf_token', csrfToken);
        }

        // Save to localStorage and update AuthContext
        localStorage.setItem('auth_user', JSON.stringify(userData));
        updateUser(userData);

        // Navigate to dashboard (no page reload needed)
        navigate('/dashboard', { replace: true });
      } catch (e) {
        console.error('Failed to parse OAuth user data:', e);
        setError('Sign-in failed. Invalid user data. Please try again.');
      }
    } else if (success === 'true') {
      // Fallback: success but no user data param (shouldn't happen with updated backend)
      // Do a full page reload to let AuthContext handle it via refresh
      window.location.href = '/dashboard';
    } else {
      setError('Sign-in incomplete. Please try again.');
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2000);
    }
  }, [searchParams, navigate, updateUser]);

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
