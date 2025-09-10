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
    complexity?: 'simple' | 'medium' | 'complex';
}
/**
 * Gemini Agent configuration
 */
interface GeminiAgentConfig {
    model?: string;
    geminiApiKey?: string;
    debug?: boolean;
    premium?: boolean;
    [key: string]: unknown;
}
/**
 * Implementation of Gemini-based agent
 */
export declare class GeminiAgent extends BaseAgent {
    /**
     * Prompt template name
     */
    private promptTemplate;
    /**
     * Gemini API client
     */
    private geminiClient;
    /**
     * Model name
     */
    private model;
    /**
     * Premium model name
     */
    private premiumModel;
    /**
     * Token usage for cost tracking
     */
    private tokenUsage;
    /**
     * @param promptTemplate Template name
     * @param config Configuration
     */
    constructor(promptTemplate: string, config?: GeminiAgentConfig);
    /**
     * Initialize Gemini client
     * @returns Gemini client
     */
    private initGeminiClient;
    /**
     * Analyze PR data using Gemini
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
     * Format Gemini response to standard format
     * @param rawResult Raw response from Gemini
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
