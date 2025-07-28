import dynamic from 'next/dynamic';
import React from 'react';
import type { ComponentType } from 'react';

// Lazy load heavy components to reduce initial bundle size
export const LazyStripeElements = dynamic(
  () => import('@stripe/react-stripe-js').then((mod) => ({ default: mod.Elements })),
  { 
    ssr: false,
    loading: () => React.createElement('div', null, 'Loading payment form...')
  }
) as ComponentType<Record<string, unknown>>;

export const LazyCardElement = dynamic(
  () => import('@stripe/react-stripe-js').then((mod) => ({ default: mod.CardElement })),
  { 
    ssr: false,
    loading: () => React.createElement('div', null, 'Loading card input...')
  }
) as ComponentType<Record<string, unknown>>;

// Lazy load Headless UI components that aren't used on initial page load
export const LazyDialog = dynamic(
  () => import('@headlessui/react').then((mod) => ({ default: mod.Dialog })),
  { ssr: false }
) as ComponentType<Record<string, unknown>>;

export const LazyTransition = dynamic(
  () => import('@headlessui/react').then((mod) => ({ default: mod.Transition })),
  { ssr: false }
) as ComponentType<Record<string, unknown>>;

// Utility for conditional lazy loading
export function lazyLoad<T extends React.ComponentType<Record<string, unknown>>>(
  importFn: () => Promise<{ default: T }>,
  options?: {
    ssr?: boolean;
    loading?: () => React.ReactElement | null;
  }
) {
  return dynamic(importFn, options) as T;
}