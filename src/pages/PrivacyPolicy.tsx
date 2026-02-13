import React, { Children } from 'react';
import { Link } from 'react-router-dom';
import { BookOpenIcon, ChevronRightIcon, ShieldIcon, LockIcon } from 'lucide-react';
const PrivacyPolicy = () => {
  return <div className="w-full bg-white dark:bg-gray-900">
      <section className="pt-12 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100">
              Privacy Policy
            </h1>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Last Updated:{' '}
              {new Date().toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })}
            </p>
          </div>
        </div>
      </section>
      <section className="py-12 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-md">
            <div className="flex items-center justify-center mb-8">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900 rounded-full">
                <ShieldIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h2 className="ml-3 text-xl font-bold text-gray-900 dark:text-gray-100">
                Your Privacy is Our Priority
              </h2>
            </div>
            <div className="prose max-w-none">
              <h2 className="text-xl font-semibold mb-4">1. Introduction</h2>
              <p className="mb-4">
                At CleanInbox, we take your privacy seriously. This Privacy
                Policy explains how we collect, use, disclose, and safeguard
                your information when you use our website and services. Please
                read this privacy policy carefully. If you do not agree with the
                terms of this privacy policy, please do not access the site.
              </p>
              <h2 className="text-xl font-semibold mb-4 mt-8">
                2. Information We Collect
              </h2>
              <h3 className="text-lg font-medium mb-2">Personal Data</h3>
              <p className="mb-4">
                When you register for an account, we collect:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Your name</li>
                <li>Email address</li>
                <li>
                  Payment information (processed securely through our payment
                  processors)
                </li>
              </ul>
              <h3 className="text-lg font-medium mb-2">Email Data</h3>
              <p className="mb-4">
                When you use our email management services, we process but do
                not store:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Email metadata (sender, subject lines, dates)</li>
                <li>Email content (only temporarily during processing)</li>
                <li>Subscription information</li>
              </ul>
              <div className="bg-green-50 dark:bg-green-900/30 border border-green-100 dark:border-green-800 rounded-md p-4 my-6 flex items-start">
                <LockIcon className="h-5 w-5 text-green-500 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-green-800 dark:text-green-400">
                    No Email Content Storage
                  </h4>
                  <p className="mt-1 text-sm text-green-700 dark:text-green-400">
                    We do not store your email bodies or attachments. We retain
                    only sender metadata (names, addresses, dates, subject lines)
                    to power your dashboard and cleanup tools.
                  </p>
                </div>
              </div>
              <h2 className="text-xl font-semibold mb-4 mt-8">
                3. How We Use Your Information
              </h2>
              <p className="mb-4">We use the information we collect to:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>Provide, maintain, and improve our services</li>
                <li>Process transactions and send related information</li>
                <li>
                  Send you technical notices, updates, and support messages
                </li>
                <li>Respond to your comments and questions</li>
                <li>Monitor and analyze trends, usage, and activities</li>
              </ul>
              <h2 className="text-xl font-semibold mb-4 mt-8">
                4. How We Protect Your Information
              </h2>
              <p className="mb-4">
                We implement appropriate technical and organizational security
                measures to protect your information, including:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Using OAuth for secure authentication</li>
                <li>End-to-end encryption for all data transfers</li>
                <li>Regular security assessments</li>
                <li>Strict access controls for our staff</li>
              </ul>
              <h2 className="text-xl font-semibold mb-4 mt-8">
                5. Data Retention
              </h2>
              <p className="mb-4">
                We retain your account information for as long as your account
                is active or as needed to provide you services. We will delete
                or anonymize your information upon request or when your account
                is deleted, except where we have a legal obligation to retain
                certain data.
              </p>
              <h2 className="text-xl font-semibold mb-4 mt-8">
                6. Your Rights
              </h2>
              <p className="mb-4">
                Depending on your location, you may have certain rights
                regarding your personal information, including:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>
                  The right to access personal information we hold about you
                </li>
                <li>
                  The right to request correction of your personal information
                </li>
                <li>
                  The right to request deletion of your personal information
                </li>
                <li>
                  The right to object to processing of your personal information
                </li>
                <li>The right to data portability</li>
              </ul>
              <h2 className="text-xl font-semibold mb-4 mt-8">
                7. Cookies and Tracking Technologies
              </h2>
              <p className="mb-4">
                We use cookies and similar tracking technologies to track
                activity on our Service and hold certain information. You can
                instruct your browser to refuse all cookies or to indicate when
                a cookie is being sent.
              </p>
              <h2 className="text-xl font-semibold mb-4 mt-8">
                8. Third-Party Services
              </h2>
              <p className="mb-4">
                Our service may contain links to third-party websites or
                services that are not owned or controlled by CleanInbox. We have
                no control over, and assume no responsibility for, the content,
                privacy policies, or practices of any third-party websites or
                services.
              </p>
              <h2 className="text-xl font-semibold mb-4 mt-8">
                9. Children's Privacy
              </h2>
              <p className="mb-4">
                Our Services are not intended for use by children under the age
                of 13. We do not knowingly collect personally identifiable
                information from children under 13.
              </p>
              <h2 className="text-xl font-semibold mb-4 mt-8">
                10. Changes to This Privacy Policy
              </h2>
              <p className="mb-4">
                We may update our Privacy Policy from time to time. We will
                notify you of any changes by posting the new Privacy Policy on
                this page and updating the "Last Updated" date.
              </p>
              <h2 className="text-xl font-semibold mb-4 mt-8">
                11. Contact Us
              </h2>
              <p className="mb-4">
                If you have any questions about this Privacy Policy, please
                contact us at privacy@cleaninbox.com.
              </p>
            </div>
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <Link to="/terms-of-service" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center">
                  <BookOpenIcon className="h-5 w-5 mr-2" />
                  Terms of Service
                </Link>
                <Link to="/" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center">
                  Return to Home
                  <ChevronRightIcon className="h-5 w-5 ml-1" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>;
};
export default PrivacyPolicy;