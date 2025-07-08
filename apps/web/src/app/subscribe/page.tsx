'use client';

import { useState } from 'react';

const plans = [
  {
    name: 'Free Trial',
    price: 'Free',
    description: '10 scans for one repository',
    features: [
      '10 repository scans',
      '1 repository only',
      'Basic code analysis',
      'Community support'
    ],
    cta: 'Current Plan',
    disabled: true
  },
  {
    name: 'Individual',
    price: '$29',
    period: '/month',
    description: 'For individual developers',
    features: [
      'Unlimited scans',
      'Unlimited repositories',
      'Advanced code analysis',
      'Priority support',
      'API access'
    ],
    cta: 'Subscribe',
    priceId: 'price_individual', // Replace with actual Stripe price ID
    popular: true
  },
  {
    name: 'Team',
    price: '$99',
    period: '/month',
    description: 'For development teams',
    features: [
      'Everything in Individual',
      'Team collaboration',
      'Advanced analytics',
      'Custom integrations',
      'Dedicated support'
    ],
    cta: 'Subscribe',
    priceId: 'price_team' // Replace with actual Stripe price ID
  }
];

export default function SubscribePage() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (priceId: string) => {
    try {
      setLoading(priceId);
      
      // Create checkout session
      const response = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priceId }),
        credentials: 'include'
      });

      const data = await response.json();
      
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        alert('Failed to create checkout session');
      }
    } catch (error) {
      console.error('Subscription error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Choose Your Plan
          </h2>
          <p className="mt-4 text-xl text-gray-600">
            Start with a free trial, upgrade anytime
          </p>
        </div>

        <div className="mt-12 space-y-4 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-6 lg:max-w-4xl lg:mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-lg shadow-lg divide-y divide-gray-200 ${
                plan.popular ? 'border-2 border-indigo-500' : 'border border-gray-200'
              }`}
            >
              {plan.popular && (
                <div className="bg-indigo-500 text-white text-center py-2 text-sm font-semibold">
                  Most Popular
                </div>
              )}
              <div className="p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  {plan.name}
                </h3>
                <p className="mt-4 text-sm text-gray-600">{plan.description}</p>
                <p className="mt-8">
                  <span className="text-4xl font-extrabold text-gray-900">
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-base font-medium text-gray-500">
                      {plan.period}
                    </span>
                  )}
                </p>
                <ul className="mt-6 space-y-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex">
                      <svg
                        className="flex-shrink-0 h-5 w-5 text-green-500"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="ml-3 text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-6">
                <button
                  onClick={() => plan.priceId && handleSubscribe(plan.priceId)}
                  disabled={plan.disabled || loading !== null}
                  className={`w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                    plan.disabled
                      ? 'bg-gray-400 cursor-not-allowed'
                      : plan.popular
                      ? 'bg-indigo-600 hover:bg-indigo-700'
                      : 'bg-gray-800 hover:bg-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                >
                  {loading === plan.priceId ? 'Processing...' : plan.cta}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-base text-gray-600">
            After trial ends: $0.50 per scan (pay as you go)
          </p>
        </div>
      </div>
    </div>
  );
}