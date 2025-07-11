'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { fetchWithAuth } from '../utils/api';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

function PaymentMethodFormContent({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // Create a setup intent
      const response = await fetchWithAuth('/api/billing/create-setup-intent', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to create setup intent');
      }

      const { clientSecret } = await response.json();

      // Confirm the setup intent with the card element
      const result = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
        },
      });

      if (result.error) {
        setError(result.error.message || 'An error occurred');
      } else {
        // Confirm payment method was added (for local dev without webhooks)
        try {
          const confirmResponse = await fetchWithAuth('/api/billing/confirm-payment-method', {
            method: 'POST',
            body: JSON.stringify({ setupIntentId: result.setupIntent.id }),
          });
          
          if (!confirmResponse.ok) {
            console.error('Failed to confirm payment method');
          }
        } catch (error) {
          console.error('Error confirming payment method:', error);
        }
        
        setSucceeded(true);
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Card Information
        </label>
        <div className="border border-gray-300 rounded-md p-3">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
                invalid: {
                  color: '#9e2146',
                },
              },
            }}
          />
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600">{error}</div>
      )}

      {succeeded && (
        <div className="text-sm text-green-600">
          Payment method added successfully!
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || processing || succeeded}
        className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
          processing || succeeded
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
        }`}
      >
        {processing ? 'Processing...' : succeeded ? 'Added!' : 'Add Payment Method'}
      </button>

      <p className="text-xs text-gray-500 text-center">
        Your card will be saved securely for future pay-as-you-go charges.
        You'll be charged $0.50 per scan after your trial ends.
      </p>
    </form>
  );
}

export default function PaymentMethodForm({ onSuccess = () => {} }: { onSuccess?: () => void }) {
  return (
    <Elements stripe={stripePromise}>
      <PaymentMethodFormContent onSuccess={onSuccess} />
    </Elements>
  );
}