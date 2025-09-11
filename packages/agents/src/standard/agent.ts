/**
 * Base Standard Agent Class
 * 
 * Provides common functionality for all Standard framework agents
 */

export abstract class StandardAgent {
  protected version = '1.0.0';
  
  constructor() {
    // Base initialization
  }
  
  /**
   * Get agent metadata
   */
  getMetadata() {
    return {
      version: this.version,
      framework: 'standard'
    };
  }
  
  /**
   * Log messages - can be overridden by subclasses
   */
  protected log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any) {
    const logFn = console[level] || console.log;
    logFn(`[${this.constructor.name}] ${message}`, data || '');
  }
}