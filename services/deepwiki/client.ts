import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * Interface for repository analysis options
 */
export interface RepositoryAnalysisOptions {
  /** Depth of analysis: minimal, standard, or comprehensive */
  depth?: 'minimal' | 'standard' | 'comprehensive';
  /** Areas to focus analysis on */
  focusAreas?: {
    architecture?: boolean;
    dependencies?: boolean;
    patterns?: boolean;
    security?: boolean;
    performance?: boolean;
    documentation?: boolean;
  };
  /** Cache settings */
  cache?: {
    useCache?: boolean;
    maxAge?: number; // in seconds
  };
}

/**
 * Interface for chat completion request
 */
export interface ChatCompletionRequest {
  /** GitHub repository owner */
  owner: string;
  /** GitHub repository name */
  repo: string;
  /** Question or prompt to ask about the repository */
  message: string;
  /** Optional settings for the chat completion */
  options?: {
    temperature?: number;
    maxTokens?: number;
    modelProvider?: 'openai' | 'google';
  };
}

/**
 * DeepWiki client for interacting with the DeepWiki API
 * This client provides methods to analyze repositories, export wiki content,
 * and ask questions about repositories.
 */
export class DeepWikiClient {
  private client: AxiosInstance;
  
  /**
   * Creates a new DeepWiki client
   * @param baseUrl Base URL of the DeepWiki API (defaults to the in-cluster URL)
   * @param options Additional Axios options
   */
  constructor(
    baseUrl: string = 'http://deepwiki-api.codequal-dev.svc.cluster.local:8001',
    options: AxiosRequestConfig = {}
  ) {
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 60000, // Default 1-minute timeout
      ...options,
    });
  }

  /**
   * Analyzes a GitHub repository
   * @param owner GitHub repository owner
   * @param repo GitHub repository name
   * @param options Analysis options
   * @returns Analysis result
   */
  async analyzeRepository(
    owner: string,
    repo: string,
    options?: RepositoryAnalysisOptions
  ): Promise<any> {
    try {
      const response = await this.client.post('/api/analyze-repo', {
        owner,
        repo,
        depth: options?.depth || 'standard',
        focusAreas: options?.focusAreas,
        cache: options?.cache,
      });
      
      return response.data;
    } catch (error) {
      this.handleError('Error analyzing repository', error);
      throw error;
    }
  }

  /**
   * Exports wiki content for a repository
   * @param owner GitHub repository owner
   * @param repo GitHub repository name
   * @param format Format of the export (markdown or JSON)
   * @returns Wiki content
   */
  async exportWiki(
    owner: string,
    repo: string,
    format: 'markdown' | 'json' = 'markdown'
  ): Promise<any> {
    try {
      const response = await this.client.post('/export/wiki', {
        owner,
        repo,
        format,
      });
      
      return response.data;
    } catch (error) {
      this.handleError('Error exporting wiki', error);
      throw error;
    }
  }

  /**
   * Gets cached wiki data if available
   * @param owner GitHub repository owner
   * @param repo GitHub repository name
   * @returns Cached wiki data or null if not cached
   */
  async getWikiCache(owner: string, repo: string): Promise<any | null> {
    try {
      const response = await this.client.get('/api/wiki_cache', {
        params: { owner, repo },
      });
      
      return response.data;
    } catch (error) {
      // If 404, it means not cached
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      
      this.handleError('Error getting wiki cache', error);
      throw error;
    }
  }

  /**
   * Stores wiki data in the cache
   * @param owner GitHub repository owner
   * @param repo GitHub repository name
   * @param data Wiki data to cache
   * @returns Success status
   */
  async storeWikiCache(owner: string, repo: string, data: any): Promise<any> {
    try {
      const response = await this.client.post('/api/wiki_cache', {
        owner,
        repo,
        data,
      });
      
      return response.data;
    } catch (error) {
      this.handleError('Error storing wiki cache', error);
      throw error;
    }
  }

  /**
   * Asks a question about a repository using the chat completion API
   * @param request Chat completion request
   * @returns Answer to the question
   */
  async askQuestion(request: ChatCompletionRequest): Promise<string> {
    try {
      const response = await this.client.post('/chat/completions/stream', {
        owner: request.owner,
        repo: request.repo,
        message: request.message,
        temperature: request.options?.temperature,
        maxTokens: request.options?.maxTokens,
        provider: request.options?.modelProvider,
      });
      
      return response.data;
    } catch (error) {
      this.handleError('Error asking question', error);
      throw error;
    }
  }

  /**
   * Gets the structure of a repository
   * @param owner GitHub repository owner
   * @param repo GitHub repository name
   * @returns Repository structure
   */
  async getRepositoryStructure(owner: string, repo: string): Promise<any> {
    try {
      // Since the API doesn't have a direct endpoint for GitHub repos,
      // we'll check if the repo has been analyzed first
      const cacheData = await this.getWikiCache(owner, repo);
      
      if (cacheData && cacheData.structure) {
        return cacheData.structure;
      }
      
      // If not cached, analyze the repo first
      await this.analyzeRepository(owner, repo);
      
      // Then get the cache data which should now include structure
      const freshData = await this.getWikiCache(owner, repo);
      return freshData.structure;
    } catch (error) {
      this.handleError('Error getting repository structure', error);
      throw error;
    }
  }

  /**
   * Handles errors from API calls
   * @param message Error message prefix
   * @param error Error object
   */
  private handleError(message: string, error: any): void {
    if (axios.isAxiosError(error)) {
      console.error(
        `${message}: ${error.message}`,
        error.response?.data || error
      );
    } else {
      console.error(`${message}: ${error}`);
    }
  }
}

export default DeepWikiClient;