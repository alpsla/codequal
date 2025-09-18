/**
 * Local logger implementation to replace @codequal/core/utils
 */

export interface Logger {
  debug: (message: string, context?: any) => void;
  info: (message: string, context?: any) => void;
  warn: (message: string, context?: any) => void;
  error: (message: string, context?: any) => void;
}

export function createLogger(name: string): Logger {
  return {
    debug: (message: string, context?: any) => {
      console.log(`[${name}] [DEBUG] ${message}`, context || '');
    },
    info: (message: string, context?: any) => {
      console.log(`[${name}] [INFO] ${message}`, context || '');
    },
    warn: (message: string, context?: any) => {
      console.warn(`[${name}] [WARN] ${message}`, context || '');
    },
    error: (message: string, context?: any) => {
      console.error(`[${name}] [ERROR] ${message}`, context || '');
    }
  };
}

// Re-export for compatibility
export default createLogger;