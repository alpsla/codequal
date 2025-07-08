import { getSupabase } from '@codequal/database/supabase/client';

export interface ErrorLog {
  code: string;
  message: string;
  details?: any;
  stack?: string;
  userId?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
}

export class ErrorLogger {
  private static generateErrorCode(): string {
    // Generate a unique error code: ERR-YYYYMMDD-XXXXXX
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `ERR-${dateStr}-${randomStr}`;
  }

  static async log(error: Partial<ErrorLog>): Promise<string> {
    const errorCode = error.code || this.generateErrorCode();
    
    try {
      // Log to database
      await getSupabase()
        .from('error_logs')
        .insert({
          error_code: errorCode,
          message: error.message || 'Unknown error',
          details: error.details || {},
          stack_trace: error.stack,
          user_id: error.userId,
          endpoint: error.endpoint,
          method: error.method,
          status_code: error.statusCode,
          created_at: new Date().toISOString()
        });
    } catch (dbError) {
      // If database logging fails, at least log to console
      console.error('Failed to log error to database:', dbError);
    }

    // Always log to console for immediate visibility
    console.error(`[${errorCode}]`, error.message, {
      details: error.details,
      endpoint: error.endpoint,
      userId: error.userId
    });

    return errorCode;
  }

  static formatUserError(errorCode: string, message: string, details?: any) {
    return {
      error: message,
      code: errorCode,
      details,
      timestamp: new Date().toISOString()
    };
  }
}

// Common error codes
export const ErrorCodes = {
  // Authentication
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_INVALID: 'AUTH_INVALID',
  AUTH_EXPIRED: 'AUTH_EXPIRED',
  
  // Trial/Billing
  TRIAL_LIMIT_REACHED: 'TRIAL_LIMIT_REACHED',
  TRIAL_REPOSITORY_LIMIT: 'TRIAL_REPOSITORY_LIMIT',
  SUBSCRIPTION_REQUIRED: 'SUBSCRIPTION_REQUIRED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  
  // Repository
  REPOSITORY_NOT_FOUND: 'REPOSITORY_NOT_FOUND',
  REPOSITORY_ACCESS_DENIED: 'REPOSITORY_ACCESS_DENIED',
  REPOSITORY_URL_INVALID: 'REPOSITORY_URL_INVALID',
  
  // Analysis
  ANALYSIS_FAILED: 'ANALYSIS_FAILED',
  ANALYSIS_TIMEOUT: 'ANALYSIS_TIMEOUT',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // General
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED'
} as const;