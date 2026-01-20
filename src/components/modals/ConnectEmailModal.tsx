import { useState, useEffect } from 'react';
import { X, Mail, Shield, Zap, Lock } from 'lucide-react';
import { useGmailConnection } from '../../hooks/useGmailConnection';

interface ConnectEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect?: (email: string, provider: string) => Promise<void>;
  emailLimit: number;
  currentCount: number;
}

type ConnectionMethod = 'oauth' | 'manual';

export default function ConnectEmailModal({
  isOpen,
  onClose,
  onConnect,
  emailLimit,
  currentCount
}: ConnectEmailModalProps) {
  const [connectionMethod, setConnectionMethod] = useState<ConnectionMethod>('oauth');
  const [email, setEmail] = useState('');
  const [provider, setProvider] = useState('Gmail');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { connectGmail, loading: gmailLoading, error: gmailError } = useGmailConnection();

  // Clear error when modal closes
  useEffect(() => {
    if (!isOpen) {
      setError('');
      setConnectionMethod('oauth');
    }
  }, [isOpen]);

  // Show Gmail error
  useEffect(() => {
    if (gmailError) {
      setError(gmailError);
    }
  }, [gmailError]);

  if (!isOpen) return null;

  const handleGmailConnect = async () => {
    if (currentCount >= emailLimit) {
      setError(`You've reached your email account limit (${emailLimit} account${emailLimit > 1 ? 's' : ''}). Upgrade to Pro to connect up to 10 accounts.`);
      return;
    }

    setError('');
    const authUrl = await connectGmail();
    if (authUrl) {
      // Redirect to Google OAuth
      window.location.href = authUrl;
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (currentCount >= emailLimit) {
      setError(`You've reached your email account limit (${emailLimit} account${emailLimit > 1 ? 's' : ''}). Upgrade to Pro to connect up to 10 accounts.`);
      return;
    }

    if (!onConnect) return;

    setLoading(true);

    try {
      await onConnect(email, provider);
      setEmail('');
      setProvider('Gmail');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to connect email account');
    } finally {
      setLoading(false);
    }
  };

  const isLoading = loading || gmailLoading;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header with gradient */}
        <div className="relative bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-8 text-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 mb-4">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white">Connect Your Email</h2>
          <p className="text-indigo-100 mt-2 text-sm">
            Securely link your account to start cleaning
          </p>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Account slots indicator */}
          <div className="mb-6 flex items-center justify-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full">
              <div className="flex gap-1">
                {Array.from({ length: emailLimit }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full ${
                      i < currentCount ? 'bg-indigo-500' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-600">
                {currentCount}/{emailLimit} accounts
              </span>
            </div>
          </div>

          {/* Gmail OAuth Button - Primary CTA */}
          <button
            onClick={handleGmailConnect}
            disabled={isLoading || currentCount >= emailLimit}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white border-2 border-gray-200 rounded-xl hover:border-indigo-300 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {/* Gmail Icon - Envelope M shape */}
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M2 6a2 2 0 012-2h16a2 2 0 012 2v.01L12 13 2 6.01V6z"/>
              <path fill="#EA4335" d="M2 6.01V18a2 2 0 002 2h3V9.5l5 3.5 5-3.5V20h3a2 2 0 002-2V6.01L12 13 2 6.01z"/>
              <path fill="#FBBC05" d="M7 20V9.5l5 3.5V20H7z"/>
              <path fill="#34A853" d="M17 20V9.5l-5 3.5V20h5z"/>
            </svg>
            <span className="font-semibold text-gray-700 group-hover:text-indigo-600 transition-colors">
              {gmailLoading ? 'Connecting...' : 'Continue with Gmail'}
            </span>
          </button>

          {/* Coming Soon: Other Providers */}
          <div className="mt-4 flex gap-3">
            <button
              disabled
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-400 cursor-not-allowed"
            >
              {/* Outlook Icon - 4 squares */}
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#0078D4" d="M0 0h11.377v11.372H0zm12.623 0H24v11.372H12.623zM0 12.623h11.377V24H0zm12.623 0H24V24H12.623z"/>
              </svg>
              <span className="text-sm font-medium">Outlook</span>
              <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full">Soon</span>
            </button>
            <button
              disabled
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-400 cursor-not-allowed"
            >
              {/* Yahoo Mail Icon - Purple envelope */}
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <defs>
                  <linearGradient id="yahooGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#7B5CC3"/>
                    <stop offset="100%" stopColor="#5235A0"/>
                  </linearGradient>
                </defs>
                <rect width="24" height="24" rx="4" fill="url(#yahooGrad)"/>
                <path fill="#fff" d="M4 7.5L12 13L20 7.5V7C20 6.45 19.55 6 19 6H5C4.45 6 4 6.45 4 7V7.5Z"/>
                <path fill="#fff" d="M4 9V17C4 17.55 4.45 18 5 18H19C19.55 18 20 17.55 20 17V9L12 14.5L4 9Z" opacity="0.8"/>
              </svg>
              <span className="text-sm font-medium">Yahoo</span>
              <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full">Soon</span>
            </button>
          </div>

          {/* Trust indicators */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="flex items-center justify-center gap-6 text-xs text-gray-500">
              <div className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-green-500" />
                <span>OAuth 2.0</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-green-500" />
                <span>Encrypted</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-green-500" />
                <span>Instant Sync</span>
              </div>
            </div>
          </div>

          {/* Manual Entry Toggle */}
          <div className="mt-6 text-center">
            <button
              onClick={() => setConnectionMethod(m => m === 'manual' ? 'oauth' : 'manual')}
              className="text-sm text-gray-400 hover:text-indigo-600 transition-colors"
            >
              {connectionMethod === 'manual' ? 'Hide manual entry' : 'Or add email manually'}
            </button>
          </div>

          {/* Manual Entry Form */}
          {connectionMethod === 'manual' && (
            <form onSubmit={handleManualSubmit} className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-amber-600 mb-4 bg-amber-50 p-3 rounded-lg">
                Manual entry only tracks your email address. To enable cleanup features, please use OAuth above.
              </p>

              <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="your.email@example.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  disabled={isLoading}
                />
              </div>

              <div className="mb-4">
                <label htmlFor="provider" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Provider
                </label>
                <select
                  id="provider"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  disabled={isLoading}
                >
                  <option value="Gmail">Gmail</option>
                  <option value="Outlook">Outlook</option>
                  <option value="Yahoo">Yahoo</option>
                  <option value="iCloud">iCloud</option>
                  <option value="ProtonMail">ProtonMail</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Adding...' : 'Add Email (Manual)'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
