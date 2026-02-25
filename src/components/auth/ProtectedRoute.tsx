import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchWithAuth } from '../../lib/api';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireEmailVerification?: boolean;
}

/**
 * ProtectedRoute Component
 *
 * Wraps routes that require authentication.
 * Redirects to login if user is not authenticated.
 * Optionally can require email verification.
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireEmailVerification = false
}) => {
  const { user, isAuthenticated, loading, refreshToken } = useAuth();
  const location = useLocation();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-800">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    // Save the attempted location so we can redirect after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check email verification if required
  if (requireEmailVerification && !user.emailVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-800 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 dark:bg-yellow-900/30 mb-4">
              <svg
                className="h-8 w-8 text-yellow-600 dark:text-yellow-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Email Verification Required
            </h2>

            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Please verify your email address to access this feature. Check your inbox for a verification link.
            </p>

            <div className="space-y-3">
              <button
                onClick={async () => {
                  try {
                    const response = await fetchWithAuth('/api/auth/resend-verification', {
                      method: 'POST',
                      body: JSON.stringify({ email: user.email })
                    }, refreshToken);

                    if (response.ok) {
                      alert('Verification email sent! Please check your inbox.');
                    } else {
                      alert('Failed to send verification email. Please try again later.');
                    }
                  } catch (error) {
                    console.error('Error resending verification:', error);
                    alert('An error occurred. Please try again later.');
                  }
                }}
                className="w-full bg-indigo-600 dark:bg-indigo-500 text-white py-2 px-4 rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors"
              >
                Resend Verification Email
              </button>

              <button
                onClick={() => window.location.reload()}
                className="w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                I've Verified My Email
              </button>
            </div>

            <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
              Didn't receive an email? Check your spam folder or contact support.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // User is authenticated (and email verified if required)
  return <>{children}</>;
};

export default ProtectedRoute;
