import { useState } from 'react';
import { Sender } from '../../hooks/useEmailSenders';

// Helper to create composite key for sender (name + email)
const getSenderKey = (sender: Sender): string => `${sender.name}|||${sender.email}`;

interface SenderCardProps {
  sender: Sender;
  isSelected: boolean;
  onSelect: (senderKey: string, selected: boolean) => void;
  onDelete: (sender: Sender) => void;
  onArchive: (sender: Sender) => void;
  onUnsubscribe: (sender: Sender) => void;
  disabled?: boolean;
}

export const SenderCard = ({
  sender,
  isSelected,
  onSelect,
  onDelete,
  onArchive,
  onUnsubscribe,
  disabled = false,
}: SenderCardProps) => {
  const [showActions, setShowActions] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (email: string) => {
    const colors = [
      'bg-red-500',
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-teal-500',
    ];
    const hash = email.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  return (
    <div
      className={`
        relative flex items-center gap-4 p-4 rounded-lg border transition-all duration-200
        ${isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-900'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      onMouseEnter={() => !disabled && setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Checkbox */}
      <div className="flex-shrink-0">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(getSenderKey(sender), e.target.checked)}
          disabled={disabled}
          className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
        />
      </div>

      {/* Avatar */}
      <div
        className={`
          flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm
          ${getAvatarColor(sender.email)}
        `}
      >
        {getInitials(sender.name || sender.email)}
      </div>

      {/* Sender Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
            {sender.name || sender.email}
          </h4>
          {sender.isNewsletter && (
            <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
              Newsletter
            </span>
          )}
          {sender.isPromotional && (
            <span className="px-2 py-0.5 text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full">
              Promo
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{sender.email}</p>
        <p className="text-xs text-gray-400 mt-1">
          Last email: {formatDate(sender.lastEmailDate)}
        </p>
      </div>

      {/* Email Count */}
      <div className="flex-shrink-0 text-right">
        <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {sender.emailCount}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">emails</div>
        {sender.unreadCount > 0 && (
          <div className="text-xs text-blue-600 dark:text-blue-400">
            {sender.unreadCount} unread
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div
        className={`
          absolute right-4 flex items-center gap-2 transition-opacity duration-200
          ${showActions && !disabled ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
      >
        {sender.hasUnsubscribe && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUnsubscribe(sender);
            }}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
            title="Unsubscribe"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onArchive(sender);
          }}
          className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
          title="Archive all"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(sender);
          }}
          className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
          title="Delete all"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default SenderCard;
