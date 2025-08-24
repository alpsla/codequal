import { Logger } from '../utils/logger';
import { RepositorySizeCategory } from '../config/models/repository-model-config';
/**
 * Repository context interface
 */
export interface RepositoryContext {
    owner: string;
    repo: string;
    repoType: 'github' | 'gitlab' | 'bitbucket';
}
/**
 * DeepWiki provider options
 */
export type DeepWikiProvider = 'google' | 'openai' | 'anthropic' | 'openrouter' | 'ollama' | 'deepseek';
/**
 * DeepWiki model options by provider
 */
export interface DeepWikiModels {
    google: 'gemini-2.0-flash' | 'gemini-2.5-flash-preview-04-17' | 'gemini-2.5-pro-preview-05-06';
    openai: 'gpt-4o' | 'gpt-4.1' | 'o1' | 'o3' | 'o4-mini';
    anthropic: 'claude-3-7-sonnet' | 'claude-3-5-sonnet';
    openrouter: 'openai/gpt-4o' | 'openai/gpt-4.1' | 'openai/o1' | 'openai/o3' | 'openai/o4-mini' | 'anthropic/claude-3.7-sonnet' | 'anthropic/claude-3.5-sonnet';
    ollama: 'qwen3:1.7b' | 'llama3:8b' | 'qwen3:8b';
    deepseek: 'deepseek-coder' | 'deepseek-coder-plus' | string;
}
/**
 * Model selector interface
 */
export interface ModelSelector {
    selectModelForContext(mode: string, context: {
        primaryLanguage: string;
        size: RepositorySizeCategory;
    }): Promise<{
        primary: {
            provider: string;
            model: string;
        };
        fallback?: {
            provider: string;
            model: string;
        };
    }>;
}
/**
 * Model configuration options
 */
export interface ModelConfig<T extends DeepWikiProvider> {
    provider: T;
    model: DeepWikiModels[T];
}
/**
 * Wiki export options
 */
export interface WikiExportOptions {
    format: 'json' | 'markdown';
    language: 'en' | 'zh';
    modelConfig?: ModelConfig<DeepWikiProvider>;
}
/**
 * Chat message interface
 */
export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}
/**
 * Chat completion options
 */
export interface ChatCompletionOptions {
    messages: ChatMessage[];
    modelConfig?: ModelConfig<DeepWikiProvider>;
    stream?: boolean;
    timeout?: number;
}
/**
 * Page interface for wiki export
 */
export interface WikiPage {
    id: string;
    title: string;
    path: string;
    content: string;
    filePaths: string[];
    importance: number;
    relatedPages: string[];
}
/**
 * DeepWiki client class for integrating with the DeepWiki API
 */
export declare class DeepWikiClient {
    private client;
    private logger;
    /**
     * Repository size threshold in bytes
     * Repositories larger than this will be analyzed in chunks
     */
    private readonly LARGE_REPO_THRESHOLD;
    /**
     * Model selector for dynamic configuration
     * Will be injected if available, otherwise uses defaults
     */
    private modelSelector?;
    /**
     * Default model configuration as fallback
     * Used only when no model selector is available
     */
    private readonly DEFAULT_MODEL;
    /**
     * Constructor
     * @param baseUrl DeepWiki API base URL
     * @param logger Logger instance
     */
    constructor(baseUrl: string, logger: Logger, modelSelector?: ModelSelector);
    /**
     * Generate a wiki for a repository
     * @param repository Repository context
     * @param options Export options
     * @returns Wiki content
     */
    generateWiki(repository: RepositoryContext, options: WikiExportOptions): Promise<Record<string, unknown>>;
    /**
     * Get a chat completion for a repository
     * @param repoUrl Repository URL
     * @param options Chat completion options
     * @returns Chat completion response
     */
    getChatCompletion(repoUrl: string, options: ChatCompletionOptions): Promise<Record<string, unknown>>;
    /**
     * Get a chat completion for a repository context
     * @param repository Repository context
     * @param options Chat completion options
     * @returns Chat completion response
     */
    getChatCompletionForRepo(repository: RepositoryContext, options: ChatCompletionOptions): Promise<Record<string, unknown>>;
    /**
     * Get the size of a repository
     * @param repository Repository context
     * @returns Repository size in bytes
     */
    private getRepositorySize;
    /**
     * Generate wiki for a large repository using chunked analysis
     * @param repository Repository context
     * @param options Export options
     * @param repoSize Repository size in bytes
     * @returns Wiki content
     */
    private generateWikiForLargeRepo;
    /**
     * Build repository URL from context
     * @param repository Repository context
     * @returns Repository URL
     */
    private buildRepoUrl;
    /**
     * Recommend the best model configuration for a repository
     * @param language Primary language of the repository
     * @param sizeBytes Size of the repository in bytes
     * @returns Recommended model configuration
     */
    recommendModelConfig(language: string, sizeBytes: number): Promise<ModelConfig<DeepWikiProvider>>;
    /**
     * Handle API errors
     * @param error Error object
     * @param defaultMessage Default error message
     * @returns Error object
     */
    private handleApiError;
}
