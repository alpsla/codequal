/**
 * Logger Interface
 * 
 * Defines the contract for logging services
 */

export interface ILogger {
  /**
   * Log debug message
   */
  debug(message: string, data?: any): void;

  /**
   * Log info message
   */
  info(message: string, data?: any): void;

  /**
   * Log warning message
   */
  warn(message: string, data?: any): void;

  /**
   * Log error message
   */
  error(message: string, data?: any): void;

  /**
   * Create child logger with context
   */
  child?(context: Record<string, any>): ILogger;

  /**
   * Set log level
   */
  setLevel?(level: 'debug' | 'info' | 'warn' | 'error'): void;
}

/**
 * Structured log entry
 */
export interface LogEntry {
  timestamp: Date;
  level: string;
  message: string;
  data?: any;
  context?: Record<string, any>;
  error?: Error;
}