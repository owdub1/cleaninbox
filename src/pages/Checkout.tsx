import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LockIcon, CheckCircleIcon, ShieldIcon, ChevronRightIcon, CreditCardIcon, TagIcon, ZapIcon } from 'lucide-react';
const Checkout = () => {
  const [step, setStep] = useState(1);
  const location = useLocation();
  const [selectedPlan, setSelectedPlan] = useState({
    name: 'Pro',
    price: '$19.99',
    billing: 'monthly'
  });
  const [discountCode, setDiscountCode] = useState('');
  const [discountApplied, setDiscountApplied] = useState(false);
  const [discountError, setDiscountError] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  useEffect(() => {
    // Get the plan from URL parameters
    const params = new URLSearchParams(location.search);
    const planId = params.get('plan');
    const billing = params.get('billing') || 'monthly';
    // Handle one-time payment option
    if (planId === 'onetime') {
      const basePrice = 25;
      const finalPrice = `$${basePrice.toFixed(2)}`;
      setSelectedPlan({
        name: 'Quick Clean',
        price: finalPrice,
        billing: 'one-time'
      });
      setOriginalPrice(finalPrice);
      return;
    }
    // Calculate price based on plan and billing cycle
    let basePrice = '19.99';
    if (planId === 'basic') {
      basePrice = '9.99';
    } else if (planId === 'unlimited') {
      basePrice = '39.99';
    }
    // Apply 20% discount for annual billing (changed from 10%)
    const finalPrice = billing === 'annual' ? `$${(parseFloat(basePrice) * 0.8).toFixed(2)}` : `$${basePrice}`;
    setOriginalPrice(finalPrice);
    // Set the plan based on the URL parameter
    if (planId === 'basic') {
      setSelectedPlan({
        name: 'Basic',
        price: finalPrice,
        billing: billing
      });
    } else if (planId === 'pro') {
      setSelectedPlan({
        name: 'Pro',
        price: finalPrice,
        billing: billing
      });
    } else if (planId === 'unlimited') {
      setSelectedPlan({
        name: 'Unlimited',
        price: finalPrice,
        billing: billing
      });
    }
  }, [location]);
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    paymentMethod: 'stripe'
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
  const handleDiscountChange = e => {
    setDiscountCode(e.target.value);
    if (discountApplied) {
      setDiscountApplied(false);
      setSelectedPlan({
        ...selectedPlan,
        price: originalPrice
      });
    }
    setDiscountError('');
  };
  const applyDiscount = () => {
    if (!discountCode.trim()) {
      setDiscountError('Please enter a discount code');
      return;
    }
    // Simulate discount code validation
    if (discountCode.toLowerCase() === 'clean25') {
      // Apply 25% discount
      const price = originalPrice;
      const numericPrice = parseFloat(price.replace('$', ''));
      const discountedPrice = (numericPrice * 0.75).toFixed(2);
      setSelectedPlan({
        ...selectedPlan,
        price: `$${discountedPrice}`
      });
      setDiscountApplied(true);
      setDiscountError('');
    } else {
      setDiscountError('Invalid discount code');
    }
  };
  const handleSubmit = e => {
    e.preventDefault();
    setStep(2);
  };
  return <div className="w-full bg-white">
      {/* Header - Redesigned without gradient */}
      <section className="pt-12 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
              Checkout
            </h1>
            <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
              You're just a few steps away from a cleaner inbox
            </p>
          </div>
        </div>
      </section>
      <section className="py-12 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {step === 1 ? <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center">
                  <div className="bg-indigo-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">
                    1
                  </div>
                  <h2 className="ml-3 text-xl font-semibold text-gray-900">
                    Complete your purchase
                  </h2>
                </div>
              </div>
              <div className="p-6">
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Selected Plan
                  </h3>
                  <div className={`p-4 rounded-lg border flex justify-between items-center ${selectedPlan.billing === 'one-time' ? 'bg-purple-50 border-purple-100' : 'bg-indigo-50 border-indigo-100'}`}>
                    <div>
                      <div className="flex items-center">
                        {selectedPlan.billing === 'one-time' && <ZapIcon className="h-5 w-5 text-purple-500 mr-2" />}
                        <span className={`font-medium ${selectedPlan.billing === 'one-time' ? 'text-purple-700' : 'text-indigo-700'}`}>
                          {selectedPlan.name} Plan
                        </span>
                        {selectedPlan.billing === 'one-time' && <span className="ml-2 text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded-full">
                            One-time
                          </span>}
                      </div>
                      <p className={`text-sm mt-1 ${selectedPlan.billing === 'one-time' ? 'text-purple-600' : 'text-indigo-600'}`}>
                        {selectedPlan.price}
                        {selectedPlan.billing !== 'one-time' && `/${selectedPlan.billing === 'monthly' ? 'month' : 'month, billed annually'}`}
                      </p>
                    </div>
                    <Link to="/pricing" className={`text-sm font-medium ${selectedPlan.billing === 'one-time' ? 'text-purple-600 hover:text-purple-800' : 'text-indigo-600 hover:text-indigo-800'}`}>
                      Change
                    </Link>
                  </div>
                </div>
                <form onSubmit={handleSubmit}>
                  <div className="space-y-6">
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                        Email
                      </label>
                      <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-indigo-500 focus:border-indigo-500" placeholder="you@example.com" required />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                          First Name
                        </label>
                        <input type="text" id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-indigo-500 focus:border-indigo-500" required />
                      </div>
                      <div>
                        <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                          Last Name
                        </label>
                        <input type="text" id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-indigo-500 focus:border-indigo-500" required />
                      </div>
                    </div>
                    {/* Discount Code Section */}
                    <div>
                      <label htmlFor="discountCode" className="block text-sm font-medium text-gray-700">
                        Discount Code
                      </label>
                      <div className="mt-1 flex">
                        <div className="relative flex-grow">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <TagIcon className="h-5 w-5 text-gray-400" />
                          </div>
                          <input type="text" id="discountCode" name="discountCode" value={discountCode} onChange={handleDiscountChange} className="block w-full border border-gray-300 rounded-l-md shadow-sm pl-10 p-3 focus:ring-indigo-500 focus:border-indigo-500" placeholder="Enter code (try CLEAN25)" />
                        </div>
                        <button type="button" onClick={applyDiscount} className="bg-gray-200 text-gray-800 px-4 py-3 rounded-r-md font-medium hover:bg-gray-300 transition-colors">
                          Apply
                        </button>
                      </div>
                      {discountError && <p className="mt-2 text-sm text-red-600">
                          {discountError}
                        </p>}
                      {discountApplied && <p className="mt-2 text-sm text-green-600 flex items-center">
                          <CheckCircleIcon className="h-4 w-4 mr-1" />
                          Discount applied successfully!
                        </p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Method
                      </label>
                      <div className="border border-indigo-500 bg-indigo-50 rounded-md p-4 flex items-center">
                        <input type="radio" id="stripe" name="paymentMethod" value="stripe" checked={true} readOnly className="h-4 w-4 text-indigo-600 focus:ring-indigo-500" />
                        <label htmlFor="stripe" className="ml-3 flex items-center cursor-pointer flex-grow">
                          <span className="font-medium text-gray-900 mr-2">
                            Stripe
                          </span>
                          <CreditCardIcon className="h-5 w-5 text-gray-500" />
                        </label>
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        All payments are securely processed through Stripe. We
                        never store your payment information.
                      </p>
                    </div>
                    <div className="flex items-center">
                      <LockIcon className="h-5 w-5 text-green-500" />
                      <span className="ml-2 text-sm text-gray-600">
                        Your payment information is secure
                      </span>
                    </div>
                    <div>
                      <button type="submit" className="w-full flex justify-center items-center bg-indigo-600 text-white px-6 py-3 rounded-md font-medium hover:bg-indigo-700 transition-colors">
                        Continue to Stripe
                        <ChevronRightIcon className="ml-2 h-5 w-5" />
                      </button>
                    </div>
                    <div className="text-center text-sm text-gray-500">
                      <p>
                        By completing your purchase, you agree to our{' '}
                        <Link to="/terms-of-service" className="text-indigo-600 hover:text-indigo-800">
                          Terms of Service
                        </Link>{' '}
                        and{' '}
                        <Link to="/privacy-policy" className="text-indigo-600 hover:text-indigo-800">
                          Privacy Policy
                        </Link>
                        .
                      </p>
                    </div>
                  </div>
                </form>
              </div>
            </div> : <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mb-6">
                <CheckCircleIcon className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Thank You for Your Purchase!
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Your CleanInbox {selectedPlan.name} subscription has been
                activated.
              </p>
              <div className="bg-gray-50 p-6 rounded-lg mb-8">
                <h3 className="font-medium text-gray-900 mb-2">Next Steps:</h3>
                <ol className="text-left space-y-4 text-gray-600">
                  <li className="flex">
                    <span className="bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center font-medium mr-3 flex-shrink-0">
                      1
                    </span>
                    <span>
                      Check your email for confirmation and setup instructions
                    </span>
                  </li>
                  <li className="flex">
                    <span className="bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center font-medium mr-3 flex-shrink-0">
                      2
                    </span>
                    <span>
                      Connect your email account using our secure OAuth process
                    </span>
                  </li>
                  <li className="flex">
                    <span className="bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center font-medium mr-3 flex-shrink-0">
                      3
                    </span>
                    <span>
                      Start cleaning up your inbox and unsubscribing from
                      unwanted emails
                    </span>
                  </li>
                </ol>
              </div>
              <Link to="/" className="inline-flex items-center bg-indigo-600 text-white px-6 py-3 rounded-md font-medium hover:bg-indigo-700 transition-colors">
                Go to Dashboard
                <ChevronRightIcon className="ml-2 h-5 w-5" />
              </Link>
              <div className="mt-6 flex items-center justify-center text-sm text-gray-500">
                <ShieldIcon className="h-4 w-4 mr-1 text-green-500" />
                <span>Your data is secure and private</span>
              </div>
            </div>}
        </div>
      </section>
    </div>;
};
export default Checkout;