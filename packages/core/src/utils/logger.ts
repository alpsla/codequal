/**
 * Log levels for the application
 */
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4
}

/**
 * Logger configuration interface
 */
export interface LoggerConfig {
  level: LogLevel;
  context?: string;
  useColors?: boolean;
  includeTimestamp?: boolean;
}

/**
 * Type for loggable data
 */
export type LoggableData = 
  | string 
  | number 
  | boolean 
  | null 
  | undefined 
  | Record<string, unknown> 
  | Array<unknown> 
  | Error;

/**
 * Default logger configuration
 */
const defaultConfig: LoggerConfig = {
  level: LogLevel.INFO,
  useColors: true,
  includeTimestamp: true
};

/**
 * Global logger configuration
 */
let globalConfig: LoggerConfig = { ...defaultConfig };

/**
 * Configure the global logger settings
 * @param config Logger configuration
 */
export function configureLogger(config: Partial<LoggerConfig>): void {
  globalConfig = { ...globalConfig, ...config };
}

/**
 * Get current log level
 * @returns Current log level
 */
export function getLogLevel(): LogLevel {
  return globalConfig.level;
}

/**
 * Set global log level
 * @param level Log level
 */
export function setLogLevel(level: LogLevel): void {
  globalConfig.level = level;
}

/**
 * Color codes for console output
 */
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

/**
 * Logger class for consistent application logging
 */
export class Logger {
  private context: string;
  private config: LoggerConfig;

  /**
   * Create a new logger
   * @param context Logger context (typically class or module name)
   * @param config Logger configuration
   */
  constructor(context: string, config: Partial<LoggerConfig> = {}) {
    this.context = context;
    this.config = { ...globalConfig, ...config, context };
  }

  /**
   * Log an error message
   * @param message Log message
   * @param data Additional data
   */
  error(message: string, data?: LoggableData): void {
    if (this.config.level >= LogLevel.ERROR) {
      this.log('ERROR', message, data, this.config.useColors ? colors.red : undefined);
    }
  }

  /**
   * Log a warning message
   * @param message Log message
   * @param data Additional data
   */
  warn(message: string, data?: LoggableData): void {
    if (this.config.level >= LogLevel.WARN) {
      this.log('WARN', message, data, this.config.useColors ? colors.yellow : undefined);
    }
  }

  /**
   * Log an info message
   * @param message Log message
   * @param data Additional data
   */
  info(message: string, data?: LoggableData): void {
    if (this.config.level >= LogLevel.INFO) {
      this.log('INFO', message, data, this.config.useColors ? colors.green : undefined);
    }
  }

  /**
   * Log a debug message
   * @param message Log message
   * @param data Additional data
   */
  debug(message: string, data?: LoggableData): void {
    if (this.config.level >= LogLevel.DEBUG) {
      this.log('DEBUG', message, data, this.config.useColors ? colors.cyan : undefined);
    }
  }

  /**
   * Log a trace message
   * @param message Log message
   * @param data Additional data
   */
  trace(message: string, data?: LoggableData): void {
    if (this.config.level >= LogLevel.TRACE) {
      this.log('TRACE', message, data, this.config.useColors ? colors.magenta : undefined);
    }
  }

  /**
   * Internal log method
   * @param level Log level
   * @param message Log message
   * @param data Additional data
   * @param color Color code
   */
  private log(level: string, message: string, data?: LoggableData, color?: string): void {
    const timestamp = this.config.includeTimestamp ? new Date().toISOString() : '';
    const contextStr = this.context ? `[${this.context}]` : '';
    
    const prefix = timestamp 
      ? `${timestamp} ${level} ${contextStr}`
      : `${level} ${contextStr}`;
    
    if (data !== undefined) {
      // Only use colors in non-production environments
      if (color && process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.log(`${color}${prefix}${colors.reset} ${message}`, data);
      } else {
        // eslint-disable-next-line no-console
        console.log(`${prefix} ${message}`, data);
      }
    } else {
      if (color && process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.log(`${color}${prefix}${colors.reset} ${message}`);
      } else {
        // eslint-disable-next-line no-console
        console.log(`${prefix} ${message}`);
      }
    }
  }
}

/**
 * Create a logger for the specified context
 * @param context Logger context
 * @param config Logger configuration
 * @returns Logger instance
 */
export function createLogger(context: string, config: Partial<LoggerConfig> = {}): Logger {
  return new Logger(context, config);
}
