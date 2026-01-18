import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

/**
 * OAuth Callback Page
 *
 * Handles OAuth redirects from providers (Google, GitHub)
 * Extracts tokens from URL, stores them, and redirects to dashboard
 */
const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    const refreshToken = searchParams.get('refreshToken');
    const csrfToken = searchParams.get('csrfToken');
    const userString = searchParams.get('user');

    if (token && refreshToken && csrfToken && userString) {
      try {
        const user = JSON.parse(userString);

        // Store tokens and user data
        localStorage.setItem('auth_token', token);
        localStorage.setItem('refresh_token', refreshToken);
        localStorage.setItem('csrf_token', csrfToken);
        localStorage.setItem('auth_user', JSON.stringify(user));

        // Redirect to dashboard
        // Use replace to remove tokens from browser history
        navigate('/dashboard', { replace: true });
      } catch (error) {
        console.error('Failed to process OAuth callback:', error);
        navigate('/login?error=oauth_processing_failed', { replace: true });
      }
    } else {
      // Missing required parameters
      navigate('/login?error=oauth_incomplete', { replace: true });
    }
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <p className="mt-4 text-gray-600">Completing sign in...</p>
      </div>
    </div>
  );
};

export default OAuthCallback;
