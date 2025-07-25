'use client';

import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class PaymentErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log payment errors with high priority
    console.error('Payment Error:', error, errorInfo);
    
    // In production, send to error tracking with payment context
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to error tracking service
      // logPaymentError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Payment Processing Error
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>
                  We encountered an error while processing your payment. This could be due to:
                </p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li>Network connectivity issues</li>
                  <li>Invalid payment information</li>
                  <li>Temporary service disruption</li>
                </ul>
                <p className="mt-2">
                  Please try again or contact support if the issue persists.
                </p>
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="text-sm font-medium text-red-800 hover:text-red-700"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}