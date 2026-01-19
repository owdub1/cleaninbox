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
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  useEffect(() => {
    // Debug logging
    console.log('OAuthCallback: Full URL:', window.location.href);
    console.log('OAuthCallback: Hash:', window.location.hash);
    console.log('OAuthCallback: Search:', window.location.search);

    // Check for error in query parameters first
    const errorCode = searchParams.get('error');
    const errorReason = searchParams.get('reason');

    if (errorCode) {
      console.log('OAuthCallback: Error detected:', errorCode, errorReason);
      let errorMessage = OAUTH_ERROR_MESSAGES[errorCode] || 'An error occurred during sign-in.';
      if (errorReason) {
        setDebugInfo(`Error: ${errorCode}, Reason: ${decodeURIComponent(errorReason)}`);
      }
      setError(errorMessage);
      // Don't redirect immediately - let user see the error
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

    console.log('OAuthCallback: Parsed from hash:', { token: !!token, refreshToken: !!refreshToken, userId, email });

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

    console.log('OAuthCallback: Final values:', { token: !!token, refreshToken: !!refreshToken, userId, email });

    if (token && refreshToken && userId && email) {
      console.log('OAuthCallback: All tokens found, storing...');
      console.log('OAuthCallback: Token preview:', token.substring(0, 20) + '...');
      console.log('OAuthCallback: User ID:', userId);
      console.log('OAuthCallback: Email:', email);

      try {
        // Build user object
        const user = {
          id: userId,
          email: decodeURIComponent(email),
          firstName: firstName ? decodeURIComponent(firstName) : undefined,
          lastName: lastName ? decodeURIComponent(lastName) : undefined,
          emailVerified: true // Google users are verified
        };

        console.log('OAuthCallback: Storing user:', JSON.stringify(user));

        // Store tokens and user data
        localStorage.setItem('auth_token', token);
        localStorage.setItem('refresh_token', refreshToken);
        localStorage.setItem('auth_user', JSON.stringify(user));

        console.log('OAuthCallback: Tokens stored successfully');
        console.log('OAuthCallback: Verifying storage...');
        console.log('OAuthCallback: auth_token exists:', !!localStorage.getItem('auth_token'));
        console.log('OAuthCallback: refresh_token exists:', !!localStorage.getItem('refresh_token'));
        console.log('OAuthCallback: auth_user exists:', !!localStorage.getItem('auth_user'));

        // Clear the hash from URL for security (don't want tokens in browser history)
        window.history.replaceState(null, '', window.location.pathname);

        console.log('OAuthCallback: Redirecting to dashboard in 3 seconds...');

        // Add delay to see what's happening
        setTimeout(() => {
          console.log('OAuthCallback: Now redirecting to dashboard');
          // Force full page reload to reinitialize AuthContext with new tokens
          window.location.href = '/dashboard';
        }, 3000);
      } catch (err) {
        console.error('Failed to process OAuth callback:', err);
        setError('Failed to process sign-in. Please try again.');
        setTimeout(() => {
          navigate('/login?error=oauth_processing_failed', { replace: true });
        }, 2000);
      }
    } else {
      // Missing required parameters
      console.log('OAuthCallback: Missing required params');
      console.log('OAuthCallback: token:', !!token);
      console.log('OAuthCallback: refreshToken:', !!refreshToken);
      console.log('OAuthCallback: userId:', userId);
      console.log('OAuthCallback: email:', email);

      const missing = [];
      if (!token) missing.push('token');
      if (!refreshToken) missing.push('refreshToken');
      if (!userId) missing.push('userId');
      if (!email) missing.push('email');

      setDebugInfo(`Missing: ${missing.join(', ')}`);
      setError('Sign-in incomplete. Missing required data.');
      // Don't auto-redirect - let user see what's missing
    }
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-indigo-100">
      <div className="text-center max-w-md px-4 bg-white p-8 rounded-lg shadow-lg">
        <div className="text-xs text-gray-400 mb-4">OAuth Callback v2 - Debug Mode</div>
        {error ? (
          <>
            <div className="text-red-500 text-lg mb-2">{error}</div>
            {debugInfo && (
              <div className="text-gray-500 text-xs mb-4 bg-gray-100 p-2 rounded font-mono break-all">
                {debugInfo}
              </div>
            )}
            <a
              href="/login"
              className="inline-block mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Back to Login
            </a>
          </>
        ) : (
          <>
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600">Completing sign in...</p>
            <p className="mt-2 text-xs text-gray-400">Please wait, processing OAuth response...</p>
          </>
        )}
      </div>
    </div>
  );
};

export default OAuthCallback;
