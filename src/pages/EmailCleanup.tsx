import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDownIcon, ChevronUpIcon, SearchIcon, TrashIcon, ArchiveIcon, FilterIcon, SortDescIcon, SortAscIcon, CheckIcon, FolderIcon, MailIcon, ShieldIcon } from 'lucide-react';
// Mock data for email senders by year
const mockEmailData = {
  '2023': [{
    sender: 'Amazon',
    count: 42,
    lastEmail: '2023-11-15'
  }, {
    sender: 'Sarah Johnson',
    count: 36,
    lastEmail: '2023-11-22'
  }, {
    sender: 'LinkedIn',
    count: 38,
    lastEmail: '2023-11-20'
  }, {
    sender: 'Michael Chen',
    count: 29,
    lastEmail: '2023-11-17'
  }, {
    sender: 'Twitter',
    count: 25,
    lastEmail: '2023-11-18'
  }, {
    sender: 'David Rodriguez',
    count: 18,
    lastEmail: '2023-11-12'
  }, {
    sender: 'Netflix',
    count: 12,
    lastEmail: '2023-11-10'
  }],
  '2022': [{
    sender: 'Amazon',
    count: 56,
    lastEmail: '2022-12-24'
  }, {
    sender: 'Jennifer Parker',
    count: 48,
    lastEmail: '2022-12-22'
  }, {
    sender: 'LinkedIn',
    count: 45,
    lastEmail: '2022-12-15'
  }, {
    sender: 'Robert Kim',
    count: 39,
    lastEmail: '2022-12-10'
  }, {
    sender: 'Facebook',
    count: 30,
    lastEmail: '2022-11-30'
  }, {
    sender: 'Sophia Martinez',
    count: 26,
    lastEmail: '2022-11-25'
  }, {
    sender: 'Google',
    count: 28,
    lastEmail: '2022-12-20'
  }, {
    sender: 'Thomas Wright',
    count: 22,
    lastEmail: '2022-11-18'
  }, {
    sender: 'Apple',
    count: 15,
    lastEmail: '2022-10-12'
  }, {
    sender: 'Olivia Brown',
    count: 12,
    lastEmail: '2022-10-05'
  }],
  '2021': [{
    sender: 'Amazon',
    count: 48,
    lastEmail: '2021-12-20'
  }, {
    sender: 'William Davis',
    count: 43,
    lastEmail: '2021-12-18'
  }, {
    sender: 'Facebook',
    count: 40,
    lastEmail: '2021-12-15'
  }, {
    sender: 'Emily Cooper',
    count: 37,
    lastEmail: '2021-12-10'
  }, {
    sender: 'Twitter',
    count: 35,
    lastEmail: '2021-11-05'
  }, {
    sender: 'Daniel Lee',
    count: 32,
    lastEmail: '2021-11-02'
  }, {
    sender: 'Microsoft',
    count: 20,
    lastEmail: '2021-10-30'
  }, {
    sender: 'Emma Wilson',
    count: 15,
    lastEmail: '2021-10-28'
  }, {
    sender: 'Dropbox',
    count: 8,
    lastEmail: '2021-10-05'
  }, {
    sender: 'James Taylor',
    count: 7,
    lastEmail: '2021-10-01'
  }, {
    sender: 'Adobe',
    count: 22,
    lastEmail: '2021-11-25'
  }, {
    sender: 'Spotify',
    count: 16,
    lastEmail: '2021-11-08'
  }, {
    sender: 'Olivia Martinez',
    count: 11,
    lastEmail: '2021-10-15'
  }],
  '2020': [{
    sender: 'Zoom',
    count: 50,
    lastEmail: '2020-12-30'
  }, {
    sender: 'Isabella Thompson',
    count: 45,
    lastEmail: '2020-12-25'
  }, {
    sender: 'Amazon',
    count: 38,
    lastEmail: '2020-12-24'
  }, {
    sender: 'Ethan Robinson',
    count: 36,
    lastEmail: '2020-12-20'
  }, {
    sender: 'Microsoft Teams',
    count: 45,
    lastEmail: '2020-11-28'
  }]
};
const EmailCleanup = () => {
  const [expandedYears, setExpandedYears] = useState(['2023']);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('count'); // 'count', 'name', 'date'
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc', 'desc'
  const [selectedSenders, setSelectedSenders] = useState([]);
  const toggleYear = year => {
    if (expandedYears.includes(year)) {
      setExpandedYears(expandedYears.filter(y => y !== year));
    } else {
      setExpandedYears([...expandedYears, year]);
    }
  };
  const toggleSortDirection = () => {
    setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
  };
  const handleSortChange = value => {
    if (sortBy === value) {
      toggleSortDirection();
    } else {
      setSortBy(value);
      setSortDirection('desc');
    }
  };
  const toggleSenderSelection = (year, sender) => {
    const key = `${year}-${sender}`;
    if (selectedSenders.includes(key)) {
      setSelectedSenders(selectedSenders.filter(s => s !== key));
    } else {
      setSelectedSenders([...selectedSenders, key]);
    }
  };
  const filterAndSortEmails = year => {
    let filtered = [...mockEmailData[year]];
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(item => item.sender.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    // Apply sorting
    filtered.sort((a, b) => {
      if (sortBy === 'name') {
        return sortDirection === 'asc' ? a.sender.localeCompare(b.sender) : b.sender.localeCompare(a.sender);
      } else if (sortBy === 'date') {
        return sortDirection === 'asc' ? new Date(a.lastEmail) - new Date(b.lastEmail) : new Date(b.lastEmail) - new Date(a.lastEmail);
      } else {
        // count
        return sortDirection === 'asc' ? a.count - b.count : b.count - a.count;
      }
    });
    return filtered;
  };
  const getSelectedCount = () => {
    return selectedSenders.length;
  };
  return <div className="w-full bg-white">
      <section className="pt-10 pb-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Email Cleanup</h1>
            <p className="mt-2 text-lg text-gray-600">
              Organize and clean your inbox by year and sender
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Search and filter controls */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SearchIcon className="h-4 w-4 text-gray-400" />
                  </div>
                  <input type="text" placeholder="Search by sender..." className="pl-8 pr-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <FilterIcon className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-700 mr-2">Sort by:</span>
                    <select value={sortBy} onChange={e => handleSortChange(e.target.value)} className="border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 block sm:text-sm">
                      <option value="count">Email Count</option>
                      <option value="name">Sender Name</option>
                      <option value="date">Last Email Date</option>
                    </select>
                    <button onClick={toggleSortDirection} className="ml-2 p-1 rounded-md hover:bg-gray-100">
                      {sortDirection === 'asc' ? <SortAscIcon className="h-4 w-4 text-gray-500" /> : <SortDescIcon className="h-4 w-4 text-gray-500" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            {/* Selected items action bar */}
            {getSelectedCount() > 0 && <div className="bg-indigo-50 p-3 flex items-center justify-between">
                <div className="flex items-center">
                  <CheckIcon className="h-4 w-4 text-indigo-600 mr-2" />
                  <span className="text-indigo-800 text-sm font-medium">
                    {getSelectedCount()} sender
                    {getSelectedCount() !== 1 ? 's' : ''} selected
                  </span>
                </div>
                <div className="flex space-x-4">
                  <button className="flex items-center text-xs font-medium text-indigo-600 hover:text-indigo-800">
                    <ArchiveIcon className="h-3 w-3 mr-1" />
                    Archive
                  </button>
                  <button className="flex items-center text-xs font-medium text-red-600 hover:text-red-800">
                    <TrashIcon className="h-3 w-3 mr-1" />
                    Delete
                  </button>
                </div>
              </div>}
            {/* Year-based dropdowns */}
            <div className="divide-y divide-gray-200">
              {Object.keys(mockEmailData).sort((a, b) => b - a).map(year => <div key={year} className="overflow-hidden">
                    <button className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 focus:outline-none" onClick={() => toggleYear(year)}>
                      <div className="flex items-center">
                        <FolderIcon className="h-4 w-4 text-indigo-500 mr-2" />
                        <span className="font-medium text-gray-900">
                          {year}
                        </span>
                        <span className="ml-2 text-xs text-gray-500">
                          ({mockEmailData[year].length} senders)
                        </span>
                      </div>
                      {expandedYears.includes(year) ? <ChevronUpIcon className="h-4 w-4 text-gray-500" /> : <ChevronDownIcon className="h-4 w-4 text-gray-500" />}
                    </button>
                    {expandedYears.includes(year) && <div className="bg-gray-50 px-4 py-3">
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-100">
                              <tr>
                                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  <div className="flex items-center">
                                    <input type="checkbox" className="h-3 w-3 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
                                  </div>
                                </th>
                                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Sender
                                </th>
                                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Email Count
                                </th>
                                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Last Email
                                </th>
                                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {filterAndSortEmails(year).map(item => <tr key={item.sender} className="hover:bg-gray-50">
                                  <td className="px-4 py-2 whitespace-nowrap">
                                    <div className="flex items-center">
                                      <input type="checkbox" className="h-3 w-3 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" checked={selectedSenders.includes(`${year}-${item.sender}`)} onChange={() => toggleSenderSelection(year, item.sender)} />
                                    </div>
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">
                                      {item.sender}
                                    </div>
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap">
                                    <div className="text-sm text-gray-500">
                                      {item.count} emails
                                    </div>
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap">
                                    <div className="text-sm text-gray-500">
                                      {new Date(item.lastEmail).toLocaleDateString()}
                                    </div>
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                                    <button className="text-indigo-600 hover:text-indigo-900 mr-2 text-xs">
                                      Archive
                                    </button>
                                    <button className="text-red-600 hover:text-red-900 text-xs">
                                      Delete
                                    </button>
                                  </td>
                                </tr>)}
                            </tbody>
                          </table>
                        </div>
                      </div>}
                  </div>)}
            </div>
          </div>
          <div className="mt-6 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              How Email Cleanup Works
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="flex flex-col items-center text-center">
                <div className="bg-indigo-100 w-12 h-12 rounded-full flex items-center justify-center mb-3">
                  <MailIcon className="h-5 w-5 text-indigo-600" />
                </div>
                <h3 className="font-medium text-gray-900 mb-1 text-sm">
                  Organize by Year
                </h3>
                <p className="text-gray-600 text-sm">
                  We automatically categorize your emails by year, making it
                  easy to find old messages.
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="bg-indigo-100 w-12 h-12 rounded-full flex items-center justify-center mb-3">
                  <FilterIcon className="h-5 w-5 text-indigo-600" />
                </div>
                <h3 className="font-medium text-gray-900 mb-1 text-sm">
                  Filter and Sort
                </h3>
                <p className="text-gray-600 text-sm">
                  Quickly find specific senders or time periods with powerful
                  filtering options.
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="bg-indigo-100 w-12 h-12 rounded-full flex items-center justify-center mb-3">
                  <TrashIcon className="h-5 w-5 text-indigo-600" />
                </div>
                <h3 className="font-medium text-gray-900 mb-1 text-sm">
                  Bulk Actions
                </h3>
                <p className="text-gray-600 text-sm">
                  Delete or archive multiple emails at once to quickly clean up
                  your inbox.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* CTA Section - Redesigned */}
      <section className="py-12 bg-indigo-50 border-t border-indigo-100 mt-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">
              Ready to Clean Up Your Inbox?
            </h2>
            <p className="mt-3 text-gray-600 max-w-3xl mx-auto">
              Join thousands of users who have decluttered their inboxes and
              reclaimed their time.
            </p>
            <div className="mt-6">
              <Link to="/checkout" className="bg-indigo-600 text-white px-6 py-3 rounded-md font-medium hover:bg-indigo-700 transition-colors inline-block text-sm">
                Clean My Inbox Now
              </Link>
            </div>
            <p className="mt-4 text-gray-600 flex items-center justify-center text-sm">
              <ShieldIcon className="h-4 w-4 mr-2 text-indigo-600" />
              <span>Your data is never stored or shared</span>
            </p>
          </div>
        </div>
      </section>
    </div>;
};
export default EmailCleanup;