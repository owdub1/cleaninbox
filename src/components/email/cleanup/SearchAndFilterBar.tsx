import React from 'react';
import {
  SearchIcon,
  FilterIcon,
  SortDescIcon,
  SortAscIcon,
  CheckIcon,
  TrashIcon,
  ArchiveIcon,
} from 'lucide-react';
import { Sender } from '../../../hooks/useEmailSenders';

interface SearchAndFilterBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  sortBy: string;
  sortDirection: string;
  onSortChange: (value: string) => void;
  onToggleSortDirection: () => void;
  selectedCount: number;
  totalVisible: number;
  onSelectAll: () => void;
  onArchiveSelected: () => void;
  onDeleteSelected: () => void;
  selectedTool: string | null;
  hasPaidPlan?: boolean;
}

const SearchAndFilterBar: React.FC<SearchAndFilterBarProps> = ({
  searchTerm,
  onSearchChange,
  sortBy,
  sortDirection,
  onSortChange,
  onToggleSortDirection,
  selectedCount,
  totalVisible,
  onSelectAll,
  onArchiveSelected,
  onDeleteSelected,
  selectedTool,
  hasPaidPlan = true,
}) => {
  return (
    <>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                checked={selectedCount > 0 && selectedCount === totalVisible}
                onChange={onSelectAll}
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {selectedCount > 0 ? `${selectedCount} selected` : 'Select All'}
              </span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by sender..."
                className="pl-8 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm dark:bg-gray-800 dark:text-gray-100"
                value={searchTerm}
                onChange={e => onSearchChange(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <FilterIcon className="h-4 w-4 text-gray-400 mr-2" />
              <span className="text-sm text-gray-700 dark:text-gray-300 mr-2">Sort by:</span>
              <select
                value={sortBy}
                onChange={e => onSortChange(e.target.value)}
                className="border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 block sm:text-sm dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="count">Email Count</option>
                <option value="name">Sender Name</option>
                <option value="date">Last Email Date</option>
              </select>
              <button onClick={onToggleSortDirection} className="ml-2 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
                {sortDirection === 'asc' ? (
                  <SortAscIcon className="h-4 w-4 text-gray-500" />
                ) : (
                  <SortDescIcon className="h-4 w-4 text-gray-500" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {selectedCount > 0 && (
        <div className="bg-indigo-50 dark:bg-indigo-950 p-3 flex items-center justify-between">
          <div className="flex items-center">
            <CheckIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400 mr-2" />
            <span className="text-indigo-800 dark:text-indigo-300 text-sm font-medium">
              {selectedCount} sender{selectedCount !== 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="flex space-x-4">
            {selectedTool !== 'archive' && hasPaidPlan && (
              <button
                className="flex items-center text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                onClick={onArchiveSelected}
              >
                <ArchiveIcon className="h-3 w-3 mr-1" />
                Archive
              </button>
            )}
            <button
              className="flex items-center text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
              onClick={onDeleteSelected}
            >
              <TrashIcon className="h-3 w-3 mr-1" />
              Delete
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default SearchAndFilterBar;
