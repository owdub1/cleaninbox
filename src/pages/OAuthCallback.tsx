import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

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
  callback_failed: 'Sign-in failed. Please try again.'
};

/**
 * OAuth Callback Page
 *
 * Handles OAuth redirects from providers (Google)
 * Extracts tokens from URL hash (more secure - not sent to server),
 * stores them, and redirects to dashboard
 */
const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for error in query parameters first
    const errorCode = searchParams.get('error');

    if (errorCode) {
      const errorMessage = OAUTH_ERROR_MESSAGES[errorCode] || 'An error occurred during sign-in.';
      setError(errorMessage);
      return;
    }

    // First, try to get tokens from URL hash (fragment) - preferred for security
    const hash = window.location.hash.substring(1); // Remove the leading #
    const hashParams = new URLSearchParams(hash);

    let token = hashParams.get('token');
    let refreshToken = hashParams.get('refreshToken');
    let userId = hashParams.get('userId');
    let email = hashParams.get('email');
    let firstName = hashParams.get('firstName');
    let lastName = hashParams.get('lastName');


    // Fallback to query parameters if hash is empty
    if (!token) {
      token = searchParams.get('token');
      refreshToken = searchParams.get('refreshToken');
      const userString = searchParams.get('user');
      const csrfToken = searchParams.get('csrfToken');

      if (userString) {
        try {
          const user = JSON.parse(userString);
          userId = user.id;
          email = user.email;
          firstName = user.firstName;
          lastName = user.lastName;

          // Store CSRF token if provided
          if (csrfToken) {
            localStorage.setItem('csrf_token', csrfToken);
          }
        } catch (e) {
          console.error('Failed to parse user data:', e);
        }
      }
    }

    if (token && refreshToken && userId && email) {
      try {
        // Build user object
        const user = {
          id: userId,
          email: decodeURIComponent(email),
          firstName: firstName ? decodeURIComponent(firstName) : undefined,
          lastName: lastName ? decodeURIComponent(lastName) : undefined,
          emailVerified: true // Google users are verified
        };

        // Store tokens and user data
        localStorage.setItem('auth_token', token);
        localStorage.setItem('refresh_token', refreshToken);
        localStorage.setItem('auth_user', JSON.stringify(user));

        // Clear the hash from URL for security (don't want tokens in browser history)
        window.history.replaceState(null, '', window.location.pathname);

        // Force full page reload to reinitialize AuthContext with new tokens
        window.location.href = '/dashboard';
      } catch (err) {
        console.error('Failed to process OAuth callback:', err);
        setError('Failed to process sign-in. Please try again.');
        setTimeout(() => {
          navigate('/login?error=oauth_processing_failed', { replace: true });
        }, 2000);
      }
    } else {
      // Missing required parameters
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
