import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  SearchIcon,
  TrashIcon,
  ArchiveIcon,
  FilterIcon,
  SortDescIcon,
  SortAscIcon,
  CheckIcon,
  FolderIcon,
  ShieldIcon,
  Sparkles,
  Inbox,
  BellOff,
  Ban,
  Hand,
  SlidersHorizontal,
  ArrowLeft,
  UserPlus,
  Mail,
  ArrowRight,
  Check,
  Zap,
  X,
  Gift
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDashboardData } from '../hooks/useDashboardData';

// Free trial limit
const FREE_TRIAL_LIMIT = 5;

// Mock data for email senders by year
const mockEmailData = {
  '2023': [
    { sender: 'Amazon', count: 42, lastEmail: '2023-11-15' },
    { sender: 'Sarah Johnson', count: 36, lastEmail: '2023-11-22' },
    { sender: 'LinkedIn', count: 38, lastEmail: '2023-11-20' },
    { sender: 'Michael Chen', count: 29, lastEmail: '2023-11-17' },
    { sender: 'Twitter', count: 25, lastEmail: '2023-11-18' },
    { sender: 'David Rodriguez', count: 18, lastEmail: '2023-11-12' },
    { sender: 'Netflix', count: 12, lastEmail: '2023-11-10' }
  ],
  '2022': [
    { sender: 'Amazon', count: 56, lastEmail: '2022-12-24' },
    { sender: 'Jennifer Parker', count: 48, lastEmail: '2022-12-22' },
    { sender: 'LinkedIn', count: 45, lastEmail: '2022-12-15' },
    { sender: 'Robert Kim', count: 39, lastEmail: '2022-12-10' },
    { sender: 'Facebook', count: 30, lastEmail: '2022-11-30' },
    { sender: 'Google', count: 28, lastEmail: '2022-12-20' }
  ],
  '2021': [
    { sender: 'Amazon', count: 48, lastEmail: '2021-12-20' },
    { sender: 'William Davis', count: 43, lastEmail: '2021-12-18' },
    { sender: 'Facebook', count: 40, lastEmail: '2021-12-15' },
    { sender: 'Twitter', count: 35, lastEmail: '2021-11-05' }
  ]
};

// Cleanup tool definitions
const cleanupTools = [
  {
    id: 'suggestions',
    title: 'Explore Cleaning Suggestions',
    description: 'Kick start your cleaning with our recommendations.',
    icon: Sparkles,
    color: 'from-amber-400 to-orange-400',
  },
  {
    id: 'inbox',
    title: 'View and clean your Inbox',
    description: 'Filter, group, and clean messages you no longer need.',
    icon: Inbox,
    color: 'from-blue-400 to-indigo-400',
  },
  {
    id: 'unsubscribe',
    title: 'Unsubscribe from mailing lists',
    description: 'All mailing lists and newsletters in one place.',
    icon: BellOff,
    color: 'from-red-400 to-pink-400',
  },
  {
    id: 'block',
    title: 'Block or Mute a sender',
    description: 'Or get mail from them delivered to a specific folder.',
    icon: Ban,
    color: 'from-sky-400 to-cyan-400',
  },
  {
    id: 'stop',
    title: 'Stop all unwanted mail',
    description: 'Hold mail from new senders out of Inbox. Review to Allow.',
    icon: Hand,
    color: 'from-purple-400 to-violet-400',
  },
  {
    id: 'automate',
    title: 'Clean and organize mail automatically',
    description: 'Create rules to trash, move, or label mail automatically.',
    icon: SlidersHorizontal,
    color: 'from-gray-400 to-slate-400',
  },
];

// Step indicator component
const StepIndicator = ({ currentStep }: { currentStep: number }) => {
  const steps = [
    { number: 1, label: 'Sign Up', icon: UserPlus },
    { number: 2, label: 'Connect Email', icon: Mail },
    { number: 3, label: 'Start Cleaning', icon: Sparkles },
  ];

  return (
    <div className="flex items-center justify-center mb-10">
      {steps.map((step, index) => {
        const StepIcon = step.icon;
        const isCompleted = currentStep > step.number;
        const isCurrent = currentStep === step.number;

        return (
          <React.Fragment key={step.number}>
            <div className="flex flex-col items-center">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  isCompleted
                    ? 'bg-green-500 text-white'
                    : isCurrent
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-6 h-6" />
                ) : (
                  <StepIcon className="w-5 h-5" />
                )}
              </div>
              <span
                className={`mt-2 text-sm font-medium ${
                  isCurrent ? 'text-indigo-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`w-16 md:w-24 h-1 mx-2 rounded ${
                  currentStep > step.number ? 'bg-green-500' : 'bg-gray-200'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// Upgrade Modal Component
const UpgradeModal = ({ isOpen, onClose, onUpgrade }: { isOpen: boolean; onClose: () => void; onUpgrade: () => void }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Gift className="w-8 h-8 text-white" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            You've Used Your Free Tries!
          </h2>

          <p className="text-gray-600 mb-6">
            Great job cleaning up! You've used all 5 free actions. Upgrade to Pro for unlimited cleaning and premium features.
          </p>

          <div className="bg-indigo-50 rounded-xl p-4 mb-6">
            <p className="text-indigo-900 font-semibold mb-2">Pro Plan - $9/month</p>
            <ul className="text-sm text-indigo-700 space-y-1">
              <li className="flex items-center justify-center">
                <Check className="w-4 h-4 mr-2" /> Unlimited unsubscribes
              </li>
              <li className="flex items-center justify-center">
                <Check className="w-4 h-4 mr-2" /> 10 email accounts
              </li>
              <li className="flex items-center justify-center">
                <Check className="w-4 h-4 mr-2" /> Advanced automation
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <button
              onClick={onUpgrade}
              className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center"
            >
              <Zap className="w-5 h-5 mr-2" />
              Upgrade to Pro
            </button>
            <button
              onClick={onClose}
              className="w-full py-3 text-gray-500 hover:text-gray-700 text-sm"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const EmailCleanup = () => {
  const { isAuthenticated, user } = useAuth();
  const { emailAccounts } = useDashboardData();
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<'onboarding' | 'tools' | 'cleanup'>('onboarding');
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [expandedYears, setExpandedYears] = useState(['2023']);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('count');
  const [sortDirection, setSortDirection] = useState('desc');
  const [selectedSenders, setSelectedSenders] = useState<string[]>([]);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Track free trial usage (in production, this would come from the backend)
  const [freeActionsUsed, setFreeActionsUsed] = useState(0);
  const freeActionsRemaining = FREE_TRIAL_LIMIT - freeActionsUsed;
  const hasFreeTries = freeActionsRemaining > 0;
  const hasPaidPlan = user?.subscription_tier && user.subscription_tier !== 'Free';

  // Determine current onboarding step
  const hasEmailConnected = emailAccounts && emailAccounts.length > 0;

  const getCurrentStep = () => {
    if (!isAuthenticated) return 1;
    if (!hasEmailConnected) return 2;
    return 3; // Ready to start cleaning
  };

  const currentStep = getCurrentStep();
  const isOnboardingComplete = currentStep >= 3 && currentView !== 'onboarding';

  const handleToolSelect = (toolId: string) => {
    setSelectedTool(toolId);
    setCurrentView('cleanup');
  };

  const handleBackToTools = () => {
    setCurrentView('tools');
    setSelectedTool(null);
  };

  const handleStartCleaning = () => {
    setCurrentView('tools');
  };

  // Handle cleanup action (delete/unsubscribe)
  const handleCleanupAction = (actionType: 'delete' | 'archive' | 'unsubscribe', sender: string) => {
    if (!hasPaidPlan && !hasFreeTries) {
      setShowUpgradeModal(true);
      return;
    }

    // Perform the action
    if (!hasPaidPlan) {
      setFreeActionsUsed(prev => prev + 1);
    }

    // In production, this would call the API
    console.log(`${actionType} action on ${sender}`);

    // Show success feedback
    alert(`Successfully ${actionType === 'delete' ? 'deleted' : actionType === 'archive' ? 'archived' : 'unsubscribed from'} ${sender}`);
  };

  const toggleYear = (year: string) => {
    if (expandedYears.includes(year)) {
      setExpandedYears(expandedYears.filter(y => y !== year));
    } else {
      setExpandedYears([...expandedYears, year]);
    }
  };

  const toggleSortDirection = () => {
    setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
  };

  const handleSortChange = (value: string) => {
    if (sortBy === value) {
      toggleSortDirection();
    } else {
      setSortBy(value);
      setSortDirection('desc');
    }
  };

  const toggleSenderSelection = (year: string, sender: string) => {
    const key = `${year}-${sender}`;
    if (selectedSenders.includes(key)) {
      setSelectedSenders(selectedSenders.filter(s => s !== key));
    } else {
      setSelectedSenders([...selectedSenders, key]);
    }
  };

  const filterAndSortEmails = (year: string) => {
    let filtered = [...mockEmailData[year as keyof typeof mockEmailData]];
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.sender.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    filtered.sort((a, b) => {
      if (sortBy === 'name') {
        return sortDirection === 'asc'
          ? a.sender.localeCompare(b.sender)
          : b.sender.localeCompare(a.sender);
      } else if (sortBy === 'date') {
        return sortDirection === 'asc'
          ? new Date(a.lastEmail).getTime() - new Date(b.lastEmail).getTime()
          : new Date(b.lastEmail).getTime() - new Date(a.lastEmail).getTime();
      } else {
        return sortDirection === 'asc' ? a.count - b.count : b.count - a.count;
      }
    });
    return filtered;
  };

  const getSelectedCount = () => selectedSenders.length;

  // Show onboarding funnel
  if (currentStep < 3 || (currentStep === 3 && currentView === 'onboarding')) {
    return (
      <div className="w-full min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-4xl mx-auto px-4 py-12">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              Clean Your Inbox in 3 Easy Steps
            </h1>
            <p className="text-lg text-gray-600">
              Get started in minutes and take control of your email
            </p>
          </div>

          {/* Step Indicator */}
          <StepIndicator currentStep={currentStep} />

          {/* Step Content */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 md:p-12">
            {/* Step 1: Sign Up */}
            {currentStep === 1 && (
              <div className="text-center">
                <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <UserPlus className="w-10 h-10 text-indigo-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  Create Your Free Account
                </h2>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  Join thousands of users who have decluttered their inboxes.
                  Sign up takes less than a minute!
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center px-8 py-4 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
                  >
                    Sign Up Free
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Link>
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center px-8 py-4 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    Already have an account? Log In
                  </Link>
                </div>
                <div className="mt-8 flex items-center justify-center text-sm text-gray-500">
                  <ShieldIcon className="w-4 h-4 mr-2 text-green-500" />
                  No credit card required • 5 free cleanups included
                </div>
              </div>
            )}

            {/* Step 2: Add Email */}
            {currentStep === 2 && (
              <div className="text-center">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Mail className="w-10 h-10 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  Connect Your Email
                </h2>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  Securely connect your email account so we can help you identify
                  and clean up unwanted messages.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-lg mx-auto mb-8">
                  <button
                    onClick={() => navigate('/dashboard?tab=myemails')}
                    className="flex items-center justify-center p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-all"
                  >
                    <img
                      src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Gmail_icon_%282020%29.svg/2560px-Gmail_icon_%282020%29.svg.png"
                      alt="Gmail"
                      className="h-8 w-8"
                    />
                  </button>
                  <button
                    onClick={() => navigate('/dashboard?tab=myemails')}
                    className="flex items-center justify-center p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-all"
                  >
                    <img
                      src="https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Microsoft_Office_Outlook_%282018%E2%80%93present%29.svg/1200px-Microsoft_Office_Outlook_%282018%E2%80%93present%29.svg.png"
                      alt="Outlook"
                      className="h-8 w-8"
                    />
                  </button>
                  <button
                    onClick={() => navigate('/dashboard?tab=myemails')}
                    className="flex items-center justify-center p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-all"
                  >
                    <img
                      src="https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Yahoo%21_Mail_icon.svg/1200px-Yahoo%21_Mail_icon.svg.png"
                      alt="Yahoo"
                      className="h-8 w-8"
                    />
                  </button>
                </div>
                <button
                  onClick={() => navigate('/dashboard?tab=myemails')}
                  className="inline-flex items-center justify-center px-8 py-4 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
                >
                  Connect Email Account
                  <ArrowRight className="w-5 h-5 ml-2" />
                </button>
                <div className="mt-8 flex items-center justify-center text-sm text-gray-500">
                  <ShieldIcon className="w-4 h-4 mr-2 text-green-500" />
                  We use OAuth • Your password is never stored
                </div>
              </div>
            )}

            {/* Step 3: Start Cleaning */}
            {currentStep === 3 && currentView === 'onboarding' && (
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  You're All Set! Start Cleaning
                </h2>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Your email is connected and ready to go. You have <span className="font-bold text-indigo-600">5 free cleanups</span> to try out the platform!
                </p>

                {/* Free trial badge */}
                <div className="inline-flex items-center bg-gradient-to-r from-amber-100 to-orange-100 rounded-full px-6 py-3 mb-8">
                  <Gift className="w-5 h-5 text-amber-600 mr-2" />
                  <span className="text-amber-800 font-medium">5 Free Actions Included</span>
                </div>

                <button
                  onClick={handleStartCleaning}
                  className="inline-flex items-center justify-center px-10 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Start Cleaning Now
                </button>

                <p className="mt-6 text-sm text-gray-500">
                  Unsubscribe, delete, or archive emails with one click
                </p>
              </div>
            )}
          </div>

          {/* Benefits Section */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldIcon className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Secure & Private</h3>
              <p className="text-sm text-gray-600">Your data is encrypted and never shared with third parties</p>
            </div>
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Inbox className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Easy to Use</h3>
              <p className="text-sm text-gray-600">Simple interface to manage all your emails in one place</p>
            </div>
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckIcon className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">One-Click Actions</h3>
              <p className="text-sm text-gray-600">Unsubscribe and clean up with a single click</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Tools selection page
  if (currentView === 'tools') {
    return (
      <div className="w-full bg-gray-50 min-h-screen">
        <section className="pt-10 pb-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Free trial banner */}
            {!hasPaidPlan && (
              <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Gift className="w-5 h-5 text-amber-600 mr-3" />
                    <span className="text-amber-800">
                      <span className="font-semibold">{freeActionsRemaining} free actions</span> remaining
                    </span>
                  </div>
                  {freeActionsRemaining < FREE_TRIAL_LIMIT && (
                    <button
                      onClick={() => navigate('/checkout')}
                      className="text-sm font-medium text-amber-700 hover:text-amber-900 underline"
                    >
                      Upgrade for unlimited
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="text-center mb-10">
              <h1 className="text-3xl font-bold text-gray-900">Email Cleanup Tools</h1>
              <p className="mt-2 text-lg text-gray-600">
                Choose a cleanup tool to get started
              </p>
            </div>

            {/* Cleanup Tools Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cleanupTools.map((tool) => {
                const IconComponent = tool.icon;
                return (
                  <button
                    key={tool.id}
                    onClick={() => handleToolSelect(tool.id)}
                    className="group relative overflow-hidden rounded-2xl p-6 text-left transition-all hover:scale-105 hover:shadow-xl"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${tool.color} opacity-90 group-hover:opacity-100 transition-opacity`} />
                    <div className="relative z-10">
                      <div className="mb-4">
                        <div className="text-white">
                          <IconComponent className="w-8 h-8" />
                        </div>
                      </div>
                      <h3 className="text-white font-semibold text-lg mb-2">
                        {tool.title}
                      </h3>
                      <p className="text-white/80 text-sm">
                        {tool.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* How It Works Section */}
            <div className="mt-12 bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-base font-medium text-gray-900 mb-4 text-center">How It Works</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 mb-3">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-sm text-gray-600">
                    Kick start your cleaning with our recommendations.
                  </p>
                </div>
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-400 mb-3">
                    <Inbox className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-sm text-gray-600">
                    Filter, group, and clean messages you no longer need.
                  </p>
                </div>
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-red-400 to-pink-400 mb-3">
                    <BellOff className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-sm text-gray-600">
                    All mailing lists and newsletters in one place.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // Cleanup interface
  const selectedToolData = cleanupTools.find(t => t.id === selectedTool);

  return (
    <div className="w-full bg-white">
      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onUpgrade={() => navigate('/checkout')}
      />

      <section className="pt-10 pb-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Free trial banner */}
          {!hasPaidPlan && (
            <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Gift className="w-5 h-5 text-amber-600 mr-3" />
                  <span className="text-amber-800">
                    <span className="font-semibold">{freeActionsRemaining} free actions</span> remaining
                  </span>
                </div>
                <button
                  onClick={() => navigate('/checkout')}
                  className="text-sm font-medium text-amber-700 hover:text-amber-900 underline"
                >
                  Upgrade for unlimited
                </button>
              </div>
            </div>
          )}

          <div className="mb-6">
            <button
              onClick={handleBackToTools}
              className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Cleanup Tools
            </button>
            <h1 className="text-3xl font-bold text-gray-900">
              {selectedToolData?.title || 'Email Cleanup'}
            </h1>
            <p className="mt-2 text-lg text-gray-600">
              {selectedToolData?.description || 'Organize and clean your inbox by year and sender'}
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
                  <input
                    type="text"
                    placeholder="Search by sender..."
                    className="pl-8 pr-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <FilterIcon className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-700 mr-2">Sort by:</span>
                    <select
                      value={sortBy}
                      onChange={e => handleSortChange(e.target.value)}
                      className="border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 block sm:text-sm"
                    >
                      <option value="count">Email Count</option>
                      <option value="name">Sender Name</option>
                      <option value="date">Last Email Date</option>
                    </select>
                    <button onClick={toggleSortDirection} className="ml-2 p-1 rounded-md hover:bg-gray-100">
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

            {/* Selected items action bar */}
            {getSelectedCount() > 0 && (
              <div className="bg-indigo-50 p-3 flex items-center justify-between">
                <div className="flex items-center">
                  <CheckIcon className="h-4 w-4 text-indigo-600 mr-2" />
                  <span className="text-indigo-800 text-sm font-medium">
                    {getSelectedCount()} sender{getSelectedCount() !== 1 ? 's' : ''} selected
                  </span>
                </div>
                <div className="flex space-x-4">
                  <button
                    className="flex items-center text-xs font-medium text-indigo-600 hover:text-indigo-800"
                    onClick={() => {
                      selectedSenders.forEach(s => {
                        const sender = s.split('-')[1];
                        handleCleanupAction('archive', sender);
                      });
                    }}
                  >
                    <ArchiveIcon className="h-3 w-3 mr-1" />
                    Archive
                  </button>
                  <button
                    className="flex items-center text-xs font-medium text-red-600 hover:text-red-800"
                    onClick={() => {
                      selectedSenders.forEach(s => {
                        const sender = s.split('-')[1];
                        handleCleanupAction('delete', sender);
                      });
                    }}
                  >
                    <TrashIcon className="h-3 w-3 mr-1" />
                    Delete
                  </button>
                </div>
              </div>
            )}

            {/* Year-based dropdowns */}
            <div className="divide-y divide-gray-200">
              {Object.keys(mockEmailData).sort((a, b) => Number(b) - Number(a)).map(year => (
                <div key={year} className="overflow-hidden">
                  <button
                    className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 focus:outline-none"
                    onClick={() => toggleYear(year)}
                  >
                    <div className="flex items-center">
                      <FolderIcon className="h-4 w-4 text-indigo-500 mr-2" />
                      <span className="font-medium text-gray-900">{year}</span>
                      <span className="ml-2 text-xs text-gray-500">
                        ({mockEmailData[year as keyof typeof mockEmailData].length} senders)
                      </span>
                    </div>
                    {expandedYears.includes(year) ? (
                      <ChevronUpIcon className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                    )}
                  </button>
                  {expandedYears.includes(year) && (
                    <div className="bg-gray-50 px-4 py-3">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                          <thead className="bg-gray-100">
                            <tr>
                              <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <input type="checkbox" className="h-3 w-3 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
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
                            {filterAndSortEmails(year).map(item => (
                              <tr key={item.sender} className="hover:bg-gray-50">
                                <td className="px-4 py-2 whitespace-nowrap">
                                  <input
                                    type="checkbox"
                                    className="h-3 w-3 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                    checked={selectedSenders.includes(`${year}-${item.sender}`)}
                                    onChange={() => toggleSenderSelection(year, item.sender)}
                                  />
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">{item.sender}</div>
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap">
                                  <div className="text-sm text-gray-500">{item.count} emails</div>
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap">
                                  <div className="text-sm text-gray-500">
                                    {new Date(item.lastEmail).toLocaleDateString()}
                                  </div>
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                                  <button
                                    className="text-indigo-600 hover:text-indigo-900 mr-2 text-xs"
                                    onClick={() => handleCleanupAction('archive', item.sender)}
                                  >
                                    Archive
                                  </button>
                                  <button
                                    className="text-red-600 hover:text-red-900 text-xs"
                                    onClick={() => handleCleanupAction('delete', item.sender)}
                                  >
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default EmailCleanup;
