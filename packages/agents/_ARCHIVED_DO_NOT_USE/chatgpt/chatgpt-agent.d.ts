import { BaseAgent } from '../base/base-agent';
import { AnalysisResult } from '../agent';
/**
 * OpenAI API completion response type
 */
interface OpenAIResponse {
    choices: Array<{
        message?: {
            content: string;
            role: string;
        };
        text?: string;
        index: number;
        finish_reason: string;
    }>;
    created: number;
    id: string;
    model: string;
    object: string;
    usage: {
        completion_tokens: number;
        prompt_tokens: number;
        total_tokens: number;
    } | undefined;
}
/**
 * OpenAI API request parameters
 */
interface OpenAIRequestParams {
    model: string;
    messages: Array<{
        role: 'system' | 'user' | 'assistant';
        content: string;
    }>;
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
    stop?: string | string[];
}
/**
 * OpenAI Chat client interface
 */
interface OpenAIClient {
    chat: {
        completions: {
            create: (params: OpenAIRequestParams) => Promise<OpenAIResponse>;
        };
    };
}
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
 * ChatGPT Agent configuration
 */
interface ChatGPTAgentConfig {
    model?: string;
    openaiApiKey?: string;
    debug?: boolean;
    [key: string]: unknown;
}
/**
 * Implementation of ChatGPT/OpenAI-based agent
 */
export declare class ChatGPTAgent extends BaseAgent {
    /**
     * Prompt template name
     */
    private promptTemplate;
    /**
     * OpenAI API client
     */
    private openaiClient;
    /**
     * Model name
     */
    private model;
    /**
     * @param promptTemplate Template name
     * @param config Configuration
     */
    constructor(promptTemplate: string, config?: ChatGPTAgentConfig);
    /**
     * Initialize OpenAI client
     * @returns OpenAI client
     */
    protected initOpenAIClient(): OpenAIClient;
    /**
     * Create a client wrapper for OpenAI/OpenRouter
     * @param openai OpenAI client instance
     * @param logger Logger instance
     * @returns OpenAI client wrapper
     */
    private createClientWrapper;
    /**
     * Analyze PR data using ChatGPT
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
     * Format ChatGPT response to standard format
     * @param response OpenAI response
     * @returns Standardized analysis result
     */
    protected formatResult(response: string): AnalysisResult;
}
export {};
