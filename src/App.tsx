import React, { useEffect, Suspense, lazy } from 'react';
import * as Sentry from '@sentry/react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { CookieConsent } from './components/CookieConsent';

// Lazy-loaded pages — each page is only downloaded when the user visits it
const Home = lazy(() => import('./pages/Home'));
const Pricing = lazy(() => import('./pages/Pricing'));
const HowItWorks = lazy(() => import('./pages/HowItWorks'));
const Contact = lazy(() => import('./pages/Contact'));
const Checkout = lazy(() => import('./pages/Checkout'));
const EmailCleanup = lazy(() => import('./pages/EmailCleanup'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const OAuthCallback = lazy(() => import('./pages/OAuthCallback'));
const NotFound = lazy(() => import('./pages/NotFound'));
// Scroll to top component
function ScrollToTop() {
  const {
    pathname
  } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
// Main app with AuthProvider
function AppWithAuth() {
  return <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-gray-950 text-base">
      <Navbar />
      <main className="flex-grow">
        <Suspense fallback={<div className="flex-grow" />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/email-cleanup" element={
            <ProtectedRoute requireEmailVerification>
              <EmailCleanup />
            </ProtectedRoute>
          } />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/oauth/callback" element={<OAuthCallback />} />
          <Route path="/dashboard" element={
            <ProtectedRoute requireEmailVerification>
              <Dashboard />
            </ProtectedRoute>
          } />

          <Route path="/checkout" element={
            <ProtectedRoute requireEmailVerification>
              <Checkout />
            </ProtectedRoute>
          } />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
      </main>
      <Footer />
      <CookieConsent />
    </div>;
}
function SentryFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Something went wrong</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">An unexpected error occurred. Please try reloading the page.</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-indigo-600 text-white px-6 py-3 rounded-md font-medium hover:bg-indigo-700 transition-colors"
        >
          Reload Page
        </button>
      </div>
    </div>
  );
}

export function App() {
  return <Sentry.ErrorBoundary fallback={<SentryFallback />}>
      <Router>
        <ScrollToTop />
        <ThemeProvider>
          <AuthProvider>
            <AppWithAuth />
          </AuthProvider>
        </ThemeProvider>
      </Router>
    </Sentry.ErrorBoundary>;
}