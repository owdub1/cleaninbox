import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  SearchIcon,
  ArchiveIcon,
  CheckIcon,
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
    color: 'from-red-500 to-rose-500',
  },
  {
    id: 'unsubscribe',
    title: 'Unsubscribe',
    description: 'One-click unsubscribe from newsletters and mailing lists.',
    icon: BellOff,
    color: 'from-purple-500 to-violet-500',
  },
  {
    id: 'archive',
    title: 'Archive Old Emails',
    description: 'Archive emails older than 30/60/90 days.',
    icon: Archive,
    color: 'from-blue-500 to-indigo-500',
  },
  {
    id: 'top-senders',
    title: 'Top Senders',
    description: 'See who sends you the most emails and clean up fast.',
    icon: BarChart3,
    color: 'from-amber-500 to-orange-500',
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
  const { isAuthenticated } = useAuth();
  const { emailAccounts } = useDashboardData();
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<'onboarding' | 'tools' | 'cleanup'>('onboarding');
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Tool-specific views state
  const [expandedSenders, setExpandedSenders] = useState<string[]>([]);
  const [archiveAge, setArchiveAge] = useState<30 | 60 | 90>(30);

  // Cleanup confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    action: 'delete' | 'archive' | 'unsubscribe';
    senders: Sender[];
  }>({ isOpen: false, action: 'delete', senders: [] });

  // Gmail connection hooks
  const { handleOAuthCallback, clearCallbackParams } = useGmailConnection();

  // Email senders hook
  const {
    senders,
    loading: sendersLoading,
    syncing,
    error: sendersError,
    fetchSenders,
    syncEmails
  } = useEmailSenders({ autoFetch: true });

  // Cleanup actions hook
  const { deleteEmails, archiveEmails, unsubscribe, loading: cleanupLoading } = useCleanupActions();

  // Subscription hook - get actual subscription status
  const { isPaid } = useSubscription();

  // Track free trial usage (only for free users)
  const [freeActionsUsed, setFreeActionsUsed] = useState(0);
  const freeActionsRemaining = FREE_TRIAL_LIMIT - freeActionsUsed;
  const hasFreeTries = freeActionsRemaining > 0;
  const hasPaidPlan = isPaid;

  // Get connected Gmail account
  const connectedGmailAccount = emailAccounts?.find(
    (acc: any) => acc.provider === 'Gmail' && acc.connection_status === 'connected'
  );

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
    if (connectedGmailAccount) {
      const success = await syncEmails(connectedGmailAccount.email);
      if (success) {
        setNotification({ type: 'success', message: 'Emails synced successfully!' });
      } else {
        setNotification({ type: 'error', message: 'Failed to sync emails. Please try again.' });
      }
    } else {
      setNotification({ type: 'error', message: 'No Gmail account connected. Please connect your Gmail first.' });
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
      } else if (result && 'requiresManualAction' in result && result.requiresManualAction) {
        setNotification({
          type: 'success',
          message: ('message' in result && result.message) || 'Please complete the unsubscribe manually'
        });
        if ('unsubscribeLink' in result && result.unsubscribeLink) {
          window.open(result.unsubscribeLink, '_blank');
        }
      }
    } catch (error: any) {
      setNotification({ type: 'error', message: error.message || 'Action failed' });
    }

    setConfirmModal({ isOpen: false, action: 'delete', senders: [] });
  };

  // Filter senders by search term
  const filterSenders = (senderList: Sender[]) => {
    if (!searchTerm) return senderList;
    return senderList.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Show onboarding funnel
  if (currentStep < 3 || (currentStep === 3 && currentView === 'onboarding')) {
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
                    <img
                      src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Gmail_icon_%282020%29.svg/2560px-Gmail_icon_%282020%29.svg.png"
                      alt="Gmail"
                      className="h-8 w-8"
                    />
                  </button>
                  <button
                    disabled
                    className="flex items-center justify-center p-4 bg-gray-50 border-2 border-gray-100 rounded-xl opacity-50 cursor-not-allowed"
                    title="Coming soon"
                  >
                    <img
                      src="https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Microsoft_Office_Outlook_%282018%E2%80%93present%29.svg/1200px-Microsoft_Office_Outlook_%282018%E2%80%93present%29.svg.png"
                      alt="Outlook"
                      className="h-8 w-8"
                    />
                  </button>
                  <button
                    disabled
                    className="flex items-center justify-center p-4 bg-gray-50 border-2 border-gray-100 rounded-xl opacity-50 cursor-not-allowed"
                    title="Coming soon"
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {cleanupTools.map((tool) => {
                const IconComponent = tool.icon;
                return (
                  <button
                    key={tool.id}
                    onClick={() => handleToolSelect(tool.id)}
                    className="group relative overflow-hidden rounded-2xl p-8 text-left transition-all hover:scale-105 hover:shadow-xl"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${tool.color} opacity-90 group-hover:opacity-100 transition-opacity`} />
                    <div className="relative z-10">
                      <div className="mb-4">
                        <div className="text-white">
                          <IconComponent className="w-10 h-10" />
                        </div>
                      </div>
                      <h3 className="text-white font-semibold text-xl mb-2">
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

          {/* Tool-specific views */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Loading state */}
            {sendersLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center gap-3 text-gray-500">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                  <span>Loading senders...</span>
                </div>
              </div>
            )}

            {/* Empty state */}
            {!sendersLoading && senders.length === 0 && (
              <div className="text-center py-12">
                <Mail className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No emails found</h3>
                <p className="text-gray-500 mb-4">
                  {connectedGmailAccount
                    ? 'Click "Sync Emails" to fetch your email senders.'
                    : 'Connect your Gmail account to get started.'}
                </p>
                {connectedGmailAccount && (
                  <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                    Sync Emails
                  </button>
                )}
              </div>
            )}

            {/* DELETE & CLEAN INBOX VIEW */}
            {!sendersLoading && senders.length > 0 && selectedTool === 'delete' && (
              <div>
                {/* Search bar */}
                <div className="p-4 border-b border-gray-200">
                  <div className="relative max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <SearchIcon className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search senders..."
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                {/* Senders list sorted by email count */}
                <div className="divide-y divide-gray-200">
                  {filterSenders(senders)
                    .sort((a, b) => b.emailCount - a.emailCount)
                    .map(sender => {
                      const isExpanded = expandedSenders.includes(sender.email);
                      return (
                        <div key={sender.id} className="bg-white">
                          {/* Sender row */}
                          <div className="px-4 py-4 flex items-center justify-between hover:bg-gray-50">
                            <div className="flex items-center flex-1 min-w-0">
                              <button
                                onClick={() => {
                                  if (isExpanded) {
                                    setExpandedSenders(expandedSenders.filter(e => e !== sender.email));
                                  } else {
                                    setExpandedSenders([...expandedSenders, sender.email]);
                                  }
                                }}
                                className="mr-3 p-1 hover:bg-gray-100 rounded"
                              >
                                {isExpanded ? (
                                  <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                                ) : (
                                  <ChevronRightIcon className="h-5 w-5 text-gray-500" />
                                )}
                              </button>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-900 truncate">{sender.name}</span>
                                  <span className="text-sm text-gray-500">({sender.emailCount} emails)</span>
                                </div>
                                <p className="text-sm text-gray-500 truncate">{sender.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 ml-4">
                              <span className="text-xs text-gray-400">
                                Last: {new Date(sender.lastEmailDate).toLocaleDateString()}
                              </span>
                              <button
                                onClick={() => handleCleanupAction('delete', [sender])}
                                className="px-4 py-2 bg-red-100 text-red-700 text-sm font-medium rounded-lg hover:bg-red-200 transition-colors"
                              >
                                Delete All
                              </button>
                            </div>
                          </div>

                          {/* Expanded email list placeholder */}
                          {isExpanded && (
                            <div className="bg-gray-50 px-4 py-3 border-t border-gray-100">
                              <div className="ml-9 space-y-2">
                                <p className="text-sm text-gray-500 italic">
                                  Individual email viewing coming soon. For now, use "Delete All" to remove all {sender.emailCount} emails from this sender.
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* UNSUBSCRIBE VIEW */}
            {!sendersLoading && senders.length > 0 && selectedTool === 'unsubscribe' && (
              <div>
                {/* Filter info */}
                <div className="p-4 border-b border-gray-200 bg-purple-50">
                  <div className="flex items-center gap-2 text-purple-800">
                    <BellOff className="w-5 h-5" />
                    <span className="text-sm font-medium">
                      Showing {senders.filter(s => s.hasUnsubscribe).length} newsletters and mailing lists with unsubscribe options
                    </span>
                  </div>
                </div>

                {/* Unsubscribable senders */}
                <div className="divide-y divide-gray-200">
                  {senders
                    .filter(sender => sender.hasUnsubscribe)
                    .sort((a, b) => b.emailCount - a.emailCount)
                    .map(sender => (
                      <div key={sender.id} className="px-4 py-4 flex items-center justify-between hover:bg-gray-50">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{sender.name}</span>
                            {sender.isNewsletter && (
                              <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                                Newsletter
                              </span>
                            )}
                            {sender.isPromotional && (
                              <span className="px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full">
                                Promotional
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">{sender.email} · {sender.emailCount} emails</p>
                        </div>
                        <button
                          onClick={() => handleCleanupAction('unsubscribe', [sender])}
                          className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                        >
                          <BellOff className="w-4 h-4" />
                          Unsubscribe
                        </button>
                      </div>
                    ))}

                  {senders.filter(s => s.hasUnsubscribe).length === 0 && (
                    <div className="text-center py-12">
                      <BellOff className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-1">No unsubscribe options found</h3>
                      <p className="text-gray-500">
                        We couldn't find any emails with unsubscribe links.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ARCHIVE OLD EMAILS VIEW */}
            {!sendersLoading && senders.length > 0 && selectedTool === 'archive' && (() => {
              const cutoffDate = new Date();
              cutoffDate.setDate(cutoffDate.getDate() - archiveAge);
              const oldSenders = senders.filter(s => new Date(s.lastEmailDate) < cutoffDate);
              const totalEmails = oldSenders.reduce((sum, s) => sum + s.emailCount, 0);

              return (
                <div>
                  {/* Age selector */}
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <label className="text-sm font-medium text-gray-700">
                        Archive emails older than:
                      </label>
                      <div className="flex gap-2">
                        {[30, 60, 90].map((days) => (
                          <button
                            key={days}
                            onClick={() => setArchiveAge(days as 30 | 60 | 90)}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                              archiveAge === days
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {days} days
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="p-4 bg-blue-50 border-b border-blue-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-semibold text-blue-900">
                          {totalEmails} emails will be archived
                        </p>
                        <p className="text-sm text-blue-700">
                          From {oldSenders.length} senders older than {archiveAge} days
                        </p>
                      </div>
                      {oldSenders.length > 0 && (
                        <button
                          onClick={() => handleCleanupAction('archive', oldSenders)}
                          className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                          <ArchiveIcon className="w-5 h-5" />
                          Archive All {totalEmails} Emails
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Preview list */}
                  <div className="p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Preview:</h4>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {oldSenders
                        .sort((a, b) => b.emailCount - a.emailCount)
                        .slice(0, 20)
                        .map(sender => (
                          <div key={sender.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <ArchiveIcon className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-900">{sender.name}</span>
                            </div>
                            <span className="text-sm text-gray-500">{sender.emailCount} emails</span>
                          </div>
                        ))}
                      {oldSenders.length > 20 && (
                        <p className="text-sm text-gray-500 text-center py-2">
                          ... and {oldSenders.length - 20} more senders
                        </p>
                      )}
                    </div>

                    {oldSenders.length === 0 && (
                      <div className="text-center py-8">
                        <ArchiveIcon className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-1">No old emails found</h3>
                        <p className="text-gray-500">
                          All your emails are newer than {archiveAge} days.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* TOP SENDERS VIEW */}
            {!sendersLoading && senders.length > 0 && selectedTool === 'top-senders' && (() => {
              const topSenders = [...senders]
                .sort((a, b) => b.emailCount - a.emailCount)
                .slice(0, 20);
              const maxCount = topSenders[0]?.emailCount || 1;

              return (
                <div>
                  {/* Header */}
                  <div className="p-4 border-b border-gray-200 bg-amber-50">
                    <div className="flex items-center gap-2 text-amber-800">
                      <BarChart3 className="w-5 h-5" />
                      <span className="text-sm font-medium">
                        Top 20 senders by email volume - quickly clean up your biggest email sources
                      </span>
                    </div>
                  </div>

                  {/* Top senders list */}
                  <div className="divide-y divide-gray-200">
                    {topSenders.map((sender, index) => {
                      const barWidth = (sender.emailCount / maxCount) * 100;
                      return (
                        <div key={sender.id} className="px-4 py-4 hover:bg-gray-50">
                          <div className="flex items-start gap-4">
                            {/* Rank */}
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                              <span className="text-sm font-bold text-amber-700">#{index + 1}</span>
                            </div>

                            {/* Sender info and bar */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-gray-900 truncate">{sender.name}</span>
                                <span className="text-sm font-semibold text-gray-600">{sender.emailCount} emails</span>
                              </div>
                              <p className="text-sm text-gray-500 truncate mb-2">{sender.email}</p>

                              {/* Visual bar */}
                              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                                  style={{ width: `${barWidth}%` }}
                                />
                              </div>
                            </div>

                            {/* Action buttons */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button
                                onClick={() => handleCleanupAction('delete', [sender])}
                                className="px-3 py-1.5 bg-red-100 text-red-700 text-xs font-medium rounded-lg hover:bg-red-200 transition-colors"
                              >
                                Delete All
                              </button>
                              <button
                                onClick={() => handleCleanupAction('archive', [sender])}
                                className="px-3 py-1.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-lg hover:bg-blue-200 transition-colors"
                              >
                                Archive All
                              </button>
                              {sender.hasUnsubscribe && (
                                <button
                                  onClick={() => handleCleanupAction('unsubscribe', [sender])}
                                  className="px-3 py-1.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-lg hover:bg-purple-200 transition-colors"
                                >
                                  Unsubscribe
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </section>
    </div>
  );
};

export default EmailCleanup;
