import React, { useState } from 'react';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { Sender, EmailMessage } from '../../../hooks/useEmailSenders';
import SenderAvatar from './SenderAvatar';
import { getSenderKey, getStalenessBadge } from './emailCleanupUtils';

interface SenderRowProps {
  sender: Sender;
  isExpanded: boolean;
  isSelected: boolean;
  onToggleExpand: () => void;
  onToggleSelect?: () => void;
  emails: EmailMessage[];
  loadingEmails: boolean;
  deletingEmailId: string | null;
  onDeleteSingleEmail: (email: EmailMessage, senderEmail: string, senderName: string) => void;
  onViewEmail: (messageId: string, accountEmail: string, senderEmail: string, senderName: string) => void;
  // Action buttons
  actions: React.ReactNode;
  // Config
  showCheckbox?: boolean;
  showDate?: boolean;
  showStalenessBadge?: boolean;
  showNewsletterBadge?: boolean;
  showExpandedActions?: boolean;
  onDeleteAll?: () => void;
}

const SenderRow: React.FC<SenderRowProps> = ({
  sender,
  isExpanded,
  isSelected,
  onToggleExpand,
  onToggleSelect,
  emails,
  loadingEmails,
  deletingEmailId,
  onDeleteSingleEmail,
  onViewEmail,
  actions,
  showCheckbox = true,
  showDate = false,
  showStalenessBadge = false,
  showNewsletterBadge = false,
  showExpandedActions = false,
  onDeleteAll,
}) => {
  const [selectedEmailIds, setSelectedEmailIds] = useState<Set<string>>(new Set());

  const toggleEmailSelection = (emailId: string) => {
    setSelectedEmailIds(prev => {
      const next = new Set(prev);
      if (next.has(emailId)) {
        next.delete(emailId);
      } else {
        next.add(emailId);
      }
      return next;
    });
  };

  const toggleSelectAllEmails = () => {
    if (selectedEmailIds.size === emails.length) {
      setSelectedEmailIds(new Set());
    } else {
      setSelectedEmailIds(new Set(emails.map(e => e.id)));
    }
  };

  const handleDeleteSelected = () => {
    const selected = emails.filter(e => selectedEmailIds.has(e.id));
    selected.forEach(email => {
      onDeleteSingleEmail(email, sender.email, sender.name);
    });
    setSelectedEmailIds(new Set());
  };

  // Clear selections when sender collapses
  const handleToggleExpand = () => {
    if (isExpanded) {
      setSelectedEmailIds(new Set());
    }
    onToggleExpand();
  };

  const allSelected = emails.length > 0 && selectedEmailIds.size === emails.length;
  const someSelected = selectedEmailIds.size > 0;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div className="px-5 py-4 flex items-center justify-between">
        <button
          className="flex items-center flex-1 text-left"
          onClick={handleToggleExpand}
        >
          {isExpanded ? (
            <ChevronUpIcon className="h-5 w-5 text-gray-400 mr-3" />
          ) : (
            <ChevronDownIcon className="h-5 w-5 text-gray-400 mr-3" />
          )}
          {showCheckbox && onToggleSelect && (
            <input
              type="checkbox"
              className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mr-4"
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation();
                onToggleSelect();
              }}
              onClick={(e) => e.stopPropagation()}
            />
          )}
          <SenderAvatar sender={sender} />
          <div className="flex-1 ml-4">
            <div className="flex items-center">
              <span className="text-base font-medium text-gray-900 dark:text-gray-100">{sender.name}</span>
              <span className="ml-3 px-2.5 py-0.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">{sender.emailCount} emails</span>
              {showNewsletterBadge && sender.isNewsletter && (
                <span className="ml-2 px-2.5 py-0.5 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
                  Newsletter
                </span>
              )}
              {showStalenessBadge && (() => {
                const badge = getStalenessBadge(sender.lastEmailDate);
                return badge ? (
                  <span className={`ml-2 px-2.5 py-0.5 text-sm rounded-full ${badge.className}`}>
                    {badge.label}
                  </span>
                ) : null;
              })()}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{sender.email}</div>
          </div>
          {showDate && (
            <div className="text-sm text-gray-400 mr-4">
              {new Date(sender.lastEmailDate).toLocaleDateString()}
            </div>
          )}
        </button>
        <div className="flex items-center gap-3">
          {actions}
        </div>
      </div>

      {isExpanded && (
        <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-t border-gray-100 dark:border-gray-800">
          {showExpandedActions && (
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Emails from this sender ({sender.emailCount} total):
              </div>
              <div className="flex gap-2">
                {onDeleteAll && (
                  <button
                    className="px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                    onClick={onDeleteAll}
                  >
                    Delete All
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Delete selected bar — only shown when emails are checked */}
          {someSelected && (
            <div className="flex items-center justify-end mb-2">
              <button
                onClick={handleDeleteSelected}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                Delete {selectedEmailIds.size} selected
              </button>
            </div>
          )}

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {loadingEmails ? (
              <div className="flex items-center justify-center py-4">
                <RefreshCw className="w-5 h-5 animate-spin text-gray-400 mr-2" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Loading emails...</span>
              </div>
            ) : emails.length > 0 ? (
              emails.map(email => (
                <div key={email.id} className="bg-white dark:bg-gray-900 rounded-lg p-3 shadow-sm border border-gray-100 dark:border-gray-800 group hover:border-indigo-200 dark:hover:border-indigo-600 hover:shadow-md transition-all cursor-pointer">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        className="h-4 w-4 mt-0.5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded flex-shrink-0"
                        checked={selectedEmailIds.has(email.id)}
                        onChange={(e) => { e.stopPropagation(); toggleEmailSelection(email.id); }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div
                        className="flex-1 min-w-0"
                        role="button"
                        tabIndex={0}
                        onClick={() => onViewEmail(email.id, sender.accountEmail, sender.email, sender.name)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onViewEmail(email.id, sender.accountEmail, sender.email, sender.name); } }}
                      >
                        <div className="flex items-center gap-2">
                          {email.isUnread && <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />}
                          <span className={`text-sm truncate ${email.isUnread ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'}`}>
                            {email.subject}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">{email.snippet}</p>
                        <div className="text-xs text-gray-400 mt-1">
                          {new Date(email.date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteSingleEmail(email, sender.email, sender.name); }}
                      disabled={deletingEmailId === email.id}
                      className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all flex-shrink-0"
                      aria-label="Delete email"
                    >
                      {deletingEmailId === email.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-2 text-sm text-gray-500 dark:text-gray-400">
                No emails found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SenderRow;
