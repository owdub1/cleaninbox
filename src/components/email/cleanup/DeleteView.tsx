import React from 'react';
import { Sender, EmailMessage } from '../../../hooks/useEmailSenders';
import SenderRow from './SenderRow';
import { getSenderKey } from './emailCleanupUtils';

interface DeleteViewProps {
  sortBy: string;
  sendersByTimePeriod: { period: string; senders: Sender[]; sortOrder: number }[];
  flatSenders: Sender[];
  selectedSenderKeys: string[];
  expandedSenders: string[];
  senderEmails: Record<string, EmailMessage[]>;
  loadingEmails: string | null;
  deletingEmailId: string | null;
  onToggleSenderExpand: (sender: Sender) => void;
  onToggleSenderSelection: (sender: Sender) => void;
  onDeleteSingleEmail: (email: EmailMessage, senderEmail: string, senderName: string) => void;
  onViewEmail: (messageId: string, accountEmail: string, senderEmail: string, senderName: string) => void;
  onCleanupAction: (action: 'delete' | 'archive', senders: Sender[]) => void;
}

const DeleteView: React.FC<DeleteViewProps> = ({
  sortBy,
  sendersByTimePeriod,
  flatSenders,
  selectedSenderKeys,
  expandedSenders,
  senderEmails,
  loadingEmails,
  deletingEmailId,
  onToggleSenderExpand,
  onToggleSenderSelection,
  onDeleteSingleEmail,
  onViewEmail,
  onCleanupAction,
}) => {
  if (sortBy === 'date') {
    return (
      <div>
        {sendersByTimePeriod.map(({ period, senders: periodSenders }) => {
          const totalEmails = periodSenders.reduce((sum, s) => sum + s.emailCount, 0);
          if (periodSenders.length === 0) return null;

          return (
            <div key={period} className="mb-4">
              <div className="px-4 py-2 bg-gray-100 dark:bg-gray-700 border-y border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {period === 'Today' || period === 'Yesterday' ? `Last email: ${period.toLowerCase()}` : `Last email: ${period}`}
                  </span>
                  <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                    {periodSenders.length} sender{periodSenders.length !== 1 ? 's' : ''} • {totalEmails.toLocaleString()} total emails
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="px-2 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded"
                    onClick={() => onCleanupAction('archive', periodSenders)}
                  >
                    Archive All
                  </button>
                  <button
                    className="px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                    onClick={() => onCleanupAction('delete', periodSenders)}
                  >
                    Delete All
                  </button>
                </div>
              </div>
              <div className="px-4 py-3 space-y-3">
                {periodSenders.map(sender => (
                  <SenderRow
                    key={sender.id}
                    sender={sender}
                    isExpanded={expandedSenders.includes(getSenderKey(sender))}
                    isSelected={selectedSenderKeys.includes(getSenderKey(sender))}
                    onToggleExpand={() => onToggleSenderExpand(sender)}
                    onToggleSelect={() => onToggleSenderSelection(sender)}
                    emails={senderEmails[getSenderKey(sender)] || []}
                    loadingEmails={loadingEmails === getSenderKey(sender)}
                    deletingEmailId={deletingEmailId}
                    onDeleteSingleEmail={onDeleteSingleEmail}
                    onViewEmail={onViewEmail}
                    actions={
                      <>
                        <button
                          className="px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-lg transition-colors"
                          onClick={() => onCleanupAction('archive', [sender])}
                        >
                          Archive
                        </button>
                        <button
                          className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                          onClick={() => onCleanupAction('delete', [sender])}
                        >
                          Delete
                        </button>
                      </>
                    }
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Flat list mode
  return (
    <div className="px-4 py-3 space-y-3">
      {flatSenders.map(sender => (
        <SenderRow
          key={sender.id}
          sender={sender}
          isExpanded={expandedSenders.includes(getSenderKey(sender))}
          isSelected={selectedSenderKeys.includes(getSenderKey(sender))}
          onToggleExpand={() => onToggleSenderExpand(sender)}
          onToggleSelect={() => onToggleSenderSelection(sender)}
          emails={senderEmails[getSenderKey(sender)] || []}
          loadingEmails={loadingEmails === getSenderKey(sender)}
          deletingEmailId={deletingEmailId}
          onDeleteSingleEmail={onDeleteSingleEmail}
          onViewEmail={onViewEmail}
          showDate
          actions={
            <>
              <button
                className="px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-lg transition-colors"
                onClick={() => onCleanupAction('archive', [sender])}
              >
                Archive
              </button>
              <button
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                onClick={() => onCleanupAction('delete', [sender])}
              >
                Delete
              </button>
            </>
          }
        />
      ))}
    </div>
  );
};

export default DeleteView;
