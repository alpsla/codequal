import { BaseAgent } from '../base/base-agent';
import { AnalysisResult } from '../../../core/src';
/**
 * File data structure
 */
interface FileData {
    filename: string;
    content?: string;
    patch?: string;
    status?: string;
    additions?: number;
    deletions?: number;
}
/**
 * PR data structure
 */
interface PRData {
    url?: string;
    title?: string;
    description?: string;
    files?: FileData[];
    branch?: string;
    baseBranch?: string;
    author?: string;
    repository?: string;
}
/**
 * DeepSeek Agent configuration
 */
interface DeepSeekAgentConfig {
    model?: string;
    deepseekApiKey?: string;
    debug?: boolean;
    premium?: boolean;
    [key: string]: unknown;
}
/**
 * Implementation of DeepSeek-based agent
 */
export declare class DeepSeekAgent extends BaseAgent {
    /**
     * Prompt template name
     */
    private promptTemplate;
    /**
     * DeepSeek API client
     */
    private deepseekClient;
    /**
     * Model name
     */
    private model;
    /**
     * Token usage for cost tracking
     */
    private tokenUsage;
    /**
     * @param promptTemplate Template name
     * @param config Configuration
     */
    constructor(promptTemplate: string, config?: DeepSeekAgentConfig);
    /**
     * Initialize DeepSeek client
     * @returns DeepSeek client
     */
    private initDeepSeekClient;
    /**
     * Analyze PR data using DeepSeek
     * @param data PR data
     * @returns Analysis result
     */
    analyze(data: PRData): Promise<AnalysisResult>;
    /**
     * Fill prompt template with PR data
     * @param template Prompt template
     * @param data PR data
     * @returns Filled prompt
     */
    private fillPromptTemplate;
    /**
     * Format files for prompt
     * @param files Files changed
     * @returns Formatted files string
     */
    private formatFilesForPrompt;
    /**
     * Get mock response for test case
     * @returns Standardized mock analysis result for tests
     */
    private getMockTestResponse;
    /**
     * Format DeepSeek response to standard format
     * @param rawResult Raw response from DeepSeek
     * @returns Standardized analysis result
     */
    protected formatResult(rawResult: unknown): AnalysisResult;
    /**
     * Handle error in agent operation
     * @param error Error object
     * @returns Error result
     */
    protected handleError(error: unknown): AnalysisResult;
}
export {};
