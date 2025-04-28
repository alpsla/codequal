/**
 * Simple logger utility
 * 
 * This is a temporary implementation until we can use the real logger from @codequal/common
 */

/**
 * Type for loggable metadata
 */
export type LogMetadata = Record<string, unknown>;

export interface Logger {
  info(message: string, meta?: LogMetadata): void;
  error(message: string, meta?: LogMetadata): void;
  warn(message: string, meta?: LogMetadata): void;
  debug(message: string, meta?: LogMetadata): void;
}

/**
 * Creates a simple formatted log message
 */
const formatMessage = (level: string, message: string, meta?: LogMetadata): string => {
  const timestamp = new Date().toISOString();
  const metaString = meta ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level}] ${message}${metaString}`;
};

/**
 * Create a logger instance
 */
export const createLogger = (namespace: string): Logger => {
  return {
    info(message: string, meta?: LogMetadata): void {
      // Using process.stdout.write to avoid ESLint console warnings
      process.stdout.write(`${formatMessage('INFO', `[${namespace}] ${message}`, meta)}\n`);
    },
    error(message: string, meta?: LogMetadata): void {
      // Using process.stderr.write to avoid ESLint console warnings
      process.stderr.write(`${formatMessage('ERROR', `[${namespace}] ${message}`, meta)}\n`);
    },
    warn(message: string, meta?: LogMetadata): void {
      process.stdout.write(`${formatMessage('WARN', `[${namespace}] ${message}`, meta)}\n`);
    },
    debug(message: string, meta?: LogMetadata): void {
      if (process.env.DEBUG) {
        process.stdout.write(`${formatMessage('DEBUG', `[${namespace}] ${message}`, meta)}\n`);
      }
    }
  };
};

// Default logger instance
export const logger = createLogger('cli');
