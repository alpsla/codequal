/**
 * Error reporting service for production
 * This can be integrated with services like Sentry, LogRocket, or custom error tracking
 */

interface ErrorContext {
  userId?: string;
  componentStack?: string;
  errorBoundary?: boolean;
  errorBoundaryProps?: Record<string, any>;
  url?: string;
  userAgent?: string;
}

class ErrorReportingService {
  private isProduction = process.env.NODE_ENV === 'production';
  private errorQueue: Array<{ error: Error; context: ErrorContext }> = [];
  private maxQueueSize = 10;

  /**
   * Initialize error reporting service
   * In production, this would initialize Sentry or similar service
   */
  initialize() {
    if (this.isProduction) {
      // Example Sentry initialization:
      // Sentry.init({
      //   dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      //   environment: process.env.NODE_ENV,
      //   tracesSampleRate: 0.1,
      // });

      // Set up global error handler
      if (typeof window !== 'undefined') {
        window.addEventListener('unhandledrejection', (event) => {
          this.logError(new Error(event.reason), {
            url: window.location.href,
            userAgent: navigator.userAgent,
          });
        });
      }
    }
  }

  /**
   * Log an error to the reporting service
   */
  logError(error: Error, context: ErrorContext = {}) {
    // Always log to console in development
    if (!this.isProduction) {
      console.error('Error Report:', error, context);
      return;
    }

    // Add to queue to prevent losing errors during initialization
    if (this.errorQueue.length < this.maxQueueSize) {
      this.errorQueue.push({ error, context });
    }

    // In production, send to error reporting service
    try {
      // Example Sentry integration:
      // Sentry.captureException(error, {
      //   contexts: {
      //     react: {
      //       componentStack: context.componentStack,
      //     },
      //   },
      //   tags: {
      //     errorBoundary: context.errorBoundary || false,
      //   },
      //   user: context.userId ? { id: context.userId } : undefined,
      // });

      // For now, just log to console in production too
      console.error('[Production Error]', {
        message: error.message,
        stack: error.stack,
        context,
        timestamp: new Date().toISOString(),
      });

      // You could also send to your own API endpoint
      this.sendToAPI(error, context);
    } catch (reportingError) {
      // Fail silently to avoid infinite loops
      console.error('Failed to report error:', reportingError);
    }
  }

  /**
   * Send error to your own API endpoint
   */
  private async sendToAPI(error: Error, context: ErrorContext) {
    if (typeof window === 'undefined') return;

    try {
      await fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          context,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          userAgent: navigator.userAgent,
        }),
      });
    } catch {
      // Fail silently
    }
  }

  /**
   * Log payment-specific errors with additional context
   */
  logPaymentError(error: Error, paymentContext: {
    amount?: number;
    currency?: string;
    paymentMethod?: string;
    step?: string;
  }) {
    this.logError(error, {
      ...paymentContext,
      errorBoundary: true,
      url: window?.location.href,
    });
  }

  /**
   * Flush any queued errors
   */
  flush() {
    while (this.errorQueue.length > 0) {
      const { error, context } = this.errorQueue.shift()!;
      this.logError(error, context);
    }
  }
}

// Export singleton instance
export const errorReporter = new ErrorReportingService();

// Initialize on import
if (typeof window !== 'undefined') {
  errorReporter.initialize();
}