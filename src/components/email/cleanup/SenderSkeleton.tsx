import React from 'react';

const SenderSkeleton = () => (
  <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm overflow-hidden animate-pulse">
    <div className="px-5 py-4 flex items-center justify-between">
      <div className="flex items-center flex-1">
        <div className="h-5 w-5 bg-gray-200 dark:bg-gray-600 rounded mr-3" />
        <div className="h-5 w-5 bg-gray-200 dark:bg-gray-600 rounded mr-4" />
        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-full" />
        <div className="flex-1 ml-4">
          <div className="flex items-center">
            <div className="h-5 w-32 bg-gray-200 dark:bg-gray-600 rounded" />
            <div className="ml-3 h-5 w-16 bg-gray-100 dark:bg-gray-700 rounded-full" />
          </div>
          <div className="h-4 w-48 bg-gray-100 dark:bg-gray-700 rounded mt-1.5" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="h-9 w-20 bg-gray-100 dark:bg-gray-700 rounded-lg" />
        <div className="h-9 w-20 bg-gray-200 dark:bg-gray-600 rounded-lg" />
      </div>
    </div>
  </div>
);

export default SenderSkeleton;
