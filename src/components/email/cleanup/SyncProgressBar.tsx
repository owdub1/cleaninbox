import React from 'react';
import { RefreshCw } from 'lucide-react';

interface SyncProgressBarProps {
  syncPhase: 'idle' | 'initial' | 'full';
  hasSenders: boolean;
}

/**
 * Two visual modes based on sync phase and whether senders are visible:
 *
 * Phase 1 (no senders yet): Prominent centered layout above skeleton loaders
 * Phase 2 (senders visible): Compact top bar above sender list
 * Idle: Renders nothing
 */
const SyncProgressBar: React.FC<SyncProgressBarProps> = ({ syncPhase, hasSenders }) => {
  if (syncPhase === 'idle') return null;

  // Phase 2 or any sync when senders are already visible: compact top bar
  if (hasSenders) {
    return (
      <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800">
        <div className="h-1 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-2">
          <div className="h-full bg-indigo-500 dark:bg-indigo-400 rounded-full animate-progress-indeterminate" />
        </div>
        <div className="flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-500 dark:text-indigo-400" />
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Syncing all emails for accurate counts...
          </span>
        </div>
      </div>
    );
  }

  // Phase 1 (no senders yet): prominent centered layout
  return (
    <div className="flex flex-col items-center justify-center py-6 px-4">
      <div className="w-full max-w-xs mb-4">
        <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-500 dark:bg-indigo-400 rounded-full animate-progress-indeterminate" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <RefreshCw className="w-5 h-5 animate-spin text-indigo-600 dark:text-indigo-400" />
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Loading your most recent emails...
        </span>
      </div>
    </div>
  );
};

export default SyncProgressBar;
