export const StatsCardsSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
    {[0, 1].map((i) => (
      <div key={i} className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="p-3 rounded-full bg-gray-200 dark:bg-gray-700">
            <div className="h-6 w-6" />
          </div>
          <div className="ml-4">
            <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-7 w-16 bg-gray-200 dark:bg-gray-700 rounded mt-2" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

export const SubscriptionSkeleton = () => (
  <div className="mt-8 bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden animate-pulse">
    <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
      <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
    </div>
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded mt-2" />
        </div>
        <div>
          <div className="h-4 w-14 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-full mt-2" />
        </div>
        <div>
          <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-5 w-28 bg-gray-200 dark:bg-gray-700 rounded mt-2" />
        </div>
        <div className="h-9 w-36 bg-gray-200 dark:bg-gray-700 rounded-md" />
      </div>
      <div className="mt-6">
        <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
        <ActivitySkeleton />
      </div>
    </div>
  </div>
);

export const ActivitySkeleton = () => (
  <div className="space-y-2 animate-pulse">
    {[0, 1, 2, 3].map((i) => (
      <div key={i} className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700" />
        <div className="flex-1">
          <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-3 w-20 bg-gray-100 dark:bg-gray-700 rounded mt-2" />
        </div>
      </div>
    ))}
  </div>
);
