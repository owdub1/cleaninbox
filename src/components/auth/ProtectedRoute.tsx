import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchWithAuth } from '../../lib/api';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireEmailVerification?: boolean;
}

const RESEND_COOLDOWN = 60; // seconds

/**
 * Verification screen shown as a full-page overlay.
 * Has a 60-second cooldown on the resend button.
 */
function EmailVerificationScreen({ email, refreshToken }: { email: string; refreshToken: () => Promise<boolean> }) {
  const [cooldown, setCooldown] = useState(0);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleResend = useCallback(async () => {
    if (cooldown > 0) return;
    try {
      const response = await fetchWithAuth('/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email })
      }, refreshToken);

      if (response.ok) {
        setSent(true);
        setCooldown(RESEND_COOLDOWN);
      } else {
        alert('Failed to send verification email. Please try again later.');
      }
    } catch (error) {
      console.error('Error resending verification:', error);
      alert('An error occurred. Please try again later.');
    }
  }, [cooldown, email, refreshToken]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-50 dark:bg-gray-800">
      {/* Logo only — not clickable */}
      <div className="pt-6 pb-4 flex justify-center">
        <div className="flex items-center space-x-2">
          <svg className="h-8 w-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span className="text-xl font-bold text-gray-900 dark:text-gray-100">CleanInbox</span>
        </div>
      </div>

      {/* Centered card */}
      <div className="flex-grow flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 mb-4">
              <svg
                className="h-8 w-8 text-indigo-600 dark:text-indigo-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Check Your Email
            </h2>

            <p className="text-gray-600 dark:text-gray-400 mb-6">
              We sent a verification link to <span className="font-medium text-gray-900 dark:text-gray-200">{email}</span>. Click the link to get started.
            </p>

            <div className="space-y-3">
              <button
                onClick={handleResend}
                disabled={cooldown > 0}
                className={`w-full py-2 px-4 rounded-md transition-colors ${
                  cooldown > 0
                    ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : 'bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600'
                }`}
              >
                {cooldown > 0
                  ? `Resend in ${cooldown}s`
                  : sent
                    ? 'Resend Verification Email'
                    : 'Resend Verification Email'}
              </button>

              <button
                onClick={() => window.location.reload()}
                className="w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                I've Verified My Email
              </button>
            </div>

            {sent && cooldown > 0 && (
              <p className="mt-4 text-sm text-green-600 dark:text-green-400">
                Verification email sent! Check your inbox.
              </p>
            )}

            <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
              Didn't receive an email? Check your spam folder or contact support.
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
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
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check email verification if required
  if (requireEmailVerification && !user.emailVerified) {
    return <EmailVerificationScreen email={user.email} refreshToken={refreshToken} />;
  }

  // User is authenticated (and email verified if required)
  return <>{children}</>;
};

export default ProtectedRoute;
