import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Connect Email Account</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-4">
              You're using <span className="font-semibold">{currentCount} of {emailLimit}</span> email account slots
            </p>
          </div>

          {/* OAuth Connection - Recommended */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Connect with OAuth (Recommended)</h3>
            <p className="text-xs text-gray-500 mb-4">
              Securely connect your account to enable email cleanup features.
            </p>

            {/* Gmail OAuth Button */}
            <button
              onClick={handleGmailConnect}
              disabled={isLoading || currentCount >= emailLimit}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {/* Gmail Icon */}
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"
                />
              </svg>
              <span className="font-medium text-gray-700">
                {gmailLoading ? 'Connecting...' : 'Continue with Gmail'}
              </span>
            </button>

            {/* Coming Soon: Other Providers */}
            <div className="mt-3 flex gap-2">
              <button
                disabled
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-gray-400 cursor-not-allowed"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm-1.25 17.5h2.5v-2.5h-2.5v2.5zm0-5h2.5V6.5h-2.5v6z"/>
                </svg>
                <span className="text-sm">Outlook (Soon)</span>
              </button>
              <button
                disabled
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-gray-400 cursor-not-allowed"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm-1.25 17.5h2.5v-2.5h-2.5v2.5zm0-5h2.5V6.5h-2.5v6z"/>
                </svg>
                <span className="text-sm">Yahoo (Soon)</span>
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>

          {/* Manual Entry Toggle */}
          <button
            onClick={() => setConnectionMethod(m => m === 'manual' ? 'oauth' : 'manual')}
            className="w-full text-center text-sm text-gray-500 hover:text-gray-700"
          >
            {connectionMethod === 'manual' ? 'Hide manual entry' : 'Add email manually (tracking only)'}
          </button>

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
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Adding...' : 'Add Email (Manual)'}
              </button>
            </form>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
          <p className="text-xs text-gray-600">
            <strong>Secure Connection:</strong> We use OAuth 2.0 for secure access.
            Your credentials are never stored on our servers.
          </p>
        </div>
      </div>
    </div>
  );
}
