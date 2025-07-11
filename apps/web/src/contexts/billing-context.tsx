'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchWithAuth } from '../utils/api';

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
  webScanUsage: {
    scansUsed: number;
    scansLimit: number;
  } | null;
  hasPaymentMethod: boolean;
  loading: boolean;
  error: string | null;
  refreshBilling: () => Promise<void>;
}

const BillingContext = createContext<BillingContextType | undefined>(undefined);

export function BillingProvider({ children }: { children: React.ReactNode }) {
  const [subscription, setSubscription] = useState<BillingContextType['subscription']>(null);
  const [trialUsage, setTrialUsage] = useState<BillingContextType['trialUsage']>(null);
  const [webScanUsage, setWebScanUsage] = useState<BillingContextType['webScanUsage']>(null);
  const [hasPaymentMethod, setHasPaymentMethod] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [mounted, setMounted] = useState(false);

  const refreshBilling = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Refreshing billing data...');
      
      // Fetch billing data from API
      const response = await fetchWithAuth('/api/billing/status');
      console.log('Billing response status:', response.status);

      if (response.status === 401) {
        // User is not authenticated
        console.log('User not authenticated, clearing billing data');
        setIsAuthenticated(false);
        setSubscription(null);
        setTrialUsage(null);
        setWebScanUsage(null);
        setHasPaymentMethod(false);
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Billing fetch failed:', response.status, errorText);
        throw new Error(`Failed to fetch billing status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Billing data received:', data);
      
      setIsAuthenticated(true);
      setSubscription(data.subscription);
      setTrialUsage(data.trialUsage);
      setWebScanUsage(data.webScanUsage || null);
      setHasPaymentMethod(data.hasPaymentMethod || false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error fetching billing:', err);
      
      // If it's a network error, show more specific message
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Failed to connect to server. Please check if the API server is running.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && typeof window !== 'undefined') {
      // Only refresh billing if we have an auth token
      const token = localStorage.getItem('access_token');
      if (token) {
        refreshBilling();
      }
      
      // Refresh billing when window regains focus (e.g., returning from payment page)
      const handleFocus = () => {
        console.log('Window focused - refreshing billing status');
        if (localStorage.getItem('access_token')) {
          refreshBilling();
        }
      };
      
      window.addEventListener('focus', handleFocus);
      
      // Also refresh when visibility changes (for tab switching)
      const handleVisibilityChange = () => {
        if (!document.hidden && localStorage.getItem('access_token')) {
          console.log('Page visible - refreshing billing status');
          refreshBilling();
        }
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      return () => {
        window.removeEventListener('focus', handleFocus);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [mounted]);

  // Prevent hydration mismatch by showing consistent state until mounted
  if (!mounted) {
    return (
      <BillingContext.Provider value={{
        subscription: null,
        trialUsage: null,
        webScanUsage: null,
        hasPaymentMethod: false,
        loading: false,
        error: null,
        refreshBilling
      }}>
        {children}
      </BillingContext.Provider>
    );
  }

  return (
    <BillingContext.Provider value={{
      subscription,
      trialUsage,
      webScanUsage,
      hasPaymentMethod,
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