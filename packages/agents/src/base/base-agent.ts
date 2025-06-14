import { Agent, AnalysisResult } from '../agent';
import { createLogger, Logger, LoggableData } from '@codequal/core/utils';

/**
 * Abstract base class for all agents
 */
export abstract class BaseAgent implements Agent {
  /**
   * Agent configuration
   */
  protected config: Record<string, unknown>;
  
  /**
   * Logger instance
   */
  protected logger: Logger;
  
  /**
   * @param config Agent configuration
   */
  constructor(config: Record<string, unknown> = {}) {
    this.config = config;
    this.logger = createLogger(this.constructor.name);
  }
  
  /**
   * Analyze PR data
   * @param data PR data to analyze
   * @returns Analysis result
   */
  abstract analyze(data: any): Promise<AnalysisResult>;
  
  /**
   * Format the result in the standard format
   * @param rawResult Raw result from the provider
   * @returns Standardized analysis result
   */
  protected abstract formatResult(rawResult: unknown): AnalysisResult;
  
  /**
   * Log agent activity (for debugging and monitoring)
   * @param message Log message
   * @param data Additional data
   */
  protected log(message: string, data?: LoggableData): void {
    if (this.config.debug) {
      this.logger.debug(message, data);
    }
  }
  
  /**
   * Handle errors during analysis
   * @param error Error object
   * @returns Empty analysis result
   */
  protected handleError(error: unknown): AnalysisResult {
    // Convert error to proper format for logging
    const errorData: LoggableData = error instanceof Error 
      ? error 
      : { message: String(error) };
      
    this.logger.error(`Error during analysis:`, errorData);
    
    return {
      insights: [],
      suggestions: [],
      metadata: {
        error: true,
        message: error instanceof Error ? error.message : String(error)
      }
    };
  }
}