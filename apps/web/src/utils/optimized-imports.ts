/* eslint-disable @typescript-eslint/no-explicit-any */
import dynamic from 'next/dynamic';
import React from 'react';

// Lazy load heavy components to reduce initial bundle size
// Note: These components don't export their props types properly for dynamic imports
// so we use 'any' here to avoid complex TypeScript errors during build
export const LazyStripeElements = dynamic<any>(
  () => import('@stripe/react-stripe-js').then((mod) => mod.Elements),
  { 
    ssr: false,
    loading: () => React.createElement('div', null, 'Loading payment form...')
  }
);

export const LazyCardElement = dynamic<any>(
  () => import('@stripe/react-stripe-js').then((mod) => mod.CardElement),
  { 
    ssr: false,
    loading: () => React.createElement('div', null, 'Loading card input...')
  }
);

// Lazy load Headless UI components that aren't used on initial page load
export const LazyDialog = dynamic<any>(
  () => import('@headlessui/react').then((mod) => mod.Dialog),
  { ssr: false }
);

export const LazyTransition = dynamic<any>(
  () => import('@headlessui/react').then((mod) => mod.Transition),
  { ssr: false }
);

// Utility for conditional lazy loading
export function lazyLoad<P = Record<string, unknown>>(
  importFn: () => Promise<{ default: React.ComponentType<P> } | React.ComponentType<P>>,
  options?: {
    ssr?: boolean;
    loading?: () => React.ReactElement | null;
  }
) {
  return dynamic<P>(importFn, options);
}