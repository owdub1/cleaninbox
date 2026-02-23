import React from 'react';
import { Sender } from '../../../hooks/useEmailSenders';
import SenderAvatar from './SenderAvatar';
import { getSenderKey } from './emailCleanupUtils';

interface ArchiveViewProps {
  senders: Sender[];
  selectedSenderKeys: string[];
  onToggleSenderSelection: (sender: Sender) => void;
  onCleanupAction: (action: 'delete', senders: Sender[]) => void;
}

const ArchiveView: React.FC<ArchiveViewProps> = ({
  senders,
  selectedSenderKeys,
  onToggleSenderSelection,
  onCleanupAction,
}) => {
  return (
    <div className="px-4 py-3 space-y-3">
      {senders.map(sender => (
        <div key={sender.id} className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between">
            <div className="flex items-center flex-1">
              <input
                type="checkbox"
                className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mr-4"
                checked={selectedSenderKeys.includes(getSenderKey(sender))}
                onChange={() => onToggleSenderSelection(sender)}
              />
              <SenderAvatar sender={sender} />
              <div className="flex-1 ml-4">
                <div className="flex items-center">
                  <span className="text-base font-medium text-gray-900 dark:text-gray-100">{sender.name}</span>
                  <span className="ml-3 px-2.5 py-0.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">{sender.emailCount} emails</span>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{sender.email}</div>
              </div>
              <div className="text-sm text-gray-400 mr-4">
                Last: {new Date(sender.lastEmailDate).toLocaleDateString()}
              </div>
            </div>
            <button
              className="px-5 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
              onClick={() => onCleanupAction('delete', [sender])}
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ArchiveView;
