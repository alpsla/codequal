/**
 * Logger utility for CodeQual
 */

/**
 * Data that can be logged
 */
export type LoggableData = Error | Record<string, unknown> | string | number | boolean | null | undefined;

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
        // eslint-disable-next-line no-console
        console.log(`[DEBUG] [${name}]`, message, data !== undefined ? data : '');
      }
    },
    info(message: string, data?: LoggableData): void {
      // eslint-disable-next-line no-console
      console.log(`[INFO] [${name}]`, message, data !== undefined ? data : '');
    },
    warn(message: string, data?: LoggableData): void {
      console.warn(`[WARN] [${name}]`, message, data !== undefined ? data : '');
    },
    error(message: string, data?: LoggableData): void {
      console.error(`[ERROR] [${name}]`, message, data !== undefined ? data : '');
    },
  };
}
