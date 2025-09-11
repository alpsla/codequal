/**
 * Mock utility functions for testing
 */

/**
 * Data that can be logged
 */
export type LoggableData = Error | Record<string, any> | string | number | boolean | null | undefined;

/**
 * Logger interface
 */
export interface Logger {
  debug(message: string, data?: LoggableData): void;
  info(message: string, data?: LoggableData): void;
  warn(message: string, data?: LoggableData): void;
  error(message: string, data?: LoggableData): void;
}

/**
 * Create a logger instance
 * @param name Logger name
 * @returns Logger instance
 */
export function createLogger(name: string): Logger {
  return {
    debug(message: string, data?: LoggableData): void {
      // Mock implementation for tests
      console.log(`[DEBUG] [${name}]`, message, data);
    },
    info(message: string, data?: LoggableData): void {
      // Mock implementation for tests
      console.log(`[INFO] [${name}]`, message, data);
    },
    warn(message: string, data?: LoggableData): void {
      // Mock implementation for tests
      console.log(`[WARN] [${name}]`, message, data);
    },
    error(message: string, data?: LoggableData): void {
      // Mock implementation for tests
      console.error(`[ERROR] [${name}]`, message, data);
    },
  };
}