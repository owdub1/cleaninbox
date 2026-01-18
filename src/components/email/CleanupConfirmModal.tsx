import { useState } from 'react';
import { Sender } from '../../hooks/useEmailSenders';

interface CleanupConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  action: 'delete' | 'archive' | 'unsubscribe';
  senders: Sender[];
  loading?: boolean;
}

export const CleanupConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  action,
  senders,
  loading = false,
}: CleanupConfirmModalProps) => {
  const [confirming, setConfirming] = useState(false);

  if (!isOpen) return null;

  const totalEmails = senders.reduce((sum, s) => sum + s.emailCount, 0);

  const actionConfig = {
    delete: {
      title: 'Delete Emails',
      description: 'This will move all emails from the selected senders to trash.',
      buttonText: 'Delete emails',
      buttonClass: 'bg-red-600 hover:bg-red-700',
      icon: (
        <svg className="w-12 h-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
    },
    archive: {
      title: 'Archive Emails',
      description: 'This will remove all emails from the selected senders from your inbox.',
      buttonText: 'Archive emails',
      buttonClass: 'bg-blue-600 hover:bg-blue-700',
      icon: (
        <svg className="w-12 h-12 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      ),
    },
    unsubscribe: {
      title: 'Unsubscribe',
      description: 'This will attempt to unsubscribe you from the selected senders.',
      buttonText: 'Unsubscribe',
      buttonClass: 'bg-purple-600 hover:bg-purple-700',
      icon: (
        <svg className="w-12 h-12 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      ),
    },
  };

  const config = actionConfig[action];

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await onConfirm();
    } finally {
      setConfirming(false);
    }
  };

  const isLoading = loading || confirming;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6 transform transition-all">
          {/* Close button */}
          <button
            onClick={onClose}
            disabled={isLoading}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Icon */}
          <div className="flex justify-center mb-4">
            {config.icon}
          </div>

          {/* Title */}
          <h3 className="text-xl font-semibold text-center text-gray-900 mb-2">
            {config.title}
          </h3>

          {/* Description */}
          <p className="text-center text-gray-600 mb-6">
            {config.description}
          </p>

          {/* Summary */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Selected senders:</span>
              <span className="font-semibold text-gray-900">{senders.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Total emails:</span>
              <span className="font-semibold text-gray-900">{totalEmails.toLocaleString()}</span>
            </div>

            {/* Sender list preview */}
            {senders.length <= 5 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <ul className="space-y-1">
                  {senders.map(sender => (
                    <li key={sender.email} className="text-sm text-gray-600 truncate">
                      {sender.name || sender.email} ({sender.emailCount} emails)
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className={`flex-1 px-4 py-2 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50 ${config.buttonClass}`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Processing...</span>
                </>
              ) : (
                <span>{config.buttonText}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CleanupConfirmModal;
