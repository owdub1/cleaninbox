import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MailIcon, SendIcon, CheckCircleIcon, Loader2 } from 'lucide-react';
import { API_URL } from '../lib/api';
const Contact = () => {
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const handleChange = e => {
    const {
      name,
      value
    } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/api/contact/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send message');
      }
      setFormSubmitted(true);
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  };
  return <div className="w-full bg-white dark:bg-gray-900">
      {/* Header - Redesigned without gradient */}
      <section className="pt-12 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-gray-100">
              Get In Touch
            </h1>
            <p className="mt-4 text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Have questions or feedback? We'd love to hear from you.
            </p>
          </div>
        </div>
      </section>
      {/* Contact Form and Info */}
      <section className="py-12 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Contact Us</h2>
              <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
                Fill out the form and our team will get back to you within 24
                hours.
              </p>
              <div className="mt-8 space-y-6">
                <div className="flex items-start">
                  <MailIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400 mt-1 flex-shrink-0" />
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Email</h3>
                    <p className="mt-1 text-gray-600 dark:text-gray-400">support@cleaninbox.com</p>
                  </div>
                </div>
              </div>
            </div>
            <div>
              {formSubmitted ? <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-md">
                  <div className="text-center">
                    <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30">
                      <CheckCircleIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="mt-6 text-xl font-medium text-gray-900 dark:text-gray-100">
                      Thank you for your message!
                    </h3>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">
                      We've received your message and will get back to you as
                      soon as possible.
                    </p>
                    <div className="mt-6">
                      <button onClick={() => setFormSubmitted(false)} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                        Send another message
                      </button>
                    </div>
                  </div>
                </div> : <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-md">
                  <form onSubmit={handleSubmit}>
                    <div className="space-y-6">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Name
                        </label>
                        <div className="mt-1">
                          <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-3 border dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400" placeholder="Your name" required />
                        </div>
                      </div>
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Email
                        </label>
                        <div className="mt-1">
                          <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-3 border dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400" placeholder="your.email@example.com" required />
                        </div>
                      </div>
                      <div>
                        <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Subject
                        </label>
                        <div className="mt-1">
                          <input type="text" name="subject" id="subject" value={formData.subject} onChange={handleChange} className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-3 border dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400" placeholder="How can we help you?" required />
                        </div>
                      </div>
                      <div>
                        <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Message
                        </label>
                        <div className="mt-1">
                          <textarea id="message" name="message" rows={6} value={formData.message} onChange={handleChange} className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-3 border dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400" placeholder="Your message" required />
                        </div>
                      </div>
                      {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-3 rounded-md text-sm">
                          {error}
                        </div>
                      )}
                      <div>
                        <button type="submit" disabled={sending} className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed">
                          {sending ? (
                            <>
                              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <SendIcon className="h-5 w-5 mr-2" />
                              Send Message
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>}
            </div>
          </div>
        </div>
      </section>
      {/* FAQ Section */}
      <section className="py-16 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Frequently Asked Questions
            </h2>
            <p className="mt-4 text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Find quick answers to common questions
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-gray-50 dark:bg-gray-800 p-8 rounded-lg">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                How secure is CleanInbox?
              </h3>
              <p className="mt-4 text-gray-600 dark:text-gray-400">
                We use OAuth for authentication, never store your email content, and all connections are secured with TLS encryption.
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 p-8 rounded-lg">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Which email providers do you support?
              </h3>
              <p className="mt-4 text-gray-600 dark:text-gray-400">
                We currently support Gmail. Support for Outlook and Yahoo is coming soon.
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 p-8 rounded-lg">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                How do I cancel my subscription?
              </h3>
              <p className="mt-4 text-gray-600 dark:text-gray-400">
                You can cancel your subscription at any time from your account
                settings. There are no long-term contracts or cancellation fees.
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 p-8 rounded-lg">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                What payment methods do you accept?
              </h3>
              <p className="mt-4 text-gray-600 dark:text-gray-400">
                We accept payments through Stripe for maximum security and convenience. Your payment information is never stored on our servers.
              </p>
            </div>
          </div>
          <div className="mt-12 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              Can't find what you're looking for?{' '}
              <Link to="/contact" className="text-indigo-600 dark:text-indigo-400 font-medium hover:text-indigo-500 dark:hover:text-indigo-300">
                Contact our support team
              </Link>
            </p>
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
          </div>
        </div>
      </section>
    </div>;
};
export default Contact;