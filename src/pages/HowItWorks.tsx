import React from 'react';
import { Link } from 'react-router-dom';
import { MailIcon, LockIcon, SearchIcon, CheckCircleIcon, ShieldIcon, AlertTriangleIcon, CheckIcon } from 'lucide-react';
const HowItWorks = () => {
  return <div className="w-full bg-white dark:bg-gray-900">
      {/* Header - Redesigned without gradient */}
      <section className="pt-12 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-gray-100">
              How CleanInbox Works
            </h1>
            <p className="mt-4 text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              A simple, secure process to declutter your inbox in minutes
            </p>
          </div>
        </div>
      </section>
      {/* Process Overview */}
      <section className="py-16 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center relative">
              <div className="bg-indigo-100 dark:bg-indigo-900 w-20 h-20 mx-auto rounded-full flex items-center justify-center">
                <MailIcon className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900 dark:text-gray-100">
                1. Connect Your Email
              </h3>
              <p className="mt-4 text-gray-600 dark:text-gray-400">
                Securely connect your email account using OAuth. We never see or
                store your password.
              </p>
              <div className="hidden md:flex absolute top-1/2 -right-6 transform -translate-y-1/2 z-10">
                <svg className="h-8 w-8 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="text-center relative">
              <div className="bg-indigo-100 dark:bg-indigo-900 w-20 h-20 mx-auto rounded-full flex items-center justify-center">
                <SearchIcon className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900 dark:text-gray-100">
                2. Review Subscriptions
              </h3>
              <p className="mt-4 text-gray-600 dark:text-gray-400">
                We'll show you a list of your most frequent senders, making it
                easy to identify newsletters and marketing emails.
              </p>
              <div className="hidden md:flex absolute top-1/2 -right-6 transform -translate-y-1/2 z-10">
                <svg className="h-8 w-8 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="text-center">
              <div className="bg-indigo-100 dark:bg-indigo-900 w-20 h-20 mx-auto rounded-full flex items-center justify-center">
                <CheckCircleIcon className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900 dark:text-gray-100">
                3. Clean Up Your Inbox
              </h3>
              <p className="mt-4 text-gray-600 dark:text-gray-400">
                Delete unwanted emails in bulk or unsubscribe from senders you
                no longer want to hear from. We'll handle the rest automatically.
              </p>
            </div>
          </div>
        </div>
      </section>
      {/* Detailed Process */}
      <section className="py-16 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              The Technical Details
            </h2>
            <p className="mt-4 text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              How we keep your data secure while cleaning your inbox
            </p>
          </div>
          <div className="space-y-16">
            {/* Step 1 */}
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center bg-indigo-100 dark:bg-indigo-900 rounded-full px-4 py-1 text-indigo-800 dark:text-indigo-300 font-medium mb-4">
                  Step 1
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Secure Connection
                </h3>
                <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
                  We use OAuth 2.0 to securely connect to your email provider.
                  This industry-standard protocol means:
                </p>
                <ul className="mt-6 space-y-4">
                  <li className="flex items-start">
                    <CheckIcon className="h-6 w-6 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="ml-3 text-gray-700 dark:text-gray-300">
                      We never see or store your email password
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckIcon className="h-6 w-6 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="ml-3 text-gray-700 dark:text-gray-300">
                      You can revoke access at any time
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckIcon className="h-6 w-6 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="ml-3 text-gray-700 dark:text-gray-300">
                      All communication is encrypted using TLS/SSL
                    </span>
                  </li>
                </ul>
              </div>
              <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-md">
                <div className="bg-indigo-50 dark:bg-indigo-950 p-6 rounded-lg">
                  <div className="flex items-center mb-4">
                    <LockIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                    <h4 className="ml-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                      OAuth 2.0 Authentication
                    </h4>
                  </div>
                  <ol className="space-y-4 text-gray-700 dark:text-gray-300">
                    <li className="flex">
                      <span className="bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center font-medium mr-3 flex-shrink-0">
                        1
                      </span>
                      <span>You click "Connect Email"</span>
                    </li>
                    <li className="flex">
                      <span className="bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center font-medium mr-3 flex-shrink-0">
                        2
                      </span>
                      <span>
                        You're redirected to your email provider's login page
                      </span>
                    </li>
                    <li className="flex">
                      <span className="bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center font-medium mr-3 flex-shrink-0">
                        3
                      </span>
                      <span>
                        You log in directly with your provider (we never see
                        your password)
                      </span>
                    </li>
                    <li className="flex">
                      <span className="bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center font-medium mr-3 flex-shrink-0">
                        4
                      </span>
                      <span>
                        Your provider gives us a temporary access token
                      </span>
                    </li>
                    <li className="flex">
                      <span className="bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center font-medium mr-3 flex-shrink-0">
                        5
                      </span>
                      <span>You're redirected back to CleanInbox</span>
                    </li>
                  </ol>
                </div>
              </div>
            </div>
            {/* Step 2 */}
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="order-2 md:order-1">
                <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-md">
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">
                        Your Top Email Senders
                      </h4>
                    </div>
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {[{
                      name: 'Daily Newsletter',
                      email: 'noreply@dailynews.com',
                      initials: 'DN',
                      color: 'bg-blue-500',
                      count: 43,
                      newsletter: true,
                      selected: true
                    }, {
                      name: 'Shopping Promotions',
                      email: 'deals@shoppromo.com',
                      initials: 'SP',
                      color: 'bg-orange-500',
                      count: 27,
                      newsletter: false,
                      selected: true
                    }, {
                      name: 'Social Updates',
                      email: 'notifications@social.com',
                      initials: 'SU',
                      color: 'bg-green-500',
                      count: 19,
                      newsletter: false,
                      selected: false
                    }, {
                      name: 'Marketing Emails',
                      email: 'hello@marketing.co',
                      initials: 'ME',
                      color: 'bg-purple-500',
                      count: 16,
                      newsletter: true,
                      selected: true
                    }, {
                      name: 'Weekly Digest',
                      email: 'digest@weekly.com',
                      initials: 'WD',
                      color: 'bg-indigo-500',
                      count: 12,
                      newsletter: true,
                      selected: false
                    }].map((sender, index) => <div key={index} className="flex items-center justify-between px-4 py-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-9 h-9 ${sender.color} rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                              {sender.initials}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                  {sender.name}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                                  {sender.count} emails
                                </span>
                                {sender.newsletter && (
                                  <span className="text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded">
                                    Newsletter
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-400 dark:text-gray-500 truncate">
                                {sender.email}
                              </div>
                            </div>
                          </div>
                          <button className={`px-4 py-1.5 rounded-lg text-sm font-medium flex-shrink-0 ml-3 ${sender.selected ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                            Unsubscribe
                          </button>
                        </div>)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="order-1 md:order-2">
                <div className="inline-flex items-center bg-indigo-100 dark:bg-indigo-900 rounded-full px-4 py-1 text-indigo-800 dark:text-indigo-300 font-medium mb-4">
                  Step 2
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Analyze & Present
                </h3>
                <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
                  We analyze your inbox to identify your most frequent senders,
                  then present them in an easy-to-review list.
                </p>
                <ul className="mt-6 space-y-4">
                  <li className="flex items-start">
                    <CheckIcon className="h-6 w-6 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="ml-3 text-gray-700 dark:text-gray-300">
                      We only access header information, not email content
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckIcon className="h-6 w-6 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="ml-3 text-gray-700 dark:text-gray-300">
                      Email data is processed on demand when you sync
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckIcon className="h-6 w-6 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="ml-3 text-gray-700 dark:text-gray-300">
                      No email bodies or attachments are stored on our servers
                    </span>
                  </li>
                </ul>
              </div>
            </div>
            {/* Step 3 */}
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center bg-indigo-100 dark:bg-indigo-900 rounded-full px-4 py-1 text-indigo-800 dark:text-indigo-300 font-medium mb-4">
                  Step 3
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Delete & Unsubscribe
                </h3>
                <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
                  Delete unwanted emails in bulk by sender, or unsubscribe from
                  mailing lists with one click.
                </p>
                <ul className="mt-6 space-y-4">
                  <li className="flex items-start">
                    <CheckIcon className="h-6 w-6 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="ml-3 text-gray-700 dark:text-gray-300">
                      We find and follow the unsubscribe link in emails
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckIcon className="h-6 w-6 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="ml-3 text-gray-700 dark:text-gray-300">
                      We send the unsubscribe request automatically when one-click is supported
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckIcon className="h-6 w-6 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="ml-3 text-gray-700 dark:text-gray-300">
                      We confirm the unsubscribe request was received
                    </span>
                  </li>
                </ul>
              </div>
              <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-md">
                <div className="space-y-6">
                  <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg border border-green-200 dark:border-green-800 flex items-start">
                    <CheckCircleIcon className="h-6 w-6 text-green-500 mt-0.5 flex-shrink-0" />
                    <div className="ml-3">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">
                        Daily Newsletter
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Successfully unsubscribed
                      </p>
                    </div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg border border-green-200 dark:border-green-800 flex items-start">
                    <CheckCircleIcon className="h-6 w-6 text-green-500 mt-0.5 flex-shrink-0" />
                    <div className="ml-3">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">
                        Shopping Promotions
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Successfully unsubscribed
                      </p>
                    </div>
                  </div>
                  <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800 flex items-start">
                    <AlertTriangleIcon className="h-6 w-6 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <div className="ml-3">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">
                        Marketing Emails
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Confirmation email sent - please check your inbox
                      </p>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-indigo-600 rounded-full mr-3"></div>
                      <span className="text-gray-700 dark:text-gray-300">
                        Unsubscribe progress
                      </span>
                    </div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      3/3 Complete
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Security Section */}
      <section className="py-16 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Our Security Promise
            </h2>
            <p className="mt-4 text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Your privacy and security are our top priorities
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-50 dark:bg-gray-800 p-8 rounded-lg">
              <div className="bg-indigo-100 dark:bg-indigo-900 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                <ShieldIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                No Email Content Storage
              </h3>
              <p className="mt-4 text-gray-600 dark:text-gray-400">
                We never store your email bodies, attachments, or passwords.
                Only sender metadata is kept to power your dashboard.
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 p-8 rounded-lg">
              <div className="bg-indigo-100 dark:bg-indigo-900 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                <LockIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Encrypted Connections
              </h3>
              <p className="mt-4 text-gray-600 dark:text-gray-400">
                All communication between our servers and your email provider is
                encrypted using TLS/SSL. Your data is never exposed.
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 p-8 rounded-lg">
              <div className="bg-indigo-100 dark:bg-indigo-900 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                <MailIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Minimal Access
              </h3>
              <p className="mt-4 text-gray-600 dark:text-gray-400">
                We only request the minimum permissions needed to analyze
                senders and process unsubscribe requests. We never read your
                email content.
              </p>
            </div>
          </div>
        </div>
      </section>
      {/* CTA Section - Redesigned */}
      <section className="py-12 bg-indigo-50 dark:bg-indigo-950 border-t border-indigo-100 dark:border-indigo-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
              Ready to Clean Up Your Inbox?
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Join thousands of users who have decluttered their inboxes and
              reclaimed their time.
            </p>
            <div className="mt-8">
              <Link to="/email-cleanup" className="bg-indigo-600 text-white px-6 py-3 rounded-md font-medium hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors inline-block">
                Clean My Inbox Now
              </Link>
            </div>
            <p className="mt-6 text-gray-600 dark:text-gray-400 flex items-center justify-center">
              <ShieldIcon className="h-5 w-5 mr-2 text-indigo-600 dark:text-indigo-400" />
              <span>Your email content is never stored or shared</span>
            </p>
          </div>
        </div>
      </section>
    </div>;
};
export default HowItWorks;