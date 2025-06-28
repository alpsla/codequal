#!/usr/bin/env node
/**
 * API Error Handling Example
 * 
 * This module demonstrates proper error handling patterns for API failures
 * in the CodeQual test integration suite.
 */

import axios, { AxiosError, AxiosResponse } from 'axios';
import chalk from 'chalk';

interface APIErrorResponse {
  error: string;
  code?: string;
  details?: any;
  retryAfter?: number;
}

export class APIErrorHandler {
  /**
   * Handle different types of API errors with appropriate strategies
   */
  static async handleAPIError(error: unknown, context: string): Promise<void> {
    console.log(chalk.red(`\n❌ API Error in ${context}:`));

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<APIErrorResponse>;
      
      if (axiosError.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        await this.handleResponseError(axiosError.response);
      } else if (axiosError.request) {
        // The request was made but no response was received
        this.handleRequestError(axiosError);
      } else {
        // Something happened in setting up the request that triggered an Error
        this.handleSetupError(axiosError);
      }
    } else {
      // Non-Axios error
      console.log(chalk.red(`   Unexpected error: ${error}`));
    }
  }

  /**
   * Handle errors where the server responded
   */
  private static async handleResponseError(response: AxiosResponse<APIErrorResponse>): Promise<void> {
    const { status, data, headers } = response;

    switch (status) {
      case 400:
        console.log(chalk.yellow('   400 Bad Request'));
        console.log(`   Message: ${data.error || 'Invalid request parameters'}`);
        if (data.details) {
          console.log(`   Details: ${JSON.stringify(data.details, null, 2)}`);
        }
        break;

      case 401:
        console.log(chalk.yellow('   401 Unauthorized'));
        console.log('   Solution: Check your API key is valid and properly configured');
        console.log('   Set: export CODEQUAL_API_KEY="your-api-key"');
        break;

      case 403:
        console.log(chalk.yellow('   403 Forbidden'));
        console.log('   Solution: Your API key may not have access to this resource');
        break;

      case 404:
        console.log(chalk.yellow('   404 Not Found'));
        console.log('   Solution: Check the API endpoint URL and repository/PR details');
        break;

      case 429: {
        const retryAfter = headers['retry-after'] || data.retryAfter || 60;
        console.log(chalk.yellow('   429 Rate Limited'));
        console.log(`   Retry after: ${retryAfter} seconds`);
        console.log('   Solution: Add GITHUB_TOKEN to increase rate limits');
        break;
      }

      case 500:
      case 502:
      case 503:
      case 504:
        console.log(chalk.red(`   ${status} Server Error`));
        console.log('   The server is experiencing issues. This is usually temporary.');
        console.log('   Solution: Wait a few minutes and try again');
        break;

      default:
        console.log(chalk.red(`   ${status} ${response.statusText}`));
        console.log(`   Message: ${data.error || 'Unknown error'}`);
    }
  }

  /**
   * Handle errors where no response was received
   */
  private static handleRequestError(error: AxiosError): void {
    if (error.code === 'ECONNREFUSED') {
      console.log(chalk.red('   Connection refused'));
      console.log('   Solution: Ensure the API server is running');
      console.log('   Check: Is the server running on the correct port?');
    } else if (error.code === 'ETIMEDOUT') {
      console.log(chalk.red('   Request timeout'));
      console.log('   Solution: The request took too long. Try again or increase timeout');
    } else if (error.code === 'ENOTFOUND') {
      console.log(chalk.red('   Server not found'));
      console.log('   Solution: Check the API URL is correct');
    } else {
      console.log(chalk.red(`   Network error: ${error.message}`));
      console.log('   Solution: Check your internet connection and firewall settings');
    }
  }

  /**
   * Handle errors in request setup
   */
  private static handleSetupError(error: AxiosError): void {
    console.log(chalk.red('   Request setup error'));
    console.log(`   Message: ${error.message}`);
    console.log('   Solution: Check your request configuration');
  }

  /**
   * Implement exponential backoff retry strategy
   */
  static async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    initialDelay = 1000
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries - 1) {
          const delay = initialDelay * Math.pow(2, attempt);
          console.log(chalk.gray(`   Retrying in ${delay / 1000}s... (attempt ${attempt + 1}/${maxRetries})`));
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Check if an error is retryable
   */
  static isRetryableError(error: unknown): boolean {
    if (!axios.isAxiosError(error)) {
      return false;
    }

    const axiosError = error as AxiosError;
    
    // Network errors are retryable
    if (!axiosError.response) {
      return true;
    }

    // Server errors (5xx) are retryable
    const status = axiosError.response.status;
    if (status >= 500 && status < 600) {
      return true;
    }

    // Rate limiting is retryable after delay
    if (status === 429) {
      return true;
    }

    // Client errors (4xx) are generally not retryable
    return false;
  }

  /**
   * Extract user-friendly error message
   */
  static getErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<APIErrorResponse>;
      
      if (axiosError.response?.data?.error) {
        return axiosError.response.data.error;
      }
      
      if (axiosError.response) {
        return `HTTP ${axiosError.response.status}: ${axiosError.response.statusText}`;
      }
      
      if (axiosError.code) {
        const codeMessages: Record<string, string> = {
          'ECONNREFUSED': 'Connection refused - is the server running?',
          'ETIMEDOUT': 'Request timed out',
          'ENOTFOUND': 'Server not found - check the URL',
          'ECONNRESET': 'Connection reset by server'
        };
        return codeMessages[axiosError.code] || axiosError.message;
      }
      
      return axiosError.message;
    }
    
    return String(error);
  }
}

/**
 * Example usage demonstrating error handling patterns
 */
async function demonstrateErrorHandling(): Promise<void> {
  console.log(chalk.bold('\n🔧 API Error Handling Demonstration\n'));

  // Example 1: Basic error handling
  try {
    const response = await axios.get('http://localhost:3001/api/invalid-endpoint');
    console.log('Success:', response.data);
  } catch (error) {
    await APIErrorHandler.handleAPIError(error, 'Basic Request');
  }

  // Example 2: Retry with backoff
  console.log(chalk.bold('\n🔄 Retry with Backoff Example:'));
  try {
    const result = await APIErrorHandler.retryWithBackoff(async () => {
      console.log('   Making request...');
      const response = await axios.get('http://localhost:3001/api/health');
      return response.data;
    }, 3, 2000);
    
    console.log(chalk.green('   Success after retry:', result));
  } catch (error) {
    console.log(chalk.red('   Failed after all retries'));
    console.log(`   Error: ${APIErrorHandler.getErrorMessage(error)}`);
  }

  // Example 3: Conditional retry based on error type
  console.log(chalk.bold('\n🎯 Conditional Retry Example:'));
  const makeRequest = async () => {
    try {
      const response = await axios.post('http://localhost:3001/api/analysis/pr', {
        // Invalid payload to trigger error
        invalid: 'data'
      });
      return response.data;
    } catch (error) {
      if (APIErrorHandler.isRetryableError(error)) {
        console.log(chalk.yellow('   Error is retryable'));
        throw error;
      } else {
        console.log(chalk.red('   Error is not retryable'));
        console.log(`   Message: ${APIErrorHandler.getErrorMessage(error)}`);
        throw new Error('Non-retryable error');
      }
    }
  };

  try {
    await makeRequest();
  } catch (error) {
    console.log('   Handled final error appropriately');
  }
}

// Run demonstration if executed directly
if (require.main === module) {
  demonstrateErrorHandling()
    .then(() => console.log(chalk.green('\n✅ Error handling demonstration complete')))
    .catch(error => console.error(chalk.red('\n❌ Demonstration failed:'), error));
}