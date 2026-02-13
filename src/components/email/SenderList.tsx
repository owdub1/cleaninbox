import { useState, useMemo } from 'react';
import { Sender } from '../../hooks/useEmailSenders';
import SenderCard from './SenderCard';

interface SenderListProps {
  senders: Sender[];
  loading?: boolean;
  onDelete: (sender: Sender) => void;
  onArchive: (sender: Sender) => void;
  onUnsubscribe: (sender: Sender) => void;
  onBulkDelete: (senders: Sender[]) => void;
  onBulkArchive: (senders: Sender[]) => void;
  disabled?: boolean;
}

// Helper to create composite key for sender (name + email)
const getSenderKey = (sender: Sender): string => `${sender.name}|||${sender.email}`;

export const SenderList = ({
  senders,
  loading = false,
  onDelete,
  onArchive,
  onUnsubscribe,
  onBulkDelete,
  onBulkArchive,
  disabled = false,
}: SenderListProps) => {
  // Use composite keys (name|||email) for selection to differentiate senders with same email but different names
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'count' | 'name' | 'date'>('count');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set([new Date().getFullYear().toString()]));
  const [filter, setFilter] = useState<'all' | 'newsletter' | 'promotional' | 'unsubscribable'>('all');

  // Filter and sort senders
  const filteredSenders = useMemo(() => {
    let result = [...senders];

    // Apply search
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(s =>
        s.name.toLowerCase().includes(lowerSearch) ||
        s.email.toLowerCase().includes(lowerSearch)
      );
    }

    // Apply filter
    if (filter === 'newsletter') {
      result = result.filter(s => s.isNewsletter);
    } else if (filter === 'promotional') {
      result = result.filter(s => s.isPromotional);
    } else if (filter === 'unsubscribable') {
      result = result.filter(s => s.hasUnsubscribe);
    }

    // Apply sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'count':
          comparison = a.emailCount - b.emailCount;
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'date':
          comparison = new Date(a.lastEmailDate).getTime() - new Date(b.lastEmailDate).getTime();
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [senders, searchTerm, sortBy, sortDirection, filter]);

  // Group by year
  const sendersByYear = useMemo(() => {
    const grouped: Record<string, Sender[]> = {};
    for (const sender of filteredSenders) {
      const year = new Date(sender.lastEmailDate).getFullYear().toString();
      if (!grouped[year]) {
        grouped[year] = [];
      }
      grouped[year].push(sender);
    }
    return grouped;
  }, [filteredSenders]);

  const years = Object.keys(sendersByYear).sort((a, b) => parseInt(b) - parseInt(a));

  const handleSelectSender = (senderKey: string, selected: boolean) => {
    const newSelected = new Set(selectedKeys);
    if (selected) {
      newSelected.add(senderKey);
    } else {
      newSelected.delete(senderKey);
    }
    setSelectedKeys(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedKeys.size === filteredSenders.length) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(filteredSenders.map(s => getSenderKey(s))));
    }
  };

  const toggleYear = (year: string) => {
    const newExpanded = new Set(expandedYears);
    if (newExpanded.has(year)) {
      newExpanded.delete(year);
    } else {
      newExpanded.add(year);
    }
    setExpandedYears(newExpanded);
  };

  const selectedSenders = filteredSenders.filter(s => selectedKeys.has(getSenderKey(s)));
  const totalSelectedEmails = selectedSenders.reduce((sum, s) => sum + s.emailCount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
          <svg className="animate-spin w-6 h-6" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Loading senders...</span>
        </div>
      </div>
    );
  }

  if (senders.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">No emails found</h3>
        <p className="text-gray-500 dark:text-gray-400">Sync your Gmail to see your email senders.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search senders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400"
            />
          </div>
        </div>

        {/* Filter */}
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100"
        >
          <option value="all">All senders</option>
          <option value="newsletter">Newsletters</option>
          <option value="promotional">Promotional</option>
          <option value="unsubscribable">Can unsubscribe</option>
        </select>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100"
          >
            <option value="count">Email count</option>
            <option value="name">Name</option>
            <option value="date">Last email</option>
          </select>
          <button
            onClick={() => setSortDirection(d => d === 'asc' ? 'desc' : 'asc')}
            className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
            title={`Sort ${sortDirection === 'asc' ? 'descending' : 'ascending'}`}
          >
            {sortDirection === 'asc' ? (
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Selection Actions */}
      {selectedKeys.size > 0 && (
        <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-4">
            <button
              onClick={handleSelectAll}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
            >
              {selectedKeys.size === filteredSenders.length ? 'Deselect all' : 'Select all'}
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {selectedKeys.size} sender{selectedKeys.size !== 1 ? 's' : ''} selected
              ({totalSelectedEmails.toLocaleString()} emails)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onBulkArchive(selectedSenders)}
              disabled={disabled}
              className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-900 border border-blue-300 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 disabled:opacity-50"
            >
              Archive all
            </button>
            <button
              onClick={() => onBulkDelete(selectedSenders)}
              disabled={disabled}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              Delete all
            </button>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <span>
          {filteredSenders.length} sender{filteredSenders.length !== 1 ? 's' : ''}
          {searchTerm && ` matching "${searchTerm}"`}
        </span>
        <span>
          {filteredSenders.reduce((sum, s) => sum + s.emailCount, 0).toLocaleString()} total emails
        </span>
      </div>

      {/* Sender List by Year */}
      <div className="space-y-4">
        {years.map(year => (
          <div key={year} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            {/* Year Header */}
            <button
              onClick={() => toggleYear(year)}
              className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <svg
                  className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${expandedYears.has(year) ? 'rotate-90' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{year}</span>
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {sendersByYear[year].length} sender{sendersByYear[year].length !== 1 ? 's' : ''}
              </span>
            </button>

            {/* Senders */}
            {expandedYears.has(year) && (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {sendersByYear[year].map(sender => (
                  <SenderCard
                    key={getSenderKey(sender)}
                    sender={sender}
                    isSelected={selectedKeys.has(getSenderKey(sender))}
                    onSelect={(senderKey, selected) => handleSelectSender(senderKey, selected)}
                    onDelete={onDelete}
                    onArchive={onArchive}
                    onUnsubscribe={onUnsubscribe}
                    disabled={disabled}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SenderList;
