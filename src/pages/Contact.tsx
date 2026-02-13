import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MailIcon, SendIcon, CheckCircleIcon } from 'lucide-react';
const Contact = () => {
  const [formSubmitted, setFormSubmitted] = useState(false);
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
  const handleSubmit = e => {
    e.preventDefault();
    // In a real app, you would send the form data to your backend
    console.log(formData);
    setFormSubmitted(true);
    setFormData({
      name: '',
      email: '',
      subject: '',
      message: ''
    });
  };
  return <div className="w-full bg-white">
      {/* Header - Redesigned without gradient */}
      <section className="pt-12 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl md:text-5xl font-bold text-gray-900">
              Get In Touch
            </h1>
            <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
              Have questions or feedback? We'd love to hear from you.
            </p>
          </div>
        </div>
      </section>
      {/* Contact Form and Info */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Contact Us</h2>
              <p className="mt-4 text-lg text-gray-600">
                Fill out the form and our team will get back to you within 24
                hours.
              </p>
              <div className="mt-8 space-y-6">
                <div className="flex items-start">
                  <MailIcon className="h-6 w-6 text-indigo-600 mt-1 flex-shrink-0" />
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">Email</h3>
                    <p className="mt-1 text-gray-600">support@cleaninbox.com</p>
                  </div>
                </div>
              </div>
            </div>
            <div>
              {formSubmitted ? <div className="bg-white p-8 rounded-lg shadow-md">
                  <div className="text-center">
                    <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
                      <CheckCircleIcon className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="mt-6 text-xl font-medium text-gray-900">
                      Thank you for your message!
                    </h3>
                    <p className="mt-2 text-gray-600">
                      We've received your message and will get back to you as
                      soon as possible.
                    </p>
                    <div className="mt-6">
                      <button onClick={() => setFormSubmitted(false)} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                        Send another message
                      </button>
                    </div>
                  </div>
                </div> : <div className="bg-white p-8 rounded-lg shadow-md">
                  <form onSubmit={handleSubmit}>
                    <div className="space-y-6">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                          Name
                        </label>
                        <div className="mt-1">
                          <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-3 border" placeholder="Your name" required />
                        </div>
                      </div>
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                          Email
                        </label>
                        <div className="mt-1">
                          <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-3 border" placeholder="your.email@example.com" required />
                        </div>
                      </div>
                      <div>
                        <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                          Subject
                        </label>
                        <div className="mt-1">
                          <input type="text" name="subject" id="subject" value={formData.subject} onChange={handleChange} className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-3 border" placeholder="How can we help you?" required />
                        </div>
                      </div>
                      <div>
                        <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                          Message
                        </label>
                        <div className="mt-1">
                          <textarea id="message" name="message" rows={6} value={formData.message} onChange={handleChange} className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-3 border" placeholder="Your message" required />
                        </div>
                      </div>
                      <div>
                        <button type="submit" className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 w-full justify-center">
                          <SendIcon className="h-5 w-5 mr-2" />
                          Send Message
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
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">
              Frequently Asked Questions
            </h2>
            <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
              Find quick answers to common questions
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-gray-50 p-8 rounded-lg">
              <h3 className="text-xl font-semibold text-gray-900">
                How secure is CleanInbox?
              </h3>
              <p className="mt-4 text-gray-600">
                Very secure. We use OAuth for authentication, never store your
                emails or credentials, and all processing happens in real-time
                with end-to-end encryption.
              </p>
            </div>
            <div className="bg-gray-50 p-8 rounded-lg">
              <h3 className="text-xl font-semibold text-gray-900">
                Which email providers do you support?
              </h3>
              <p className="mt-4 text-gray-600">
                We support all major email providers including Gmail, Outlook,
                Yahoo, and any custom IMAP/SMTP email service.
              </p>
            </div>
            <div className="bg-gray-50 p-8 rounded-lg">
              <h3 className="text-xl font-semibold text-gray-900">
                How do I cancel my subscription?
              </h3>
              <p className="mt-4 text-gray-600">
                You can cancel your subscription at any time from your account
                settings. There are no long-term contracts or cancellation fees.
              </p>
            </div>
            <div className="bg-gray-50 p-8 rounded-lg">
              <h3 className="text-xl font-semibold text-gray-900">
                What payment methods do you accept?
              </h3>
              <p className="mt-4 text-gray-600">
                We accept payments through PayPal and Stripe for maximum
                security and convenience. Your payment information is never
                stored on our servers.
              </p>
            </div>
          </div>
          <div className="mt-12 text-center">
            <p className="text-gray-600">
              Can't find what you're looking for?{' '}
              <Link to="/contact" className="text-indigo-600 font-medium hover:text-indigo-500">
                Contact our support team
              </Link>
            </p>
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
          </div>
        </div>
      </section>
    </div>;
};
export default Contact;