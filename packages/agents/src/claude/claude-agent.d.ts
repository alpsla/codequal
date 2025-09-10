import { BaseAgent } from '../base/base-agent';
import { AnalysisResult } from '../agent';
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
 * Claude Agent configuration
 */
interface ClaudeAgentConfig {
    model?: string;
    anthropicApiKey?: string;
    debug?: boolean;
    [key: string]: unknown;
}
/**
 * Implementation of Claude-based agent
 */
export declare class ClaudeAgent extends BaseAgent {
    /**
     * Prompt template name
     */
    private promptTemplate;
    /**
     * Claude API client
     */
    private claudeClient;
    /**
     * Model name
     */
    private model;
    /**
     * @param promptTemplate Template name
     * @param config Configuration
     */
    constructor(promptTemplate: string, config?: ClaudeAgentConfig);
    /**
     * Initialize Claude client
     * @returns Claude client
     */
    private initClaudeClient;
    /**
     * Analyze PR data using Claude
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
     * Format Claude response to standard format
     * @param response Claude response
     * @returns Standardized analysis result
     */
    protected formatResult(response: string): AnalysisResult;
    /**
     * Handle error in agent operation
     * @param error Error object
     * @returns Error result
     */
    protected handleError(error: unknown): AnalysisResult;
}
export {};
