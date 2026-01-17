import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Inbox,
  BellOff,
  Ban,
  Hand,
  SlidersHorizontal,
  Mail,
  LogOut,
  User,
  CreditCard,
  Plus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDashboardData } from '../hooks/useDashboardData';
import ConnectEmailModal from '../components/modals/ConnectEmailModal';
import { useEmailAccounts } from '../hooks/useEmailAccounts';

interface CleanupCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  count?: number;
  action: () => void;
}

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { stats, emailAccounts, loading } = useDashboardData();
  const { addEmailAccount } = useEmailAccounts();
  const [showConnectEmailModal, setShowConnectEmailModal] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleConnectEmail = async (email: string, provider: string) => {
    await addEmailAccount(email, provider);
    setShowConnectEmailModal(false);
  };

  const cleanupCards: CleanupCard[] = [
    {
      id: 'suggestions',
      title: 'Explore Cleaning Suggestions',
      description: 'Kick start your cleaning with our recommendations.',
      icon: <Sparkles className="w-8 h-8" />,
      color: 'from-amber-400 to-orange-400',
      count: stats?.suggestions || 48,
      action: () => navigate('/cleanup')
    },
    {
      id: 'inbox',
      title: 'View and clean your Inbox',
      description: 'Filter, group, and clean messages you no longer need.',
      icon: <Inbox className="w-8 h-8" />,
      color: 'from-blue-400 to-indigo-400',
      action: () => navigate('/cleanup')
    },
    {
      id: 'unsubscribe',
      title: 'Unsubscribe from mailing lists',
      description: 'All mailing lists and newsletters in one place.',
      icon: <BellOff className="w-8 h-8" />,
      color: 'from-red-400 to-pink-400',
      count: stats?.subscriptions || 337,
      action: () => navigate('/cleanup')
    },
    {
      id: 'block',
      title: 'Block or Mute a sender',
      description: 'Or get mail from them delivered to a specific folder.',
      icon: <Ban className="w-8 h-8" />,
      color: 'from-sky-400 to-cyan-400',
      action: () => navigate('/cleanup')
    },
    {
      id: 'stop',
      title: 'Stop all unwanted mail',
      description: 'Hold mail from new senders out of Inbox. Review to Allow.',
      icon: <Hand className="w-8 h-8" />,
      color: 'from-purple-400 to-violet-400',
      action: () => navigate('/cleanup')
    },
    {
      id: 'automate',
      title: 'Clean and organize mail automatically',
      description: 'Create rules to, trash, move, or label mail automatically.',
      icon: <SlidersHorizontal className="w-8 h-8" />,
      color: 'from-gray-400 to-slate-400',
      action: () => navigate('/cleanup')
    }
  ];

  const emailLimit = user?.subscription_tier === 'Pro' ? 10 : 1;
  const connectedEmailsCount = emailAccounts?.length || 0;
  const canAddEmail = connectedEmailsCount < emailLimit;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">CleanInbox</h1>
              <p className="text-sm text-gray-600 mt-1">
                {user?.first_name ? `Welcome back, ${user.first_name}` : 'Welcome back'}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user?.subscription_tier || 'Free'} Plan
              </span>
              <button
                onClick={() => navigate('/account')}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                title="Account Settings"
              >
                <User className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={handleLogout}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Email Accounts Section */}
        <section className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Connected Email Accounts</h2>
            {canAddEmail && (
              <button
                onClick={() => setShowConnectEmailModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Connect Email</span>
              </button>
            )}
          </div>

          {emailAccounts && emailAccounts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {emailAccounts.map((account) => (
                <div
                  key={account.id}
                  className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="bg-indigo-100 rounded-full p-2">
                        <Mail className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{account.email}</p>
                        <p className="text-xs text-gray-500">{account.provider}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-xs text-gray-500">Total</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {account.total_emails || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Processed</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {account.processed_emails || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Cleaned</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {account.unsubscribed || 0}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No email accounts connected
              </h3>
              <p className="text-gray-600 mb-4">
                Connect your first email account to start cleaning your inbox
              </p>
              <button
                onClick={() => setShowConnectEmailModal(true)}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Connect Your First Email
              </button>
            </div>
          )}
        </section>

        {/* Cleanup Actions Grid */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Cleanup Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cleanupCards.map((card) => (
              <button
                key={card.id}
                onClick={card.action}
                className="group relative overflow-hidden rounded-2xl p-6 text-left transition-all hover:scale-105 hover:shadow-xl"
              >
                {/* Gradient Background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-90 group-hover:opacity-100 transition-opacity`} />

                {/* Content */}
                <div className="relative z-10">
                  <div className="mb-4">
                    <div className="text-white">
                      {card.icon}
                    </div>
                  </div>
                  <h3 className="text-white font-semibold text-lg mb-2">
                    {card.title}
                  </h3>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Feature Descriptions */}
        <section className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-base font-medium text-gray-900 mb-4">How It Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {cleanupCards.slice(0, 3).map((card) => (
              <div key={card.id} className="text-center">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br ${card.color} mb-3`}>
                  <div className="text-white scale-75">
                    {card.icon}
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  {card.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Upgrade CTA for Free Users */}
        {user?.subscription_tier !== 'Pro' && (
          <section className="mt-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg p-8 text-center text-white">
            <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-90" />
            <h3 className="text-2xl font-bold mb-2">Upgrade to CleanInbox Pro</h3>
            <p className="text-indigo-100 mb-6 max-w-2xl mx-auto">
              Connect up to 10 email accounts, get advanced filtering, and unlock powerful automation features.
            </p>
            <button
              onClick={() => navigate('/checkout')}
              className="bg-white text-indigo-600 px-8 py-3 rounded-lg font-semibold hover:bg-indigo-50 transition-colors"
            >
              Upgrade Now
            </button>
          </section>
        )}
      </main>

      {/* Connect Email Modal */}
      <ConnectEmailModal
        isOpen={showConnectEmailModal}
        onClose={() => setShowConnectEmailModal(false)}
        onConnect={handleConnectEmail}
        emailLimit={emailLimit}
        currentCount={connectedEmailsCount}
      />
    </div>
  );
};

export default Dashboard;
