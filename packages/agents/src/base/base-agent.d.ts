import { Agent, AnalysisResult } from '../agent';
import { Logger, LoggableData } from '@codequal/core/utils';
import { TokenUsage } from '../services/token-usage-extractor';
/**
 * Abstract base class for all agents
 */
export declare abstract class BaseAgent implements Agent {
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
    constructor(config?: Record<string, unknown>);
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
    protected log(message: string, data?: LoggableData): void;
    /**
     * Handle errors during analysis
     * @param error Error object
     * @returns Empty analysis result
     */
    protected handleError(error: unknown): AnalysisResult;
    /**
     * Extract token usage from API response
     * @param response API response object
     * @returns Token usage or null if not found
     */
    protected extractTokenUsage(response: any): TokenUsage | null;
    /**
     * Add token usage to analysis result
     * @param result Analysis result
     * @param response API response containing token usage
     * @returns Analysis result with token usage
     */
    protected addTokenUsage(result: AnalysisResult, response: any): AnalysisResult;
}
