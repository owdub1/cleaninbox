import React, { useState, useEffect, useRef } from 'react';
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
  AlertCircle,
  Undo2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDashboardData } from '../hooks/useDashboardData';
import { useGmailConnection } from '../hooks/useGmailConnection';
import { useEmailSenders, Sender, EmailMessage } from '../hooks/useEmailSenders';
import { useCleanupActions } from '../hooks/useCleanupActions';
import { useSubscription } from '../hooks/useSubscription';
import CleanupConfirmModal from '../components/email/CleanupConfirmModal';
import EmailViewModal from '../components/email/EmailViewModal';

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

// Avatar component for senders
const SenderAvatar = ({ sender }: { sender: Sender }) => {
  const [imgError, setImgError] = useState(false);

  // Extract domain from email for Clearbit logo
  const domain = sender.email.split('@')[1];
  const logoUrl = `https://logo.clearbit.com/${domain}`;

  // Get initials from name
  const getInitials = (name: string) => {
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Generate consistent color based on email
  const getAvatarColor = (email: string) => {
    const colors = [
      'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-red-500',
      'bg-orange-500', 'bg-amber-500', 'bg-green-500', 'bg-teal-500',
      'bg-cyan-500', 'bg-indigo-500', 'bg-violet-500', 'bg-rose-500'
    ];
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      hash = email.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  if (imgError) {
    // Fallback to initials
    return (
      <div className={`w-12 h-12 rounded-full ${getAvatarColor(sender.email)} flex items-center justify-center text-white font-semibold text-base flex-shrink-0`}>
        {getInitials(sender.name || sender.email)}
      </div>
    );
  }

  return (
    <img
      src={logoUrl}
      alt={sender.name}
      className="w-12 h-12 rounded-full object-cover flex-shrink-0"
      onError={() => setImgError(true)}
    />
  );
};

// Skeleton loader for sender rows
const SenderSkeleton = () => (
  <div className="bg-white rounded-2xl shadow-sm overflow-hidden animate-pulse">
    <div className="px-5 py-4 flex items-center justify-between">
      <div className="flex items-center flex-1">
        <div className="h-5 w-5 bg-gray-200 rounded mr-3" />
        <div className="h-5 w-5 bg-gray-200 rounded mr-4" />
        <div className="w-12 h-12 bg-gray-200 rounded-full" />
        <div className="flex-1 ml-4">
          <div className="flex items-center">
            <div className="h-5 w-32 bg-gray-200 rounded" />
            <div className="ml-3 h-5 w-16 bg-gray-100 rounded-full" />
          </div>
          <div className="h-4 w-48 bg-gray-100 rounded mt-1.5" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="h-9 w-20 bg-gray-100 rounded-lg" />
        <div className="h-9 w-20 bg-gray-200 rounded-lg" />
      </div>
    </div>
  </div>
);

// Undo toast component
interface UndoAction {
  id: string;
  type: 'delete' | 'archive';
  count: number;
  senderEmails: string[];
  messageIds?: string[];
  timestamp: number;
}

// Pending deletion state for true undo (deferred API calls)
interface PendingDeletion {
  id: string;
  type: 'single' | 'bulk';
  action: 'delete' | 'archive';
  // For single delete:
  email?: EmailMessage;
  senderEmail?: string;
  senderName?: string;
  senderKey?: string;
  originalEmails?: EmailMessage[];
  originalSenderCount?: number;
  originalLastEmailDate?: string;
  // For bulk delete:
  senders?: Sender[];
  senderEmails?: string[];
  senderNames?: string[];
  // Common:
  timeoutId: ReturnType<typeof setTimeout>;
}

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
  const UNDO_TIMEOUT = 4000; // 4 seconds to undo

  // Use ref to avoid restarting timer when onDismiss reference changes
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

  // Stack toasts vertically with offset
  const bottomOffset = 24 + (stackIndex * 72); // 72px per toast

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
  const [expandedPeriods, setExpandedPeriods] = useState<string[]>(['Today', 'Yesterday']); // Time periods expanded by default
  const [expandedSenders, setExpandedSenders] = useState<string[]>([]); // For Unsubscribe view
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('count');
  const [sortDirection, setSortDirection] = useState('desc');
  // Use composite keys (name|||email) for selection to differentiate senders with same email but different names
  const [selectedSenderKeys, setSelectedSenderKeys] = useState<string[]>([]);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Account selector state - for users with multiple email accounts
  const [selectedAccountEmail, setSelectedAccountEmail] = useState<string | null>(null);

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
    getSendersByYear,
    fetchEmailsBySender,
    updateSenderCount,
    updateSenderLastEmailDate
  } = useEmailSenders({ autoFetch: true });

  // State for storing loaded emails by sender
  const [senderEmails, setSenderEmails] = useState<Record<string, EmailMessage[]>>({});
  const [deletingEmailId, setDeletingEmailId] = useState<string | null>(null);
  const [undoActions, setUndoActions] = useState<UndoAction[]>([]);
  const [pendingDeletions, setPendingDeletions] = useState<Map<string, PendingDeletion>>(new Map());
  const pendingDeletionsRef = useRef<Map<string, PendingDeletion>>(new Map());
  const [loadingEmails, setLoadingEmails] = useState<string | null>(null);
  // State for viewing individual email
  const [viewingEmail, setViewingEmail] = useState<{ messageId: string; accountEmail: string; senderEmail: string; senderName: string } | null>(null);

  // Cleanup actions hook
  const { deleteSingleEmail, deleteEmails, archiveEmails, unsubscribe, loading: cleanupLoading } = useCleanupActions();

  // Track free trial usage (only for free users)
  const [freeActionsUsed, setFreeActionsUsed] = useState(0);
  const freeActionsRemaining = FREE_TRIAL_LIMIT - freeActionsUsed;
  const hasFreeTries = freeActionsRemaining > 0;
  const hasPaidPlan = isPaid;

  // Get all connected Gmail accounts
  const connectedGmailAccounts = emailAccounts?.filter(
    (acc: any) => acc.provider === 'Gmail' && acc.connection_status === 'connected'
  ) || [];

  // Set initial selected account when accounts load
  useEffect(() => {
    if (connectedGmailAccounts.length > 0 && !selectedAccountEmail) {
      setSelectedAccountEmail(connectedGmailAccounts[0].email);
    }
  }, [connectedGmailAccounts, selectedAccountEmail]);

  // Get the currently selected Gmail account
  const connectedGmailAccount = selectedAccountEmail
    ? emailAccounts?.find((acc: any) => acc.email === selectedAccountEmail && acc.connection_status === 'connected')
    : connectedGmailAccounts[0];

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

  // Show senders error as notification (only when authenticated)
  useEffect(() => {
    if (sendersError && isAuthenticated && sendersError !== 'Authentication required') {
      setNotification({ type: 'error', message: sendersError });
    }
  }, [sendersError, isAuthenticated]);

  // Keep pendingDeletionsRef in sync with state for async callbacks
  useEffect(() => {
    pendingDeletionsRef.current = pendingDeletions;
  }, [pendingDeletions]);

  // Cleanup: execute all pending deletions if component unmounts
  useEffect(() => {
    return () => {
      pendingDeletionsRef.current.forEach((pending) => {
        clearTimeout(pending.timeoutId);
        // Execute the pending deletion before unmount
        // Note: This runs synchronously, but the API call is async
        // The deletion will proceed even after unmount
        if (connectedGmailAccount) {
          if (pending.type === 'single' && pending.email && pending.senderEmail) {
            deleteSingleEmail(
              connectedGmailAccount.email,
              pending.email.id,
              pending.senderEmail
            );
          } else if (pending.type === 'bulk' && pending.senderEmails && pending.senderNames) {
            if (pending.action === 'delete') {
              deleteEmails(connectedGmailAccount.email, pending.senderEmails, pending.senderNames);
            } else if (pending.action === 'archive') {
              archiveEmails(connectedGmailAccount.email, pending.senderEmails, pending.senderNames);
            }
          }
        }
      });
    };
  }, [connectedGmailAccount, deleteSingleEmail, deleteEmails, archiveEmails]);

  const getCurrentStep = () => {
    if (!isAuthenticated) return 1;
    if (!hasEmailConnected) return 2;
    return 3; // Ready to start cleaning
  };

  const currentStep = getCurrentStep();

  const handleToolSelect = (toolId: string) => {
    setSelectedTool(toolId);
    setCurrentView('cleanup');
    // Set default sort based on tool
    if (toolId === 'delete') {
      setSortBy('date');
      setSortDirection('desc'); // Newest first, like Gmail
    } else {
      setSortBy('count');
      setSortDirection('desc'); // Most emails first
    }
  };

  const handleBackToTools = () => {
    setCurrentView('tools');
    setSelectedTool(null);
  };

  const handleStartCleaning = () => {
    setCurrentView('tools');
  };

  const handleSync = async (fullSync: boolean = false, repair: boolean = false) => {
    // Use connected account, or fall back to any Gmail account
    const accountToSync = connectedGmailAccount || anyGmailAccount;
    if (accountToSync) {
      const syncType = repair ? 'Repair' : (fullSync ? 'Full' : 'Incremental');
      console.log(`${syncType} sync for:`, accountToSync.email);
      const result = await syncEmails(accountToSync.email, { fullSync, repair });
      if (result.success) {
        // Clear cached email lists and collapse dropdowns so UI reflects fresh data
        setSenderEmails({});
        setExpandedSenders([]);
        const message = repair ? 'Data repaired successfully!' : (fullSync ? 'Full sync completed!' : 'Emails synced successfully!');
        setNotification({ type: 'success', message });
      } else if (result.limitReached) {
        // Show sync limit message with upgrade suggestion
        const message = result.upgradeMessage
          ? `${sendersError}. ${result.upgradeMessage}`
          : sendersError || 'Sync limit reached.';
        setNotification({ type: 'error', message });
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

  // Helper to create composite key for sender (name + email)
  const getSenderKey = (sender: Sender): string => `${sender.name}|||${sender.email}`;

  // Execute cleanup action (deferred for delete/archive, immediate for unsubscribe)
  const executeCleanupAction = async () => {
    if (!connectedGmailAccount) return;

    const { action, senders: actionSenders } = confirmModal;
    const senderEmailsList = actionSenders.map(s => s.email);
    const senderNamesList = actionSenders.map(s => s.name);

    // Unsubscribe still executes immediately (no undo needed)
    if (action === 'unsubscribe') {
      try {
        if (actionSenders.length === 1) {
          const result = await unsubscribe(
            connectedGmailAccount.email,
            actionSenders[0].email,
            actionSenders[0].unsubscribeLink || undefined
          );

          if (result?.success) {
            if (!hasPaidPlan) {
              setFreeActionsUsed(prev => prev + actionSenders.length);
            }
            setNotification({
              type: 'success',
              message: `Successfully unsubscribed from ${actionSenders.length} sender(s)`
            });
            fetchSenders();
            setSelectedSenderKeys([]);
          } else if (result?.requiresManualAction) {
            setNotification({
              type: 'success',
              message: result.message || 'Please complete the unsubscribe manually'
            });
            if (result.unsubscribeLink) {
              window.open(result.unsubscribeLink, '_blank');
            }
          }
        }
      } catch (error: any) {
        setNotification({ type: 'error', message: error.message || 'Action failed' });
      }
      setConfirmModal({ isOpen: false, action: 'delete', senders: [] });
      return;
    }

    // For delete/archive, use deferred execution with true undo
    // Store original senders for potential restoration
    const originalSenders = [...actionSenders];

    // Calculate total count for undo toast
    const totalCount = actionSenders.reduce((sum, s) => sum + s.emailCount, 0);

    // Generate unique ID for this action
    const actionId = `bulk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Set up deferred deletion (API call after 4 seconds)
    const timeoutId = setTimeout(() => {
      executePendingDeletion(actionId);
    }, 4000);

    const newPendingDeletion: PendingDeletion = {
      id: actionId,
      type: 'bulk',
      action,
      senders: originalSenders,
      senderEmails: senderEmailsList,
      senderNames: senderNamesList,
      timeoutId
    };

    setPendingDeletions(prev => new Map(prev).set(actionId, newPendingDeletion));

    setUndoActions(prev => [...prev, {
      id: actionId,
      type: action,
      count: totalCount,
      senderEmails: senderEmailsList,
      timestamp: Date.now()
    }]);

    // Increment free actions used (will be decremented on undo if needed)
    if (!hasPaidPlan) {
      setFreeActionsUsed(prev => prev + actionSenders.length);
    }

    // Clear selection and close modal
    setSelectedSenderKeys([]);
    setConfirmModal({ isOpen: false, action: 'delete', senders: [] });
  };

  // Execute pending deletion when undo timeout expires
  const executePendingDeletion = async (actionId: string) => {
    const pending = pendingDeletionsRef.current.get(actionId);
    if (!pending || !connectedGmailAccount) {
      // Remove from state even if not found
      setPendingDeletions(prev => {
        const newMap = new Map(prev);
        newMap.delete(actionId);
        return newMap;
      });
      setUndoActions(prev => prev.filter(a => a.id !== actionId));
      return;
    }

    try {
      if (pending.type === 'single' && pending.email && pending.senderEmail) {
        await deleteSingleEmail(
          connectedGmailAccount.email,
          pending.email.id,
          pending.senderEmail
        );
      } else if (pending.type === 'bulk' && pending.senderEmails && pending.senderNames) {
        if (pending.action === 'delete') {
          await deleteEmails(connectedGmailAccount.email, pending.senderEmails, pending.senderNames);
        } else if (pending.action === 'archive') {
          await archiveEmails(connectedGmailAccount.email, pending.senderEmails, pending.senderNames);
        }
        // Refresh senders list after bulk action completes
        fetchSenders();
      }
    } catch (error) {
      console.error('Failed to execute pending deletion:', error);
      setNotification({ type: 'error', message: 'Failed to complete action' });
      // On failure, refresh to restore correct state
      fetchSenders();
    }

    // Remove this specific pending deletion
    setPendingDeletions(prev => {
      const newMap = new Map(prev);
      newMap.delete(actionId);
      return newMap;
    });
    setUndoActions(prev => prev.filter(a => a.id !== actionId));
  };

  // Handle deleting a single email (deferred API call for true undo)
  const handleDeleteSingleEmail = (email: EmailMessage, senderEmail: string, senderName: string) => {
    if (!connectedGmailAccount) return;

    const senderKey = `${senderName}|||${senderEmail}`;

    // Save current state for potential undo
    const originalEmails = senderEmails[senderKey] || [];
    const currentSender = senders.find(s => s.email === senderEmail && s.name === senderName);

    // Optimistic UI update (remove email visually)
    const remainingEmails = originalEmails.filter(e => e.id !== email.id);
    setSenderEmails(prev => ({ ...prev, [senderKey]: remainingEmails }));

    // Update sender count and lastEmailDate
    if (remainingEmails.length > 0) {
      const sortedByDate = [...remainingEmails].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      updateSenderLastEmailDate(senderEmail, senderName, sortedByDate[0].date);
    }
    updateSenderCount(senderEmail, senderName, -1);

    // Generate unique ID for this action
    const actionId = `single-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Set up deferred deletion (API call after 4 seconds)
    const timeoutId = setTimeout(() => {
      executePendingDeletion(actionId);
    }, 4000);

    // Store pending deletion for undo capability
    const newPendingDeletion: PendingDeletion = {
      id: actionId,
      type: 'single',
      action: 'delete',
      email,
      senderEmail,
      senderName,
      senderKey,
      originalEmails,
      originalSenderCount: currentSender?.emailCount,
      originalLastEmailDate: currentSender?.lastEmailDate,
      timeoutId
    };

    setPendingDeletions(prev => new Map(prev).set(actionId, newPendingDeletion));

    // Show undo toast
    setUndoActions(prev => [...prev, {
      id: actionId,
      type: 'delete',
      count: 1,
      senderEmails: [senderEmail],
      messageIds: [email.id],
      timestamp: Date.now()
    }]);
  };

  // Handle undo action - true restoration (cancels pending API call)
  const handleUndo = (actionId: string) => {
    const pendingDeletion = pendingDeletions.get(actionId);
    if (!pendingDeletion) {
      setUndoActions(prev => prev.filter(a => a.id !== actionId));
      return;
    }

    // Cancel the pending API call
    clearTimeout(pendingDeletion.timeoutId);

    // Restore UI state based on deletion type
    if (pendingDeletion.type === 'single' && pendingDeletion.senderKey) {
      // Restore email to local state
      const restoredEmails = pendingDeletion.originalEmails || [];
      setSenderEmails(prev => ({
        ...prev,
        [pendingDeletion.senderKey!]: restoredEmails
      }));

      // Restore sender count and recalculate date from actual emails
      // (Don't use cached originalLastEmailDate - it may be stale with concurrent deletions)
      if (pendingDeletion.senderEmail && pendingDeletion.senderName) {
        updateSenderCount(pendingDeletion.senderEmail, pendingDeletion.senderName, 1);
        if (restoredEmails.length > 0) {
          const sortedByDate = [...restoredEmails].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          );
          updateSenderLastEmailDate(
            pendingDeletion.senderEmail,
            pendingDeletion.senderName,
            sortedByDate[0].date
          );
        }
      }
    } else if (pendingDeletion.type === 'bulk') {
      // For bulk undo, senders are still in state (just filtered out by filterPendingBulkDeletions)
      // Clearing pendingDeletion will make them reappear instantly
      // Decrement free actions if they were incremented for this bulk action
      if (!hasPaidPlan && pendingDeletion.senders) {
        setFreeActionsUsed(prev => Math.max(0, prev - pendingDeletion.senders!.length));
      }
    }

    // Remove this specific pending deletion and undo toast
    setPendingDeletions(prev => {
      const newMap = new Map(prev);
      newMap.delete(actionId);
      return newMap;
    });
    setUndoActions(prev => prev.filter(a => a.id !== actionId));

    const actionWord = pendingDeletion.action === 'archive' ? 'Archive' : 'Deletion';
    setNotification({ type: 'success', message: `${actionWord} cancelled` });
  };

  // Select all visible senders
  const handleSelectAll = () => {
    const visibleSenders = filterAndSortSenders(senders);
    if (selectedSenderKeys.length === visibleSenders.length) {
      // Deselect all
      setSelectedSenderKeys([]);
    } else {
      // Select all using composite keys
      setSelectedSenderKeys(visibleSenders.map(s => getSenderKey(s)));
    }
  };

  const togglePeriod = (period: string) => {
    if (expandedPeriods.includes(period)) {
      setExpandedPeriods(expandedPeriods.filter(p => p !== period));
    } else {
      setExpandedPeriods([...expandedPeriods, period]);
    }
  };

  const toggleSenderExpand = async (sender: Sender, accountEmail?: string) => {
    const key = getSenderKey(sender);
    if (expandedSenders.includes(key)) {
      setExpandedSenders(expandedSenders.filter(s => s !== key));
    } else {
      setExpandedSenders([...expandedSenders, key]);

      // Always fetch fresh emails when expanding (to get accurate count and latest emails)
      if (accountEmail) {
        setLoadingEmails(key);
        const emails = await fetchEmailsBySender(sender.email, accountEmail, 50, sender.name);
        setSenderEmails(prev => ({ ...prev, [key]: emails }));
        setLoadingEmails(null);
      }
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

  const toggleSenderSelection = (sender: Sender) => {
    const key = getSenderKey(sender);
    if (selectedSenderKeys.includes(key)) {
      setSelectedSenderKeys(selectedSenderKeys.filter(k => k !== key));
    } else {
      setSelectedSenderKeys([...selectedSenderKeys, key]);
    }
  };

  // Filter and sort senders
  const filterAndSortSenders = (senderList: Sender[]) => {
    let filtered = [...senderList];

    // Filter by selected account when multiple accounts exist
    if (selectedAccountEmail && connectedGmailAccounts.length > 1) {
      filtered = filtered.filter(item => item.accountEmail === selectedAccountEmail);
    }

    // Hide senders with 0 emails (already deleted)
    filtered = filtered.filter(item => item.emailCount > 0);

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
    return senders.filter(s => selectedSenderKeys.includes(getSenderKey(s)));
  };

  // Get senders grouped by time period (Today, Yesterday, days of week, months, then years)
  // Uses UTC for all comparisons to match how dates are stored in the database
  const getSendersByTimePeriod = (): { period: string; senders: Sender[]; sortOrder: number }[] => {
    const now = new Date();
    const currentYear = now.getUTCFullYear();
    const currentMonth = now.getUTCMonth();

    // Create date boundaries at midnight UTC
    const todayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0);
    const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
    const twoDaysAgoStart = todayStart - 2 * 24 * 60 * 60 * 1000;

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];

    const grouped: Record<string, { senders: Sender[]; sortOrder: number }> = {};

    for (const sender of senders) {
      const emailDate = new Date(sender.lastEmailDate);
      const emailYear = emailDate.getUTCFullYear();
      const emailMonth = emailDate.getUTCMonth();
      const emailDayOfMonth = emailDate.getUTCDate();

      // Create a date at midnight UTC for the email's date
      const emailDayStart = Date.UTC(emailYear, emailMonth, emailDayOfMonth, 0, 0, 0, 0);

      // Calculate days difference (both values are epoch ms from Date.UTC)
      const msDiff = todayStart - emailDayStart;
      const daysDiff = Math.floor(msDiff / (1000 * 60 * 60 * 24));

      let period: string;
      let sortOrder: number;

      if (daysDiff === 0) {
        period = 'Today';
        sortOrder = 0;
      } else if (daysDiff === 1) {
        period = 'Yesterday';
        sortOrder = 1;
      } else if (daysDiff >= 2 && daysDiff <= 6) {
        // 2-6 days ago - show day name
        period = dayNames[emailDate.getUTCDay()];
        sortOrder = daysDiff;
      } else if (daysDiff >= 7 && daysDiff <= 30) {
        // 7-30 days ago - "Last Week" or "Earlier This Month"
        if (daysDiff <= 13) {
          period = 'Last Week';
          sortOrder = 10;
        } else {
          period = 'Earlier This Month';
          sortOrder = 15;
        }
      } else if (emailYear === currentYear) {
        // This year but more than 30 days ago - group by month
        period = monthNames[emailMonth];
        // Sort order: earlier months have higher sort order
        sortOrder = 20 + (currentMonth - emailMonth);
      } else if (emailYear === currentYear - 1) {
        // Last year - group by month with year
        period = `${monthNames[emailMonth]} ${emailYear}`;
        sortOrder = 100 + (11 - emailMonth); // December = 100, January = 111
      } else {
        // Older than last year - group by year
        period = emailYear.toString();
        sortOrder = 200 + (currentYear - emailYear);
      }

      if (!grouped[period]) {
        grouped[period] = { senders: [], sortOrder };
      }
      grouped[period].senders.push(sender);
    }

    // Convert to array and sort by sortOrder
    return Object.entries(grouped)
      .map(([period, data]) => ({ period, senders: data.senders, sortOrder: data.sortOrder }))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  };

  const sendersByTimePeriod = getSendersByTimePeriod();

  // Get senders grouped by year (keeping for backward compatibility)
  const sendersByYear = getSendersByYear();

  // Filter out senders that are pending bulk deletion
  const filterPendingBulkDeletions = (senderList: Sender[]): Sender[] => {
    if (pendingDeletions.size === 0) return senderList;

    // Collect all pending bulk deletion sender emails/names
    const pendingBulkSenders = new Set<string>();
    pendingDeletions.forEach(pending => {
      if (pending.type === 'bulk' && pending.senderEmails && pending.senderNames) {
        pending.senderEmails.forEach((email, index) => {
          pendingBulkSenders.add(`${email}|||${pending.senderNames![index]}`);
        });
      }
    });

    if (pendingBulkSenders.size === 0) return senderList;

    return senderList.filter(sender => {
      const key = `${sender.email}|||${sender.name}`;
      return !pendingBulkSenders.has(key);
    });
  };

  // Get senders that can be unsubscribed (for Unsubscribe tool) - exclude 0 email senders
  const unsubscribableSenders = senders.filter(s => s.hasUnsubscribe && s.emailCount > 0);

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

      {/* Email View Modal */}
      <EmailViewModal
        isOpen={!!viewingEmail}
        onClose={() => setViewingEmail(null)}
        messageId={viewingEmail?.messageId || ''}
        accountEmail={viewingEmail?.accountEmail || ''}
        onDelete={viewingEmail ? () => {
          const senderKey = `${viewingEmail.senderName}|||${viewingEmail.senderEmail}`;
          const email = senderEmails[senderKey]?.find(e => e.id === viewingEmail.messageId);
          if (email) {
            handleDeleteSingleEmail(email, viewingEmail.senderEmail, viewingEmail.senderName);
          }
        } : undefined}
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
              <div className="flex items-center gap-3">
                {/* Account Selector - show when multiple accounts connected */}
                {connectedGmailAccounts.length > 1 && (
                  <div className="relative">
                    <select
                      value={selectedAccountEmail || ''}
                      onChange={(e) => setSelectedAccountEmail(e.target.value)}
                      className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer"
                    >
                      {connectedGmailAccounts.map((account: any) => (
                        <option key={account.id} value={account.email}>
                          {account.email}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                      <ChevronDownIcon className="h-4 w-4" />
                    </div>
                  </div>
                )}
                {connectedGmailAccount && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleSync(false, false)}
                      disabled={syncing}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                      {syncing ? 'Syncing...' : 'Sync Now'}
                    </button>
                    <button
                      onClick={() => handleSync(false, true)}
                      disabled={syncing}
                      className="text-sm text-gray-500 hover:text-indigo-600 transition-colors"
                      title="Fix incorrect sender dates and counts"
                    >
                      Repair Data
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Search and filter controls */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                <div className="flex items-center gap-4">
                  {/* Select All checkbox */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      checked={selectedSenderKeys.length > 0 && selectedSenderKeys.length === filterAndSortSenders(senders).length}
                      onChange={handleSelectAll}
                    />
                    <span className="text-sm text-gray-700">
                      {selectedSenderKeys.length > 0 ? `${selectedSenderKeys.length} selected` : 'Select All'}
                    </span>
                  </label>
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
            {selectedSenderKeys.length > 0 && (
              <div className="bg-indigo-50 p-3 flex items-center justify-between">
                <div className="flex items-center">
                  <CheckIcon className="h-4 w-4 text-indigo-600 mr-2" />
                  <span className="text-indigo-800 text-sm font-medium">
                    {selectedSenderKeys.length} sender{selectedSenderKeys.length !== 1 ? 's' : ''} selected
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

            {/* Loading/Syncing state - Skeleton loaders */}
            {(sendersLoading || syncing) && (
              <div className="px-4 py-3 space-y-3">
                {syncing && (
                  <div className="flex items-center justify-center py-4 mb-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-indigo-600 mr-2" />
                    <span className="text-sm text-gray-600">Syncing your emails...</span>
                  </div>
                )}
                {/* Skeleton rows */}
                {[...Array(6)].map((_, i) => (
                  <SenderSkeleton key={i} />
                ))}
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
                      onClick={() => handleSync(false)}
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

            {/* Delete & Clean Inbox View - Time period grouping when sorting by date */}
            {!sendersLoading && !syncing && senders.length > 0 && selectedTool === 'delete' && sortBy === 'date' && (
              <div>
                {sendersByTimePeriod.map(({ period, senders: periodSenders }) => {
                  const filteredSenders = filterPendingBulkDeletions(filterAndSortSenders(periodSenders));
                  const totalEmails = filteredSenders.reduce((sum, s) => sum + s.emailCount, 0);

                  if (filteredSenders.length === 0) return null;

                  return (
                    <div key={period} className="mb-4">
                      {/* Time period divider header - always visible, not collapsible */}
                      <div className="px-4 py-2 bg-gray-100 border-y border-gray-200 flex items-center justify-between sticky top-0 z-10">
                        <div className="flex items-center">
                          <span className="text-sm font-semibold text-gray-700">
                            {period === 'Today' || period === 'Yesterday' ? `Last email: ${period.toLowerCase()}` : `Last email: ${period}`}
                          </span>
                          <span className="ml-2 text-xs text-gray-500">
                            {filteredSenders.length} sender{filteredSenders.length !== 1 ? 's' : ''} • {totalEmails.toLocaleString()} total emails
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            className="px-2 py-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded"
                            onClick={() => handleCleanupAction('archive', filteredSenders)}
                          >
                            Archive All
                          </button>
                          <button
                            className="px-2 py-1 text-xs font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                            onClick={() => handleCleanupAction('delete', filteredSenders)}
                          >
                            Delete All
                          </button>
                        </div>
                      </div>

                      {/* Senders within time period - always visible as cards */}
                      <div className="px-4 py-3 space-y-3">
                        {filteredSenders.map(sender => (
                          <div key={sender.id} className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                            <div className="px-5 py-4 flex items-center justify-between">
                              <button
                                className="flex items-center flex-1 text-left"
                                onClick={() => toggleSenderExpand(sender, sender.accountEmail)}
                              >
                                {expandedSenders.includes(getSenderKey(sender)) ? (
                                  <ChevronUpIcon className="h-5 w-5 text-gray-400 mr-3" />
                                ) : (
                                  <ChevronDownIcon className="h-5 w-5 text-gray-400 mr-3" />
                                )}
                                <input
                                  type="checkbox"
                                  className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mr-4"
                                  checked={selectedSenderKeys.includes(getSenderKey(sender))}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    toggleSenderSelection(sender);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <SenderAvatar sender={sender} />
                                <div className="flex-1 ml-4">
                                  <div className="flex items-center">
                                    <span className="text-base font-medium text-gray-900">{sender.name}</span>
                                    <span className="ml-3 px-2.5 py-0.5 text-sm bg-gray-100 text-gray-600 rounded-full">{sender.emailCount} emails</span>
                                  </div>
                                  <div className="text-sm text-gray-500 mt-0.5">{sender.email}</div>
                                </div>
                              </button>
                              <div className="flex items-center gap-3">
                                <button
                                  className="px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                  onClick={() => handleCleanupAction('archive', [sender])}
                                >
                                  Archive
                                </button>
                                <button
                                  className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                                  onClick={() => handleCleanupAction('delete', [sender])}
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                            {/* Individual emails dropdown */}
                            {expandedSenders.includes(getSenderKey(sender)) && (
                              <div className="bg-gray-50 px-4 py-3 border-t border-gray-100">
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                  {loadingEmails === getSenderKey(sender) ? (
                                    <div className="flex items-center justify-center py-4">
                                      <RefreshCw className="w-5 h-5 animate-spin text-gray-400 mr-2" />
                                      <span className="text-sm text-gray-500">Loading emails...</span>
                                    </div>
                                  ) : senderEmails[getSenderKey(sender)]?.length > 0 ? (
                                    senderEmails[getSenderKey(sender)].map(email => (
                                      <div key={email.id} className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 group hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer">
                                        <div className="flex items-start justify-between gap-3">
                                          <div
                                            className="flex-1 min-w-0"
                                            onClick={() => setViewingEmail({ messageId: email.id, accountEmail: sender.accountEmail, senderEmail: sender.email, senderName: sender.name })}
                                          >
                                            <div className="flex items-center gap-2">
                                              {email.isUnread && <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />}
                                              <span className={`text-sm truncate ${email.isUnread ? 'font-semibold' : ''}`}>
                                                {email.subject}
                                              </span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1 line-clamp-1">{email.snippet}</p>
                                            <div className="text-xs text-gray-400 mt-1">
                                              {new Date(email.date).toLocaleDateString('en-US', { timeZone: 'UTC' })}
                                            </div>
                                          </div>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteSingleEmail(email, sender.email, sender.name); }}
                                            disabled={deletingEmailId === email.id}
                                            className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all flex-shrink-0"
                                            title="Delete email"
                                          >
                                            {deletingEmailId === email.id ? (
                                              <RefreshCw className="w-4 h-4 animate-spin" />
                                            ) : (
                                              <Trash2 className="w-4 h-4" />
                                            )}
                                          </button>
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-center py-2 text-sm text-gray-500">
                                      No emails found
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Delete & Clean Inbox View - Flat list with expandable senders when sorting by name or count */}
            {!sendersLoading && !syncing && senders.length > 0 && selectedTool === 'delete' && sortBy !== 'date' && (
              <div className="px-4 py-3 space-y-3">
                {filterPendingBulkDeletions(filterAndSortSenders(senders)).map(sender => (
                  <div key={sender.id} className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                    <div className="px-5 py-4 flex items-center justify-between">
                      <button
                        className="flex items-center flex-1 text-left"
                        onClick={() => toggleSenderExpand(sender, sender.accountEmail)}
                      >
                        {expandedSenders.includes(getSenderKey(sender)) ? (
                          <ChevronUpIcon className="h-5 w-5 text-gray-400 mr-3" />
                        ) : (
                          <ChevronDownIcon className="h-5 w-5 text-gray-400 mr-3" />
                        )}
                        <input
                          type="checkbox"
                          className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mr-4"
                          checked={selectedSenderKeys.includes(getSenderKey(sender))}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleSenderSelection(sender);
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <SenderAvatar sender={sender} />
                        <div className="flex-1 ml-4">
                          <div className="flex items-center">
                            <span className="text-base font-medium text-gray-900">{sender.name}</span>
                            <span className="ml-3 px-2.5 py-0.5 text-sm bg-gray-100 text-gray-600 rounded-full">{sender.emailCount} emails</span>
                          </div>
                          <div className="text-sm text-gray-500 mt-0.5">{sender.email}</div>
                        </div>
                        <div className="text-sm text-gray-400 mr-4">
                          {new Date(sender.lastEmailDate).toLocaleDateString('en-US', { timeZone: 'UTC' })}
                        </div>
                      </button>
                      <div className="flex items-center gap-3">
                        <button
                          className="px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          onClick={() => handleCleanupAction('archive', [sender])}
                        >
                          Archive
                        </button>
                        <button
                          className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                          onClick={() => handleCleanupAction('delete', [sender])}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    {/* Individual emails dropdown */}
                    {expandedSenders.includes(getSenderKey(sender)) && (
                      <div className="bg-gray-50 px-4 py-3 border-t border-gray-100">
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {loadingEmails === getSenderKey(sender) ? (
                            <div className="flex items-center justify-center py-4">
                              <RefreshCw className="w-5 h-5 animate-spin text-gray-400 mr-2" />
                              <span className="text-sm text-gray-500">Loading emails...</span>
                            </div>
                          ) : senderEmails[getSenderKey(sender)]?.length > 0 ? (
                            senderEmails[getSenderKey(sender)].map(email => (
                              <div key={email.id} className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 group hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer">
                                <div className="flex items-start justify-between gap-3">
                                  <div
                                    className="flex-1 min-w-0"
                                    onClick={() => setViewingEmail({ messageId: email.id, accountEmail: sender.accountEmail, senderEmail: sender.email, senderName: sender.name })}
                                  >
                                    <div className="flex items-center gap-2">
                                      {email.isUnread && <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />}
                                      <span className={`text-sm truncate ${email.isUnread ? 'font-semibold' : ''}`}>
                                        {email.subject}
                                      </span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">{email.snippet}</p>
                                    <div className="text-xs text-gray-400 mt-1">
                                      {new Date(email.date).toLocaleDateString('en-US', { timeZone: 'UTC' })}
                                    </div>
                                  </div>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteSingleEmail(email, sender.email, sender.name); }}
                                    disabled={deletingEmailId === email.id}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all flex-shrink-0"
                                    title="Delete email"
                                  >
                                    {deletingEmailId === email.id ? (
                                      <RefreshCw className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-4 h-4" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-2 text-sm text-gray-500">
                              No emails found
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Unsubscribe View - Only senders with unsubscribe option, expandable */}
            {!sendersLoading && !syncing && senders.length > 0 && selectedTool === 'unsubscribe' && (
              <div className="px-4 py-3 space-y-3">
                {unsubscribableSenders.length === 0 ? (
                  <div className="text-center py-12">
                    <BellOff className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No newsletters found</h3>
                    <p className="text-gray-500">
                      No senders with unsubscribe options were found in your emails.
                    </p>
                  </div>
                ) : (
                  filterPendingBulkDeletions(filterAndSortSenders(unsubscribableSenders)).map(sender => (
                    <div key={sender.id} className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                      <div className="px-5 py-4 flex items-center justify-between">
                        <button
                          className="flex items-center flex-1 text-left"
                          onClick={() => toggleSenderExpand(sender, sender.accountEmail)}
                        >
                          {expandedSenders.includes(getSenderKey(sender)) ? (
                            <ChevronUpIcon className="h-5 w-5 text-gray-400 mr-3" />
                          ) : (
                            <ChevronDownIcon className="h-5 w-5 text-gray-400 mr-3" />
                          )}
                          <SenderAvatar sender={sender} />
                          <div className="flex-1 ml-4">
                            <div className="flex items-center">
                              <span className="text-base font-medium text-gray-900">{sender.name}</span>
                              <span className="ml-3 px-2.5 py-0.5 text-sm bg-gray-100 text-gray-600 rounded-full">{sender.emailCount} emails</span>
                              {sender.isNewsletter && (
                                <span className="ml-2 px-2.5 py-0.5 text-sm bg-blue-100 text-blue-700 rounded-full">
                                  Newsletter
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500 mt-0.5">{sender.email}</div>
                          </div>
                        </button>
                        <button
                          className="px-5 py-2.5 text-sm font-medium text-white bg-purple-500 hover:bg-purple-600 rounded-lg transition-colors"
                          onClick={() => handleCleanupAction('unsubscribe', [sender])}
                        >
                          Unsubscribe
                        </button>
                      </div>
                      {expandedSenders.includes(getSenderKey(sender)) && (
                        <div className="bg-gray-50 px-4 py-3 border-t border-gray-100">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-xs text-gray-500">
                              Emails from this sender ({sender.emailCount} total):
                            </div>
                            <div className="flex gap-2">
                              <button
                                className="px-2 py-1 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded"
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
                          <div className="space-y-2 max-h-80 overflow-y-auto">
                            {loadingEmails === getSenderKey(sender) ? (
                              <div className="flex items-center justify-center py-4">
                                <RefreshCw className="w-5 h-5 animate-spin text-gray-400 mr-2" />
                                <span className="text-sm text-gray-500">Loading emails...</span>
                              </div>
                            ) : senderEmails[getSenderKey(sender)]?.length > 0 ? (
                              senderEmails[getSenderKey(sender)].map(email => (
                                <div key={email.id} className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 group hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer">
                                  <div className="flex items-start justify-between gap-3">
                                    <div
                                      className="flex-1 min-w-0"
                                      onClick={() => setViewingEmail({ messageId: email.id, accountEmail: sender.accountEmail, senderEmail: sender.email, senderName: sender.name })}
                                    >
                                      <div className="flex items-center gap-2">
                                        {email.isUnread && (
                                          <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                                        )}
                                        <span className={`text-sm truncate ${email.isUnread ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                                          {email.subject}
                                        </span>
                                      </div>
                                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                        {email.snippet}
                                      </p>
                                      <div className="text-xs text-gray-400 mt-1">
                                        {new Date(email.date).toLocaleDateString('en-US', { timeZone: 'UTC' })} at {new Date(email.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}
                                      </div>
                                    </div>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleDeleteSingleEmail(email, sender.email, sender.name); }}
                                      disabled={deletingEmailId === email.id}
                                      className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all flex-shrink-0"
                                      title="Delete email"
                                    >
                                      {deletingEmailId === email.id ? (
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <Trash2 className="w-4 h-4" />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="text-center py-4 text-sm text-gray-500">
                                No emails found. Try syncing your emails.
                              </div>
                            )}
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
              <div className="px-4 py-3 space-y-3">
                {filterPendingBulkDeletions(filterAndSortSenders(senders)).map(sender => (
                  <div key={sender.id} className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                    <div className="px-5 py-4 flex items-center justify-between">
                      <div className="flex items-center flex-1">
                        <input
                          type="checkbox"
                          className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mr-4"
                          checked={selectedSenderKeys.includes(getSenderKey(sender))}
                          onChange={() => toggleSenderSelection(sender)}
                        />
                        <SenderAvatar sender={sender} />
                        <div className="flex-1 ml-4">
                          <div className="flex items-center">
                            <span className="text-base font-medium text-gray-900">{sender.name}</span>
                            <span className="ml-3 px-2.5 py-0.5 text-sm bg-gray-100 text-gray-600 rounded-full">{sender.emailCount} emails</span>
                          </div>
                          <div className="text-sm text-gray-500 mt-0.5">{sender.email}</div>
                        </div>
                        <div className="text-sm text-gray-400 mr-4">
                          Last: {new Date(sender.lastEmailDate).toLocaleDateString('en-US', { timeZone: 'UTC' })}
                        </div>
                      </div>
                      <button
                        className="px-5 py-2.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
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
            {!sendersLoading && !syncing && senders.length > 0 && selectedTool === 'top-senders' && (() => {
              const topSenders = filterPendingBulkDeletions([...senders].sort((a, b) => b.emailCount - a.emailCount)).slice(0, 20);
              const maxEmailCount = topSenders[0]?.emailCount || 1;
              return (
                <div className="px-4 py-3 space-y-3">
                  {topSenders.map((sender, index) => (
                    <div key={sender.id} className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                      <div className="px-5 py-4 flex items-center justify-between">
                        <div className="flex items-center flex-1">
                          <span className="w-8 text-base font-semibold text-gray-400 mr-3">#{index + 1}</span>
                          <SenderAvatar sender={sender} />
                          <div className="flex-1 ml-4">
                            <div className="flex items-center">
                              <span className="text-base font-medium text-gray-900">{sender.name}</span>
                              {sender.isNewsletter && (
                                <span className="ml-2 px-2.5 py-0.5 text-sm bg-blue-100 text-blue-700 rounded-full">
                                  Newsletter
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500 mt-0.5">{sender.email}</div>
                          </div>
                          <div className="flex items-center mr-4">
                            <div className="w-32 bg-gray-200 rounded-full h-2.5 mr-3">
                              <div
                                className="bg-gradient-to-r from-amber-400 to-orange-500 h-2.5 rounded-full"
                                style={{ width: `${Math.min((sender.emailCount / maxEmailCount) * 100, 100)}%` }}
                              />
                            </div>
                            <span className="text-base font-semibold text-gray-700">{sender.emailCount}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      </section>

      {/* Undo Toasts (stacked) */}
      {undoActions.map((action, index) => (
        <UndoToast
          key={action.id}
          action={action}
          onUndo={() => handleUndo(action.id)}
          onDismiss={() => executePendingDeletion(action.id)}
          stackIndex={index}
        />
      ))}

      {/* Animation styles */}
      <style>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default EmailCleanup;
