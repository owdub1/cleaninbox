import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarIcon, MailIcon, AlertCircleIcon, CheckCircleIcon, UserIcon, XIcon, FileTextIcon, InboxIcon, RefreshCwIcon, TrashIcon, PlusIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../lib/api';
import { useDashboardData } from '../hooks/useDashboardData';
import { useEmailAccounts } from '../hooks/useEmailAccounts';
import { useSubscription } from '../hooks/useSubscription';
import { useActivity } from '../hooks/useActivity';
import ConnectEmailModal from '../components/modals/ConnectEmailModal';
const Dashboard = () => {
  const { stats: dbStats, emailAccounts: dbEmailAccounts, loading: statsLoading, refetch: refetchDashboard } = useDashboardData();
  const { addEmailAccount, removeEmailAccount } = useEmailAccounts();
  const { subscription, loading: subscriptionLoading, isPaid, isUnlimited, cancelSubscription, isCancelled } = useSubscription();
  const { activities, loading: activityLoading, formatRelativeTime } = useActivity(5);
  const [activeTab, setActiveTab] = useState('overview');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showEmailLimitModal, setShowEmailLimitModal] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [showConnectEmailModal, setShowConnectEmailModal] = useState(false);
  const [emailToDisconnect, setEmailToDisconnect] = useState(null);
  const [connectedEmails, setConnectedEmails] = useState([]);

  // Update connectedEmails when dbEmailAccounts changes
  useEffect(() => {
    setConnectedEmails(dbEmailAccounts);
  }, [dbEmailAccounts]);

  const navigate = useNavigate();
  const {
    user,
    token,
    updateUser
  } = useAuth();

  // Settings tab state
  const [settingsFirstName, setSettingsFirstName] = useState(user?.firstName || '');
  const [settingsLastName, setSettingsLastName] = useState(user?.lastName || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  // Format date helper
  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Format date with time helper (for sync dates, etc.)
  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'Never';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      // Show relative time for recent dates
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

      // Show full date for older dates
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  // User data from auth and database
  const userData = {
    name: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : 'User',
    email: user?.email || '',
    subscription: {
      plan: subscription.planName,
      status: subscription.status === 'active' ? 'Active' : subscription.status,
      nextBilling: formatDate(subscription.nextBillingDate),
      price: subscription.price === 0 ? '$0' : `$${subscription.price}`,
      period: subscription.period,
      emailLimit: subscription.emailLimit,
      features: subscription.features
    },
    stats: {
      emailsProcessed: dbStats.emailsProcessed,
      unsubscribed: dbStats.unsubscribed,
      deleted: dbStats.deleted,
      emailAccounts: dbStats.emailAccounts
    }
  };
  const handlePlanSwitch = (planId, billing = 'monthly') => {
    navigate(`/checkout?plan=${planId}&billing=${billing}`);
  };
  const handleConnectNewEmail = () => {
    // Check if user has reached their email account limit
    if (connectedEmails.length >= userData.subscription.emailLimit) {
      setShowEmailLimitModal(true);
    } else {
      setShowConnectEmailModal(true);
    }
  };

  const handleConnectEmail = async (email: string, provider: string) => {
    await addEmailAccount(email, provider);
    // The useDashboardData hook will automatically refresh and update connectedEmails
  };
  const handleDisconnectEmail = email => {
    setEmailToDisconnect(email);
    setShowDisconnectModal(true);
  };
  const confirmDisconnectEmail = async () => {
    if (emailToDisconnect) {
      try {
        await removeEmailAccount(emailToDisconnect.id);
        // The useDashboardData hook will automatically refresh and update connectedEmails
        setShowDisconnectModal(false);
        setEmailToDisconnect(null);
      } catch (error: any) {
        alert('Failed to disconnect email account: ' + error.message);
      }
    }
  };
  const isFreeUser = !isPaid;

  const handleSaveSettings = async () => {
    setSettingsError(null);
    setSettingsSuccess(null);

    // Validate password fields if any are filled
    const hasPasswordChange = currentPassword || newPassword || confirmPassword;
    if (hasPasswordChange) {
      if (!currentPassword) {
        setSettingsError('Current password is required to change password');
        return;
      }
      if (!newPassword) {
        setSettingsError('New password is required');
        return;
      }
      if (newPassword !== confirmPassword) {
        setSettingsError('New passwords do not match');
        return;
      }
    }

    // Check if name actually changed
    const nameChanged = settingsFirstName !== (user?.firstName || '') || settingsLastName !== (user?.lastName || '');
    if (!nameChanged && !hasPasswordChange) {
      setSettingsError('No changes to save');
      return;
    }

    setSettingsLoading(true);
    try {
      const body: Record<string, string> = {};
      if (nameChanged) {
        body.firstName = settingsFirstName;
        body.lastName = settingsLastName;
      }
      if (hasPasswordChange) {
        body.currentPassword = currentPassword;
        body.newPassword = newPassword;
      }

      const response = await fetch(`${API_URL}/api/user/update-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      updateUser({
        firstName: data.user.firstName,
        lastName: data.user.lastName
      }, data.token);

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSettingsSuccess(hasPasswordChange ? 'Profile and password updated successfully' : 'Profile updated successfully');
    } catch (error: any) {
      setSettingsError(error.message);
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      setDeleteError('Password is required');
      return;
    }

    setDeleteError(null);
    setDeleteLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/user/delete-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password: deletePassword })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete account');
      }

      localStorage.clear();
      navigate('/');
    } catch (error: any) {
      setDeleteError(error.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  return <div className="w-full bg-white">
      <section className="bg-gradient-to-r from-blue-600 to-purple-700 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
              <p className="mt-2 text-blue-100">
                Welcome back, {userData.name}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Friendly Upgrade Banner for Free Users */}
      {isFreeUser && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-b border-purple-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-start">
                <svg className="w-6 h-6 text-purple-600 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <div>
                  <h3 className="font-semibold text-gray-900">You're on the Free Plan</h3>
                  <p className="text-sm text-gray-600">Upgrade to Pro to connect unlimited email accounts and unlock all features!</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/pricing')}
                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-md font-medium hover:from-purple-700 hover:to-blue-700 transition-colors whitespace-nowrap"
              >
                View Plans
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="py-8 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Dashboard Tabs */}
          <div className="flex border-b border-gray-200 overflow-x-auto">
            <button className={`px-4 py-2 font-medium text-sm ${activeTab === 'overview' ? 'border-b-2 border-gray-500 text-gray-700' : 'text-gray-500 hover:text-gray-700'}`} onClick={() => setActiveTab('overview')}>
              Overview
            </button>
            <button className={`px-4 py-2 font-medium text-sm ${activeTab === 'myemails' ? 'border-b-2 border-gray-500 text-gray-700' : 'text-gray-500 hover:text-gray-700'}`} onClick={() => setActiveTab('myemails')}>
              Email Accounts
            </button>
            <button className={`px-4 py-2 font-medium text-sm ${activeTab === 'subscription' ? 'border-b-2 border-gray-500 text-gray-700' : 'text-gray-500 hover:text-gray-700'}`} onClick={() => setActiveTab('subscription')}>
              Subscription
            </button>
            <button className={`px-4 py-2 font-medium text-sm ${activeTab === 'payments' ? 'border-b-2 border-gray-500 text-gray-700' : 'text-gray-500 hover:text-gray-700'}`} onClick={() => setActiveTab('payments')}>
              Payment History
            </button>
            <button className={`px-4 py-2 font-medium text-sm ${activeTab === 'settings' ? 'border-b-2 border-gray-500 text-gray-700' : 'text-gray-500 hover:text-gray-700'}`} onClick={() => setActiveTab('settings')}>
              Settings
            </button>
          </div>
          {/* Tab Content */}
          <div className="mt-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && <div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                        <MailIcon className="h-6 w-6" />
                      </div>
                      <div className="ml-4">
                        <h3 className="text-lg font-medium text-gray-900">
                          Emails Processed
                        </h3>
                        <p className="text-2xl font-bold text-purple-600">
                          {userData.stats.emailsProcessed}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                        <UserIcon className="h-6 w-6" />
                      </div>
                      <div className="ml-4">
                        <h3 className="text-lg font-medium text-gray-900">
                          Email Accounts
                        </h3>
                        <p className="text-2xl font-bold text-blue-600">
                          {connectedEmails.length}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-8 bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-5 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">
                      Subscription Overview
                    </h3>
                  </div>
                  <div className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-4 border-b border-gray-200">
                      <div>
                        <p className="text-sm text-gray-500">Current Plan</p>
                        <p className="text-lg font-medium text-purple-600">
                          {userData.subscription.plan}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Status</p>
                        <p className="text-sm font-medium bg-green-100 text-green-800 px-2 py-1 rounded-full inline-flex items-center">
                          <CheckCircleIcon className="h-4 w-4 mr-1" />
                          {userData.subscription.status}
                        </p>
                      </div>
                      {userData.subscription.nextBilling && <div>
                        <p className="text-sm text-gray-500">Next Billing</p>
                        <div className="flex items-center">
                          <CalendarIcon className="h-4 w-4 text-gray-400 mr-1" />
                          <p className="text-gray-900">
                            {userData.subscription.nextBilling}
                          </p>
                        </div>
                      </div>}
                      {isPaid && (
                        <div>
                          {isCancelled ? (
                            <span className="inline-flex items-center px-4 py-2 rounded-md font-medium bg-gray-100 text-gray-500">
                              Subscription Cancelled
                            </span>
                          ) : (
                            <button className="bg-red-50 text-red-600 px-4 py-2 rounded-md font-medium hover:bg-red-100 transition-colors" onClick={() => setShowCancelModal(true)}>
                              Cancel Subscription
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="mt-6">
                      <h4 className="text-md font-medium text-gray-900 mb-4">
                        Recent Activity
                      </h4>
                      <div className="space-y-2">
                        {activityLoading ? (
                          <div className="flex items-center justify-center py-4">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
                          </div>
                        ) : activities.length > 0 ? (
                          activities.map((activity) => (
                            <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                                activity.action_type === 'email_sync' ? 'bg-blue-100' :
                                activity.action_type === 'unsubscribe' ? 'bg-green-100' :
                                activity.action_type === 'delete' ? 'bg-red-100' :
                                'bg-purple-100'
                              }`}>
                                {activity.action_type === 'email_sync' ? (
                                  <RefreshCwIcon className="h-4 w-4 text-blue-600" />
                                ) : activity.action_type === 'unsubscribe' ? (
                                  <CheckCircleIcon className="h-4 w-4 text-green-600" />
                                ) : activity.action_type === 'delete' ? (
                                  <TrashIcon className="h-4 w-4 text-red-600" />
                                ) : (
                                  <MailIcon className="h-4 w-4 text-purple-600" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-900">{activity.description}</p>
                                <p className="text-xs text-gray-500 mt-1">{formatRelativeTime(activity.created_at)}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500 text-center py-4">
                            No recent activity
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>}
            {/* Email Accounts Tab (formerly My Emails) */}
            {activeTab === 'myemails' && <div>
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-5 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">
                      Connected Email Accounts
                    </h3>
                  </div>
                  <div className="p-6">
                    <div className="space-y-6">
                      {connectedEmails.map((emailAccount, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-6 border border-gray-100">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                            <div className="mb-4 md:mb-0">
                              <div className="flex items-center">
                                <InboxIcon className="h-5 w-5 text-purple-600 mr-2" />
                                <h4 className="text-lg font-medium text-gray-900">
                                  {emailAccount.email}
                                </h4>
                              </div>
                              <p className="text-sm text-gray-500 mt-1">
                                Provider: {emailAccount.provider} | Last synced: {formatDateTime(emailAccount.lastSynced)}
                              </p>
                            </div>
                            <button className="bg-red-50 text-red-600 px-3 py-1 rounded text-sm font-medium hover:bg-red-100 transition-colors flex items-center" onClick={() => handleDisconnectEmail(emailAccount)}>
                              <TrashIcon className="h-3 w-3 mr-1" />
                              Disconnect
                            </button>
                          </div>
                          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white p-4 rounded-lg shadow-sm">
                              <p className="text-sm text-gray-500">Total Emails</p>
                              <p className="text-xl font-bold text-gray-900">
                                {emailAccount.totalEmails.toLocaleString()}
                              </p>
                            </div>
                            <div className="bg-white p-4 rounded-lg shadow-sm">
                              <p className="text-sm text-gray-500">Processed</p>
                              <p className="text-xl font-bold text-purple-600">
                                {emailAccount.processedEmails.toLocaleString()}
                              </p>
                            </div>
                            <div className="bg-white p-4 rounded-lg shadow-sm">
                              <p className="text-sm text-gray-500">Unsubscribed</p>
                              <p className="text-xl font-bold text-green-600">
                                {emailAccount.unsubscribed.toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Add New Email Account Card */}
                      <button
                        onClick={handleConnectNewEmail}
                        className="w-full bg-gray-50 rounded-lg p-6 border-2 border-dashed border-gray-200 hover:border-purple-400 hover:bg-purple-50 transition-all duration-200 cursor-pointer group"
                      >
                        <div className="flex flex-col items-center justify-center py-8">
                          <div className="w-12 h-12 rounded-full bg-gray-100 group-hover:bg-purple-100 flex items-center justify-center mb-4 transition-colors">
                            <PlusIcon className="h-6 w-6 text-gray-400 group-hover:text-purple-600 transition-colors" />
                          </div>
                          <h4 className="text-lg font-medium text-gray-500 group-hover:text-purple-600 transition-colors">
                            Add Email Account
                          </h4>
                          <p className="text-sm text-gray-400 mt-1">
                            Connect another Gmail account
                          </p>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>}
            {/* Subscription Tab */}
            {activeTab === 'subscription' && <div>
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-5 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">
                      Current Subscription
                    </h3>
                  </div>
                  <div className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-4 border-b border-gray-200">
                      <div>
                        <p className="text-sm text-gray-500">Current Plan</p>
                        <p className="text-lg font-medium text-purple-600">
                          {userData.subscription.plan}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Status</p>
                        <p className="text-sm font-medium bg-green-100 text-green-800 px-2 py-1 rounded-full inline-flex items-center">
                          <CheckCircleIcon className="h-4 w-4 mr-1" />
                          {userData.subscription.status}
                        </p>
                      </div>
                      {userData.subscription.nextBilling && <div>
                        <p className="text-sm text-gray-500">Next Billing</p>
                        <div className="flex items-center">
                          <CalendarIcon className="h-4 w-4 text-gray-400 mr-1" />
                          <p className="text-gray-900">
                            {userData.subscription.nextBilling}
                          </p>
                        </div>
                      </div>}
                      <div>
                        <button className="bg-red-50 text-red-600 px-4 py-2 rounded-md font-medium hover:bg-red-100 transition-colors" onClick={() => setShowCancelModal(true)}>
                          Cancel Subscription
                        </button>
                      </div>
                    </div>
                    <div className="mt-6">
                      <h4 className="text-md font-medium text-gray-900 mb-4">
                        Plan Features
                      </h4>
                      <ul className="space-y-3">
                        {userData.subscription.features?.map((feature, index) => (
                          <li key={index} className="flex items-start">
                            <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="ml-3 text-gray-700">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-8">
                      <h4 className="text-md font-medium text-gray-900 mb-4">
                        Available Plans
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                          { id: 'basic', name: 'Basic', price: '$9.99/month' },
                          { id: 'pro', name: 'Pro', price: '$19.99/month' },
                          { id: 'unlimited', name: 'Unlimited', price: '$39.99/month' }
                        ].map((plan) => {
                          const isCurrent = subscription.plan.toLowerCase() === plan.id;
                          const isUpgrade = !isCurrent && (
                            (subscription.plan.toLowerCase() === 'free') ||
                            (subscription.plan.toLowerCase() === 'basic' && plan.id !== 'basic') ||
                            (subscription.plan.toLowerCase() === 'pro' && plan.id === 'unlimited')
                          );
                          return (
                            <div
                              key={plan.id}
                              className={`rounded-lg p-4 relative ${
                                isCurrent
                                  ? 'border-2 border-purple-400'
                                  : 'border border-gray-200 hover:border-purple-400 cursor-pointer transition-colors'
                              }`}
                              onClick={() => !isCurrent && handlePlanSwitch(plan.id)}
                            >
                              {isCurrent && (
                                <div className="absolute top-0 right-0 bg-purple-400 text-white text-xs px-2 py-1 rounded-bl-lg">
                                  Current
                                </div>
                              )}
                              {isUpgrade && !isCurrent && (
                                <div className="absolute top-0 right-0 bg-gradient-to-l from-purple-600 to-blue-500 text-white text-xs px-3 py-1 rounded-bl-lg">
                                  Upgrade
                                </div>
                              )}
                              <h5 className="font-medium text-gray-900">{plan.name}</h5>
                              <p className="text-gray-500 text-sm">{plan.price}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>}
            {/* Payment History Tab */}
            {activeTab === 'payments' && <div>
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-5 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">
                      Payment History
                    </h3>
                  </div>
                  <div className="p-6">
                    <div className="text-center py-12">
                      <FileTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No Payment History
                      </h3>
                      <p className="text-gray-500">
                        Your payment history will appear here
                      </p>
                    </div>
                  </div>
                </div>
              </div>}
            {/* Settings Tab */}
            {activeTab === 'settings' && <div>
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-5 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">
                      Account Settings
                    </h3>
                  </div>
                  <div className="p-6">
                    <div className="space-y-6">
                      {settingsError && (
                        <div className="bg-red-50 border border-red-200 rounded-md p-3">
                          <p className="text-sm text-red-700">{settingsError}</p>
                        </div>
                      )}
                      {settingsSuccess && (
                        <div className="bg-green-50 border border-green-200 rounded-md p-3">
                          <p className="text-sm text-green-700">{settingsSuccess}</p>
                        </div>
                      )}
                      <div>
                        <h4 className="text-md font-medium text-gray-900 mb-2">
                          Personal Information
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                              First Name
                            </label>
                            <input type="text" id="firstName" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-amber-500 focus:border-amber-500" value={settingsFirstName} onChange={e => setSettingsFirstName(e.target.value)} />
                          </div>
                          <div>
                            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                              Last Name
                            </label>
                            <input type="text" id="lastName" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-amber-500 focus:border-amber-500" value={settingsLastName} onChange={e => setSettingsLastName(e.target.value)} />
                          </div>
                        </div>
                        <div className="mt-4">
                          <label htmlFor="settingsEmail" className="block text-sm font-medium text-gray-700">
                            Email
                          </label>
                          <input type="email" id="settingsEmail" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-gray-50 text-gray-500 cursor-not-allowed" value={userData.email} disabled />
                          <p className="mt-1 text-xs text-gray-400">Email cannot be changed</p>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-md font-medium text-gray-900 mb-2">
                          Change Password
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                              Current Password
                            </label>
                            <input type="password" id="currentPassword" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-amber-500 focus:border-amber-500" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
                          </div>
                          <div>
                            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                              New Password
                            </label>
                            <input type="password" id="newPassword" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-amber-500 focus:border-amber-500" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                          </div>
                          <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                              Confirm New Password
                            </label>
                            <input type="password" id="confirmPassword" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-amber-500 focus:border-amber-500" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                          </div>
                        </div>
                      </div>
                      <div className="pt-5 border-t border-gray-200">
                        <div className="flex justify-end">
                          <button type="button" className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-500" onClick={() => {
                            setSettingsFirstName(user?.firstName || '');
                            setSettingsLastName(user?.lastName || '');
                            setCurrentPassword('');
                            setNewPassword('');
                            setConfirmPassword('');
                            setSettingsError(null);
                            setSettingsSuccess(null);
                          }}>
                            Cancel
                          </button>
                          <button type="button" className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gradient-to-r from-yellow-500 to-red-600 hover:from-yellow-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50" onClick={handleSaveSettings} disabled={settingsLoading}>
                            {settingsLoading ? 'Saving...' : 'Save Changes'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-6 bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-5 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">
                      Danger Zone
                    </h3>
                  </div>
                  <div className="p-6">
                    <div className="bg-red-50 border border-red-100 rounded-md p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <AlertCircleIcon className="h-5 w-5 text-red-400" />
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-red-800">
                            Delete Account
                          </h3>
                          <div className="mt-2 text-sm text-red-700">
                            <p>
                              Once you delete your account, there is no going
                              back. Please be certain.
                            </p>
                          </div>
                          <div className="mt-4">
                            <button type="button" className="inline-flex items-center justify-center px-4 py-2 border border-transparent font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500" onClick={() => setShowDeleteModal(true)}>
                              Delete Account
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>}
          </div>
        </div>
      </section>
      {/* Cancel Subscription Modal */}
      {showCancelModal && <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => !cancelLoading && setShowCancelModal(false)}></div>
          <div className="relative bg-white rounded-lg max-w-md w-full mx-4 shadow-xl">
            <div className="absolute top-0 right-0 pt-4 pr-4">
              <button type="button" className="text-gray-400 hover:text-gray-500" onClick={() => !cancelLoading && setShowCancelModal(false)} disabled={cancelLoading}>
                <XIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Cancel Your Subscription?
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  Are you sure you want to cancel your subscription? You'll lose
                  access to all Pro features at the end of your current billing
                  period.
                </p>
                {cancelError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-600">{cancelError}</p>
                  </div>
                )}
              </div>
              <div className="mt-5 sm:mt-6 flex flex-col space-y-3">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={async () => {
                    setCancelLoading(true);
                    setCancelError(null);
                    const result = await cancelSubscription();
                    setCancelLoading(false);
                    if (result.success) {
                      setShowCancelModal(false);
                    } else {
                      setCancelError(result.error || 'Failed to cancel subscription');
                    }
                  }}
                  disabled={cancelLoading}
                >
                  {cancelLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Cancelling...
                    </>
                  ) : (
                    'Yes, Cancel Subscription'
                  )}
                </button>
                <button type="button" className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 sm:text-sm disabled:opacity-50" onClick={() => setShowCancelModal(false)} disabled={cancelLoading}>
                  No, Keep My Subscription
                </button>
              </div>
            </div>
          </div>
        </div>}
      {/* Email Limit Modal */}
      {showEmailLimitModal && <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => setShowEmailLimitModal(false)}></div>
          <div className="relative bg-white rounded-lg max-w-md w-full mx-4 shadow-xl">
            <div className="absolute top-0 right-0 pt-4 pr-4">
              <button type="button" className="text-gray-400 hover:text-gray-500" onClick={() => setShowEmailLimitModal(false)}>
                <XIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="text-center">
                <AlertCircleIcon className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Email Account Limit Reached
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  Your current plan allows for a maximum of{' '}
                  {userData.subscription.emailLimit} email accounts. Upgrade
                  your plan to connect more email accounts.
                </p>
              </div>
              <div className="mt-5 sm:mt-6 flex flex-col space-y-3">
                <button type="button" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-gradient-to-r from-yellow-500 to-red-600 text-base font-medium text-white hover:from-yellow-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 sm:text-sm" onClick={() => {
              setShowEmailLimitModal(false);
              handlePlanSwitch('unlimited');
            }}>
                  Upgrade My Plan
                </button>
                <button type="button" className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 sm:text-sm" onClick={() => setShowEmailLimitModal(false)}>
                  Not Now
                </button>
              </div>
            </div>
          </div>
        </div>}
      {/* Disconnect Email Modal */}
      {showDisconnectModal && emailToDisconnect && <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => setShowDisconnectModal(false)}></div>
          <div className="relative bg-white rounded-lg max-w-md w-full mx-4 shadow-xl">
            <div className="absolute top-0 right-0 pt-4 pr-4">
              <button type="button" className="text-gray-400 hover:text-gray-500" onClick={() => setShowDisconnectModal(false)}>
                <XIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="text-center">
                <AlertCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Disconnect Email Account
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  Are you sure you want to disconnect{' '}
                  <span className="font-medium">{emailToDisconnect.email}</span>
                  ? This will remove all data associated with this email
                  account.
                </p>
              </div>
              <div className="mt-5 sm:mt-6 flex flex-col space-y-3">
                <button type="button" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:text-sm" onClick={confirmDisconnectEmail}>
                  Yes, Disconnect
                </button>
                <button type="button" className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 sm:text-sm" onClick={() => setShowDisconnectModal(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>}

      {/* Delete Account Modal */}
      {showDeleteModal && <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => !deleteLoading && setShowDeleteModal(false)}></div>
          <div className="relative bg-white rounded-lg max-w-md w-full mx-4 shadow-xl">
            <div className="absolute top-0 right-0 pt-4 pr-4">
              <button type="button" className="text-gray-400 hover:text-gray-500" onClick={() => !deleteLoading && setShowDeleteModal(false)} disabled={deleteLoading}>
                <XIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="text-center">
                <AlertCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Delete Your Account
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  This action is permanent and cannot be undone. All your data, including connected email accounts, sender lists, and cleanup history will be permanently deleted.
                </p>
                {deleteError && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                    <p className="text-sm text-red-700">{deleteError}</p>
                  </div>
                )}
                <div className="text-left mb-4">
                  <label htmlFor="deletePassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Enter your password to confirm
                  </label>
                  <input type="password" id="deletePassword" className="block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-red-500 focus:border-red-500" value={deletePassword} onChange={e => setDeletePassword(e.target.value)} placeholder="Your password" />
                </div>
              </div>
              <div className="mt-5 sm:mt-6 flex flex-col space-y-3">
                <button type="button" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:text-sm disabled:opacity-50" onClick={handleDeleteAccount} disabled={deleteLoading || !deletePassword}>
                  {deleteLoading ? 'Deleting...' : 'Permanently Delete Account'}
                </button>
                <button type="button" className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 sm:text-sm" onClick={() => { setShowDeleteModal(false); setDeletePassword(''); setDeleteError(null); }} disabled={deleteLoading}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>}

      {/* Connect Email Modal */}
      <ConnectEmailModal
        isOpen={showConnectEmailModal}
        onClose={() => setShowConnectEmailModal(false)}
        onConnect={handleConnectEmail}
        emailLimit={userData.subscription.emailLimit}
        currentCount={connectedEmails.length}
      />
    </div>;
};
export default Dashboard;