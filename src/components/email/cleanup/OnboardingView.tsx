import React from 'react';
import { Link } from 'react-router-dom';
import {
  CheckIcon,
  ShieldIcon,
  Sparkles,
  Inbox,
  UserPlus,
  Mail,
  ArrowRight,
  Check,
  Gift,
  AlertCircle,
} from 'lucide-react';

interface OnboardingViewProps {
  currentStep: number;
  freeActionsRemaining: number;
  freeActionsUsed: number;
  notification: { type: 'success' | 'error'; message: string } | null;
  onConnectGmail: () => void;
  onConnectOutlook: () => void;
  onStartCleaning: () => void;
}

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
                    : 'bg-gray-200 text-gray-500 dark:bg-gray-600 dark:text-gray-400'
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
                  isCurrent ? 'text-indigo-600 dark:text-indigo-400' : isCompleted ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`w-16 md:w-24 h-1 mx-2 rounded ${
                  currentStep > step.number ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-600'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const OnboardingView: React.FC<OnboardingViewProps> = ({
  currentStep,
  freeActionsRemaining,
  freeActionsUsed,
  notification,
  onConnectGmail,
  onConnectOutlook,
  onStartCleaning,
}) => {
  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-gray-950 dark:to-gray-900">
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

      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-3">
            Clean Your Inbox in 3 Easy Steps
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Get started in minutes and take control of your email
          </p>
        </div>

        <StepIndicator currentStep={currentStep} />

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 p-8 md:p-12">
          {currentStep === 1 && (
            <div className="text-center">
              <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center mx-auto mb-6">
                <UserPlus className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                Create Your Free Account
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                Join thousands of users who have decluttered their inboxes.
                Sign up takes less than a minute!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center px-8 py-4 bg-indigo-600 dark:bg-indigo-500 text-white font-semibold rounded-xl hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors"
                >
                  Sign Up Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center px-8 py-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Already have an account? Log In
                </Link>
              </div>
              <div className="mt-8 flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                <ShieldIcon className="w-4 h-4 mr-2 text-green-500" />
                No credit card required • 5 free cleanups included
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <Mail className="w-10 h-10 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                Connect Your Email
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                Select your email provider to securely connect your account.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-lg mx-auto mb-8">
                <button
                  onClick={onConnectGmail}
                  className="flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-lg transition-all group"
                >
                  <svg className="w-10 h-10 mb-3" viewBox="0 0 48 48">
                    <path fill="#4caf50" d="M45,16.2l-5,2.75l-5,4.75L35,40h7c1.657,0,3-1.343,3-3V16.2z"/>
                    <path fill="#1e88e5" d="M3,16.2l3.614,1.71L13,23.7V40H6c-1.657,0-3-1.343-3-3V16.2z"/>
                    <polygon fill="#e53935" points="35,11.2 24,19.45 13,11.2 12,17 13,23.7 24,31.95 35,23.7 36,17"/>
                    <path fill="#c62828" d="M3,12.298V16.2l10,7.5V11.2L9.876,8.859C9.132,8.301,8.228,8,7.298,8h0C4.924,8,3,9.924,3,12.298z"/>
                    <path fill="#fbc02d" d="M45,12.298V16.2l-10,7.5V11.2l3.124-2.341C38.868,8.301,39.772,8,40.702,8h0 C43.076,8,45,9.924,45,12.298z"/>
                  </svg>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">Gmail</span>
                </button>
                <button
                  onClick={onConnectOutlook}
                  className="flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-lg transition-all group"
                >
                  <svg className="w-10 h-10 mb-3" viewBox="0 0 24 24">
                    <path fill="#0078D4" d="M0 0h11.377v11.372H0zm12.623 0H24v11.372H12.623zM0 12.623h11.377V24H0zm12.623 0H24V24H12.623z"/>
                  </svg>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">Outlook</span>
                </button>
                <div className="flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-800/50 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl opacity-60">
                  <svg className="w-10 h-10 mb-3" viewBox="0 0 24 24">
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
                  <span className="text-sm font-medium text-gray-400 dark:text-gray-500">Yahoo</span>
                  <span className="text-xs text-gray-400 dark:text-gray-600 mt-1">Coming Soon</span>
                </div>
              </div>
              <div className="flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                <ShieldIcon className="w-4 h-4 mr-2 text-green-500" />
                We use OAuth • Your password is never stored
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                You're All Set! Start Cleaning
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                Your email is connected and ready to go. You have <span className="font-bold text-indigo-600 dark:text-indigo-400">{freeActionsRemaining} free cleanups</span> to try out the platform!
              </p>
              <div className="inline-flex items-center bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 rounded-full px-6 py-3 mb-8">
                <Gift className="w-5 h-5 text-amber-600 dark:text-amber-400 mr-2" />
                <span className="text-amber-800 dark:text-amber-300 font-medium">
                  {freeActionsUsed > 0 ? `${freeActionsRemaining} free actions left` : '5 Free Actions Included'}
                </span>
              </div>
              <button
                onClick={onStartCleaning}
                className="inline-flex items-center justify-center px-10 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Start Cleaning Now
              </button>
              <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
                Unsubscribe, delete, or archive emails with one click
              </p>
            </div>
          )}
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Secure & Private</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Your data is encrypted and never shared with third parties</p>
          </div>
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Inbox className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Easy to Use</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Simple interface to manage all your emails in one place</p>
          </div>
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckIcon className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">One-Click Actions</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Unsubscribe and clean up with a single click</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingView;
