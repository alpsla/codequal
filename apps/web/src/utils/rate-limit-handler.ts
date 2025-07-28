/**
 * Client-side rate limit handler
 * Provides utilities for handling rate limit responses gracefully
 */

interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
  retryAfter?: number; // Seconds
}

export class RateLimitHandler {
  private rateLimitInfo: Map<string, RateLimitInfo> = new Map();
  private requestQueue: Map<string, Promise<unknown>[]> = new Map();

  /**
   * Extract rate limit info from response headers
   */
  extractRateLimitInfo(response: Response): RateLimitInfo | null {
    const limit = response.headers.get('X-RateLimit-Limit');
    const remaining = response.headers.get('X-RateLimit-Remaining');
    const reset = response.headers.get('X-RateLimit-Reset');
    const retryAfter = response.headers.get('Retry-After');

    if (limit && remaining && reset) {
      return {
        limit: parseInt(limit, 10),
        remaining: parseInt(remaining, 10),
        reset: parseInt(reset, 10),
        retryAfter: retryAfter ? parseInt(retryAfter, 10) : undefined
      };
    }

    return null;
  }

  /**
   * Update stored rate limit info for an endpoint
   */
  updateRateLimitInfo(endpoint: string, response: Response) {
    const info = this.extractRateLimitInfo(response);
    if (info) {
      this.rateLimitInfo.set(endpoint, info);
    }
  }

  /**
   * Get current rate limit info for an endpoint
   */
  getRateLimitInfo(endpoint: string): RateLimitInfo | undefined {
    return this.rateLimitInfo.get(endpoint);
  }

  /**
   * Check if we're approaching rate limit
   */
  isApproachingLimit(endpoint: string, threshold = 0.2): boolean {
    const info = this.rateLimitInfo.get(endpoint);
    if (!info) return false;
    
    const percentageRemaining = info.remaining / info.limit;
    return percentageRemaining <= threshold;
  }

  /**
   * Calculate delay before next request should be made
   */
  getRecommendedDelay(endpoint: string): number {
    const info = this.rateLimitInfo.get(endpoint);
    if (!info || info.remaining > 5) return 0;

    // Calculate time until reset
    const now = Math.floor(Date.now() / 1000);
    const timeUntilReset = Math.max(0, info.reset - now);

    if (info.remaining === 0) {
      // If no requests remaining, wait until reset
      return timeUntilReset * 1000;
    }

    // Spread remaining requests over time until reset
    return Math.floor((timeUntilReset * 1000) / info.remaining);
  }

  /**
   * Handle 429 response with exponential backoff
   */
  async handleRateLimitError(
    response: Response,
    request: () => Promise<Response>,
    maxRetries = 3
  ): Promise<Response> {
    const retryAfter = response.headers.get('Retry-After');
    let delay = 1000; // Default 1 second

    if (retryAfter) {
      // If Retry-After is a number, it's seconds
      // If it's a date, parse it
      const retryAfterNum = parseInt(retryAfter, 10);
      if (!isNaN(retryAfterNum)) {
        delay = retryAfterNum * 1000;
      } else {
        // Try to parse as date
        const retryDate = new Date(retryAfter);
        if (!isNaN(retryDate.getTime())) {
          delay = Math.max(0, retryDate.getTime() - Date.now());
        }
      }
    }

    // Implement exponential backoff
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      await new Promise(resolve => setTimeout(resolve, delay));
      
      try {
        const retryResponse = await request();
        if (retryResponse.status !== 429) {
          return retryResponse;
        }
        
        // Exponential backoff with jitter
        delay = delay * 2 + Math.random() * 1000;
      } catch (error) {
        if (attempt === maxRetries - 1) throw error;
      }
    }

    throw new Error('Rate limit retry failed after maximum attempts');
  }

  /**
   * Display user-friendly rate limit notification
   */
  notifyRateLimit(endpoint: string, info?: RateLimitInfo) {
    const storedInfo = info || this.rateLimitInfo.get(endpoint);
    if (!storedInfo) return;

    const now = Math.floor(Date.now() / 1000);
    const timeUntilReset = Math.max(0, storedInfo.reset - now);
    const minutes = Math.floor(timeUntilReset / 60);
    const seconds = timeUntilReset % 60;

    let message = 'Rate limit reached. ';
    if (minutes > 0) {
      message += `Please try again in ${minutes} minute${minutes > 1 ? 's' : ''} and ${seconds} second${seconds > 1 ? 's' : ''}.`;
    } else {
      message += `Please try again in ${seconds} second${seconds > 1 ? 's' : ''}.`;
    }

    // This would typically integrate with your notification system
    console.warn(message);
    
    // Return the message for UI display
    return message;
  }

  /**
   * Batch multiple requests to reduce rate limit impact
   */
  async batchRequests<T>(
    requests: Array<() => Promise<T>>,
    batchSize = 5,
    delayBetweenBatches = 100
  ): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(req => req()));
      results.push(...batchResults);
      
      // Add delay between batches to avoid hitting rate limits
      if (i + batchSize < requests.length) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }
    
    return results;
  }
}

// Export singleton instance
export const rateLimitHandler = new RateLimitHandler();

// React hook for rate limit awareness
export function useRateLimit(endpoint: string) {
  const [rateLimitInfo, setRateLimitInfo] = React.useState<RateLimitInfo | undefined>(
    rateLimitHandler.getRateLimitInfo(endpoint)
  );

  React.useEffect(() => {
    // Update rate limit info when it changes
    const interval = setInterval(() => {
      const info = rateLimitHandler.getRateLimitInfo(endpoint);
      setRateLimitInfo(info);
    }, 1000);

    return () => clearInterval(interval);
  }, [endpoint]);

  return {
    rateLimitInfo,
    isApproachingLimit: rateLimitHandler.isApproachingLimit(endpoint),
    recommendedDelay: rateLimitHandler.getRecommendedDelay(endpoint)
  };
}

// Add missing React import
import React from 'react';