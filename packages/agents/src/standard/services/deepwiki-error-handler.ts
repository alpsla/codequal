/**
 * DeepWiki Error Handler
 * Handles parsing and transformation of DeepWiki API errors
 */

export type DeepWikiErrorType = 'NETWORK' | 'TIMEOUT' | 'VALIDATION' | 'NOT_FOUND' | 'RATE_LIMIT' | 'SERVER' | 'PARSE' | 'UNKNOWN';

export class DeepWikiError extends Error {
  public statusCode?: number;
  public response?: any;
  public isRetryable: boolean;

  constructor(message: string, statusCode?: number, response?: any) {
    super(message);
    this.name = 'DeepWikiError';
    this.statusCode = statusCode;
    this.response = response;
    this.isRetryable = this.determineRetryable(statusCode);
  }

  private determineRetryable(statusCode?: number): boolean {
    if (!statusCode) return false;
    // Retry on server errors and rate limits
    return statusCode >= 500 || statusCode === 429 || statusCode === 408;
  }
}

export class DeepWikiErrorHandler {
  /**
   * Handle DeepWiki API errors
   */
  static handleError(error: any, context?: any): never {
    // Network errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      throw new DeepWikiError(
        'DeepWiki service is not available. Please check if the service is running.',
        503
      );
    }

    // Timeout errors
    if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKETTIMEDOUT') {
      throw new DeepWikiError(
        'DeepWiki request timed out. The repository might be too large.',
        408
      );
    }

    // HTTP errors
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      if (status === 400) {
        throw new DeepWikiError(
          `Invalid request: ${data?.error || 'Bad request parameters'}`,
          400,
          data
        );
      }
      
      if (status === 404) {
        throw new DeepWikiError(
          'Repository or pull request not found',
          404,
          data
        );
      }
      
      if (status === 429) {
        throw new DeepWikiError(
          'Rate limit exceeded. Please try again later.',
          429,
          data
        );
      }
      
      if (status >= 500) {
        throw new DeepWikiError(
          `DeepWiki server error: ${data?.error || 'Internal server error'}`,
          status,
          data
        );
      }
    }

    // Parse errors
    if (error.message?.includes('JSON')) {
      throw new DeepWikiError(
        'Failed to parse DeepWiki response. The response format may have changed.',
        502
      );
    }

    // Default error
    throw new DeepWikiError(
      error.message || 'Unknown DeepWiki error',
      error.statusCode,
      error.response
    );
  }

  /**
   * Check if error is retryable
   */
  static isRetryable(error: any): boolean {
    if (error instanceof DeepWikiError) {
      return error.isRetryable;
    }
    
    // Check for common retryable conditions
    const retryableCodes = ['ECONNRESET', 'ETIMEDOUT', 'ESOCKETTIMEDOUT'];
    if (error.code && retryableCodes.includes(error.code)) {
      return true;
    }
    
    // Check status codes
    if (error.statusCode) {
      return error.statusCode >= 500 || error.statusCode === 429;
    }
    
    return false;
  }

  /**
   * Format error for logging
   */
  static formatError(error: any): string {
    if (error instanceof DeepWikiError) {
      return `${error.name}: ${error.message} (Status: ${error.statusCode || 'N/A'})`;
    }
    
    return `Error: ${error.message || 'Unknown error'}`;
  }

  /**
   * Log error for debugging
   */
  static logError(message: string, error?: any): void {
    console.error(`[DeepWikiError] ${message}`, error ? this.formatError(error) : '');
  }
}