'use client';

import { useState } from 'react';
import AuthenticatedLayout from '../../../components/authenticated-layout';
import PaymentMethodForm from '../../../components/payment-method-form';
import { useRouter } from 'next/navigation';
import { useBilling } from '../../../contexts/billing-context';

export default function PaymentSettingsPage() {
  const router = useRouter();
  const [showForm, setShowForm] = useState(true);
  const { refreshBilling } = useBilling();

  const handleSuccess = async () => {
    // Refresh billing data to update subscription status
    await refreshBilling();
    
    // Show success message briefly then redirect
    setTimeout(() => {
      router.push('/scan');
    }, 2000);
  };

  return (
    <AuthenticatedLayout>
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <div className="bg-white shadow rounded-lg p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Payment Settings</h1>
            
            <div className="mb-6">
              <h2 className="text-lg font-medium text-gray-900 mb-2">Pay-as-you-go</h2>
              <p className="text-sm text-gray-600">
                Add a payment method to continue scanning after your trial. 
                You'll be charged $0.50 per scan only when you use the service.
              </p>
            </div>

            {showForm && (
              <PaymentMethodForm onSuccess={handleSuccess} />
            )}

            <div className="mt-8 p-4 bg-blue-50 rounded-md">
              <h3 className="text-sm font-medium text-blue-900 mb-2">Why add a payment method?</h3>
              <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                <li>Continue scanning after your 10 free trial scans</li>
                <li>Pay only for what you use - $0.50 per scan</li>
                <li>No monthly commitment required</li>
                <li>Or upgrade to a subscription for unlimited scans</li>
              </ul>
            </div>

            <div className="mt-6 text-center">
              <a
                href="/subscribe"
                className="text-sm text-indigo-600 hover:text-indigo-500"
              >
                View subscription plans →
              </a>
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}