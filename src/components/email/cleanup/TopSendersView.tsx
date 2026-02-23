import React from 'react';
import { Sender } from '../../../hooks/useEmailSenders';
import SenderAvatar from './SenderAvatar';

interface TopSendersViewProps {
  senders: Sender[];
}

const TopSendersView: React.FC<TopSendersViewProps> = ({ senders }) => {
  const topSenders = [...senders].sort((a, b) => b.emailCount - a.emailCount).slice(0, 20);
  const maxEmailCount = topSenders[0]?.emailCount || 1;

  return (
    <div className="px-4 py-3 space-y-3">
      {topSenders.map((sender, index) => (
        <div key={sender.id} className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between">
            <div className="flex items-center flex-1">
              <span className="w-8 text-base font-semibold text-gray-400 mr-3">#{index + 1}</span>
              <SenderAvatar sender={sender} />
              <div className="flex-1 ml-4">
                <div className="flex items-center">
                  <span className="text-base font-medium text-gray-900 dark:text-gray-100">{sender.name}</span>
                  {sender.isNewsletter && (
                    <span className="ml-2 px-2.5 py-0.5 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
                      Newsletter
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{sender.email}</div>
              </div>
              <div className="flex items-center mr-4">
                <div className="w-32 bg-gray-200 dark:bg-gray-600 rounded-full h-2.5 mr-3">
                  <div
                    className="bg-gradient-to-r from-amber-400 to-orange-500 h-2.5 rounded-full"
                    style={{ width: `${Math.min((sender.emailCount / maxEmailCount) * 100, 100)}%` }}
                  />
                </div>
                <span className="text-base font-semibold text-gray-700 dark:text-gray-300">{sender.emailCount}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TopSendersView;
