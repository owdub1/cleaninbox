import React from 'react';
import { BellOff } from 'lucide-react';
import { Sender, EmailMessage } from '../../../hooks/useEmailSenders';
import SenderRow from './SenderRow';
import { getSenderKey } from './emailCleanupUtils';

interface UnsubscribeViewProps {
  senders: Sender[];
  expandedSenders: string[];
  senderEmails: Record<string, EmailMessage[]>;
  loadingEmails: string | null;
  deletingEmailId: string | null;
  onToggleSenderExpand: (sender: Sender) => void;
  onDeleteSingleEmail: (email: EmailMessage, senderEmail: string, senderName: string) => void;
  onViewEmail: (messageId: string, accountEmail: string, senderEmail: string, senderName: string) => void;
  onCleanupAction: (action: 'delete' | 'archive' | 'unsubscribe', senders: Sender[]) => void;
}

const UnsubscribeView: React.FC<UnsubscribeViewProps> = ({
  senders,
  expandedSenders,
  senderEmails,
  loadingEmails,
  deletingEmailId,
  onToggleSenderExpand,
  onDeleteSingleEmail,
  onViewEmail,
  onCleanupAction,
}) => {
  if (senders.length === 0) {
    return (
      <div className="text-center py-12">
        <BellOff className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">No newsletters found</h3>
        <p className="text-gray-500 dark:text-gray-400">
          No senders with unsubscribe options were found in your emails.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 space-y-3">
      {senders.map(sender => (
        <SenderRow
          key={sender.id}
          sender={sender}
          isExpanded={expandedSenders.includes(getSenderKey(sender))}
          isSelected={false}
          onToggleExpand={() => onToggleSenderExpand(sender)}
          emails={senderEmails[getSenderKey(sender)] || []}
          loadingEmails={loadingEmails === getSenderKey(sender)}
          deletingEmailId={deletingEmailId}
          onDeleteSingleEmail={onDeleteSingleEmail}
          onViewEmail={onViewEmail}
          showCheckbox={false}
          showNewsletterBadge
          showStalenessBadge
          showExpandedActions
          onArchiveAll={() => onCleanupAction('archive', [sender])}
          onDeleteAll={() => onCleanupAction('delete', [sender])}
          actions={
            <button
              className="px-5 py-2.5 text-sm font-medium text-white bg-purple-500 hover:bg-purple-600 rounded-lg transition-colors"
              onClick={() => onCleanupAction('unsubscribe', [sender])}
            >
              Unsubscribe
            </button>
          }
        />
      ))}
    </div>
  );
};

export default UnsubscribeView;
