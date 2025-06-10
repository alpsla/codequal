/**
 * Mock utility functions for local usage
 * Note: These are temporary replacements for the core utility functions
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
      if (process.env.DEBUG === 'true') {
        // Using global console for logging, but this would be replaced with a proper logger in production
        // eslint-disable-next-line no-console
        console.log(`[DEBUG] [${name}]`, message, data !== undefined ? data : '');
      }
    },
    info(message: string, data?: LoggableData): void {
      // eslint-disable-next-line no-console
      console.log(`[INFO] [${name}]`, message, data !== undefined ? data : '');
    },
    warn(message: string, data?: LoggableData): void {
      // eslint-disable-next-line no-console
      console.warn(`[WARN] [${name}]`, message, data !== undefined ? data : '');
    },
    error(message: string, data?: LoggableData): void {
      // eslint-disable-next-line no-console
      console.error(`[ERROR] [${name}]`, message, data !== undefined ? data : '');
    },
  };
}
