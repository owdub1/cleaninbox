import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MailIcon, CheckCircleIcon, XCircleIcon, RefreshCwIcon, MailOpenIcon, ShieldIcon, ArrowRightIcon, ChevronDownIcon, ChevronUpIcon, LoaderIcon, TrashIcon, ArchiveIcon, InboxIcon, AlertCircleIcon, SearchIcon, FilterIcon, SortAscIcon, PlusIcon, ExternalLinkIcon, CheckIcon } from 'lucide-react';
const CleanInbox = () => {
  // State for the different steps in the process
  const [currentStep, setCurrentStep] = useState(1);
  const [emailConnected, setEmailConnected] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [selectedAll, setSelectedAll] = useState(false);
  const [cleaningInProgress, setCleaningInProgress] = useState(false);
  const [cleaningComplete, setCleaningComplete] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState({
    newsletters: true,
    marketing: true,
    social: true,
    updates: false
  });
  // Mock data for subscriptions
  const [subscriptions, setSubscriptions] = useState([{
    id: 1,
    name: 'Daily Newsletter',
    email: 'news@dailynewsletter.com',
    frequency: 'Daily',
    lastEmail: '2 days ago',
    category: 'newsletters',
    selected: false
  }, {
    id: 2,
    name: 'Shopping Promotions',
    email: 'deals@shoppingsite.com',
    frequency: 'Weekly',
    lastEmail: '5 days ago',
    category: 'marketing',
    selected: false
  }, {
    id: 3,
    name: 'Social Media Updates',
    email: 'updates@socialnetwork.com',
    frequency: 'Daily',
    lastEmail: '1 day ago',
    category: 'social',
    selected: false
  }, {
    id: 4,
    name: 'Tech News',
    email: 'news@techsite.com',
    frequency: 'Weekly',
    lastEmail: '3 days ago',
    category: 'newsletters',
    selected: false
  }, {
    id: 5,
    name: 'Fitness App',
    email: 'updates@fitnessapp.com',
    frequency: 'Monthly',
    lastEmail: '2 weeks ago',
    category: 'updates',
    selected: false
  }, {
    id: 6,
    name: 'Online Store',
    email: 'promotions@onlinestore.com',
    frequency: 'Weekly',
    lastEmail: '4 days ago',
    category: 'marketing',
    selected: false
  }, {
    id: 7,
    name: 'Professional Network',
    email: 'network@professional.com',
    frequency: 'Weekly',
    lastEmail: '1 week ago',
    category: 'social',
    selected: false
  }, {
    id: 8,
    name: 'Travel Deals',
    email: 'deals@travelsite.com',
    frequency: 'Monthly',
    lastEmail: '3 weeks ago',
    category: 'marketing',
    selected: false
  }]);
  // Handler to toggle selection of a subscription
  const toggleSubscription = id => {
    setSubscriptions(subscriptions.map(sub => sub.id === id ? {
      ...sub,
      selected: !sub.selected
    } : sub));
  };
  // Handler to toggle select all
  const toggleSelectAll = () => {
    const newSelectedAll = !selectedAll;
    setSelectedAll(newSelectedAll);
    setSubscriptions(subscriptions.map(sub => ({
      ...sub,
      selected: newSelectedAll
    })));
  };
  // Handler to connect email (mock)
  const connectEmail = () => {
    setIsScanning(true);
    setTimeout(() => {
      setEmailConnected(true);
      setIsScanning(false);
      setScanComplete(true);
      setCurrentStep(2);
    }, 2000);
  };
  // Handler to start cleaning process
  const startCleaning = () => {
    setCleaningInProgress(true);
    setCurrentStep(3);
    setTimeout(() => {
      setCleaningInProgress(false);
      setCleaningComplete(true);
    }, 3000);
  };
  // Filter subscriptions based on search and categories
  const filteredSubscriptions = subscriptions.filter(sub => (sub.name.toLowerCase().includes(searchTerm.toLowerCase()) || sub.email.toLowerCase().includes(searchTerm.toLowerCase())) && categories[sub.category]);
  // Count selected subscriptions
  const selectedCount = subscriptions.filter(sub => sub.selected).length;
  return <div className="w-full min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      {/* Header Section */}
      <section className="pt-16 pb-12 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center justify-center p-1 mb-6 bg-indigo-900/80 backdrop-blur-sm rounded-full">
            <span className="px-4 py-1 text-sm font-medium text-indigo-200">
              Powered by AI technology
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 to-purple-300">
            Clean My Inbox
          </h1>
          <p className="text-xl text-indigo-100 max-w-3xl mx-auto">
            Automatically identify and unsubscribe from unwanted emails with our
            intelligent inbox cleaner.
          </p>
        </div>
      </section>
      {/* Step Indicator */}
      <section className="pb-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex-1">
              <div className={`h-2 ${currentStep >= 1 ? 'bg-gradient-to-r from-indigo-500 to-purple-500' : 'bg-gray-700'} rounded-l-full`}></div>
            </div>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${currentStep >= 1 ? 'bg-gradient-to-r from-indigo-500 to-purple-500' : 'bg-gray-700'} text-white font-bold`}>
              1
            </div>
            <div className="flex-1">
              <div className={`h-2 ${currentStep >= 2 ? 'bg-gradient-to-r from-indigo-500 to-purple-500' : 'bg-gray-700'}`}></div>
            </div>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${currentStep >= 2 ? 'bg-gradient-to-r from-indigo-500 to-purple-500' : 'bg-gray-700'} text-white font-bold`}>
              2
            </div>
            <div className="flex-1">
              <div className={`h-2 ${currentStep >= 3 ? 'bg-gradient-to-r from-indigo-500 to-purple-500' : 'bg-gray-700'}`}></div>
            </div>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${currentStep >= 3 ? 'bg-gradient-to-r from-indigo-500 to-purple-500' : 'bg-gray-700'} text-white font-bold`}>
              3
            </div>
            <div className="flex-1">
              <div className={`h-2 ${currentStep >= 3 ? 'bg-gradient-to-r from-indigo-500 to-purple-500' : 'bg-gray-700'} rounded-r-full`}></div>
            </div>
          </div>
          <div className="flex justify-between text-sm text-indigo-200">
            <div className="text-center">
              <p>Connect Email</p>
            </div>
            <div className="text-center">
              <p>Select Subscriptions</p>
            </div>
            <div className="text-center">
              <p>Clean Inbox</p>
            </div>
          </div>
        </div>
      </section>
      {/* Main Content Area */}
      <section className="pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Step 1: Connect Email */}
          {currentStep === 1 && <div className="bg-slate-800/90 backdrop-blur-md rounded-xl p-8 border border-indigo-900/50 shadow-xl">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-900/80 rounded-full mb-4">
                  <MailIcon className="h-8 w-8 text-indigo-300" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Connect Your Email</h2>
                <p className="text-indigo-200">
                  First, connect your email account to scan for subscriptions
                  and newsletters.
                </p>
              </div>
              <div className="bg-slate-900/90 rounded-lg p-6 mb-8 border border-indigo-900/30">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">Secure Connection</h3>
                  <div className="flex items-center">
                    <ShieldIcon className="h-4 w-4 text-green-400 mr-2" />
                    <span className="text-sm text-green-400">Encrypted</span>
                  </div>
                </div>
                <p className="text-sm text-indigo-200 mb-6">
                  We use OAuth to securely connect to your email provider
                  without storing your password. Your data is never shared.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button className="flex items-center justify-center p-4 bg-white/5 hover:bg-white/10 rounded-lg border border-indigo-900/30 transition-colors" onClick={connectEmail}>
                    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Gmail_icon_%282020%29.svg/2560px-Gmail_icon_%282020%29.svg.png" alt="Gmail" className="h-6 mr-2" />
                    <span>Connect Gmail</span>
                  </button>
                  <button className="flex items-center justify-center p-4 bg-white/5 hover:bg-white/10 rounded-lg border border-indigo-900/30 transition-colors" onClick={connectEmail}>
                    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Microsoft_Office_Outlook_%282018%E2%80%93present%29.svg/1200px-Microsoft_Office_Outlook_%282018%E2%80%93present%29.svg.png" alt="Outlook" className="h-6 mr-2" />
                    <span>Connect Outlook</span>
                  </button>
                  <button className="flex items-center justify-center p-4 bg-white/5 hover:bg-white/10 rounded-lg border border-indigo-900/30 transition-colors" onClick={connectEmail}>
                    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Yahoo%21_Mail_icon.svg/1200px-Yahoo%21_Mail_icon.svg.png" alt="Yahoo" className="h-6 mr-2" />
                    <span>Connect Yahoo</span>
                  </button>
                </div>
              </div>
              {isScanning && <div className="bg-indigo-900/80 rounded-lg p-6 text-center animate-pulse">
                  <LoaderIcon className="h-8 w-8 text-indigo-300 mx-auto mb-4 animate-spin" />
                  <h3 className="font-medium mb-2">Scanning Your Inbox</h3>
                  <p className="text-sm text-indigo-200">
                    Please wait while we scan your inbox for subscriptions...
                  </p>
                </div>}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className="bg-slate-900/90 p-4 rounded-lg border border-indigo-900/30">
                  <ShieldIcon className="h-6 w-6 text-indigo-300 mx-auto mb-2" />
                  <h4 className="font-medium text-sm mb-1">Secure & Private</h4>
                  <p className="text-xs text-indigo-200">
                    We never store your emails or credentials
                  </p>
                </div>
                <div className="bg-slate-900/90 p-4 rounded-lg border border-indigo-900/30">
                  <RefreshCwIcon className="h-6 w-6 text-indigo-300 mx-auto mb-2" />
                  <h4 className="font-medium text-sm mb-1">Fast Processing</h4>
                  <p className="text-xs text-indigo-200">
                    Scan and clean your inbox in minutes
                  </p>
                </div>
                <div className="bg-slate-900/90 p-4 rounded-lg border border-indigo-900/30">
                  <CheckCircleIcon className="h-6 w-6 text-indigo-300 mx-auto mb-2" />
                  <h4 className="font-medium text-sm mb-1">
                    One-Click Unsubscribe
                  </h4>
                  <p className="text-xs text-indigo-200">
                    Easily unsubscribe from multiple newsletters
                  </p>
                </div>
              </div>
            </div>}
          {/* Step 2: Select Subscriptions */}
          {currentStep === 2 && <div className="bg-slate-800/90 backdrop-blur-md rounded-xl p-8 border border-indigo-900/50 shadow-xl">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-900/80 rounded-full mb-4">
                  <MailOpenIcon className="h-8 w-8 text-indigo-300" />
                </div>
                <h2 className="text-2xl font-bold mb-2">
                  Select Subscriptions to Remove
                </h2>
                <p className="text-indigo-200">
                  We found {subscriptions.length} subscriptions in your inbox.
                  Select the ones you want to unsubscribe from.
                </p>
              </div>
              {/* Search and Filter Controls */}
              <div className="bg-slate-900/90 rounded-lg p-4 mb-6 border border-indigo-900/30">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <SearchIcon className="h-4 w-4 text-indigo-300" />
                    </div>
                    <input type="text" placeholder="Search subscriptions..." className="pl-10 pr-4 py-2 w-full bg-slate-800 border border-indigo-900/50 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-indigo-300" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                  </div>
                  <div>
                    <button className="flex items-center justify-center px-4 py-2 bg-indigo-800/50 hover:bg-indigo-700/50 rounded-lg transition-colors" onClick={() => setShowFilters(!showFilters)}>
                      <FilterIcon className="h-4 w-4 mr-2" />
                      <span>Filters</span>
                      {showFilters ? <ChevronUpIcon className="h-4 w-4 ml-2" /> : <ChevronDownIcon className="h-4 w-4 ml-2" />}
                    </button>
                  </div>
                </div>
                {showFilters && <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
                    <label className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-slate-800">
                      <input type="checkbox" checked={categories.newsletters} onChange={() => setCategories({
                  ...categories,
                  newsletters: !categories.newsletters
                })} className="form-checkbox h-4 w-4 text-indigo-500" />
                      <span>Newsletters</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-slate-800">
                      <input type="checkbox" checked={categories.marketing} onChange={() => setCategories({
                  ...categories,
                  marketing: !categories.marketing
                })} className="form-checkbox h-4 w-4 text-indigo-500" />
                      <span>Marketing</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-slate-800">
                      <input type="checkbox" checked={categories.social} onChange={() => setCategories({
                  ...categories,
                  social: !categories.social
                })} className="form-checkbox h-4 w-4 text-indigo-500" />
                      <span>Social</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-slate-800">
                      <input type="checkbox" checked={categories.updates} onChange={() => setCategories({
                  ...categories,
                  updates: !categories.updates
                })} className="form-checkbox h-4 w-4 text-indigo-500" />
                      <span>Updates</span>
                    </label>
                  </div>}
              </div>
              {/* Subscription List */}
              <div className="bg-slate-900/90 rounded-lg border border-indigo-900/30 overflow-hidden mb-6">
                <div className="p-4 border-b border-indigo-900/30 flex items-center justify-between">
                  <div className="flex items-center">
                    <input type="checkbox" checked={selectedAll} onChange={toggleSelectAll} className="form-checkbox h-4 w-4 text-indigo-500 mr-3" />
                    <span className="font-medium">
                      Select All ({filteredSubscriptions.length})
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-indigo-300">
                    <span>{selectedCount} selected</span>
                  </div>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {filteredSubscriptions.length > 0 ? filteredSubscriptions.map(sub => <div key={sub.id} className="p-4 border-b border-indigo-900/30 hover:bg-slate-800/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <input type="checkbox" checked={sub.selected} onChange={() => toggleSubscription(sub.id)} className="form-checkbox h-4 w-4 text-indigo-500 mr-3" />
                            <div>
                              <h4 className="font-medium">{sub.name}</h4>
                              <p className="text-sm text-indigo-300">
                                {sub.email}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-indigo-300">
                              {sub.frequency}
                            </div>
                            <div className="text-xs text-indigo-400">
                              Last: {sub.lastEmail}
                            </div>
                          </div>
                        </div>
                      </div>) : <div className="p-8 text-center">
                      <AlertCircleIcon className="h-8 w-8 text-indigo-300 mx-auto mb-2" />
                      <p>No subscriptions match your filters</p>
                    </div>}
                </div>
              </div>
              {/* Action Buttons */}
              <div className="flex justify-between">
                <button className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors" onClick={() => setCurrentStep(1)}>
                  Back
                </button>
                <button className={`px-6 py-3 rounded-lg transition-colors flex items-center ${selectedCount > 0 ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500' : 'bg-gray-700 cursor-not-allowed'}`} onClick={selectedCount > 0 ? startCleaning : null} disabled={selectedCount === 0}>
                  Unsubscribe from {selectedCount} Subscriptions
                  <ArrowRightIcon className="h-4 w-4 ml-2" />
                </button>
              </div>
            </div>}
          {/* Step 3: Cleaning Process */}
          {currentStep === 3 && <div className="bg-slate-800/90 backdrop-blur-md rounded-xl p-8 border border-indigo-900/50 shadow-xl">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-900/80 rounded-full mb-4">
                  {cleaningComplete ? <CheckCircleIcon className="h-8 w-8 text-green-400" /> : <RefreshCwIcon className="h-8 w-8 text-indigo-300 animate-spin" />}
                </div>
                <h2 className="text-2xl font-bold mb-2">
                  {cleaningComplete ? "You're All Set!" : "We're Cleaning Your Inbox"}
                </h2>
                <p className="text-indigo-200">
                  {cleaningComplete ? "We've successfully unsubscribed you from the selected subscriptions." : 'Please wait while we unsubscribe you from the selected subscriptions.'}
                </p>
              </div>
              {cleaningInProgress && <div className="bg-slate-900/90 rounded-lg p-6 mb-8 border border-indigo-900/30">
                  <div className="mb-4">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Progress</span>
                      <span className="text-sm">45%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" style={{
                  width: '45%'
                }}></div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <div className="w-6 h-6 flex-shrink-0 mr-3">
                        <CheckCircleIcon className="h-6 w-6 text-green-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Daily Newsletter</p>
                        <p className="text-sm text-indigo-300">Unsubscribed</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className="w-6 h-6 flex-shrink-0 mr-3">
                        <CheckCircleIcon className="h-6 w-6 text-green-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Shopping Promotions</p>
                        <p className="text-sm text-indigo-300">Unsubscribed</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className="w-6 h-6 flex-shrink-0 mr-3">
                        <LoaderIcon className="h-6 w-6 text-indigo-300 animate-spin" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Social Media Updates</p>
                        <p className="text-sm text-indigo-300">
                          In progress...
                        </p>
                      </div>
                    </div>
                  </div>
                </div>}
              {cleaningComplete && <div className="bg-slate-900/90 rounded-lg p-6 mb-8 border border-indigo-900/30">
                  <div className="text-center mb-6">
                    <div className="inline-block p-4 bg-green-900/20 rounded-full mb-4">
                      <CheckCircleIcon className="h-12 w-12 text-green-400" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">
                      Inbox Successfully Cleaned!
                    </h3>
                    <p className="text-indigo-200">
                      You've unsubscribed from {selectedCount} subscriptions.
                      Your inbox is now cleaner and more organized.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-slate-800/50 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-green-400">
                        {selectedCount}
                      </div>
                      <p className="text-sm text-indigo-300">
                        Subscriptions Removed
                      </p>
                    </div>
                    <div className="bg-slate-800/50 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-indigo-300">
                        ~{Math.round(selectedCount * 4.5)}
                      </div>
                      <p className="text-sm text-indigo-300">
                        Emails Prevented Monthly
                      </p>
                    </div>
                    <div className="bg-slate-800/50 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-indigo-300">
                        ~{Math.round(selectedCount * 0.8)}hrs
                      </div>
                      <p className="text-sm text-indigo-300">
                        Time Saved Monthly
                      </p>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-indigo-200 mb-4">
                      We recommend checking your inbox regularly and
                      unsubscribing from new unwanted subscriptions as they
                      appear.
                    </p>
                    <button className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-lg transition-colors" onClick={() => window.location.reload()}>
                      Clean Another Inbox
                    </button>
                  </div>
                </div>}
              {cleaningComplete && <div className="bg-indigo-900/80 rounded-lg p-6 border border-indigo-800/30">
                  <h3 className="font-medium mb-4">What's Next?</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Link to="/dashboard" className="flex items-center p-4 bg-white/5 hover:bg-white/10 rounded-lg border border-indigo-900/30 transition-colors">
                      <InboxIcon className="h-5 w-5 mr-3 text-indigo-300" />
                      <div>
                        <p className="font-medium">Go to Dashboard</p>
                        <p className="text-sm text-indigo-300">
                          View your email statistics
                        </p>
                      </div>
                    </Link>
                    <Link to="/email-cleanup" className="flex items-center p-4 bg-white/5 hover:bg-white/10 rounded-lg border border-indigo-900/30 transition-colors">
                      <ArchiveIcon className="h-5 w-5 mr-3 text-indigo-300" />
                      <div>
                        <p className="font-medium">Email Cleanup</p>
                        <p className="text-sm text-indigo-300">
                          Organize and archive old emails
                        </p>
                      </div>
                    </Link>
                  </div>
                </div>}
            </div>}
        </div>
      </section>
      {/* Security Info Section */}
      <section className="py-16 px-4 bg-slate-900/90">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold mb-4">
              Your Privacy & Security Is Our Priority
            </h2>
            <p className="text-indigo-200 max-w-3xl mx-auto">
              We built CleanInbox with security and privacy as our foundation.
              Here's how we keep your data safe:
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-6 border border-indigo-900/50">
              <div className="bg-indigo-900/80 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <ShieldIcon className="h-6 w-6 text-indigo-300" />
              </div>
              <h3 className="text-lg font-bold mb-2">No Email Storage</h3>
              <p className="text-indigo-200 text-sm">
                We never store your emails or their contents. All processing
                happens in real-time.
              </p>
            </div>
            <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-6 border border-indigo-900/50">
              <div className="bg-indigo-900/80 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <CheckIcon className="h-6 w-6 text-indigo-300" />
              </div>
              <h3 className="text-lg font-bold mb-2">
                Secure OAuth Authentication
              </h3>
              <p className="text-indigo-200 text-sm">
                We use industry-standard OAuth to connect to your email provider
                without ever seeing your password.
              </p>
            </div>
            <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-6 border border-indigo-900/50">
              <div className="bg-indigo-900/80 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <ExternalLinkIcon className="h-6 w-6 text-indigo-300" />
              </div>
              <h3 className="text-lg font-bold mb-2">No Data Retention</h3>
              <p className="text-indigo-200 text-sm">
                After you're done, we don't keep any information about your
                emails or subscriptions.
              </p>
            </div>
          </div>
        </div>
      </section>
      {/* CTA Section */}
      <section className="py-16 px-4 bg-gradient-to-r from-indigo-900 to-purple-900">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready for a Cleaner Inbox?
          </h2>
          <p className="text-xl text-indigo-200 mb-8">
            Join thousands of users who have decluttered their inboxes and
            reclaimed their time.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/pricing" className="px-8 py-4 bg-white text-indigo-900 rounded-lg font-bold hover:bg-indigo-100 transition-colors">
              View Pricing Plans
            </Link>
            <Link to="/how-it-works" className="px-8 py-4 bg-indigo-800/50 text-white rounded-lg font-bold hover:bg-indigo-700/50 transition-colors">
              Learn How It Works
            </Link>
          </div>
        </div>
      </section>
    </div>;
};
export default CleanInbox;