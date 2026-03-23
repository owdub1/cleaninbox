import { useState, useEffect } from 'react';
import { Cookie } from 'lucide-react';

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}

const GA_MEASUREMENT_ID = 'G-ZD75VZTB4H';

function loadGoogleAnalytics() {
  // Don't load twice
  if (document.querySelector(`script[src*="gtag/js"]`)) return;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.gtag('consent', 'update', {
    analytics_storage: 'granted'
  });
  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID);
}

export const CookieConsent = () => {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    if (consent === 'accepted') {
      // User previously accepted — load GA
      loadGoogleAnalytics();
    } else if (!consent) {
      // No choice yet — show banner after brief delay
      const timer = setTimeout(() => setShowBanner(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem('cookieConsent', 'accepted');
    loadGoogleAnalytics();
    setShowBanner(false);
  };

  const declineCookies = () => {
    localStorage.setItem('cookieConsent', 'declined');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-50 animate-slide-up">
      <div className="w-[calc(100vw-2rem)] sm:w-[calc(100vw-3rem)] max-w-96 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-shrink-0 w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center">
            <Cookie className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">We use cookies</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              We use cookies to improve your experience, analyze site traffic, and personalize content.
              By clicking "Accept", you consent to our use of cookies.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={declineCookies}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors border border-gray-200 dark:border-gray-700"
          >
            Decline
          </button>
          <button
            onClick={acceptCookies}
            className="flex-1 px-6 py-2.5 text-sm font-medium text-white bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 rounded-lg transition-colors"
          >
            Accept
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(100%);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};
