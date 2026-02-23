import React, { useState, useEffect, useRef } from 'react';
import { Undo2, X } from 'lucide-react';
import { UndoAction } from './emailCleanupUtils';

const UNDO_TIMEOUT = 4000;

const UndoToast = ({
  action,
  onUndo,
  onDismiss,
  stackIndex = 0
}: {
  action: UndoAction;
  onUndo: () => void;
  onDismiss: () => void;
  stackIndex?: number;
}) => {
  const [progress, setProgress] = useState(100);

  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / UNDO_TIMEOUT) * 100);
      setProgress(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        onDismissRef.current();
      }
    }, 50);

    return () => clearInterval(interval);
  }, []);

  const bottomOffset = 24 + (stackIndex * 72);

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-50 animate-slide-up transition-all duration-200"
      style={{ bottom: `${bottomOffset}px` }}
    >
      <div className="bg-gray-900 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-4 min-w-[300px]">
        <div className="flex-1">
          <p className="text-sm font-medium">
            {action.type === 'delete' ? 'Deleted' : 'Archived'} {action.count} email{action.count !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={onUndo}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
        >
          <Undo2 className="w-4 h-4" />
          Undo
        </button>
        <button
          onClick={onDismiss}
          className="p-1 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="h-1 bg-gray-700 rounded-full mt-1 overflow-hidden">
        <div
          className="h-full bg-indigo-500 transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default UndoToast;
