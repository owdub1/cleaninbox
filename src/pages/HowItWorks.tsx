import React from 'react';
import { Link } from 'react-router-dom';
import { MailIcon, LockIcon, SearchIcon, CheckCircleIcon, ShieldIcon, AlertTriangleIcon, CheckIcon } from 'lucide-react';
const HowItWorks = () => {
  return <div className="w-full bg-white">
      {/* Header - Redesigned without gradient */}
      <section className="pt-12 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl md:text-5xl font-bold text-gray-900">
              How CleanInbox Works
            </h1>
            <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
              A simple, secure process to declutter your inbox in minutes
            </p>
          </div>
        </div>
      </section>
      {/* Process Overview */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center relative">
              <div className="bg-indigo-100 w-20 h-20 mx-auto rounded-full flex items-center justify-center">
                <MailIcon className="h-10 w-10 text-indigo-600" />
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">
                1. Connect Your Email
              </h3>
              <p className="mt-4 text-gray-600">
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
              <div className="bg-indigo-100 w-20 h-20 mx-auto rounded-full flex items-center justify-center">
                <SearchIcon className="h-10 w-10 text-indigo-600" />
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">
                2. Review Subscriptions
              </h3>
              <p className="mt-4 text-gray-600">
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
              <div className="bg-indigo-100 w-20 h-20 mx-auto rounded-full flex items-center justify-center">
                <CheckCircleIcon className="h-10 w-10 text-indigo-600" />
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">
                3. Unsubscribe Instantly
              </h3>
              <p className="mt-4 text-gray-600">
                Click the unsubscribe button next to any sender you no longer
                want to hear from. We'll handle the rest automatically.
              </p>
            </div>
          </div>
        </div>
      </section>
      {/* Detailed Process */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">
              The Technical Details
            </h2>
            <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
              How we keep your data secure while cleaning your inbox
            </p>
          </div>
          <div className="space-y-16">
            {/* Step 1 */}
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center bg-indigo-100 rounded-full px-4 py-1 text-indigo-800 font-medium mb-4">
                  Step 1
                </div>
                <h3 className="text-2xl font-bold text-gray-900">
                  Secure Connection
                </h3>
                <p className="mt-4 text-lg text-gray-600">
                  We use OAuth 2.0 to securely connect to your email provider.
                  This industry-standard protocol means:
                </p>
                <ul className="mt-6 space-y-4">
                  <li className="flex items-start">
                    <CheckIcon className="h-6 w-6 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="ml-3 text-gray-700">
                      We never see or store your email password
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckIcon className="h-6 w-6 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="ml-3 text-gray-700">
                      You can revoke access at any time
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckIcon className="h-6 w-6 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="ml-3 text-gray-700">
                      All communication is encrypted using TLS/SSL
                    </span>
                  </li>
                </ul>
              </div>
              <div className="bg-white p-8 rounded-lg shadow-md">
                <div className="bg-indigo-50 p-6 rounded-lg">
                  <div className="flex items-center mb-4">
                    <LockIcon className="h-6 w-6 text-indigo-600" />
                    <h4 className="ml-2 text-lg font-semibold text-gray-900">
                      OAuth 2.0 Authentication
                    </h4>
                  </div>
                  <ol className="space-y-4 text-gray-700">
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
                <div className="bg-white p-8 rounded-lg shadow-md">
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <h4 className="font-medium text-gray-900">
                        Your Top Email Senders
                      </h4>
                    </div>
                    <div className="divide-y divide-gray-200">
                      {[{
                      name: 'Daily Newsletter',
                      count: 43,
                      selected: true
                    }, {
                      name: 'Shopping Promotions',
                      count: 27,
                      selected: true
                    }, {
                      name: 'Social Updates',
                      count: 19,
                      selected: false
                    }, {
                      name: 'Marketing Emails',
                      count: 16,
                      selected: true
                    }, {
                      name: 'Weekly Digest',
                      count: 12,
                      selected: false
                    }].map((sender, index) => <div key={index} className="flex items-center justify-between p-4">
                          <div>
                            <div className="font-medium text-gray-900">
                              {sender.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {sender.count} emails in the last 30 days
                            </div>
                          </div>
                          <button className={`px-3 py-1 rounded-full text-sm font-medium ${sender.selected ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                            {sender.selected ? 'Unsubscribe' : 'Keep'}
                          </button>
                        </div>)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="order-1 md:order-2">
                <div className="inline-flex items-center bg-indigo-100 rounded-full px-4 py-1 text-indigo-800 font-medium mb-4">
                  Step 2
                </div>
                <h3 className="text-2xl font-bold text-gray-900">
                  Analyze & Present
                </h3>
                <p className="mt-4 text-lg text-gray-600">
                  We analyze your inbox to identify your most frequent senders,
                  then present them in an easy-to-review list.
                </p>
                <ul className="mt-6 space-y-4">
                  <li className="flex items-start">
                    <CheckIcon className="h-6 w-6 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="ml-3 text-gray-700">
                      We only access header information, not email content
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckIcon className="h-6 w-6 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="ml-3 text-gray-700">
                      All processing happens in real-time
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckIcon className="h-6 w-6 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="ml-3 text-gray-700">
                      No email data is stored on our servers
                    </span>
                  </li>
                </ul>
              </div>
            </div>
            {/* Step 3 */}
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center bg-indigo-100 rounded-full px-4 py-1 text-indigo-800 font-medium mb-4">
                  Step 3
                </div>
                <h3 className="text-2xl font-bold text-gray-900">
                  Unsubscribe & Verify
                </h3>
                <p className="mt-4 text-lg text-gray-600">
                  When you click "Unsubscribe", we handle the entire process
                  automatically and verify it worked.
                </p>
                <ul className="mt-6 space-y-4">
                  <li className="flex items-start">
                    <CheckIcon className="h-6 w-6 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="ml-3 text-gray-700">
                      We find and follow the unsubscribe link in emails
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckIcon className="h-6 w-6 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="ml-3 text-gray-700">
                      We complete any unsubscribe forms automatically
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckIcon className="h-6 w-6 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="ml-3 text-gray-700">
                      We verify the unsubscribe was successful
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckIcon className="h-6 w-6 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="ml-3 text-gray-700">
                      Your session data is immediately deleted after completion
                    </span>
                  </li>
                </ul>
              </div>
              <div className="bg-white p-8 rounded-lg shadow-md">
                <div className="space-y-6">
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200 flex items-start">
                    <CheckCircleIcon className="h-6 w-6 text-green-500 mt-0.5 flex-shrink-0" />
                    <div className="ml-3">
                      <h4 className="font-medium text-gray-900">
                        Daily Newsletter
                      </h4>
                      <p className="text-sm text-gray-600">
                        Successfully unsubscribed
                      </p>
                    </div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200 flex items-start">
                    <CheckCircleIcon className="h-6 w-6 text-green-500 mt-0.5 flex-shrink-0" />
                    <div className="ml-3">
                      <h4 className="font-medium text-gray-900">
                        Shopping Promotions
                      </h4>
                      <p className="text-sm text-gray-600">
                        Successfully unsubscribed
                      </p>
                    </div>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 flex items-start">
                    <AlertTriangleIcon className="h-6 w-6 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <div className="ml-3">
                      <h4 className="font-medium text-gray-900">
                        Marketing Emails
                      </h4>
                      <p className="text-sm text-gray-600">
                        Confirmation email sent - please check your inbox
                      </p>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg border border-gray-200 flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-indigo-600 rounded-full mr-3"></div>
                      <span className="text-gray-700">
                        Unsubscribe progress
                      </span>
                    </div>
                    <div className="font-medium text-gray-900">
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
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">
              Our Security Promise
            </h2>
            <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
              Your privacy and security are our top priorities
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-50 p-8 rounded-lg">
              <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                <ShieldIcon className="h-8 w-8 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                No Data Storage
              </h3>
              <p className="mt-4 text-gray-600">
                We never store your emails, their contents, or your credentials.
                All processing happens in real-time during your session.
              </p>
            </div>
            <div className="bg-gray-50 p-8 rounded-lg">
              <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                <LockIcon className="h-8 w-8 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                End-to-End Encryption
              </h3>
              <p className="mt-4 text-gray-600">
                All communication between our servers and your email provider is
                encrypted using TLS/SSL. Your data is never exposed.
              </p>
            </div>
            <div className="bg-gray-50 p-8 rounded-lg">
              <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                <MailIcon className="h-8 w-8 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                Minimal Access
              </h3>
              <p className="mt-4 text-gray-600">
                We only request the minimum permissions needed to analyze
                senders and process unsubscribe requests. We never read your
                email content.
              </p>
            </div>
          </div>
        </div>
      </section>
      {/* CTA Section - Redesigned */}
      <section className="py-12 bg-indigo-50 border-t border-indigo-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
              Ready to Clean Up Your Inbox?
            </h2>
            <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
              Join thousands of users who have decluttered their inboxes and
              reclaimed their time.
            </p>
            <div className="mt-8">
              <Link to="/" className="bg-indigo-600 text-white px-6 py-3 rounded-md font-medium hover:bg-indigo-700 transition-colors inline-block">
                Clean My Inbox Now
              </Link>
            </div>
            <p className="mt-6 text-gray-600 flex items-center justify-center">
              <ShieldIcon className="h-5 w-5 mr-2 text-indigo-600" />
              <span>Your data is never stored or shared</span>
            </p>
          </div>
        </div>
      </section>
    </div>;
};
export default HowItWorks;