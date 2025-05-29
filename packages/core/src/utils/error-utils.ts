/**
 * Error handling utility functions
 */
import { LoggableData } from './logger';

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

/**
 * Safely convert unknown to Record<string, unknown>
 * @param data Unknown data to convert
 * @returns Safe record object 
 */
export function toRecord(data: unknown): Record<string, unknown> {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  return { value: data };
}

/**
 * Safely convert unknown to string
 * @param data Unknown data to convert
 * @returns String value or empty string
 */
export function toString(data: unknown): string {
  if (data === null || data === undefined) {
    return '';
  }
  return String(data);
}