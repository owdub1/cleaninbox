import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpenIcon, ChevronRightIcon } from 'lucide-react';
const TermsOfService = () => {
  return <div className="w-full bg-white dark:bg-gray-900">
      <section className="pt-12 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100">
              Terms of Service
            </h1>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Last Updated:{' '}
March 1, 2026
            </p>
          </div>
        </div>
      </section>
      <section className="py-12 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-md">
            <div className="prose max-w-none">
              <h2 className="text-xl font-semibold mb-4">1. Introduction</h2>
              <p className="mb-4">
                Welcome to CleanInbox. These Terms of Service ("Terms") govern
                your use of our website, products, and services ("Services"). By
                using our Services, you agree to these Terms. If you disagree
                with any part of the terms, you may not access the Services.
              </p>
              <h2 className="text-xl font-semibold mb-4 mt-8">
                2. Use of Services
              </h2>
              <p className="mb-4">
                Our Services are designed to help you manage your email
                subscriptions and clean up your inbox. You may use our Services
                only as permitted by law and according to these Terms. We may
                suspend or stop providing our Services to you if you do not
                comply with our terms or policies or if we are investigating
                suspected misconduct.
              </p>
              <h2 className="text-xl font-semibold mb-4 mt-8">
                3. Privacy Policy
              </h2>
              <p className="mb-4">
                Please refer to our{' '}
                <Link to="/privacy-policy" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300">
                  Privacy Policy
                </Link>{' '}
                for information on how we collect, use, and disclose information
                from our users. By using our Services, you agree to the
                collection and use of information in accordance with this
                policy.
              </p>
              <h2 className="text-xl font-semibold mb-4 mt-8">
                4. Account Security
              </h2>
              <p className="mb-4">
                When you create an account with us, you must provide accurate
                and complete information. You are responsible for safeguarding
                the password that you use to access the Services and for any
                activities or actions under your password. We encourage you to
                use "strong" passwords (passwords that use a combination of
                upper and lower case letters, numbers, and symbols) with your
                account.
              </p>
              <h2 className="text-xl font-semibold mb-4 mt-8">
                5. Subscription and Billing
              </h2>
              <p className="mb-4">
                Some of our Services are billed on a subscription basis. You
                will be billed in advance on a recurring basis, depending on the
                type of subscription plan you select. We may change the fees for
                our Services at any time, but will provide you with advance
                notice of these changes via email.
              </p>
              <h2 className="text-xl font-semibold mb-4 mt-8">
                6. Cancellation and Refunds
              </h2>
              <p className="mb-4">
                You may cancel your subscription at any time through your
                account settings. Upon cancellation, you will continue to have
                access to the Services through the end of your billing period.
                We do not provide refunds for partial subscription periods,
                except where required by law.
              </p>
              <h2 className="text-xl font-semibold mb-4 mt-8">
                7. Modifications to the Service and Terms
              </h2>
              <p className="mb-4">
                We reserve the right to modify or discontinue, temporarily or
                permanently, the Services (or any part thereof) with or without
                notice. We may also modify these Terms from time to time. We
                will notify you of any material changes by posting the new Terms
                on the Site and/or sending you an email.
              </p>
              <h2 className="text-xl font-semibold mb-4 mt-8">
                8. Limitation of Liability
              </h2>
              <p className="mb-4">
                In no event shall CleanInbox, nor its directors, employees,
                partners, agents, suppliers, or affiliates, be liable for any
                indirect, incidental, special, consequential or punitive
                damages, including without limitation, loss of profits, data,
                use, goodwill, or other intangible losses, resulting from your
                access to or use of or inability to access or use the Services.
              </p>
              <h2 className="text-xl font-semibold mb-4 mt-8">
                9. Governing Law
              </h2>
              <p className="mb-4">
                These Terms shall be governed and construed in accordance with
                the laws of the Province of Quebec, Canada, without regard to its conflict
                of law provisions.
              </p>
              <h2 className="text-xl font-semibold mb-4 mt-8">
                10. Contact Us
              </h2>
              <p className="mb-4">
                If you have any questions about these Terms, please contact us
                at support@cleaninbox.com.
              </p>
            </div>
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <Link to="/privacy-policy" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center">
                  <BookOpenIcon className="h-5 w-5 mr-2" />
                  Privacy Policy
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
export default TermsOfService;