import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldIcon, CheckIcon, LockIcon, MailIcon, MailOpenIcon, UserIcon, CheckCircleIcon, FolderIcon, FilterIcon } from 'lucide-react';
import { SEO } from '../components/SEO';
const Home = () => {
  const [subscriptions, setSubscriptions] = useState([{
    name: 'Daily Newsletter',
    subscribed: false
  }, {
    name: 'Shopping Promotions',
    subscribed: false
  }, {
    name: 'Social Media Updates',
    subscribed: false
  }, {
    name: 'Marketing Emails',
    subscribed: false
  }, {
    name: 'Weekly Digest',
    subscribed: false
  }]);
  const toggleSubscription = index => {
    setSubscriptions(subscriptions.map((sub, i) => i === index ? {
      ...sub,
      subscribed: !sub.subscribed
    } : sub));
  };
  const homeJsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'CleanInbox',
      url: 'https://cleaninbox.ca',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'CleanInbox',
      url: 'https://cleaninbox.ca',
      logo: 'https://cleaninbox.ca/favicon-512.png',
      description: 'Delete unwanted emails in bulk and unsubscribe from senders with one click.',
      sameAs: [],
    },
  ];
  return <><SEO description="Delete unwanted emails in bulk and unsubscribe from senders with one click. Connect your Gmail or Outlook account and clean up your inbox in minutes." jsonLd={homeJsonLd} /><div className="w-full bg-white dark:bg-gray-900">
      {/* Hero Section - Redesigned without the blue header */}
      <section className="pt-16 pb-20 bg-white dark:bg-gray-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold leading-tight text-gray-900 dark:text-gray-100">
                Take Back Control of Your Inbox
              </h1>
              <p className="mt-6 text-xl text-gray-600 dark:text-gray-400">
                Unsubscribe from newsletters and marketing emails quickly — one click for supported senders, easy links for the rest.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Link to="/email-cleanup" className="bg-indigo-600 dark:bg-indigo-500 text-white px-6 py-3 rounded-md font-medium hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors text-center">
                  Clean My Inbox Now
                </Link>
                <Link to="/how-it-works" className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-6 py-3 rounded-md font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-center">
                  How It Works
                </Link>
              </div>
              <div className="mt-8 flex items-center">
                <ShieldIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <span className="ml-2 text-gray-600 dark:text-gray-400">
                  Your email content is never stored or shared
                </span>
              </div>
              <div className="mt-4 flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                <span>Supported by</span>
                <span className="inline-flex items-center gap-1.5">
                  <svg className="h-[18px] w-[18px]" viewBox="52 42 88 66" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path fill="#4285f4" d="M58 108h14V74L52 59v43c0 3.32 2.69 6 6 6"/>
                    <path fill="#34a853" d="M120 108h14c3.32 0 6-2.69 6-6V59l-20 15"/>
                    <path fill="#fbbc04" d="M120 48v26l20-15v-8c0-7.42-8.47-11.65-14.4-7.2"/>
                    <path fill="#ea4335" d="M72 74V48l24 18 24-18v26L96 92"/>
                    <path fill="#c5221f" d="M52 51v8l20 15V48l-5.6-4.2c-5.94-4.46-14.4-.22-14.4 7.2"/>
                  </svg>
                  <span className="text-gray-500 dark:text-gray-400 font-medium">Gmail</span>
                </span>
                <span className="text-gray-300 dark:text-gray-600">&</span>
                <span className="inline-flex items-center gap-1.5">
                  <svg className="h-[18px] w-[18px]" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path fill="#0364b8" d="M28.596 11.09H18.5L16 14.546l2.5 3.454H28.596A1.404 1.404 0 0 0 30 16.596v-4.102a1.404 1.404 0 0 0-1.404-1.404z"/>
                    <path fill="#0078d4" d="M16 3H5.404A1.404 1.404 0 0 0 4 4.404v10.192A1.404 1.404 0 0 0 5.404 16H16l3-6.5z"/>
                    <path fill="#28a8ea" d="M16 16H5.404A1.404 1.404 0 0 0 4 17.404v10.192A1.404 1.404 0 0 0 5.404 29H16l3-6.5z"/>
                    <path fill="#0078d4" d="M16 16h12.596A1.404 1.404 0 0 0 30 14.596V4.404A1.404 1.404 0 0 0 28.596 3H16v13z"/>
                    <path fill="#0364b8" d="M16 16h12.596A1.404 1.404 0 0 0 30 17.404v10.192A1.404 1.404 0 0 0 28.596 29H16V16z"/>
                    <path opacity=".5" fill="#0a2767" d="M17.2 8.31v16.18a.79.79 0 0 1-.49.73.67.67 0 0 1-.3.07H4v-17.6h1.4v-.28A1.4 1.4 0 0 1 6.81 6h9.89v1.59a.81.81 0 0 1 .5.72z"/>
                    <rect fill="#0078d4" x="2" y="7" width="14" height="18" rx="1.4"/>
                    <path fill="#fff" d="M12.58 12.87a4.13 4.13 0 0 0-1.8-1.59 5.91 5.91 0 0 0-2.67-.57 6.08 6.08 0 0 0-2.75.59 4.19 4.19 0 0 0-1.83 1.67A4.89 4.89 0 0 0 2.89 16a5.17 5.17 0 0 0 .6 2.56A4.11 4.11 0 0 0 5.2 20.2a5.69 5.69 0 0 0 2.6.57 5.93 5.93 0 0 0 2.69-.58 4.14 4.14 0 0 0 1.78-1.63 4.74 4.74 0 0 0 .63-2.46 5 5 0 0 0-.32-1.23zm-2.15 4.08a2.42 2.42 0 0 1-1 1.07 2.93 2.93 0 0 1-1.53.39 3 3 0 0 1-1.58-.41 2.56 2.56 0 0 1-1-1.12 3.69 3.69 0 0 1-.35-1.65 3.77 3.77 0 0 1 .35-1.68 2.6 2.6 0 0 1 1-1.13 2.84 2.84 0 0 1 1.52-.4 2.93 2.93 0 0 1 1.52.39 2.5 2.5 0 0 1 1 1.09 3.57 3.57 0 0 1 .34 1.61 3.89 3.89 0 0 1-.27 1.84z"/>
                  </svg>
                  <span className="text-gray-500 dark:text-gray-400 font-medium">Outlook</span>
                </span>
              </div>
            </div>
            <div className="hidden md:block relative">
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl p-6 transform rotate-2 border border-gray-100 dark:border-gray-800">
                <div className="flex items-center mb-4">
                  <MailIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="ml-2 text-lg font-semibold text-gray-800 dark:text-gray-200">
                    Your Subscriptions
                  </h3>
                </div>
                <div className="space-y-3">
                  {subscriptions.map((item, index) => <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                      <span className="text-gray-700 dark:text-gray-300">{item.name}</span>
                      <button className={`text-sm ${item.subscribed ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'}
                          px-3 py-1 rounded-full font-medium transition-colors`} onClick={() => toggleSubscription(index)}>
                        {item.subscribed ? 'Subscribe' : 'Unsubscribe'}
                      </button>
                    </div>)}
                </div>
              </div>
              <div className="absolute -bottom-6 -left-6 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded-full px-4 py-2 font-medium flex items-center shadow-lg">
                <CheckCircleIcon className="h-5 w-5 mr-1" />
                {subscriptions.filter(s => !s.subscribed).length}{' '}
                Subscriptions Removed
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Why Choose CleanInbox?
            </h2>
            <p className="mt-4 text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              We make it incredibly easy to declutter your inbox while keeping
              your data private and secure.
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800 text-center">
              <div className="bg-indigo-100 dark:bg-indigo-900 w-16 h-16 mx-auto rounded-full flex items-center justify-center">
                <LockIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900 dark:text-gray-100">
                Secure & Private
              </h3>
              <p className="mt-4 text-gray-600 dark:text-gray-400">
                We never store your emails or credentials. All connections are secured with TLS encryption.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800 text-center">
              <div className="bg-indigo-100 dark:bg-indigo-900 w-16 h-16 mx-auto rounded-full flex items-center justify-center">
                <MailOpenIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900 dark:text-gray-100">
                One-Click Unsubscribe
              </h3>
              <p className="mt-4 text-gray-600 dark:text-gray-400">
                Unsubscribe from multiple newsletters and marketing emails with
                a single click. No more hunting for tiny unsubscribe links.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800 text-center">
              <div className="bg-indigo-100 dark:bg-indigo-900 w-16 h-16 mx-auto rounded-full flex items-center justify-center">
                <FolderIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900 dark:text-gray-100">
                Email Cleanup
              </h3>
              <p className="mt-4 text-gray-600 dark:text-gray-400">
                Organize emails by year and sender. Easily identify and remove
                old emails with our powerful categorization tools.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800 text-center">
              <div className="bg-indigo-100 dark:bg-indigo-900 w-16 h-16 mx-auto rounded-full flex items-center justify-center">
                <UserIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900 dark:text-gray-100">
                Works With Gmail
              </h3>
              <p className="mt-4 text-gray-600 dark:text-gray-400">
                Connect your Gmail account and let CleanInbox analyze your inbox.
                Simple setup with secure OAuth authentication.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Our Services</h2>
            <p className="mt-4 text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Two powerful ways to manage your inbox
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-12">
            {/* Unsubscribe Service */}
            <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800">
              <div className="bg-indigo-100 dark:bg-indigo-900 w-12 h-12 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xl mb-6">
                1
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Unsubscribe Service
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Automatically unsubscribe from unwanted emails and newsletters
                with just a few clicks.
              </p>
              <div className="space-y-4 mb-8">
                <div className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                  <span className="ml-3 text-gray-700 dark:text-gray-300">
                    One-click unsubscribe from multiple senders
                  </span>
                </div>
                <div className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                  <span className="ml-3 text-gray-700 dark:text-gray-300">
                    Supports one-click and email-based unsubscribe methods
                  </span>
                </div>
                <div className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                  <span className="ml-3 text-gray-700 dark:text-gray-300">
                    Confirms the unsubscribe request was sent successfully
                  </span>
                </div>
              </div>
              <Link to="/how-it-works" className="inline-block bg-indigo-600 dark:bg-indigo-500 text-white px-6 py-3 rounded-md font-medium hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors">
                Learn More
              </Link>
            </div>
            {/* Email Cleanup Service */}
            <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800">
              <div className="bg-indigo-100 dark:bg-indigo-900 w-12 h-12 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xl mb-6">
                2
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Email Cleanup Service
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Organize and clean your inbox by categorizing emails by year and
                sender.
              </p>
              <div className="space-y-4 mb-8">
                <div className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                  <span className="ml-3 text-gray-700 dark:text-gray-300">
                    Year-based organization of emails
                  </span>
                </div>
                <div className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                  <span className="ml-3 text-gray-700 dark:text-gray-300">
                    Filter by date or sender name
                  </span>
                </div>
                <div className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                  <span className="ml-3 text-gray-700 dark:text-gray-300">
                    Bulk delete old emails
                  </span>
                </div>
              </div>
              <Link to="/email-cleanup" className="inline-block bg-indigo-600 dark:bg-indigo-500 text-white px-6 py-3 rounded-md font-medium hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors">
                Learn More
              </Link>
            </div>
          </div>
          <div className="mt-16 text-center">
            <Link to="/email-cleanup" className="bg-indigo-600 dark:bg-indigo-500 text-white px-8 py-4 rounded-md font-medium hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors inline-block">
              Clean My Inbox Now
            </Link>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Your Privacy & Security Is Our Priority
              </h2>
              <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
                We built CleanInbox with security and privacy as our foundation.
                Here's how we keep your data safe:
              </p>
              <div className="mt-8 space-y-4">
                <div className="flex items-start">
                  <CheckIcon className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                  <div className="ml-3">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                      No Email Content Storage
                    </h3>
                    <p className="mt-1 text-gray-600 dark:text-gray-400">
                      We never store your email bodies or attachments. Only
                      sender info and metadata are kept for your dashboard.
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <CheckIcon className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                  <div className="ml-3">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                      Secure OAuth Authentication
                    </h3>
                    <p className="mt-1 text-gray-600 dark:text-gray-400">
                      We use industry-standard OAuth to connect to your email
                      provider without ever seeing your password.
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <CheckIcon className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                  <div className="ml-3">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                      Encrypted Connections
                    </h3>
                    <p className="mt-1 text-gray-600 dark:text-gray-400">
                      All communication between our servers and your email
                      provider is encrypted using TLS/SSL.
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <CheckIcon className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                  <div className="ml-3">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                      You Control Your Data
                    </h3>
                    <p className="mt-1 text-gray-600 dark:text-gray-400">
                      You can delete your account and all stored data at any time from your settings.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-white dark:bg-gray-900 rounded-lg p-8 shadow-sm border border-gray-100 dark:border-gray-800">
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center">
                      <LockIcon className="h-6 w-6 text-green-500" />
                      <span className="ml-2 text-lg font-medium text-gray-900 dark:text-gray-100">
                        Secure Connection
                      </span>
                    </div>
                    <div className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 text-xs px-2 py-1 rounded-full font-medium">
                      Active
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Data Processing
                      </h4>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Secure server-side processing with encrypted connections
                      </p>
                      <div className="mt-2 w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{
                        width: '100%'
                      }}></div>
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Data Storage
                      </h4>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Email content and passwords are never stored
                      </p>
                      <div className="mt-2 w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{
                        width: '0%'
                      }}></div>
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Connection
                      </h4>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Using OAuth 2.0 with your provider
                      </p>
                      <div className="mt-2 w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{
                        width: '100%'
                      }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              What Our Users Say
            </h2>
            <p className="mt-4 text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Thousands of people have reclaimed their inboxes with CleanInbox
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[{
            name: 'Sarah Johnson',
            role: 'Marketing Manager',
            content: 'I was getting over 50 marketing emails a day. CleanInbox helped me unsubscribe from 37 newsletters in just 5 minutes!'
          }, {
            name: 'Michael Chen',
            role: 'Software Developer',
            content: "The security features impressed me. I like that they don't store any of my data and use OAuth. Cleaned my inbox and kept my data private.",
            featured: true
          }, {
            name: 'Emily Rodriguez',
            role: 'Small Business Owner',
            content: "As someone who's not tech-savvy, I appreciate how easy CleanInbox is to use. Three clicks and my inbox is so much cleaner."
          }].map((testimonial, index) => <div key={index} className={`${testimonial.featured ? 'bg-indigo-50 dark:bg-indigo-950 border border-indigo-100 dark:border-indigo-800' : 'bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800'} p-8 rounded-lg shadow-sm`}>
                <div className="h-24">
                  <p className={`${testimonial.featured ? 'text-indigo-700 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400'}`}>
                    "{testimonial.content}"
                  </p>
                </div>
                <div className="mt-8 flex items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${testimonial.featured ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
                    {testimonial.name.charAt(0)}
                  </div>
                  <div className="ml-4">
                    <h4 className={`font-medium ${testimonial.featured ? 'text-gray-900 dark:text-gray-100' : 'text-gray-900 dark:text-gray-100'}`}>
                      {testimonial.name}
                    </h4>
                    <p className={testimonial.featured ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400'}>
                      {testimonial.role}
                    </p>
                  </div>
                </div>
              </div>)}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-indigo-50 dark:bg-indigo-950 border-t border-indigo-100 dark:border-indigo-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100">
              Ready to Clean Up Your Inbox?
            </h2>
            <p className="mt-4 text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Join thousands of users who have decluttered their inboxes and
              reclaimed their time.
            </p>
            <div className="mt-8">
              <Link to="/email-cleanup" className="bg-indigo-600 dark:bg-indigo-500 text-white px-8 py-4 rounded-md font-medium hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors inline-block">
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
    </div></>;
};
export default Home;