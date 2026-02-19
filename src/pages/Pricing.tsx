import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckIcon, XIcon, CreditCardIcon, ShieldIcon, ZapIcon, SparklesIcon } from 'lucide-react';
const Pricing = () => {
  const [billingCycle, setBillingCycle] = useState('monthly');
  const toggleBillingCycle = () => {
    setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly');
  };
  const plans = [{
    name: 'Basic',
    description: 'For individuals with light email usage',
    price: billingCycle === 'monthly' ? '$7.99' : '$6.39',
    features: ['Import up to 5,000 emails total', 'Connect up to 2 email accounts', 'One-click unsubscribe', 'Email support', 'Sender statistics and email counts'],
    notIncluded: [],
    popular: false,
    gradient: 'from-blue-500 to-cyan-500'
  }, {
    name: 'Pro',
    description: 'For professionals with moderate email volume',
    price: billingCycle === 'monthly' ? '$14.99' : '$11.99',
    features: ['Import up to 15,000 emails total', 'Connect up to 3 email accounts', 'One-click unsubscribe', 'Email support', 'Detailed sender insights and Top Senders view'],
    notIncluded: [],
    popular: true,
    gradient: 'from-orange-500 to-red-600'
  }, {
    name: 'Unlimited',
    description: 'For businesses with high email volume',
    price: billingCycle === 'monthly' ? '$24.99' : '$19.99',
    features: ['Unlimited email importing', 'Connect up to 5 email accounts', 'One-click unsubscribe', 'Email support', 'Detailed sender insights and Top Senders view'],
    notIncluded: [],
    popular: false,
    gradient: 'from-gray-800 to-gray-900'
  }];
  // Quick clean option
  const quickClean = {
    name: 'Quick Clean',
    description: 'One-time cleanup service',
    price: '$19.99',
    features: ['Process up to 3,000 emails', 'Connect 1 email account', 'Standard unsubscribe speed', 'One-time payment', 'Basic analytics', 'Valid for 30 days'],
    cta: 'Buy Now'
  };
  return <div className="w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Simple, Transparent Pricing
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Choose the plan that works best for your email cleanup needs
            </p>
            {/* Billing toggle */}
            <div className="mt-10 flex justify-center items-center">
              <span className={`mr-3 ${billingCycle === 'monthly' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>
                Monthly
              </span>
              <button onClick={toggleBillingCycle} className="relative inline-flex h-6 w-11 items-center rounded-full bg-indigo-600">
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${billingCycle === 'annual' ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
              <span className={`ml-3 flex items-center ${billingCycle === 'annual' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>
                Annual
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-300">
                  Save 20%
                </span>
              </span>
            </div>
          </div>
          {/* Subscription Plans */}
          <div className="mt-16 grid gap-8 lg:grid-cols-3">
            {plans.map((plan, index) => <Link key={index} to={`/checkout?plan=${plan.name.toLowerCase()}&billing=${billingCycle}`} className={`rounded-lg overflow-hidden bg-gradient-to-br ${plan.gradient} border border-transparent shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-xl`}>
                <div className="p-8 h-full flex flex-col text-white">
                  <div className="flex justify-between items-start">
                    <h3 className="text-2xl font-bold">{plan.name}</h3>
                    {plan.popular && <div className="flex items-center bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                        <SparklesIcon className="h-4 w-4 mr-1 text-yellow-300" />
                        <span className="text-sm font-medium">
                          Most Popular
                        </span>
                      </div>}
                  </div>
                  <p className="mt-2 text-white/80">{plan.description}</p>
                  <p className="mt-6">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="ml-2 opacity-80">
                      /
                      {billingCycle === 'monthly' ? 'month' : 'billed annually'}
                    </span>
                  </p>
                  <ul className="mt-8 space-y-4 flex-grow">
                    {plan.features.map((feature, idx) => <li key={idx} className="flex items-start">
                        <CheckIcon className="h-5 w-5 text-white mt-0.5 flex-shrink-0" />
                        <span className="ml-3 text-white/90">{feature}</span>
                      </li>)}
                    {plan.notIncluded.map((feature, idx) => <li key={idx} className="flex items-start">
                        <XIcon className="h-5 w-5 text-white/50 mt-0.5 flex-shrink-0" />
                        <span className="ml-3 text-white/50">{feature}</span>
                      </li>)}
                  </ul>
                </div>
              </Link>)}
          </div>
          {/* One-time quick clean option */}
          <div className="mt-16">
            <Link to="/checkout?plan=onetime" className="block w-full max-w-full mx-auto rounded-lg overflow-hidden bg-gradient-to-r from-purple-500 to-purple-700 border border-purple-400 shadow-lg transform transition-all duration-300 hover:scale-[1.02] hover:shadow-xl">
              <div className="p-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center">
                      <ZapIcon className="h-6 w-6 text-yellow-400 mr-2" />
                      <h3 className="text-2xl font-bold text-white">
                        {quickClean.name}
                      </h3>
                    </div>
                    <p className="mt-2 text-purple-100">
                      {quickClean.description}
                    </p>
                  </div>
                  <div>
                    <p className="mt-4">
                      <span className="text-3xl font-bold text-white">
                        {quickClean.price}
                      </span>
                    </p>
                    <p className="text-purple-100 text-sm">one-time payment</p>
                  </div>
                </div>
                <ul className="mt-8 grid grid-cols-2 md:grid-cols-3 gap-4">
                  {quickClean.features.map((feature, idx) => <li key={idx} className="flex items-start">
                      <CheckIcon className="h-5 w-5 text-purple-100 mt-0.5 flex-shrink-0" />
                      <span className="ml-3 text-white">{feature}</span>
                    </li>)}
                </ul>
              </div>
            </Link>
          </div>
        </div>
      </section>
      {/* FAQ Section */}
      <section className="py-16 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Frequently Asked Questions
            </h2>
            <p className="mt-4 text-xl text-gray-600 dark:text-gray-400">
              Everything you need to know about our pricing and plans
            </p>
          </div>
          <div className="space-y-8">
            {[{
            question: 'Can I change plans later?',
            answer: 'Yes, you can upgrade or downgrade your plan at any time. Changes will be applied to your next billing cycle.'
          }, {
            question: 'What happens when I reach my email processing limit?',
            answer: 'Once you reach your email import limit, you can upgrade your plan to process more emails.'
          }, {
            question: 'Is there a free trial?',
            answer: 'Yes! You get 5 free cleanup actions to try the service before purchasing a plan.'
          }, {
            question: 'How do I cancel my subscription?',
            answer: 'You can cancel your subscription anytime from your account dashboard. Your service will continue until the end of your current billing period.'
          }, {
            question: 'What payment methods do you accept?',
            answer: 'We accept all major credit cards through Stripe.'
          }].map((faq, index) => <div key={index} className="bg-white dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  {faq.question}
                </h3>
                <p className="mt-2 text-gray-600 dark:text-gray-400">{faq.answer}</p>
              </div>)}
          </div>
        </div>
      </section>
      {/* CTA Section */}
      <section className="py-16 bg-indigo-600">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Ready to Clean Up Your Inbox?
          </h2>
          <p className="text-xl text-indigo-100 mb-8 max-w-3xl mx-auto">
            Join thousands of users who have decluttered their inboxes and
            reclaimed their time.
          </p>
          <Link to="/email-cleanup" className="inline-block bg-white text-indigo-600 px-8 py-4 rounded-md font-medium hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors">
            Clean My Inbox Now
          </Link>
          <div className="mt-6 flex items-center justify-center text-indigo-100">
            <ShieldIcon className="h-5 w-5 mr-2" />
            <span>Your email content is never stored or shared</span>
          </div>
        </div>
      </section>
    </div>;
};
export default Pricing;