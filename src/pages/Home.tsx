import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldIcon, CheckIcon, LockIcon, MailIcon, MailOpenIcon, UserIcon, CheckCircleIcon, FolderIcon, FilterIcon } from 'lucide-react';
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
  return <div className="w-full bg-white">
      {/* Hero Section - Redesigned without the blue header */}
      <section className="pt-16 pb-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold leading-tight text-gray-900">
                Take Back Control of Your Inbox
              </h1>
              <p className="mt-6 text-xl text-gray-600">
                Unsubscribe from newsletters and marketing emails quickly — one click for supported senders, easy links for the rest.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Link to="/email-cleanup" className="bg-indigo-600 text-white px-6 py-3 rounded-md font-medium hover:bg-indigo-700 transition-colors text-center">
                  Clean My Inbox Now
                </Link>
                <Link to="/how-it-works" className="bg-gray-100 text-gray-800 px-6 py-3 rounded-md font-medium hover:bg-gray-200 transition-colors text-center">
                  How It Works
                </Link>
              </div>
              <div className="mt-8 flex items-center">
                <ShieldIcon className="h-5 w-5 text-indigo-600" />
                <span className="ml-2 text-gray-600">
                  Your email content is never stored or shared
                </span>
              </div>
            </div>
            <div className="hidden md:block relative">
              <div className="bg-white rounded-lg shadow-xl p-6 transform rotate-2 border border-gray-100">
                <div className="flex items-center mb-4">
                  <MailIcon className="h-6 w-6 text-indigo-600" />
                  <h3 className="ml-2 text-lg font-semibold text-gray-800">
                    Your Subscriptions
                  </h3>
                </div>
                <div className="space-y-3">
                  {subscriptions.map((item, index) => <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                      <span className="text-gray-700">{item.name}</span>
                      <button className={`text-sm ${item.subscribed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'} 
                          px-3 py-1 rounded-full font-medium transition-colors`} onClick={() => toggleSubscription(index)}>
                        {item.subscribed ? 'Subscribe' : 'Unsubscribe'}
                      </button>
                    </div>)}
                </div>
              </div>
              <div className="absolute -bottom-6 -left-6 bg-green-100 text-green-800 rounded-full px-4 py-2 font-medium flex items-center shadow-lg">
                <CheckCircleIcon className="h-5 w-5 mr-1" />
                {subscriptions.filter(s => !s.subscribed).length}{' '}
                Subscriptions Removed
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">
              Why Choose CleanInbox?
            </h2>
            <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
              We make it incredibly easy to declutter your inbox while keeping
              your data private and secure.
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100 text-center">
              <div className="bg-indigo-100 w-16 h-16 mx-auto rounded-full flex items-center justify-center">
                <LockIcon className="h-8 w-8 text-indigo-600" />
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">
                Secure & Private
              </h3>
              <p className="mt-4 text-gray-600">
                We never store your emails or credentials. All connections are secured with TLS encryption.
              </p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100 text-center">
              <div className="bg-indigo-100 w-16 h-16 mx-auto rounded-full flex items-center justify-center">
                <MailOpenIcon className="h-8 w-8 text-indigo-600" />
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">
                One-Click Unsubscribe
              </h3>
              <p className="mt-4 text-gray-600">
                Unsubscribe from multiple newsletters and marketing emails with
                a single click. No more hunting for tiny unsubscribe links.
              </p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100 text-center">
              <div className="bg-indigo-100 w-16 h-16 mx-auto rounded-full flex items-center justify-center">
                <FolderIcon className="h-8 w-8 text-indigo-600" />
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">
                Email Cleanup
              </h3>
              <p className="mt-4 text-gray-600">
                Organize emails by year and sender. Easily identify and remove
                old emails with our powerful categorization tools.
              </p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100 text-center">
              <div className="bg-indigo-100 w-16 h-16 mx-auto rounded-full flex items-center justify-center">
                <UserIcon className="h-8 w-8 text-indigo-600" />
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">
                Works With Gmail
              </h3>
              <p className="mt-4 text-gray-600">
                Connect your Gmail account and let CleanInbox analyze your inbox.
                Simple setup with secure OAuth authentication.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">Our Services</h2>
            <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
              Two powerful ways to manage your inbox
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-12">
            {/* Unsubscribe Service */}
            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100">
              <div className="bg-indigo-100 w-12 h-12 rounded-full flex items-center justify-center text-indigo-600 font-bold text-xl mb-6">
                1
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                Unsubscribe Service
              </h3>
              <p className="text-gray-600 mb-6">
                Automatically unsubscribe from unwanted emails and newsletters
                with just a few clicks.
              </p>
              <div className="space-y-4 mb-8">
                <div className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                  <span className="ml-3 text-gray-700">
                    One-click unsubscribe from multiple senders
                  </span>
                </div>
                <div className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                  <span className="ml-3 text-gray-700">
                    Supports one-click and email-based unsubscribe methods
                  </span>
                </div>
                <div className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                  <span className="ml-3 text-gray-700">
                    Confirms the unsubscribe request was sent successfully
                  </span>
                </div>
              </div>
              <Link to="/how-it-works" className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-md font-medium hover:bg-indigo-700 transition-colors">
                Learn More
              </Link>
            </div>
            {/* Email Cleanup Service */}
            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100">
              <div className="bg-indigo-100 w-12 h-12 rounded-full flex items-center justify-center text-indigo-600 font-bold text-xl mb-6">
                2
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                Email Cleanup Service
              </h3>
              <p className="text-gray-600 mb-6">
                Organize and clean your inbox by categorizing emails by year and
                sender.
              </p>
              <div className="space-y-4 mb-8">
                <div className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                  <span className="ml-3 text-gray-700">
                    Year-based organization of emails
                  </span>
                </div>
                <div className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                  <span className="ml-3 text-gray-700">
                    Filter by date or sender name
                  </span>
                </div>
                <div className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                  <span className="ml-3 text-gray-700">
                    Bulk delete old emails
                  </span>
                </div>
              </div>
              <Link to="/email-cleanup" className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-md font-medium hover:bg-indigo-700 transition-colors">
                Learn More
              </Link>
            </div>
          </div>
          <div className="mt-16 text-center">
            <Link to="/email-cleanup" className="bg-indigo-600 text-white px-8 py-4 rounded-md font-medium hover:bg-indigo-700 transition-colors inline-block">
              Clean My Inbox Now
            </Link>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">
                Your Privacy & Security Is Our Priority
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                We built CleanInbox with security and privacy as our foundation.
                Here's how we keep your data safe:
              </p>
              <div className="mt-8 space-y-4">
                <div className="flex items-start">
                  <CheckIcon className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                  <div className="ml-3">
                    <h3 className="text-lg font-medium text-gray-900">
                      No Email Content Storage
                    </h3>
                    <p className="mt-1 text-gray-600">
                      We never store your email bodies or attachments. Only
                      sender info and metadata are kept for your dashboard.
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <CheckIcon className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                  <div className="ml-3">
                    <h3 className="text-lg font-medium text-gray-900">
                      Secure OAuth Authentication
                    </h3>
                    <p className="mt-1 text-gray-600">
                      We use industry-standard OAuth to connect to your email
                      provider without ever seeing your password.
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <CheckIcon className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                  <div className="ml-3">
                    <h3 className="text-lg font-medium text-gray-900">
                      Encrypted Connections
                    </h3>
                    <p className="mt-1 text-gray-600">
                      All communication between our servers and your email
                      provider is encrypted using TLS/SSL.
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <CheckIcon className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                  <div className="ml-3">
                    <h3 className="text-lg font-medium text-gray-900">
                      No Data Retention
                    </h3>
                    <p className="mt-1 text-gray-600">
                      You can delete your account and all stored data at any time from your settings.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-100">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center">
                      <LockIcon className="h-6 w-6 text-green-500" />
                      <span className="ml-2 text-lg font-medium text-gray-900">
                        Secure Connection
                      </span>
                    </div>
                    <div className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                      Active
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-md">
                      <h4 className="text-sm font-medium text-gray-700">
                        Data Processing
                      </h4>
                      <p className="mt-1 text-sm text-gray-600">
                        Secure server-side processing with encrypted connections
                      </p>
                      <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{
                        width: '100%'
                      }}></div>
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-md">
                      <h4 className="text-sm font-medium text-gray-700">
                        Data Storage
                      </h4>
                      <p className="mt-1 text-sm text-gray-600">
                        Email content and passwords are never stored
                      </p>
                      <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{
                        width: '0%'
                      }}></div>
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-md">
                      <h4 className="text-sm font-medium text-gray-700">
                        Connection
                      </h4>
                      <p className="mt-1 text-sm text-gray-600">
                        Using OAuth 2.0 with your provider
                      </p>
                      <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
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
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">
              What Our Users Say
            </h2>
            <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
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
          }].map((testimonial, index) => <div key={index} className={`${testimonial.featured ? 'bg-indigo-50 border border-indigo-100' : 'bg-white border border-gray-100'} p-8 rounded-lg shadow-sm`}>
                <div className="h-24">
                  <p className={`${testimonial.featured ? 'text-indigo-700' : 'text-gray-600'}`}>
                    "{testimonial.content}"
                  </p>
                </div>
                <div className="mt-8 flex items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${testimonial.featured ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-700'}`}>
                    {testimonial.name.charAt(0)}
                  </div>
                  <div className="ml-4">
                    <h4 className={`font-medium ${testimonial.featured ? 'text-gray-900' : 'text-gray-900'}`}>
                      {testimonial.name}
                    </h4>
                    <p className={testimonial.featured ? 'text-indigo-600' : 'text-gray-600'}>
                      {testimonial.role}
                    </p>
                  </div>
                </div>
              </div>)}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-indigo-50 border-t border-indigo-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Ready to Clean Up Your Inbox?
            </h2>
            <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
              Join thousands of users who have decluttered their inboxes and
              reclaimed their time.
            </p>
            <div className="mt-8">
              <Link to="/email-cleanup" className="bg-indigo-600 text-white px-8 py-4 rounded-md font-medium hover:bg-indigo-700 transition-colors inline-block">
                Clean My Inbox Now
              </Link>
            </div>
            <p className="mt-6 text-gray-600 flex items-center justify-center">
              <ShieldIcon className="h-5 w-5 mr-2 text-indigo-600" />
              <span>Your email content is never stored or shared</span>
            </p>
          </div>
        </div>
      </section>
    </div>;
};
export default Home;