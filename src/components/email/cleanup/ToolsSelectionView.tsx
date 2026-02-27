import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckIcon,
  ShieldIcon,
  Sparkles,
  BellOff,
  Trash2,
  BarChart3,
  Check,
  Gift,
  AlertCircle,
  Lock,
} from 'lucide-react';

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
    title: 'Bulk Delete Old Emails',
    description: 'Delete emails older than 30/60/90 days.',
    icon: Trash2,
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

export { cleanupTools };

interface ToolsSelectionViewProps {
  hasPaidPlan: boolean;
  isFreeTrial?: boolean;
  subscriptionLoading: boolean;
  freeActionsRemaining: number;
  notification: { type: 'success' | 'error'; message: string } | null;
  onToolSelect: (toolId: string) => void;
}

const ToolsSelectionView: React.FC<ToolsSelectionViewProps> = ({
  hasPaidPlan,
  isFreeTrial = false,
  subscriptionLoading,
  freeActionsRemaining,
  notification,
  onToolSelect,
}) => {
  const navigate = useNavigate();
  const FREE_TRIAL_LIMIT = 5;

  return (
    <div className="w-full bg-gray-50 dark:bg-gray-800 min-h-screen">
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
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
          {isFreeTrial && !subscriptionLoading && (
            <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Gift className="w-5 h-5 text-amber-600 dark:text-amber-400 mr-3" />
                  <span className="text-amber-800 dark:text-amber-300">
                    <span className="font-semibold">{freeActionsRemaining} free actions</span> remaining
                  </span>
                </div>
                {freeActionsRemaining < FREE_TRIAL_LIMIT && (
                  <button
                    onClick={() => navigate('/checkout')}
                    className="text-sm font-medium text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 underline"
                  >
                    Upgrade for unlimited
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Email Cleanup Tools</h1>
            <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
              Choose a cleanup tool to get started
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {cleanupTools.map((tool) => {
              const IconComponent = tool.icon;
              const isLocked = !hasPaidPlan && tool.id !== 'delete';
              return (
                <button
                  key={tool.id}
                  onClick={() => onToolSelect(tool.id)}
                  className={`group relative overflow-hidden rounded-2xl p-6 text-left transition-all hover:scale-105 hover:shadow-xl ${isLocked ? 'opacity-75' : ''}`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${tool.color} opacity-90 group-hover:opacity-100 transition-opacity`} />
                  {isLocked && (
                    <div className="absolute top-3 right-3 z-20 flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-full px-2 py-1">
                      <Lock className="w-3 h-3 text-white" />
                      <span className="text-white text-xs font-semibold">Upgrade</span>
                    </div>
                  )}
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

          <div className="mt-12 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-4 text-center">How It Works</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-red-400 to-pink-400 mb-3">
                  <Trash2 className="w-6 h-6 text-white" />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  View emails grouped by sender and delete in bulk.
                </p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-violet-400 mb-3">
                  <BellOff className="w-6 h-6 text-white" />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  One-click unsubscribe from newsletters and mailing lists.
                </p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-400 mb-3">
                  <Trash2 className="w-6 h-6 text-white" />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Bulk delete old emails to keep your inbox clean.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-10 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-sm max-w-2xl mx-auto">
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
};

export default ToolsSelectionView;
