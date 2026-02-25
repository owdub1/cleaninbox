import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDownIcon,
  RefreshCw,
  Mail,
  ArrowLeft,
  Check,
  Gift,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDashboardData } from '../hooks/useDashboardData';
import { useGmailConnection } from '../hooks/useGmailConnection';
import { useEmailSenders, Sender, EmailMessage } from '../hooks/useEmailSenders';
import { useCleanupActions, CleanupError } from '../hooks/useCleanupActions';
import { useOutlookConnection } from '../hooks/useOutlookConnection';
import { useSubscription } from '../hooks/useSubscription';
import CleanupConfirmModal from '../components/email/CleanupConfirmModal';
import EmailViewModal from '../components/email/EmailViewModal';
import { fetchWithAuth } from '../lib/api';

// Extracted components
import {
  UndoAction,
  PendingDeletion,
  getSenderKey,
  filterAndSortSenders,
  getSendersByTimePeriod,
  filterPendingBulkDeletions,
} from '../components/email/cleanup/emailCleanupUtils';
import SenderSkeleton from '../components/email/cleanup/SenderSkeleton';
import UndoToast from '../components/email/cleanup/UndoToast';
import UpgradeModal from '../components/email/cleanup/UpgradeModal';
import SearchAndFilterBar from '../components/email/cleanup/SearchAndFilterBar';
import OnboardingView from '../components/email/cleanup/OnboardingView';
import ToolsSelectionView from '../components/email/cleanup/ToolsSelectionView';
import { cleanupTools } from '../components/email/cleanup/ToolsSelectionView';
import DeleteView from '../components/email/cleanup/DeleteView';
import UnsubscribeView from '../components/email/cleanup/UnsubscribeView';
import ArchiveView from '../components/email/cleanup/ArchiveView';
import TopSendersView from '../components/email/cleanup/TopSendersView';

const FREE_TRIAL_LIMIT = 5;

const EmailCleanup = () => {
  const { isAuthenticated, user, refreshToken } = useAuth();
  const { emailAccounts, loading: dashboardLoading } = useDashboardData();
  const navigate = useNavigate();

  const { subscription, isPaid, isUnlimited, loading: subscriptionLoading } = useSubscription();

  const shouldStartWithTools = isPaid && emailAccounts && emailAccounts.length > 0;
  const [currentView, setCurrentView] = useState<'onboarding' | 'tools' | 'cleanup'>(
    shouldStartWithTools ? 'tools' : 'onboarding'
  );
  const [viewInitialized, setViewInitialized] = useState(false);

  useEffect(() => {
    if (!viewInitialized && !subscriptionLoading && !dashboardLoading) {
      if (currentView !== 'cleanup') {
        if (isPaid && emailAccounts && emailAccounts.length > 0) {
          setCurrentView('tools');
        } else if (!isPaid || !emailAccounts || emailAccounts.length === 0) {
          setCurrentView('onboarding');
        }
      }
      setViewInitialized(true);
    }
  }, [isPaid, emailAccounts, subscriptionLoading, dashboardLoading, viewInitialized, currentView]);

  const isLoadingInitialView = isAuthenticated && (subscriptionLoading || dashboardLoading) && !viewInitialized;

  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [expandedSenders, setExpandedSenders] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [selectedSenderKeys, setSelectedSenderKeys] = useState<string[]>([]);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [selectedAccountEmail, setSelectedAccountEmail] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    action: 'delete' | 'archive' | 'unsubscribe';
    senders: Sender[];
  }>({ isOpen: false, action: 'delete', senders: [] });

  const { handleOAuthCallback, clearCallbackParams, connectGmail } = useGmailConnection();
  const { connectOutlook } = useOutlookConnection();

  const handleConnectGmail = async () => {
    try {
      const authUrl = await connectGmail();
      if (authUrl) {
        window.location.href = authUrl;
      } else {
        setNotification({ type: 'error', message: 'Failed to get Gmail authorization URL. Please try again.' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to connect Gmail' });
    }
  };

  const handleConnectOutlook = async () => {
    try {
      const authUrl = await connectOutlook();
      if (authUrl) {
        window.location.href = authUrl;
      } else {
        setNotification({ type: 'error', message: 'Failed to get Outlook authorization URL. Please try again.' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to connect Outlook' });
    }
  };

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
    updateSenderLastEmailDate,
    removeSenders
  } = useEmailSenders({ autoFetch: true });

  const [senderEmails, setSenderEmails] = useState<Record<string, EmailMessage[]>>({});
  const [deletingEmailId, setDeletingEmailId] = useState<string | null>(null);
  const [undoActions, setUndoActions] = useState<UndoAction[]>([]);
  const [pendingDeletions, setPendingDeletions] = useState<Map<string, PendingDeletion>>(new Map());
  const pendingDeletionsRef = useRef<Map<string, PendingDeletion>>(new Map());
  const [loadingEmails, setLoadingEmails] = useState<string | null>(null);
  const [viewingEmail, setViewingEmail] = useState<{ messageId: string; accountEmail: string; senderEmail: string; senderName: string } | null>(null);

  const { deleteSingleEmail, deleteEmails, archiveEmails, unsubscribe, loading: cleanupLoading } = useCleanupActions();

  // Free trial tracking
  const sessionKey = 'cleaninbox_free_actions_optimistic';
  const [freeActionsUsed, setFreeActionsUsedRaw] = useState(() => {
    const cached = sessionStorage.getItem(sessionKey);
    return cached ? parseInt(cached, 10) : 0;
  });
  const [freeActionsLoaded, setFreeActionsLoaded] = useState(false);

  const setFreeActionsUsed = (value: number | ((prev: number) => number)) => {
    setFreeActionsUsedRaw(prev => {
      const next = typeof value === 'function' ? value(prev) : value;
      sessionStorage.setItem(sessionKey, String(next));
      return next;
    });
  };

  useEffect(() => {
    if (!isAuthenticated || freeActionsLoaded) return;
    fetchWithAuth('/api/user/free-actions', { method: 'GET' }, refreshToken)
      .then(r => r.json())
      .then(data => {
        if (data.isPaid) {
          setFreeActionsUsed(0);
        } else {
          const serverUsed = data.used ?? 0;
          const cachedUsed = parseInt(sessionStorage.getItem(sessionKey) || '0', 10);
          setFreeActionsUsed(Math.max(serverUsed, cachedUsed));
        }
        setFreeActionsLoaded(true);
      })
      .catch(() => setFreeActionsLoaded(true));
  }, [isAuthenticated, freeActionsLoaded]);

  const freeActionsRemaining = FREE_TRIAL_LIMIT - freeActionsUsed;
  const hasFreeTries = freeActionsRemaining > 0;
  const hasPaidPlan = isPaid;

  // Connected accounts
  const connectedGmailAccounts = emailAccounts?.filter(
    (acc: any) => (acc.provider === 'Gmail' || acc.provider === 'Outlook') && acc.connection_status === 'connected'
  ) || [];

  useEffect(() => {
    if (connectedGmailAccounts.length > 0 && !selectedAccountEmail) {
      setSelectedAccountEmail(connectedGmailAccounts[0].email);
    }
  }, [connectedGmailAccounts, selectedAccountEmail]);

  const connectedGmailAccount = selectedAccountEmail
    ? emailAccounts?.find((acc: any) => acc.email === selectedAccountEmail && acc.connection_status === 'connected')
    : connectedGmailAccounts[0];

  const anyGmailAccount = emailAccounts?.find(
    (acc: any) => acc.provider === 'Gmail' || acc.provider === 'Outlook' || acc.email?.includes('gmail')
  );

  // Auto-sync
  const [hasAutoSynced, setHasAutoSynced] = useState(false);
  useEffect(() => {
    const accountToSync = connectedGmailAccount || anyGmailAccount;
    if (currentView === 'cleanup' && accountToSync && !sendersLoading && !syncing && senders.length === 0 && !hasAutoSynced && !sendersError) {
      setHasAutoSynced(true);
      syncEmails(accountToSync.email);
    }
  }, [currentView, connectedGmailAccount, anyGmailAccount, sendersLoading, syncing, senders.length, hasAutoSynced, sendersError, syncEmails]);

  const hasEmailConnected = emailAccounts && emailAccounts.length > 0;

  // OAuth callback
  useEffect(() => {
    const result = handleOAuthCallback();
    if (result.success && result.email) {
      clearCallbackParams();
      syncEmails(result.email);
    } else if (result.error) {
      setNotification({ type: 'error', message: result.error });
      clearCallbackParams();
    }
  }, []);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    if (sendersError && isAuthenticated && sendersError !== 'Authentication required') {
      setNotification({ type: 'error', message: sendersError });
    }
  }, [sendersError, isAuthenticated]);

  useEffect(() => {
    pendingDeletionsRef.current = pendingDeletions;
  }, [pendingDeletions]);

  // Cleanup pending deletions on unmount
  useEffect(() => {
    return () => {
      pendingDeletionsRef.current.forEach((pending) => {
        clearTimeout(pending.timeoutId);
        if (connectedGmailAccount) {
          if (pending.type === 'single' && pending.email && pending.senderEmail) {
            deleteSingleEmail(connectedGmailAccount.email, pending.email.id, pending.senderEmail);
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
    return 3;
  };
  const currentStep = getCurrentStep();

  const handleToolSelect = (toolId: string) => {
    if (!hasPaidPlan && toolId !== 'delete') {
      navigate('/checkout');
      return;
    }
    setSelectedTool(toolId);
    setCurrentView('cleanup');
    if (toolId === 'archive') {
      setSortBy('count');
      setSortDirection('desc');
    } else {
      setSortBy('date');
      setSortDirection('desc');
    }
  };

  const handleBackToTools = () => {
    setCurrentView('tools');
    setSelectedTool(null);
  };

  const handleSync = async () => {
    const accountToSync = connectedGmailAccount || anyGmailAccount;
    if (accountToSync) {
      try {
        const result = await syncEmails(accountToSync.email);
        if (result.success) {
          setSenderEmails({});
          setExpandedSenders([]);
          // Success syncs are silent — no notification needed
        } else if (result.limitReached) {
          const message = result.upgradeMessage
            ? `${sendersError}. ${result.upgradeMessage}`
            : sendersError || 'Sync limit reached.';
          setNotification({ type: 'error', message });
        } else {
          const provider = accountToSync.provider === 'Outlook' ? 'Outlook' : 'Gmail';
          const errorDetail = sendersError && sendersError !== 'Authentication required' ? sendersError : `Your ${provider} may need to be reconnected.`;
          setNotification({ type: 'error', message: `Failed to sync emails. ${errorDetail}` });
        }
      } catch (err: any) {
        setNotification({ type: 'error', message: `Sync error: ${err.message}` });
      }
    } else {
      setNotification({ type: 'error', message: 'No email account found. Please connect your email first.' });
    }
  };

  const handleCleanupAction = (action: 'delete' | 'archive' | 'unsubscribe', senderList: Sender[]) => {
    if (!hasPaidPlan && !hasFreeTries) {
      setShowUpgradeModal(true);
      return;
    }
    if (!hasPaidPlan) {
      const totalEmails = senderList.reduce((sum, s) => sum + s.emailCount, 0);
      if (totalEmails > freeActionsRemaining) {
        setNotification({ type: 'error', message: `Not enough free actions. This requires ${totalEmails} but you have ${freeActionsRemaining} left. Upgrade for unlimited cleanup.` });
        return;
      }
    }
    setConfirmModal({ isOpen: true, action, senders: senderList });
  };

  const executeCleanupAction = async () => {
    if (!connectedGmailAccount) return;

    const { action, senders: actionSenders } = confirmModal;
    const senderEmailsList = actionSenders.map(s => s.email);
    const senderNamesList = actionSenders.map(s => s.name);

    if (action === 'unsubscribe') {
      try {
        if (actionSenders.length === 1) {
          const result = await unsubscribe(
            connectedGmailAccount.email,
            actionSenders[0].email,
            actionSenders[0].unsubscribeLink || undefined,
            actionSenders[0].hasOneClickUnsubscribe
          );
          if (result?.success) {
            if (result.freeTrialRemaining !== undefined && !hasPaidPlan) {
              setFreeActionsUsed(FREE_TRIAL_LIMIT - result.freeTrialRemaining);
            }
            fetchSenders();
            setSelectedSenderKeys([]);
          } else if (result?.linkExpired) {
            setNotification({ type: 'error', message: result.message || 'This unsubscribe link has expired or is no longer valid.' });
          } else if (result?.requiresManualAction) {
            if (result.unsubscribeLink) {
              window.open(result.unsubscribeLink, '_blank');
            }
          }
        }
      } catch (error: any) {
        if (error instanceof CleanupError && error.code === 'PAYMENT_PAST_DUE') {
          setNotification({ type: 'error', message: 'Your payment failed. Please update your payment method in your Dashboard to continue.' });
        } else if (error instanceof CleanupError && error.code === 'FREE_TRIAL_EXCEEDED') {
          if (error.freeTrialRemaining !== undefined) {
            setFreeActionsUsed(FREE_TRIAL_LIMIT - error.freeTrialRemaining);
          }
          setShowUpgradeModal(true);
        } else {
          setNotification({ type: 'error', message: error.message || 'Action failed' });
        }
      }
      setConfirmModal({ isOpen: false, action: 'delete', senders: [] });
      return;
    }

    // Deferred delete/archive with undo
    const totalCount = actionSenders.reduce((sum, s) => sum + s.emailCount, 0);
    const actionId = `bulk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const timeoutId = setTimeout(() => {
      executePendingDeletion(actionId);
    }, 4000);

    const newPendingDeletion: PendingDeletion = {
      id: actionId,
      type: 'bulk',
      action,
      senders: [...actionSenders],
      senderEmails: senderEmailsList,
      senderNames: senderNamesList,
      timeoutId
    };

    setPendingDeletions(prev => new Map(prev).set(actionId, newPendingDeletion));
    setUndoActions(prev => [...prev, { id: actionId, type: action, count: totalCount, senderEmails: senderEmailsList, timestamp: Date.now() }]);

    if (!hasPaidPlan) {
      setFreeActionsUsed(prev => prev + totalCount);
    }

    setSelectedSenderKeys([]);
    setConfirmModal({ isOpen: false, action: 'delete', senders: [] });
  };

  const executePendingDeletion = async (actionId: string) => {
    const pending = pendingDeletionsRef.current.get(actionId);
    setUndoActions(prev => prev.filter(a => a.id !== actionId));

    if (!pending || !connectedGmailAccount) {
      setPendingDeletions(prev => { const m = new Map(prev); m.delete(actionId); return m; });
      return;
    }

    try {
      let result: any = null;
      if (pending.type === 'single' && pending.email && pending.senderEmail) {
        result = await deleteSingleEmail(connectedGmailAccount.email, pending.email.id, pending.senderEmail);
      } else if (pending.type === 'bulk' && pending.senderEmails && pending.senderNames) {
        if (pending.action === 'delete') {
          result = await deleteEmails(connectedGmailAccount.email, pending.senderEmails, pending.senderNames);
        } else if (pending.action === 'archive') {
          result = await archiveEmails(connectedGmailAccount.email, pending.senderEmails, pending.senderNames);
        }
        if (pending.senders) {
          const senderKeys = pending.senders.map(s => ({ email: s.email, name: s.name }));
          removeSenders(senderKeys);
          const keysToRemove = pending.senders.map(s => `${s.name}|||${s.email}`);
          setSenderEmails(prev => {
            const updated = { ...prev };
            keysToRemove.forEach(key => delete updated[key]);
            return updated;
          });
        }
      }
      if (result?.freeTrialRemaining !== undefined && !hasPaidPlan) {
        setFreeActionsUsed(FREE_TRIAL_LIMIT - result.freeTrialRemaining);
      }
    } catch (error) {
      if (error instanceof CleanupError && error.code === 'PAYMENT_PAST_DUE') {
        setNotification({ type: 'error', message: 'Your payment failed. Please update your payment method in your Dashboard to continue.' });
      } else if (error instanceof CleanupError && error.code === 'FREE_TRIAL_EXCEEDED') {
        if (error.freeTrialRemaining !== undefined) setFreeActionsUsed(FREE_TRIAL_LIMIT - error.freeTrialRemaining);
        setShowUpgradeModal(true);
      } else {
        setNotification({ type: 'error', message: 'Failed to complete action' });
      }
      fetchSenders();
    }

    setPendingDeletions(prev => { const m = new Map(prev); m.delete(actionId); return m; });
  };

  const handleDeleteSingleEmail = (email: EmailMessage, senderEmail: string, senderName: string) => {
    if (!connectedGmailAccount) return;
    if (!hasPaidPlan && !hasFreeTries) { setShowUpgradeModal(true); return; }

    const senderKey = `${senderName}|||${senderEmail}`;
    const originalEmails = senderEmails[senderKey] || [];
    const currentSender = senders.find(s => s.email === senderEmail && s.name === senderName);
    const remainingEmails = originalEmails.filter(e => e.id !== email.id);
    setSenderEmails(prev => ({ ...prev, [senderKey]: remainingEmails }));

    if (remainingEmails.length > 0) {
      const sorted = [...remainingEmails].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      updateSenderLastEmailDate(senderEmail, senderName, sorted[0].date);
    }
    updateSenderCount(senderEmail, senderName, -1);

    const actionId = `single-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timeoutId = setTimeout(() => executePendingDeletion(actionId), 4000);

    const newPending: PendingDeletion = {
      id: actionId, type: 'single', action: 'delete', email, senderEmail, senderName, senderKey,
      originalEmails, originalSenderCount: currentSender?.emailCount, originalLastEmailDate: currentSender?.lastEmailDate, timeoutId
    };

    setPendingDeletions(prev => new Map(prev).set(actionId, newPending));
    setUndoActions(prev => [...prev, { id: actionId, type: 'delete', count: 1, senderEmails: [senderEmail], messageIds: [email.id], timestamp: Date.now() }]);
    if (!hasPaidPlan) setFreeActionsUsed(prev => prev + 1);
  };

  const handleUndo = (actionId: string) => {
    const pd = pendingDeletions.get(actionId);
    if (!pd) { setUndoActions(prev => prev.filter(a => a.id !== actionId)); return; }

    clearTimeout(pd.timeoutId);
    if (pd.type === 'single' && pd.senderKey) {
      const restored = pd.originalEmails || [];
      setSenderEmails(prev => ({ ...prev, [pd.senderKey!]: restored }));
      if (pd.senderEmail && pd.senderName) {
        updateSenderCount(pd.senderEmail, pd.senderName, 1);
        if (restored.length > 0) {
          const sorted = [...restored].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          updateSenderLastEmailDate(pd.senderEmail, pd.senderName, sorted[0].date);
        }
      }
      if (!hasPaidPlan) setFreeActionsUsed(prev => Math.max(0, prev - 1));
    } else if (pd.type === 'bulk') {
      if (!hasPaidPlan && pd.senders) {
        const count = pd.senders.reduce((sum, s) => sum + s.emailCount, 0);
        setFreeActionsUsed(prev => Math.max(0, prev - count));
      }
    }
    setPendingDeletions(prev => { const m = new Map(prev); m.delete(actionId); return m; });
    setUndoActions(prev => prev.filter(a => a.id !== actionId));
  };

  // Derived data helpers
  const doFilterAndSort = (list: Sender[], overrideSort?: { by: string; direction: string }) =>
    filterAndSortSenders(list, searchTerm, sortBy, sortDirection, selectedAccountEmail, connectedGmailAccounts.length > 1, overrideSort);

  const doFilterPending = (list: Sender[]) => filterPendingBulkDeletions(list, pendingDeletions);

  const handleSelectAll = () => {
    const visible = doFilterAndSort(senders);
    if (selectedSenderKeys.length === visible.length) {
      setSelectedSenderKeys([]);
    } else {
      setSelectedSenderKeys(visible.map(s => getSenderKey(s)));
    }
  };

  const toggleSenderExpand = async (sender: Sender) => {
    const key = getSenderKey(sender);
    if (expandedSenders.includes(key)) {
      setExpandedSenders(expandedSenders.filter(s => s !== key));
    } else {
      setExpandedSenders([...expandedSenders, key]);
      if (sender.accountEmail) {
        setLoadingEmails(key);
        const emails = await fetchEmailsBySender(sender.email, sender.accountEmail, 50, sender.name);
        setSenderEmails(prev => ({ ...prev, [key]: emails }));
        setLoadingEmails(null);
      }
    }
  };

  const toggleSortDirection = () => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
  const handleSortChange = (value: string) => {
    if (sortBy === value) { toggleSortDirection(); } else { setSortBy(value); setSortDirection('desc'); }
  };
  const toggleSenderSelection = (sender: Sender) => {
    const key = getSenderKey(sender);
    setSelectedSenderKeys(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };
  const getSelectedSenders = (): Sender[] => senders.filter(s => selectedSenderKeys.includes(getSenderKey(s)));

  const handleViewEmail = (messageId: string, accountEmail: string, senderEmail: string, senderName: string) => {
    setViewingEmail({ messageId, accountEmail, senderEmail, senderName });
  };

  // --- RENDER ---

  if (isLoadingInitialView) {
    return (
      <div className="w-full min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-gray-950 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  const shouldShowOnboarding = (!isAuthenticated || !dashboardLoading) && (currentStep < 3 || (currentStep === 3 && currentView === 'onboarding' && !hasPaidPlan));
  if (shouldShowOnboarding) {
    return (
      <OnboardingView
        currentStep={currentStep}
        freeActionsRemaining={freeActionsRemaining}
        freeActionsUsed={freeActionsUsed}
        notification={notification}
        onConnectGmail={handleConnectGmail}
        onConnectOutlook={handleConnectOutlook}
        onStartCleaning={() => setCurrentView('tools')}
      />
    );
  }

  if (currentView === 'tools') {
    return (
      <ToolsSelectionView
        hasPaidPlan={hasPaidPlan}
        subscriptionLoading={subscriptionLoading}
        freeActionsRemaining={freeActionsRemaining}
        notification={notification}
        onToolSelect={handleToolSelect}
      />
    );
  }

  // Cleanup interface
  const selectedToolData = cleanupTools.find(t => t.id === selectedTool);
  const unsubscribableSenders = senders.filter(s => s.hasUnsubscribe && s.emailCount > 0);

  // Compute filtered senders for each view
  const timePeriodGroups = getSendersByTimePeriod(senders).map(g => ({
    ...g,
    senders: doFilterPending(doFilterAndSort(g.senders)),
  })).filter(g => g.senders.length > 0);

  const flatDeleteSenders = doFilterPending(doFilterAndSort(senders));
  const filteredUnsubscribable = doFilterPending(doFilterAndSort(unsubscribableSenders));
  const filteredArchiveSenders = doFilterPending(doFilterAndSort(senders));

  return (
    <div className="w-full bg-white dark:bg-gray-900">
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

      <EmailViewModal
        isOpen={!!viewingEmail}
        onClose={() => setViewingEmail(null)}
        messageId={viewingEmail?.messageId || ''}
        accountEmail={viewingEmail?.accountEmail || ''}
        onDelete={viewingEmail ? () => {
          const senderKey = `${viewingEmail.senderName}|||${viewingEmail.senderEmail}`;
          const email = senderEmails[senderKey]?.find(e => e.id === viewingEmail.messageId);
          if (email) handleDeleteSingleEmail(email, viewingEmail.senderEmail, viewingEmail.senderName);
        } : undefined}
      />

      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {notification.message}
          </div>
        </div>
      )}

      <section className="pt-10 pb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {!hasPaidPlan && (
            <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Gift className="w-5 h-5 text-amber-600 dark:text-amber-400 mr-3" />
                  <span className="text-amber-800 dark:text-amber-300">
                    <span className="font-semibold">{freeActionsRemaining} free actions</span> remaining
                  </span>
                </div>
                <button onClick={() => navigate('/checkout')} className="text-sm font-medium text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 underline">
                  Upgrade for unlimited
                </button>
              </div>
            </div>
          )}

          <div className="mb-6">
            <button onClick={handleBackToTools} className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Cleanup Tools
            </button>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{selectedToolData?.title || 'Email Cleanup'}</h1>
                <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">{selectedToolData?.description || 'Organize and clean your inbox by year and sender'}</p>
              </div>
              <div className="flex items-center gap-3">
                {connectedGmailAccounts.length > 1 && (
                  <div className="relative">
                    <select
                      value={selectedAccountEmail || ''}
                      onChange={(e) => setSelectedAccountEmail(e.target.value)}
                      className="appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 pr-10 text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer"
                    >
                      {connectedGmailAccounts.map((account: any) => (
                        <option key={account.id} value={account.email}>{account.email}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                      <ChevronDownIcon className="h-4 w-4" />
                    </div>
                  </div>
                )}
                {connectedGmailAccount && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSync()}
                      disabled={syncing}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 transition-colors"
                    >
                      <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                      {syncing ? 'Syncing...' : 'Sync Now'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <SearchAndFilterBar
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              sortBy={sortBy}
              sortDirection={sortDirection}
              onSortChange={handleSortChange}
              onToggleSortDirection={toggleSortDirection}
              selectedCount={selectedSenderKeys.length}
              totalVisible={doFilterAndSort(senders).length}
              onSelectAll={handleSelectAll}
              onArchiveSelected={() => handleCleanupAction('archive', getSelectedSenders())}
              onDeleteSelected={() => handleCleanupAction('delete', getSelectedSenders())}
              selectedTool={selectedTool}
            />

            {/* Loading/Syncing state */}
            {(sendersLoading || syncing) && senders.length === 0 && (
              <div className="px-4 py-3 space-y-3">
                {syncing && (
                  <div className="flex items-center justify-center py-4 mb-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-indigo-600 mr-2" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Syncing your emails...</span>
                  </div>
                )}
                {[...Array(6)].map((_, i) => <SenderSkeleton key={i} />)}
              </div>
            )}

            {/* Empty state */}
            {!sendersLoading && !syncing && senders.length === 0 && (
              <div className="text-center py-12">
                <Mail className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">No emails found</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  {connectedGmailAccount
                    ? 'Click "Sync Emails" to fetch your email senders.'
                    : anyGmailAccount
                    ? 'Your email account may need to be reconnected. Try syncing or reconnect in Dashboard.'
                    : 'Connect your email account to get started.'}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  {(connectedGmailAccount || anyGmailAccount) && (
                    <button onClick={() => handleSync()} disabled={syncing} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                      <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} /> Sync Emails
                    </button>
                  )}
                  <button onClick={handleConnectGmail} className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
                    <Mail className="w-4 h-4" /> {connectedGmailAccount ? 'Reconnect Email' : 'Connect Email'}
                  </button>
                </div>
              </div>
            )}

            {/* Tool-specific views */}
            {!sendersLoading && senders.length > 0 && selectedTool === 'delete' && (
              <DeleteView
                sortBy={sortBy}
                sendersByTimePeriod={timePeriodGroups}
                flatSenders={flatDeleteSenders}
                selectedSenderKeys={selectedSenderKeys}
                expandedSenders={expandedSenders}
                senderEmails={senderEmails}
                loadingEmails={loadingEmails}
                deletingEmailId={deletingEmailId}
                onToggleSenderExpand={toggleSenderExpand}
                onToggleSenderSelection={toggleSenderSelection}
                onDeleteSingleEmail={handleDeleteSingleEmail}
                onViewEmail={handleViewEmail}
                onCleanupAction={handleCleanupAction}
              />
            )}

            {!sendersLoading && senders.length > 0 && selectedTool === 'unsubscribe' && (
              <UnsubscribeView
                senders={filteredUnsubscribable}
                expandedSenders={expandedSenders}
                senderEmails={senderEmails}
                loadingEmails={loadingEmails}
                deletingEmailId={deletingEmailId}
                onToggleSenderExpand={toggleSenderExpand}
                onDeleteSingleEmail={handleDeleteSingleEmail}
                onViewEmail={handleViewEmail}
                onCleanupAction={handleCleanupAction}
              />
            )}

            {!sendersLoading && senders.length > 0 && selectedTool === 'archive' && (
              <ArchiveView
                senders={filteredArchiveSenders}
                selectedSenderKeys={selectedSenderKeys}
                onToggleSenderSelection={toggleSenderSelection}
                onCleanupAction={handleCleanupAction}
              />
            )}

            {!sendersLoading && senders.length > 0 && selectedTool === 'top-senders' && (
              <TopSendersView senders={doFilterPending(senders)} />
            )}
          </div>
        </div>
      </section>

      {/* Undo Toasts */}
      {undoActions.map((action, index) => (
        <UndoToast
          key={action.id}
          action={action}
          onUndo={() => handleUndo(action.id)}
          onDismiss={() => executePendingDeletion(action.id)}
          stackIndex={index}
        />
      ))}

      <style>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .animate-slide-up { animation: slide-up 0.3s ease-out; }
      `}</style>
    </div>
  );
};

export default EmailCleanup;
