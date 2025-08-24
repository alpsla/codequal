/**
 * Helper utilities for CodeQual
 */
/**
 * Deep clone an object
 * @param obj Object to clone
 * @returns Cloned object
 */
export declare function deepClone<T>(obj: T): T;
/**
 * Check if a value is empty (null, undefined, empty string, empty array, empty object)
 * @param value Value to check
 * @returns True if empty
 */
export declare function isEmpty(value: unknown): boolean;
/**
 * Format a date string
 * @param date Date to format
 * @returns Formatted date string
 */
export declare function formatDate(date: Date): string;
/**
 * Truncate a string to a maximum length
 * @param str String to truncate
 * @param maxLength Maximum length
 * @returns Truncated string
 */
export declare function truncate(str: string, maxLength: number): string;
/**
 * Sleep for a specified time
 * @param ms Milliseconds to sleep
 * @returns Promise that resolves after the specified time
 */
export declare function sleep(ms: number): Promise<void>;
/**
 * Retry a function multiple times
 * @param fn Function to retry
 * @param retries Number of retries
 * @param delay Delay between retries in milliseconds
 * @returns Promise that resolves with the function result
 */
export declare function retry<T>(fn: () => Promise<T>, retries?: number, delay?: number): Promise<T>;
