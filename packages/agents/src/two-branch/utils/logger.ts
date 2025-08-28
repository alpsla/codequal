/**
 * Simple logger for Two-Branch Analysis
 * 
 * Provides consistent logging across all components
 * Can be replaced with Winston or other logger later
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

class Logger {
  private level: LogLevel = LogLevel.INFO;
  private prefix = '[Two-Branch]';
  
  constructor() {
    // Set log level from environment
    const envLevel = process.env.LOG_LEVEL?.toUpperCase();
    if (envLevel && envLevel in LogLevel) {
      this.level = LogLevel[envLevel as keyof typeof LogLevel] as unknown as LogLevel;
    }
  }
  
  setLevel(level: LogLevel): void {
    this.level = level;
  }
  
  error(message: string, ...args: any[]): void {
    if (this.level >= LogLevel.ERROR) {
      console.error(`${this.prefix} ❌`, message, ...args);
    }
  }
  
  warn(message: string, ...args: any[]): void {
    if (this.level >= LogLevel.WARN) {
      console.warn(`${this.prefix} ⚠️`, message, ...args);
    }
  }
  
  info(message: string, ...args: any[]): void {
    if (this.level >= LogLevel.INFO) {
      console.log(`${this.prefix} ℹ️`, message, ...args);
    }
  }
  
  debug(message: string, ...args: any[]): void {
    if (this.level >= LogLevel.DEBUG) {
      console.log(`${this.prefix} 🐛`, message, ...args);
    }
  }
}

// Export singleton instance
export const logger = new Logger();
export default logger;