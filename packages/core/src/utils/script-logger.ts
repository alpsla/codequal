/**
 * Script Logger
 * 
 * A simple logger for utility scripts that can be used in place of console statements
 * to maintain consistent logging patterns and levels across the codebase.
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

export interface LogOptions {
  level: LogLevel;
  timestamp: boolean;
  prefix: string;
  colorize: boolean;
}

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

export class ScriptLogger {
  private options: LogOptions;

  constructor(options?: Partial<LogOptions>) {
    this.options = {
      level: LogLevel.INFO,
      timestamp: true,
      prefix: '',
      colorize: true,
      ...options
    };
  }

  /**
   * Sets the log level
   * @param level New log level
   */
  setLevel(level: LogLevel): void {
    this.options.level = level;
  }

  /**
   * Gets the current log level
   * @returns Current log level
   */
  getLevel(): LogLevel {
    return this.options.level;
  }

  /**
   * Sets the log prefix
   * @param prefix New log prefix
   */
  setPrefix(prefix: string): void {
    this.options.prefix = prefix;
  }

  /**
   * Logs a debug message
   * @param message Message to log
   * @param data Optional data to log
   */
  debug(message: string, data?: unknown): void {
    if (this.options.level <= LogLevel.DEBUG) {
      this.log('DEBUG', message, data, this.options.colorize ? COLORS.gray : undefined);
    }
  }

  /**
   * Logs an info message
   * @param message Message to log
   * @param data Optional data to log
   */
  info(message: string, data?: unknown): void {
    if (this.options.level <= LogLevel.INFO) {
      this.log('INFO', message, data, this.options.colorize ? COLORS.green : undefined);
    }
  }

  /**
   * Logs a warning message
   * @param message Message to log
   * @param data Optional data to log
   */
  warn(message: string, data?: unknown): void {
    if (this.options.level <= LogLevel.WARN) {
      this.log('WARN', message, data, this.options.colorize ? COLORS.yellow : undefined);
    }
  }

  /**
   * Logs an error message
   * @param message Message to log
   * @param data Optional data to log
   */
  error(message: string, data?: unknown): void {
    if (this.options.level <= LogLevel.ERROR) {
      this.log('ERROR', message, data, this.options.colorize ? COLORS.red : undefined);
    }
  }

  /**
   * Logs a message with a specific level
   * @param level Log level
   * @param message Message to log
   * @param data Optional data to log
   * @param color Optional color to use
   */
  private log(level: string, message: string, data?: unknown, color?: string): void {
    const timestamp = this.options.timestamp ? `[${new Date().toISOString()}] ` : '';
    const prefix = this.options.prefix ? `[${this.options.prefix}] ` : '';
    const levelTag = `[${level}] `;
    
    const header = timestamp + prefix + levelTag;

    if (this.options.colorize && color) {
      // eslint-disable-next-line no-console
      console.log(`${color}${header}${message}${COLORS.reset}`);
      
      if (data !== undefined) {
        // eslint-disable-next-line no-console
        console.log(data);
      }
    } else {
      // eslint-disable-next-line no-console
      console.log(`${header}${message}`);
      
      if (data !== undefined) {
        // eslint-disable-next-line no-console
        console.log(data);
      }
    }
  }

  /**
   * Creates a child logger with a specific prefix
   * @param prefix Prefix for the child logger
   * @returns Child logger
   */
  child(prefix: string): ScriptLogger {
    return new ScriptLogger({
      ...this.options,
      prefix: this.options.prefix ? `${this.options.prefix}:${prefix}` : prefix
    });
  }
}

/**
 * Create a global script logger instance
 */
export const scriptLogger = new ScriptLogger();