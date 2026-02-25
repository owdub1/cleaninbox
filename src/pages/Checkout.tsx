import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LockIcon, ChevronRightIcon, CreditCardIcon, ZapIcon, LoaderIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchWithAuth } from '../lib/api';

const Checkout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, refreshToken } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState({
    name: 'Pro',
    price: '$14.99',
    billing: 'monthly'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const planId = params.get('plan');
    const billing = params.get('billing') || 'monthly';

    if (planId === 'onetime') {
      const basePrice = 19.99;
      const finalPrice = `$${basePrice.toFixed(2)}`;
      setSelectedPlan({
        name: 'Quick Clean',
        price: finalPrice,
        billing: 'one-time'
      });
      return;
    }

    let basePrice = '14.99';
    if (planId === 'basic') {
      basePrice = '7.99';
    } else if (planId === 'unlimited') {
      basePrice = '24.99';
    }

    const finalPrice = billing === 'annual' ? `$${(parseFloat(basePrice) * 0.8).toFixed(2)}` : `$${basePrice}`;

    if (planId === 'basic') {
      setSelectedPlan({ name: 'Basic', price: finalPrice, billing });
    } else if (planId === 'pro') {
      setSelectedPlan({ name: 'Pro', price: finalPrice, billing });
    } else if (planId === 'unlimited') {
      setSelectedPlan({ name: 'Unlimited', price: finalPrice, billing });
    }
  }, [location]);

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      setError('Please log in to continue');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams(location.search);
      const planId = params.get('plan') || 'pro';
      const billingParam = params.get('billing') || 'monthly';

      const response = await fetchWithAuth('/api/stripe/create-checkout', {
        method: 'POST',
        body: JSON.stringify({
          plan: planId,
          billing: billingParam,
        })
      }, refreshToken);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // If subscription was updated in-place (upgrade/downgrade), redirect to dashboard
      if (data.updated) {
        navigate('/dashboard?upgraded=true');
        return;
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return <div className="w-full bg-white dark:bg-gray-900">
      <section className="pt-12 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100">
              Checkout
            </h1>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              You're just a few steps away from a cleaner inbox
            </p>
          </div>
        </div>
      </section>
      <section className="py-12 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="bg-indigo-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">
                  1
                </div>
                <h2 className="ml-3 text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Complete your purchase
                </h2>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-8">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                  Selected Plan
                </h3>
                <div className={`p-4 rounded-lg border flex justify-between items-center ${selectedPlan.billing === 'one-time' ? 'bg-purple-50 dark:bg-purple-950 border-purple-100 dark:border-purple-800' : 'bg-indigo-50 dark:bg-indigo-950 border-indigo-100 dark:border-indigo-800'}`}>
                  <div>
                    <div className="flex items-center">
                      {selectedPlan.billing === 'one-time' && <ZapIcon className="h-5 w-5 text-purple-500 mr-2" />}
                      <span className={`font-medium ${selectedPlan.billing === 'one-time' ? 'text-purple-700 dark:text-purple-400' : 'text-indigo-700 dark:text-indigo-400'}`}>
                        {selectedPlan.name} Plan
                      </span>
                      {selectedPlan.billing === 'one-time' && <span className="ml-2 text-xs bg-purple-200 text-purple-800 dark:text-purple-300 px-2 py-1 rounded-full">
                          One-time
                        </span>}
                    </div>
                    <p className={`text-sm mt-1 ${selectedPlan.billing === 'one-time' ? 'text-purple-600 dark:text-purple-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                      {selectedPlan.price}
                      {selectedPlan.billing !== 'one-time' && `/${selectedPlan.billing === 'monthly' ? 'month' : 'month, billed annually'}`}
                    </p>
                  </div>
                  <Link to="/pricing" className={`text-sm font-medium ${selectedPlan.billing === 'one-time' ? 'text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300' : 'text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300'}`}>
                    Change
                  </Link>
                </div>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Payment Method
                  </label>
                  <div className="border border-indigo-500 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-950 rounded-md p-4 flex items-center">
                    <CreditCardIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mr-3" />
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      Stripe Checkout
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    You'll be redirected to Stripe's secure checkout page to enter payment details.
                  </p>
                </div>
                <div className="flex items-center">
                  <LockIcon className="h-5 w-5 text-green-500" />
                  <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                    Your payment information is secure
                  </span>
                </div>
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md p-3">
                    <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                  </div>
                )}
                <div>
                  <button
                    type="button"
                    onClick={handleCheckout}
                    disabled={loading}
                    className="w-full flex justify-center items-center bg-indigo-600 text-white px-6 py-3 rounded-md font-medium hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <LoaderIcon className="animate-spin h-5 w-5 mr-2" />
                        Redirecting to Stripe...
                      </>
                    ) : (
                      <>
                        Continue to Stripe
                        <ChevronRightIcon className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </button>
                </div>
                <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                  <p>
                    By completing your purchase, you agree to our{' '}
                    <Link to="/terms-of-service" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link to="/privacy-policy" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300">
                      Privacy Policy
                    </Link>
                    .
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>;
};
export default Checkout;
