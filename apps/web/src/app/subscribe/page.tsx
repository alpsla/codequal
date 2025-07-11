'use client';

import { useState } from 'react';
import AuthenticatedLayout from '../../components/authenticated-layout';
import { fetchWithAuth } from '../../utils/api';

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
    name: 'API Plan',
    price: '$9.99',
    period: '/month',
    description: 'API access only',
    features: [
      '200 API calls/month',
      'All analysis endpoints',
      'Webhook support',
      'Developer documentation',
      'Rate limit: 100/hour',
      'No web access'
    ],
    cta: 'Subscribe',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_API || 'price_1RjLIsH9VfPdHERjZ8JwAHSV',
  },
  {
    name: 'Individual Plan',
    price: '$29.99',
    period: '/month',
    description: 'For individual developers',
    features: [
      '50 web scans/month',
      '200 API calls/month',
      'Unlimited repositories',
      'Advanced code analysis',
      'Priority support'
    ],
    cta: 'Subscribe',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_INDIVIDUAL || 'price_1RjLIsH9VfPdHERjgmSu4gLT',
    popular: true
  },
  {
    name: 'Team Plan',
    price: '$99.99',
    period: '/month',
    description: 'For teams of 3-5 developers',
    features: [
      '3-5 user seats',
      'Unlimited web scans',
      'Unlimited API calls',
      'Team collaboration',
      'Priority support'
    ],
    cta: 'Subscribe',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_TEAM || 'price_1RjLIsH9VfPdHERjC6ud2Esb',
  }
];

export default function SubscribePage() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (priceId: string) => {
    try {
      setLoading(priceId);
      
      // Create checkout session
      const response = await fetchWithAuth('/api/billing/create-checkout', {
        method: 'POST',
        body: JSON.stringify({ priceId }),
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
    <AuthenticatedLayout>
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

        <div className="mt-12 space-y-4 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-6 lg:max-w-6xl lg:mx-auto">
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
            No subscription? Pay-as-you-go: $0.50 per scan
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Payment method required for all paid options
          </p>
        </div>
      </div>
    </div>
    </AuthenticatedLayout>
  );
}