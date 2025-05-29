/**
 * Error handling utility functions
 */
import { LoggableData } from '@codequal/core/utils';

/**
 * Convert an unknown error to a LoggableData type for logging
 * @param error Unknown error object
 * @returns Properly typed LoggableData
 */
export function formatError(error: unknown): LoggableData {
  if (error instanceof Error) {
    return error;
  }
  
  if (typeof error === 'string' || typeof error === 'number' || typeof error === 'boolean') {
    return error;
  }
  
  if (error === null || error === undefined) {
    return error;
  }
  
  // For other object types, create a record with message
  return { message: String(error) };
}