// Updated DeepWikiClient based on API testing results

import axios from 'axios';
import type { AxiosInstance, AxiosError } from 'axios';
import { Logger } from '../utils/logger';

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
export class DeepWikiClient {
  private client: AxiosInstance;
  private logger: Logger;
  
  /**
   * Repository size threshold in bytes
   * Repositories larger than this will be analyzed in chunks
   */
  private readonly LARGE_REPO_THRESHOLD = 50 * 1024 * 1024; // 50MB
  
  /**
   * Best model configurations by language and size
   * This is being populated based on our testing results
   */
  private readonly MODEL_CONFIGS: Record<string, Record<'small' | 'medium' | 'large', ModelConfig<DeepWikiProvider>>> = {
    // Based on testing results
    'python': {
      'small': {
        provider: 'openai',
        model: 'gpt-4o'
      },
      'medium': {
        provider: 'google',
        model: 'gemini-2.5-pro-preview-05-06'
      },
      'large': {
        provider: 'google',
        model: 'gemini-2.5-pro-preview-05-06'
      }
    },
    'javascript': {
      'small': {
        provider: 'openai',
        model: 'gpt-4o'
      },
      'medium': {
        provider: 'google',
        model: 'gemini-2.5-pro-preview-05-06'
      },
      'large': {
        provider: 'google',
        model: 'gemini-2.5-pro-preview-05-06'
      }
    },
    'typescript': {
      'small': {
        provider: 'openai',
        model: 'gpt-4o'
      },
      'medium': {
        provider: 'google',
        model: 'gemini-2.5-pro-preview-05-06'
      },
      'large': {
        provider: 'google',
        model: 'gemini-2.5-pro-preview-05-06'
      }
    },
    // Default for other languages
    'default': {
      'small': {
        provider: 'openai',
        model: 'gpt-4o'
      },
      'medium': {
        provider: 'google',
        model: 'gemini-2.5-pro-preview-05-06'
      },
      'large': {
        provider: 'google',
        model: 'gemini-2.5-pro-preview-05-06'
      }
    }
  };
  
  /**
   * Constructor
   * @param baseUrl DeepWiki API base URL
   * @param logger Logger instance
   */
  constructor(baseUrl: string, logger: Logger) {
    this.logger = logger;
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 600000, // 10-minute timeout for large repositories
    });
    
    this.logger.info('DeepWikiClient initialized', { baseUrl });
  }
  
  /**
   * Generate a wiki for a repository
   * @param repository Repository context
   * @param options Export options
   * @returns Wiki content
   */
  async generateWiki(repository: RepositoryContext, options: WikiExportOptions): Promise<Record<string, unknown>> {
    try {
      this.logger.info('Generating wiki', { repository, options });
      
      // Check repository size first
      const repoSize = await this.getRepositorySize(repository);
      
      if (repoSize > this.LARGE_REPO_THRESHOLD) {
        this.logger.warn('Large repository detected, using chunked analysis strategy', { 
          repository, 
          sizeBytes: repoSize,
          threshold: this.LARGE_REPO_THRESHOLD
        });
        
        // Implement chunked analysis for large repositories
        return this.generateWikiForLargeRepo(repository, options, repoSize);
      }
      
      // Build repository URL
      const repoUrl = this.buildRepoUrl(repository);
      
      // Prepare wiki pages
      const pages: WikiPage[] = [
        {
          id: 'main',
          title: 'Main Documentation',
          path: '',
          content: '',
          filePaths: ['README.md', 'CONTRIBUTING.md', 'LICENSE'],
          importance: 1,
          relatedPages: []
        }
      ];
      
      // Build payload
      interface WikiPayload {
        repo_url: string;
        pages: WikiPage[];
        format: 'json' | 'markdown';
        language: 'en' | 'zh';
        provider?: string;
        model?: string;
      }
      
      const payload: WikiPayload = {
        repo_url: repoUrl,
        pages: pages,
        format: options.format,
        language: options.language
      };
      
      // Add provider and model if specified
      if (options.modelConfig) {
        payload.provider = options.modelConfig.provider;
        payload.model = options.modelConfig.model;
      }
      
      // Make API request
      const response = await this.client.post('/export/wiki', payload);
      
      return response.data;
    } catch (error) {
      this.logger.error('Error generating wiki', { repository, error });
      throw this.handleApiError(error, 'Failed to generate wiki');
    }
  }
  
  /**
   * Get a chat completion for a repository
   * @param repoUrl Repository URL
   * @param options Chat completion options
   * @returns Chat completion response
   */
  async getChatCompletion(repoUrl: string, options: ChatCompletionOptions): Promise<Record<string, unknown>> {
    try {
      this.logger.info('Getting chat completion', { repoUrl, options });
      
      // Use stream endpoint always based on our testing
      const endpoint = '/chat/completions/stream';
      
      // Build payload
      interface ChatPayload {
        repo_url: string;
        messages: ChatMessage[];
        provider?: string;
        model?: string;
      }
      
      const payload: ChatPayload = {
        repo_url: repoUrl,
        messages: options.messages
      };
      
      // Add provider and model if specified
      if (options.modelConfig) {
        payload.provider = options.modelConfig.provider;
        payload.model = options.modelConfig.model;
      }
      
      // Make API request
      const response = await this.client.post(endpoint, payload);
      
      return response.data;
    } catch (error) {
      this.logger.error('Error getting chat completion', { repoUrl, error });
      throw this.handleApiError(error, 'Failed to get chat completion');
    }
  }
  
  /**
   * Get a chat completion for a repository context
   * @param repository Repository context
   * @param options Chat completion options
   * @returns Chat completion response
   */
  async getChatCompletionForRepo(repository: RepositoryContext, options: ChatCompletionOptions): Promise<Record<string, unknown>> {
    const repoUrl = this.buildRepoUrl(repository);
    return this.getChatCompletion(repoUrl, options);
  }
  
  /**
   * Get the size of a repository
   * @param repository Repository context
   * @returns Repository size in bytes
   */
  private async getRepositorySize(_repository: RepositoryContext): Promise<number> {
    // This should be implemented using GitHub API or other means
    // For now returning a placeholder
    this.logger.info('Repository size detection not yet implemented, using default size');
    return 0;
  }
  
  /**
   * Generate wiki for a large repository using chunked analysis
   * @param repository Repository context
   * @param options Export options
   * @param repoSize Repository size in bytes
   * @returns Wiki content
   */
  private async generateWikiForLargeRepo(
    _repository: RepositoryContext, 
    _options: WikiExportOptions,
    _repoSize: number
  ): Promise<Record<string, unknown>> {
    // This should be implemented based on testing with large repositories
    // For now, just throw an error
    throw new Error('Chunked analysis for large repositories not yet implemented');
  }
  
  /**
   * Build repository URL from context
   * @param repository Repository context
   * @returns Repository URL
   */
  private buildRepoUrl(repository: RepositoryContext): string {
    const baseUrl = repository.repoType === 'github' 
      ? 'https://github.com' 
      : repository.repoType === 'gitlab'
        ? 'https://gitlab.com'
        : 'https://bitbucket.org';
    
    return `${baseUrl}/${repository.owner}/${repository.repo}`;
  }
  
  /**
   * Recommend the best model configuration for a repository
   * @param language Primary language of the repository
   * @param sizeBytes Size of the repository in bytes
   * @returns Recommended model configuration
   */
  recommendModelConfig(language: string, sizeBytes: number): ModelConfig<DeepWikiProvider> {
    // Determine size category
    let sizeCategory: 'small' | 'medium' | 'large';
    
    if (sizeBytes < 5 * 1024 * 1024) { // Less than 5MB
      sizeCategory = 'small';
    } else if (sizeBytes < 50 * 1024 * 1024) { // Between 5MB and 50MB
      sizeCategory = 'medium';
    } else {
      sizeCategory = 'large';
    }
    
    // Normalize language for lookup
    const normalizedLang = language.toLowerCase();
    
    // Find configuration for this language and size
    if (this.MODEL_CONFIGS[normalizedLang]?.[sizeCategory]) {
      return this.MODEL_CONFIGS[normalizedLang][sizeCategory];
    }
    
    // Fall back to default configuration if not found
    return this.MODEL_CONFIGS.default[sizeCategory];
  }
  
  /**
   * Handle API errors
   * @param error Error object
   * @param defaultMessage Default error message
   * @returns Error object
   */
  private handleApiError(error: unknown, defaultMessage: string): Error {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;
      const data = axiosError.response?.data as Record<string, any>;
      
      if (status === 413) {
        return new Error('Repository is too large for analysis. Please try a smaller repository or use chunked analysis.');
      }
      
      if (data?.detail) {
        if (typeof data.detail === 'string') {
          return new Error(`DeepWiki API error (${status}): ${data.detail}`);
        } else if (Array.isArray(data.detail)) {
          // Format validation errors
          const messages = data.detail.map((errorItem: { msg: string; loc: string[] }) => {
            return `${errorItem.msg} at ${errorItem.loc.join('.')}`;
          }).join('; ');
          return new Error(`DeepWiki API validation error: ${messages}`);
        }
      }
      
      if (data?.error) {
        return new Error(`DeepWiki API error (${status}): ${data.error}`);
      }
      
      return new Error(`DeepWiki API error (${status}): ${defaultMessage}`);
    }
    
    // Convert unknown error to Error object
    if (error instanceof Error) {
      return error;
    } else if (typeof error === 'string') {
      return new Error(error);
    } else {
      return new Error(`${defaultMessage}: ${String(error)}`);
    }
  }
}
