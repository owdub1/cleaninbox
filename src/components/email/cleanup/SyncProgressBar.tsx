import React from 'react';
import { RefreshCw } from 'lucide-react';

interface SyncProgressBarProps {
  syncPhase: 'idle' | 'initial' | 'full';
  hasSenders: boolean;
  syncProgress?: { current: number; total: number } | null;
}

/**
 * Two visual modes based on sync phase and whether senders are visible:
 *
 * Phase 1 (no senders yet): Prominent centered layout above skeleton loaders
 * Phase 2 (senders visible): Compact top bar above sender list
 * Idle: Renders nothing
 *
 * When syncProgress is available, shows real numbers (e.g., "Syncing 400 of 7,000 emails...")
 * Otherwise falls back to indeterminate animation.
 */
const SyncProgressBar: React.FC<SyncProgressBarProps> = ({ syncPhase, hasSenders, syncProgress }) => {
  if (syncPhase === 'idle') return null;

  const hasRealProgress = syncProgress && syncProgress.total > 0;
  const progressPercent = hasRealProgress
    ? Math.min(100, Math.round((syncProgress.current / syncProgress.total) * 100))
    : 0;

  // Phase 2 or any sync when senders are already visible: compact top bar
  if (hasSenders) {
    return (
      <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800">
        <div className="h-1 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-2">
          {hasRealProgress ? (
            <div
              className="h-full bg-indigo-500 dark:bg-indigo-400 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          ) : (
            <div className="h-full bg-indigo-500 dark:bg-indigo-400 rounded-full animate-progress-indeterminate" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-500 dark:text-indigo-400" />
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {hasRealProgress
              ? `Syncing ${syncProgress.current.toLocaleString()} of ${syncProgress.total.toLocaleString()} emails...`
              : 'Starting sync...'}
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
          {hasRealProgress ? (
            <div
              className="h-full bg-indigo-500 dark:bg-indigo-400 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          ) : (
            <div className="h-full bg-indigo-500 dark:bg-indigo-400 rounded-full animate-progress-indeterminate" />
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <RefreshCw className="w-5 h-5 animate-spin text-indigo-600 dark:text-indigo-400" />
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {hasRealProgress
            ? `Loading ${syncProgress.current.toLocaleString()} of ${syncProgress.total.toLocaleString()} recent emails...`
            : 'Preparing sync...'}
        </span>
      </div>
    </div>
  );
};

export default SyncProgressBar;
