import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface ConnectEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (email: string, provider: string) => Promise<void>;
  emailLimit: number;
  currentCount: number;
}

export default function ConnectEmailModal({
  isOpen,
  onClose,
  onConnect,
  emailLimit,
  currentCount
}: ConnectEmailModalProps) {
  const [email, setEmail] = useState('');
  const [provider, setProvider] = useState('Gmail');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Clear error when modal closes
  useEffect(() => {
    if (!isOpen) {
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Check if user has reached their limit
    if (currentCount >= emailLimit) {
      setError(`You've reached your email account limit (${emailLimit} account${emailLimit > 1 ? 's' : ''}). Upgrade to Pro to connect up to 10 accounts.`);
      return;
    }

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

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-4">
              You're using <span className="font-semibold">{currentCount} of {emailLimit}</span> email account slots
            </p>
          </div>

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
              disabled={loading}
            />
          </div>

          <div className="mb-6">
            <label htmlFor="provider" className="block text-sm font-medium text-gray-700 mb-2">
              Email Provider
            </label>
            <select
              id="provider"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              disabled={loading}
            >
              <option value="Gmail">Gmail</option>
              <option value="Outlook">Outlook</option>
              <option value="Yahoo">Yahoo</option>
              <option value="iCloud">iCloud</option>
              <option value="ProtonMail">ProtonMail</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-md hover:from-purple-700 hover:to-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Connecting...' : 'Connect Account'}
            </button>
          </div>
        </form>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
          <p className="text-xs text-gray-600">
            <strong>Note:</strong> This will store your email address for tracking purposes only.
            We don't access your actual emails or store credentials.
          </p>
        </div>
      </div>
    </div>
  );
}
