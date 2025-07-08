'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface BillingContextType {
  subscription: {
    status: string;
    tier: string;
    trialEndsAt: string | null;
  } | null;
  trialUsage: {
    scansUsed: number;
    scansLimit: number;
    trialRepository: string | null;
  } | null;
  loading: boolean;
  error: string | null;
  refreshBilling: () => Promise<void>;
}

const BillingContext = createContext<BillingContextType | undefined>(undefined);

export function BillingProvider({ children }: { children: React.ReactNode }) {
  const [subscription, setSubscription] = useState(null);
  const [trialUsage, setTrialUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshBilling = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch billing data from API
      const response = await fetch('/api/billing/status', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch billing status');
      }

      const data = await response.json();
      setSubscription(data.subscription);
      setTrialUsage(data.trialUsage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching billing:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshBilling();
  }, []);

  return (
    <BillingContext.Provider value={{
      subscription,
      trialUsage,
      loading,
      error,
      refreshBilling
    }}>
      {children}
    </BillingContext.Provider>
  );
}

export function useBilling() {
  const context = useContext(BillingContext);
  if (context === undefined) {
    throw new Error('useBilling must be used within a BillingProvider');
  }
  return context;
}