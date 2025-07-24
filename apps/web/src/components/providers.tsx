'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/auth-context';
import { BillingProvider } from '@/contexts/billing-context';
import { ErrorBoundary } from './error-boundary';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BillingProvider>
          {children}
        </BillingProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}