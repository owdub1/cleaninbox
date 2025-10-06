import React from 'react';
import { Link } from 'react-router-dom';
import { MailIcon, ShieldIcon, LockIcon } from 'lucide-react';
const Footer = () => {
  return <footer className="bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="mb-8 md:mb-0">
            <div className="flex items-center">
              <MailIcon className="h-7 w-7 text-indigo-400" />
              <span className="ml-2 text-xl font-bold">CleanInbox</span>
            </div>
            <p className="mt-4 text-gray-300 text-sm">
              Helping you take back control of your inbox by easily
              unsubscribing from unwanted emails.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Product
            </h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link to="/how-it-works" className="text-gray-300 hover:text-white">
                  How It Works
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-gray-300 hover:text-white">
                  Pricing
                </Link>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-white">
                  FAQ
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Company
            </h3>
            <ul className="mt-4 space-y-2">
              <li>
                <a href="#" className="text-gray-300 hover:text-white">
                  About Us
                </a>
              </li>
              <li>
                <Link to="/contact" className="text-gray-300 hover:text-white">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Legal
            </h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link to="/privacy-policy" className="text-gray-300 hover:text-white">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms-of-service" className="text-gray-300 hover:text-white">
                  Terms of Service
                </Link>
              </li>
              <li>
                <div className="flex items-center text-green-400 mt-4">
                  <ShieldIcon className="h-5 w-5 mr-2" />
                  <span className="text-sm">Your data is secure</span>
                </div>
                <div className="flex items-center text-green-400 mt-2">
                  <LockIcon className="h-5 w-5 mr-2" />
                  <span className="text-sm">End-to-end encrypted</span>
                </div>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-12 border-t border-gray-800 pt-8">
          <p className="text-gray-400 text-sm text-center">
            &copy; {new Date().getFullYear()} CleanInbox. All rights reserved.
          </p>
        </div>
      </div>
    </footer>;
};
export default Footer;