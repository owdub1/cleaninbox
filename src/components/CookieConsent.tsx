import { useState, useEffect } from 'react';
import { Cookie } from 'lucide-react';

export const CookieConsent = () => {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if user has already accepted cookies
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      // Small delay so it doesn't pop up immediately on page load
      const timer = setTimeout(() => setShowBanner(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem('cookieConsent', 'accepted');
    setShowBanner(false);
  };

  const declineCookies = () => {
    localStorage.setItem('cookieConsent', 'declined');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-6 left-6 z-50 animate-slide-up">
      <div className="w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-shrink-0 w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
            <Cookie className="w-6 h-6 text-indigo-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">We use cookies</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              We use cookies to improve your experience, analyze site traffic, and personalize content.
              By clicking "Accept", you consent to our use of cookies.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={declineCookies}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
          >
            Decline
          </button>
          <button
            onClick={acceptCookies}
            className="flex-1 px-6 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
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
