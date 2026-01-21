import React, { useState, useEffect } from 'react';
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
  Trash2,
  Archive,
  BarChart3,
  ArrowLeft,
  UserPlus,
  Mail,
  ArrowRight,
  Check,
  Zap,
  X,
  Gift,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDashboardData } from '../hooks/useDashboardData';
import { useGmailConnection } from '../hooks/useGmailConnection';
import { useEmailSenders, Sender } from '../hooks/useEmailSenders';
import { useCleanupActions } from '../hooks/useCleanupActions';
import { useSubscription } from '../hooks/useSubscription';
import CleanupConfirmModal from '../components/email/CleanupConfirmModal';

// Free trial limit
const FREE_TRIAL_LIMIT = 5;

// Cleanup tool definitions - 4 focused tools
const cleanupTools = [
  {
    id: 'delete',
    title: 'Delete & Clean Inbox',
    description: 'View and delete emails grouped by sender.',
    icon: Trash2,
    color: 'from-red-400 to-pink-400',
  },
  {
    id: 'unsubscribe',
    title: 'Unsubscribe',
    description: 'One-click unsubscribe from newsletters and mailing lists.',
    icon: BellOff,
    color: 'from-purple-400 to-violet-400',
  },
  {
    id: 'archive',
    title: 'Archive Old Emails',
    description: 'Archive emails older than 30/60/90 days.',
    icon: Archive,
    color: 'from-blue-400 to-indigo-400',
  },
  {
    id: 'top-senders',
    title: 'Top Senders',
    description: 'See who sends you the most emails and clean up fast.',
    icon: BarChart3,
    color: 'from-amber-400 to-orange-400',
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
  const { emailAccounts, loading: dashboardLoading } = useDashboardData();
  const navigate = useNavigate();

  // Subscription hook - get actual subscription status (needed early for view logic)
  const { subscription, isPaid, isUnlimited, loading: subscriptionLoading } = useSubscription();

  // Determine initial view - paid users with email go straight to tools
  const shouldStartWithTools = isPaid && emailAccounts && emailAccounts.length > 0;
  const [currentView, setCurrentView] = useState<'onboarding' | 'tools' | 'cleanup'>(
    shouldStartWithTools ? 'tools' : 'onboarding'
  );
  const [viewInitialized, setViewInitialized] = useState(false);

  // Update view once subscription/dashboard data loads (only once)
  useEffect(() => {
    if (!viewInitialized && !subscriptionLoading && !dashboardLoading) {
      if (isPaid && emailAccounts && emailAccounts.length > 0) {
        setCurrentView('tools');
      }
      setViewInitialized(true);
    }
  }, [isPaid, emailAccounts, subscriptionLoading, dashboardLoading, viewInitialized]);

  // Show loading while determining view for authenticated users
  const isLoadingInitialView = isAuthenticated && (subscriptionLoading || dashboardLoading) && !viewInitialized;

  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [expandedYears, setExpandedYears] = useState<string[]>([new Date().getFullYear().toString()]);
  const [expandedSenders, setExpandedSenders] = useState<string[]>([]); // For Unsubscribe view
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('count');
  const [sortDirection, setSortDirection] = useState('desc');
  const [selectedSenders, setSelectedSenders] = useState<string[]>([]);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Cleanup confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    action: 'delete' | 'archive' | 'unsubscribe';
    senders: Sender[];
  }>({ isOpen: false, action: 'delete', senders: [] });

  // Gmail connection hooks
  const { handleOAuthCallback, clearCallbackParams, connectGmail } = useGmailConnection();

  // Handler to start Gmail OAuth flow
  const handleConnectGmail = async () => {
    console.log('Starting Gmail OAuth flow...');
    try {
      const authUrl = await connectGmail();
      console.log('Got auth URL:', authUrl);
      if (authUrl) {
        window.location.href = authUrl;
      } else {
        setNotification({ type: 'error', message: 'Failed to get Gmail authorization URL. Please try again.' });
      }
    } catch (err: any) {
      console.error('Connect Gmail error:', err);
      setNotification({ type: 'error', message: err.message || 'Failed to connect Gmail' });
    }
  };

  // Email senders hook
  const {
    senders,
    loading: sendersLoading,
    syncing,
    error: sendersError,
    fetchSenders,
    syncEmails,
    getSendersByYear
  } = useEmailSenders({ autoFetch: true });

  // Cleanup actions hook
  const { deleteEmails, archiveEmails, unsubscribe, loading: cleanupLoading } = useCleanupActions();

  // Track free trial usage (only for free users)
  const [freeActionsUsed, setFreeActionsUsed] = useState(0);
  const freeActionsRemaining = FREE_TRIAL_LIMIT - freeActionsUsed;
  const hasFreeTries = freeActionsRemaining > 0;
  const hasPaidPlan = isPaid;

  // Get connected Gmail account (check for 'connected' status)
  const connectedGmailAccount = emailAccounts?.find(
    (acc: any) => acc.provider === 'Gmail' && acc.connection_status === 'connected'
  );

  // Get any Gmail account (may need reconnection)
  const anyGmailAccount = emailAccounts?.find(
    (acc: any) => acc.provider === 'Gmail' || acc.email?.includes('gmail')
  );

  // Debug: log email accounts status
  useEffect(() => {
    if (emailAccounts && emailAccounts.length > 0) {
      console.log('Email accounts:', emailAccounts.map(a => ({
        email: a.email,
        provider: a.provider,
        status: a.connection_status
      })));
    }
  }, [emailAccounts]);

  // Auto-sync when entering cleanup view with Gmail account but no senders
  const [hasAutoSynced, setHasAutoSynced] = useState(false);
  useEffect(() => {
    const accountToSync = connectedGmailAccount || anyGmailAccount;
    if (
      currentView === 'cleanup' &&
      accountToSync &&
      !sendersLoading &&
      !syncing &&
      senders.length === 0 &&
      !hasAutoSynced &&
      !sendersError
    ) {
      console.log('Auto-syncing emails for:', accountToSync.email);
      setHasAutoSynced(true);
      syncEmails(accountToSync.email);
    }
  }, [currentView, connectedGmailAccount, anyGmailAccount, sendersLoading, syncing, senders.length, hasAutoSynced, sendersError, syncEmails]);

  // Determine current onboarding step
  const hasEmailConnected = emailAccounts && emailAccounts.length > 0;

  // Handle OAuth callback on page load
  useEffect(() => {
    const result = handleOAuthCallback();
    if (result.success && result.email) {
      setNotification({
        type: 'success',
        message: `Successfully connected ${result.email}! Syncing your emails...`
      });
      clearCallbackParams();
      // Trigger sync after connection
      syncEmails(result.email);
    } else if (result.error) {
      setNotification({ type: 'error', message: result.error });
      clearCallbackParams();
    }
  }, []);

  // Clear notification after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Show senders error as notification
  useEffect(() => {
    if (sendersError) {
      setNotification({ type: 'error', message: sendersError });
    }
  }, [sendersError]);

  const getCurrentStep = () => {
    if (!isAuthenticated) return 1;
    if (!hasEmailConnected) return 2;
    return 3; // Ready to start cleaning
  };

  const currentStep = getCurrentStep();

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

  const handleSync = async () => {
    // Use connected account, or fall back to any Gmail account
    const accountToSync = connectedGmailAccount || anyGmailAccount;
    if (accountToSync) {
      console.log('Syncing emails for:', accountToSync.email);
      const success = await syncEmails(accountToSync.email);
      if (success) {
        setNotification({ type: 'success', message: 'Emails synced successfully!' });
      } else {
        setNotification({ type: 'error', message: 'Failed to sync emails. Your Gmail may need to be reconnected.' });
      }
    } else {
      setNotification({ type: 'error', message: 'No Gmail account found. Please connect your Gmail first.' });
    }
  };

  // Handle cleanup action confirmation
  const handleCleanupAction = (action: 'delete' | 'archive' | 'unsubscribe', senderList: Sender[]) => {
    if (!hasPaidPlan && !hasFreeTries) {
      setShowUpgradeModal(true);
      return;
    }

    setConfirmModal({
      isOpen: true,
      action,
      senders: senderList
    });
  };

  // Execute cleanup action
  const executeCleanupAction = async () => {
    if (!connectedGmailAccount) return;

    const { action, senders: actionSenders } = confirmModal;
    const senderEmails = actionSenders.map(s => s.email);

    try {
      let result;
      if (action === 'delete') {
        result = await deleteEmails(connectedGmailAccount.email, senderEmails);
      } else if (action === 'archive') {
        result = await archiveEmails(connectedGmailAccount.email, senderEmails);
      } else if (action === 'unsubscribe' && actionSenders.length === 1) {
        result = await unsubscribe(
          connectedGmailAccount.email,
          actionSenders[0].email,
          actionSenders[0].unsubscribeLink || undefined
        );
      }

      if (result?.success) {
        if (!hasPaidPlan) {
          setFreeActionsUsed(prev => prev + actionSenders.length);
        }
        setNotification({
          type: 'success',
          message: `Successfully ${action === 'delete' ? 'deleted' : action === 'archive' ? 'archived' : 'unsubscribed from'} ${actionSenders.length} sender(s)`
        });
        // Refresh senders list
        fetchSenders();
        // Clear selection
        setSelectedSenders([]);
      } else if (result?.requiresManualAction) {
        setNotification({
          type: 'success',
          message: result.message || 'Please complete the unsubscribe manually'
        });
        if (result.unsubscribeLink) {
          window.open(result.unsubscribeLink, '_blank');
        }
      }
    } catch (error: any) {
      setNotification({ type: 'error', message: error.message || 'Action failed' });
    }

    setConfirmModal({ isOpen: false, action: 'delete', senders: [] });
  };

  const toggleYear = (year: string) => {
    if (expandedYears.includes(year)) {
      setExpandedYears(expandedYears.filter(y => y !== year));
    } else {
      setExpandedYears([...expandedYears, year]);
    }
  };

  const toggleSenderExpand = (senderEmail: string) => {
    if (expandedSenders.includes(senderEmail)) {
      setExpandedSenders(expandedSenders.filter(s => s !== senderEmail));
    } else {
      setExpandedSenders([...expandedSenders, senderEmail]);
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

  const toggleSenderSelection = (email: string) => {
    if (selectedSenders.includes(email)) {
      setSelectedSenders(selectedSenders.filter(s => s !== email));
    } else {
      setSelectedSenders([...selectedSenders, email]);
    }
  };

  // Filter and sort senders
  const filterAndSortSenders = (senderList: Sender[]) => {
    let filtered = [...senderList];
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    filtered.sort((a, b) => {
      if (sortBy === 'name') {
        return sortDirection === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } else if (sortBy === 'date') {
        return sortDirection === 'asc'
          ? new Date(a.lastEmailDate).getTime() - new Date(b.lastEmailDate).getTime()
          : new Date(b.lastEmailDate).getTime() - new Date(a.lastEmailDate).getTime();
      } else {
        return sortDirection === 'asc' ? a.emailCount - b.emailCount : b.emailCount - a.emailCount;
      }
    });
    return filtered;
  };

  const getSelectedSenders = (): Sender[] => {
    return senders.filter(s => selectedSenders.includes(s.email));
  };

  // Get senders grouped by year
  const sendersByYear = getSendersByYear();

  // Get senders that can be unsubscribed (for Unsubscribe tool)
  const unsubscribableSenders = senders.filter(s => s.hasUnsubscribe);

  // Get all senders sorted by date (newest first) for Delete & Clean view
  const allSendersSortedByDate = [...senders].sort((a, b) =>
    new Date(b.lastEmailDate).getTime() - new Date(a.lastEmailDate).getTime()
  );

  // Show loading while determining initial view for authenticated users
  if (isLoadingInitialView) {
    return (
      <div className="w-full min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // Show onboarding funnel (skip for paid users who have connected email)
  const shouldShowOnboarding = currentStep < 3 || (currentStep === 3 && currentView === 'onboarding' && !hasPaidPlan);
  if (shouldShowOnboarding) {
    return (
      <div className="w-full min-h-screen bg-gradient-to-b from-slate-50 to-white">
        {/* Notification */}
        {notification && (
          <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
            notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? (
                <Check className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              {notification.message}
            </div>
          </div>
        )}

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
                    {/* Gmail Icon */}
                    <svg className="w-8 h-8" viewBox="0 0 48 48">
                      <path fill="#4caf50" d="M45,16.2l-5,2.75l-5,4.75L35,40h7c1.657,0,3-1.343,3-3V16.2z"/>
                      <path fill="#1e88e5" d="M3,16.2l3.614,1.71L13,23.7V40H6c-1.657,0-3-1.343-3-3V16.2z"/>
                      <polygon fill="#e53935" points="35,11.2 24,19.45 13,11.2 12,17 13,23.7 24,31.95 35,23.7 36,17"/>
                      <path fill="#c62828" d="M3,12.298V16.2l10,7.5V11.2L9.876,8.859C9.132,8.301,8.228,8,7.298,8h0C4.924,8,3,9.924,3,12.298z"/>
                      <path fill="#fbc02d" d="M45,12.298V16.2l-10,7.5V11.2l3.124-2.341C38.868,8.301,39.772,8,40.702,8h0 C43.076,8,45,9.924,45,12.298z"/>
                    </svg>
                  </button>
                  <button
                    disabled
                    className="flex items-center justify-center p-4 bg-gray-50 border-2 border-gray-100 rounded-xl opacity-50 cursor-not-allowed"
                    title="Coming soon"
                  >
                    {/* Outlook Icon - 4 squares */}
                    <svg className="w-8 h-8" viewBox="0 0 24 24">
                      <path fill="#0078D4" d="M0 0h11.377v11.372H0zm12.623 0H24v11.372H12.623zM0 12.623h11.377V24H0zm12.623 0H24V24H12.623z"/>
                    </svg>
                  </button>
                  <button
                    disabled
                    className="flex items-center justify-center p-4 bg-gray-50 border-2 border-gray-100 rounded-xl opacity-50 cursor-not-allowed"
                    title="Coming soon"
                  >
                    {/* Yahoo Icon */}
                    <svg className="w-8 h-8" viewBox="0 0 24 24">
                      <defs>
                        <linearGradient id="yahooGradCleanup" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#7B5CC3"/>
                          <stop offset="100%" stopColor="#5235A0"/>
                        </linearGradient>
                      </defs>
                      <rect width="24" height="24" rx="4" fill="url(#yahooGradCleanup)"/>
                      <path fill="#fff" d="M4 7.5L12 13L20 7.5V7C20 6.45 19.55 6 19 6H5C4.45 6 4 6.45 4 7V7.5Z"/>
                      <path fill="#fff" d="M4 9V17C4 17.55 4.45 18 5 18H19C19.55 18 20 17.55 20 17V9L12 14.5L4 9Z" opacity="0.8"/>
                    </svg>
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

            {/* Step 3: Start Cleaning - Only shown to free users */}
            {currentStep === 3 && currentView === 'onboarding' && !hasPaidPlan && (
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
        {/* Notification */}
        {notification && (
          <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
            notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? (
                <Check className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              {notification.message}
            </div>
          </div>
        )}

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

            {/* Cleanup Tools Grid - 2x2 layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
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
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-red-400 to-pink-400 mb-3">
                    <Trash2 className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-sm text-gray-600">
                    View emails grouped by sender and delete in bulk.
                  </p>
                </div>
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-violet-400 mb-3">
                    <BellOff className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-sm text-gray-600">
                    One-click unsubscribe from newsletters and mailing lists.
                  </p>
                </div>
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-400 mb-3">
                    <Archive className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-sm text-gray-600">
                    Archive old emails to keep your inbox clean.
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Text Section */}
            <div className="mt-10 text-center">
              <p className="text-gray-500 text-sm max-w-2xl mx-auto">
                Take control of your inbox in minutes. Our tools help you identify and remove unwanted emails,
                unsubscribe from mailing lists, and keep your inbox organized. Your data is encrypted and never shared.
              </p>
              <div className="mt-6 flex items-center justify-center gap-6 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <ShieldIcon className="w-4 h-4" />
                  <span>Secure & Private</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckIcon className="w-4 h-4" />
                  <span>No Credit Card Required</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span>5 Free Actions</span>
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
      {/* Modals */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onUpgrade={() => navigate('/checkout')}
      />

      <CleanupConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, action: 'delete', senders: [] })}
        onConfirm={executeCleanupAction}
        action={confirmModal.action}
        senders={confirmModal.senders}
        loading={cleanupLoading}
      />

      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <Check className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            {notification.message}
          </div>
        </div>
      )}

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
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {selectedToolData?.title || 'Email Cleanup'}
                </h1>
                <p className="mt-2 text-lg text-gray-600">
                  {selectedToolData?.description || 'Organize and clean your inbox by year and sender'}
                </p>
              </div>
              {connectedGmailAccount && (
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Syncing...' : 'Sync Emails'}
                </button>
              )}
            </div>
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
            {selectedSenders.length > 0 && (
              <div className="bg-indigo-50 p-3 flex items-center justify-between">
                <div className="flex items-center">
                  <CheckIcon className="h-4 w-4 text-indigo-600 mr-2" />
                  <span className="text-indigo-800 text-sm font-medium">
                    {selectedSenders.length} sender{selectedSenders.length !== 1 ? 's' : ''} selected
                  </span>
                </div>
                <div className="flex space-x-4">
                  <button
                    className="flex items-center text-xs font-medium text-indigo-600 hover:text-indigo-800"
                    onClick={() => handleCleanupAction('archive', getSelectedSenders())}
                  >
                    <ArchiveIcon className="h-3 w-3 mr-1" />
                    Archive
                  </button>
                  <button
                    className="flex items-center text-xs font-medium text-red-600 hover:text-red-800"
                    onClick={() => handleCleanupAction('delete', getSelectedSenders())}
                  >
                    <TrashIcon className="h-3 w-3 mr-1" />
                    Delete
                  </button>
                </div>
              </div>
            )}

            {/* Loading/Syncing state */}
            {(sendersLoading || syncing) && (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3 text-gray-500">
                  <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
                  <span className="text-lg font-medium">
                    {syncing ? 'Syncing your emails...' : 'Loading senders...'}
                  </span>
                  {syncing && (
                    <p className="text-sm text-gray-400">This may take a moment for large inboxes</p>
                  )}
                </div>
              </div>
            )}

            {/* Empty state */}
            {!sendersLoading && !syncing && senders.length === 0 && (
              <div className="text-center py-12">
                <Mail className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No emails found</h3>
                <p className="text-gray-500 mb-4">
                  {connectedGmailAccount
                    ? 'Click "Sync Emails" to fetch your email senders.'
                    : anyGmailAccount
                    ? 'Your Gmail may need to be reconnected. Try syncing or reconnect in Dashboard.'
                    : 'Connect your Gmail account to get started.'}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  {(connectedGmailAccount || anyGmailAccount) && (
                    <button
                      onClick={handleSync}
                      disabled={syncing}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                      <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                      Sync Emails
                    </button>
                  )}
                  <button
                    onClick={handleConnectGmail}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    <Mail className="w-4 h-4" />
                    {connectedGmailAccount ? 'Reconnect Gmail' : 'Connect Gmail'}
                  </button>
                </div>
              </div>
            )}

            {/* Delete & Clean Inbox View - Senders grouped, no unsubscribe */}
            {!sendersLoading && !syncing && senders.length > 0 && selectedTool === 'delete' && (
              <div className="divide-y divide-gray-200">
                {filterAndSortSenders(senders).map(sender => (
                  <div key={sender.id} className="hover:bg-gray-50">
                    <div className="px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center flex-1">
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mr-3"
                          checked={selectedSenders.includes(sender.email)}
                          onChange={() => toggleSenderSelection(sender.email)}
                        />
                        <div className="flex-1">
                          <div className="flex items-center">
                            <span className="text-sm font-medium text-gray-900">{sender.name}</span>
                            <span className="ml-2 text-xs text-gray-500">({sender.emailCount} emails)</span>
                          </div>
                          <div className="text-xs text-gray-500">{sender.email}</div>
                        </div>
                        <div className="text-xs text-gray-400 mr-4">
                          Last: {new Date(sender.lastEmailDate).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className="px-3 py-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded"
                          onClick={() => handleCleanupAction('archive', [sender])}
                        >
                          Archive All
                        </button>
                        <button
                          className="px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                          onClick={() => handleCleanupAction('delete', [sender])}
                        >
                          Delete All
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Unsubscribe View - Only senders with unsubscribe option, expandable */}
            {!sendersLoading && !syncing && senders.length > 0 && selectedTool === 'unsubscribe' && (
              <div className="divide-y divide-gray-200">
                {unsubscribableSenders.length === 0 ? (
                  <div className="text-center py-12">
                    <BellOff className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No newsletters found</h3>
                    <p className="text-gray-500">
                      No senders with unsubscribe options were found in your emails.
                    </p>
                  </div>
                ) : (
                  filterAndSortSenders(unsubscribableSenders).map(sender => (
                    <div key={sender.id} className="overflow-hidden">
                      <div className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                        <button
                          className="flex items-center flex-1 text-left"
                          onClick={() => toggleSenderExpand(sender.email)}
                        >
                          {expandedSenders.includes(sender.email) ? (
                            <ChevronUpIcon className="h-4 w-4 text-gray-400 mr-2" />
                          ) : (
                            <ChevronDownIcon className="h-4 w-4 text-gray-400 mr-2" />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center">
                              <span className="text-sm font-medium text-gray-900">{sender.name}</span>
                              <span className="ml-2 text-xs text-gray-500">({sender.emailCount} emails)</span>
                              {sender.isNewsletter && (
                                <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                                  Newsletter
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">{sender.email}</div>
                          </div>
                        </button>
                        <button
                          className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                          onClick={() => handleCleanupAction('unsubscribe', [sender])}
                        >
                          Unsubscribe
                        </button>
                      </div>
                      {expandedSenders.includes(sender.email) && (
                        <div className="bg-gray-50 px-4 py-3 border-t border-gray-100">
                          <div className="text-xs text-gray-500 mb-2">
                            Recent emails from this sender:
                          </div>
                          <div className="space-y-2">
                            {/* Show placeholder for individual emails - would need API to fetch actual emails */}
                            <div className="bg-white rounded-lg p-3 border border-gray-200">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="text-sm text-gray-700">
                                    Last email: {new Date(sender.lastEmailDate).toLocaleDateString()}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {sender.emailCount} total emails from this sender
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
                                    onClick={() => handleCleanupAction('archive', [sender])}
                                  >
                                    Archive All
                                  </button>
                                  <button
                                    className="px-2 py-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                                    onClick={() => handleCleanupAction('delete', [sender])}
                                  >
                                    Delete All
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Archive Old Emails View */}
            {!sendersLoading && !syncing && senders.length > 0 && selectedTool === 'archive' && (
              <div className="divide-y divide-gray-200">
                {filterAndSortSenders(senders).map(sender => (
                  <div key={sender.id} className="hover:bg-gray-50">
                    <div className="px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center flex-1">
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mr-3"
                          checked={selectedSenders.includes(sender.email)}
                          onChange={() => toggleSenderSelection(sender.email)}
                        />
                        <div className="flex-1">
                          <div className="flex items-center">
                            <span className="text-sm font-medium text-gray-900">{sender.name}</span>
                            <span className="ml-2 text-xs text-gray-500">({sender.emailCount} emails)</span>
                          </div>
                          <div className="text-xs text-gray-500">{sender.email}</div>
                        </div>
                        <div className="text-xs text-gray-400 mr-4">
                          Last: {new Date(sender.lastEmailDate).toLocaleDateString()}
                        </div>
                      </div>
                      <button
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                        onClick={() => handleCleanupAction('archive', [sender])}
                      >
                        Archive All
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Top Senders View */}
            {!sendersLoading && !syncing && senders.length > 0 && selectedTool === 'top-senders' && (
              <div className="divide-y divide-gray-200">
                {[...senders].sort((a, b) => b.emailCount - a.emailCount).slice(0, 20).map((sender, index) => (
                  <div key={sender.id} className="hover:bg-gray-50">
                    <div className="px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center flex-1">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm mr-3">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center">
                            <span className="text-sm font-medium text-gray-900">{sender.name}</span>
                            {sender.isNewsletter && (
                              <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                                Newsletter
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">{sender.email}</div>
                        </div>
                        <div className="flex items-center mr-4">
                          <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                            <div
                              className="bg-gradient-to-r from-amber-400 to-orange-500 h-2 rounded-full"
                              style={{ width: `${Math.min((sender.emailCount / senders[0]?.emailCount) * 100, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-gray-700">{sender.emailCount}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {sender.hasUnsubscribe && (
                          <button
                            className="px-3 py-1.5 text-xs font-medium text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded"
                            onClick={() => handleCleanupAction('unsubscribe', [sender])}
                          >
                            Unsubscribe
                          </button>
                        )}
                        <button
                          className="px-3 py-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded"
                          onClick={() => handleCleanupAction('archive', [sender])}
                        >
                          Archive
                        </button>
                        <button
                          className="px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                          onClick={() => handleCleanupAction('delete', [sender])}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default EmailCleanup;
