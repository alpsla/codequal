      'large': {
        provider: 'openai',
        model: 'gpt-4o'
      }
    },
    // Default for other languages
    'default': {
      'small': {
        provider: 'openai',
        model: 'gpt-4o'
      },
      'medium': {
        provider: 'openai',
        model: 'gpt-4o'
      },
      'large': {
        provider: 'google',
        model: 'gemini-2.5-pro-preview-05-06'
      }
    },
    // Fallback configurations if preferred provider is unavailable
    'fallback': {
      'small': {
        provider: 'google',
        model: 'gemini-2.5-pro-preview-05-06'
      },
      'medium': {
        provider: 'google',
        model: 'gemini-2.5-pro-preview-05-06'
      },
      'large': {
        provider: 'openai',
        model: 'gpt-4o'
      }
    }
  };
  
  /**
   * Constructor
   * @param baseUrl DeepWiki API base URL
   * @param logger Logger instance
   * @param apiKeys Optional API keys for different providers
   */
  constructor(
    baseUrl: string, 
    logger: Logger,
    private apiKeys?: {
      openai?: string;
      google?: string;
      anthropic?: string;
      openrouter?: string;
    }
  ) {
    this.logger = logger;
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 600000, // 10-minute timeout for large repositories
    });
    
    this.logger.info('DeepWikiClient initialized', { baseUrl });
    
    // Log available providers
    const availableProviders = [];
    if (this.apiKeys?.openai) availableProviders.push('openai');
    if (this.apiKeys?.google) availableProviders.push('google');
    if (this.apiKeys?.anthropic) availableProviders.push('anthropic');
    if (this.apiKeys?.openrouter) availableProviders.push('openrouter');
    
    this.logger.info('Available API providers', { providers: availableProviders });
  }
  
  /**
   * Generate a wiki for a repository
   * @param repository Repository context
   * @param options Export options
   * @returns Wiki content
   */
  async generateWiki(repository: RepositoryContext, options: WikiExportOptions): Promise<any> {
    try {
      this.logger.info('Generating wiki', { repository, options });
      
      // Check repository size first
      const repoSize = await this.getRepositorySize(repository);
      
      // If model config is provided, validate it's available or find an alternative
      if (options.modelConfig) {
        options.modelConfig = this.validateAndGetAvailableModelConfig(
          options.modelConfig,
          'small' // Default to small if we don't know the size category
        );
      }
      
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
      const payload: any = {
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
  async getChatCompletion(repoUrl: string, options: ChatCompletionOptions): Promise<any> {
    try {
      this.logger.info('Getting chat completion', { repoUrl, options });
      
      // Use stream endpoint always based on our testing
      const endpoint = '/chat/completions/stream';
      
      // If model config is provided, validate it's available or find an alternative
      if (options.modelConfig) {
        // We don't have size info for URLs directly, so use default small
        options.modelConfig = this.validateAndGetAvailableModelConfig(
          options.modelConfig,
          'small'
        );
      }
      
      // Build payload
      const payload = {
        repo_url: repoUrl,
        messages: options.messages
      };
      
      // Add provider and model if specified
      if (options.modelConfig) {
        payload['provider'] = options.modelConfig.provider;
        payload['model'] = options.modelConfig.model;
      }
      
      // Make API request
      const response = await this.client.post(endpoint, payload);
      
      return response.data;
    } catch (error) {
      this.logger.error('Error getting chat completion', { repoUrl, error });
      
      // Try with a fallback model if available
      if (options.modelConfig) {
        try {
          this.logger.info('Trying fallback model', { originalError: error });
          
          const fallbackConfig = this.getFallbackModelConfig(options.modelConfig.provider);
          
          if (fallbackConfig) {
            this.logger.info('Using fallback model', { fallbackConfig });
            
            // Build payload with fallback config
            const payload = {
              repo_url: repoUrl,
              messages: options.messages,
              provider: fallbackConfig.provider,
              model: fallbackConfig.model
            };
            
            // Make API request with fallback
            const response = await this.client.post('/chat/completions/stream', payload);
            
            return response.data;
          }
        } catch (fallbackError) {
          this.logger.error('Fallback model also failed', { fallbackError });
        }
      }
      
      throw this.handleApiError(error, 'Failed to get chat completion');
    }
  }
  
  /**
   * Get a chat completion for a repository context
   * @param repository Repository context
   * @param options Chat completion options
   * @returns Chat completion response
   */
  async getChatCompletionForRepo(repository: RepositoryContext, options: ChatCompletionOptions): Promise<any> {
    const repoUrl = this.buildRepoUrl(repository);
    return this.getChatCompletion(repoUrl, options);
  }
  
  /**
   * Validates that the provided model configuration can be used based on available API keys
   * If not, it will return an alternative configuration
   * @param config The requested model configuration
   * @param sizeCategory Size category for fallback recommendation
   * @returns A valid model configuration that can be used
   */
  private validateAndGetAvailableModelConfig<T extends DeepWikiProvider>(
    config: ModelConfig<T>,
    sizeCategory: 'small' | 'medium' | 'large'
  ): ModelConfig<DeepWikiProvider> {
    // Check if the requested provider is available
    const isProviderAvailable = this.isProviderAvailable(config.provider);
    
    if (isProviderAvailable) {
      // If using Anthropic and API key is not available, but OpenRouter is available,
      // switch to OpenRouter for Claude access
      if (config.provider === 'anthropic' && !this.apiKeys?.anthropic && this.apiKeys?.openrouter) {
        this.logger.info('Switching from Anthropic to OpenRouter for Claude access', { 
          originalModel: config.model
        });
        
        return {
          provider: 'openrouter',
          model: `anthropic/${config.model.replace('-', '-')}` as any
        };
      }
      
      return config;
    }
    
    // Provider not available, find an alternative
    this.logger.warn(`Provider ${config.provider} not available, finding alternative`, { 
      requestedConfig: config
    });
    
    // Get fallback configuration based on size category
    const fallbackConfig = this.MODEL_CONFIGS.fallback[sizeCategory];
    
    // Ensure fallback provider is available
    if (this.isProviderAvailable(fallbackConfig.provider)) {
      return fallbackConfig;
    }
    
    // If fallback is also not available, try each available provider
    if (this.apiKeys?.openai) {
      return {
        provider: 'openai',
        model: 'gpt-4o'
      };
    }
    
    if (this.apiKeys?.google) {
      return {
        provider: 'google',
        model: 'gemini-2.5-pro-preview-05-06'
      };
    }
    
    if (this.apiKeys?.openrouter) {
      return {
        provider: 'openrouter',
        model: 'openai/gpt-4o'
      };
    }
    
    // No available providers, return original and let the request fail
    this.logger.error('No available providers for fallback', { requestedConfig: config });
    return config;
  }
  
  /**
   * Get a fallback model configuration for a provider
   * @param provider Original provider
   * @returns Fallback model configuration
   */
  private getFallbackModelConfig(provider: DeepWikiProvider): ModelConfig<DeepWikiProvider> | null {
    // Define fallbacks for each provider
    const fallbacks: Record<DeepWikiProvider, DeepWikiProvider[]> = {
      'openai': ['google', 'openrouter', 'ollama'],
      'google': ['openai', 'openrouter', 'ollama'],
      'anthropic': ['openrouter', 'openai', 'google', 'ollama'],
      'openrouter': ['openai', 'google', 'ollama'],
      'ollama': ['openai', 'google', 'openrouter']
    };
    
    // Find the first available fallback
    for (const fallbackProvider of fallbacks[provider]) {
      if (this.isProviderAvailable(fallbackProvider)) {
        // Return appropriate model for the fallback provider
        switch (fallbackProvider) {
          case 'openai':
            return { provider: 'openai', model: 'gpt-4o' };
          case 'google':
            return { provider: 'google', model: 'gemini-2.5-pro-preview-05-06' };
          case 'openrouter':
            return { provider: 'openrouter', model: 'openai/gpt-4o' };
          case 'ollama':
            return { provider: 'ollama', model: 'llama3:8b' };
          default:
            return null;
        }
      }
    }
    
    return null;
  }
  
  /**
   * Check if a provider is available based on API keys
   * @param provider Provider to check
   * @returns Whether the provider is available
   */
  private isProviderAvailable(provider: DeepWikiProvider): boolean {
    switch (provider) {
      case 'openai':
        return !!this.apiKeys?.openai;
      case 'google':
        return !!this.apiKeys?.google;
      case 'anthropic':
        return !!this.apiKeys?.anthropic;
      case 'openrouter':
        return !!this.apiKeys?.openrouter;
      case 'ollama':
        return true; // Ollama is typically local and doesn't need API keys
      default:
        return false;
    }
  }
  
  /**
   * Get the size of a repository
   * @param repository Repository context
   * @returns Repository size in bytes
   */
  private async getRepositorySize(repository: RepositoryContext): Promise<number> {
    try {
      this.logger.info('Getting repository size', { repository });
      
      // This should be implemented using GitHub API or other means
      // For now returning a placeholder - this should be replaced with proper implementation
      const owner = repository.owner;
      const repo = repository.repo;
      
      // Try to get size from GitHub API
      try {
        const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, {
          headers: {
            'Accept': 'application/vnd.github.v3+json'
          }
        });
        
        // GitHub returns size in KB, convert to bytes
        const sizeInBytes = response.data.size * 1024;
        this.logger.info('Retrieved repository size from GitHub API', { 
          repository,
          sizeInKb: response.data.size,
          sizeInBytes 
        });
        
        return sizeInBytes;
      } catch (error) {
        this.logger.warn('Failed to get repository size from GitHub API', { 
          repository,
          error: error.message
        });
        
        // Return default size based on name length as a very rough estimate
        const defaultSize = (owner.length + repo.length) * 100 * 1024; // Very rough estimate
        return defaultSize;
      }
    } catch (error) {
      this.logger.error('Error getting repository size', { repository, error });
      return 10 * 1024 * 1024; // Default to 10MB if we can't determine size
    }
  }
  
  /**
   * Generate wiki for a large repository using chunked analysis
   * @param repository Repository context
   * @param options Export options
   * @param repoSize Repository size in bytes
   * @returns Wiki content
   */
  private async generateWikiForLargeRepo(
    repository: RepositoryContext, 
    options: WikiExportOptions,
    repoSize: number
  ): Promise<any> {
    this.logger.info('Using chunked analysis for large repository', { repository, repoSize });
    
    // For large repositories, we should use the provider best suited for large repos
    const largeRepoConfig = this.validateAndGetAvailableModelConfig(
      options.modelConfig || this.MODEL_CONFIGS.default.large,
      'large'
    );
    
    // Build repository URL
    const repoUrl = this.buildRepoUrl(repository);
    
    // First, attempt to get the repository structure through a chat query
    const structureQuery = `What is the overall structure of this repository? List the main directories and their purposes. Only include key information needed to understand the repository organization.`;
    
    try {
      const structureResponse = await this.getChatCompletion(repoUrl, {
        messages: [
          { role: 'system', content: 'You are a repository analyzer. Provide concise, focused answers.' },
          { role: 'user', content: structureQuery }
        ],
        modelConfig: largeRepoConfig
      });
      
      // Now get the key components and features through another query
      const componentsQuery = `What are the main components, modules, or features of this repository? Identify the most important parts of the codebase.`;
      
      const componentsResponse = await this.getChatCompletion(repoUrl, {
        messages: [
          { role: 'system', content: 'You are a repository analyzer. Provide concise, focused answers.' },
          { role: 'user', content: componentsQuery }
        ],
        modelConfig: largeRepoConfig
      });
      
      // Finally, ask about the architecture
      const architectureQuery = `What is the overall architecture and design pattern used in this repository? Explain briefly how the components interact.`;
      
      const architectureResponse = await this.getChatCompletion(repoUrl, {
        messages: [
          { role: 'system', content: 'You are a repository analyzer. Provide concise, focused answers.' },
          { role: 'user', content: architectureQuery }
        ],
        modelConfig: largeRepoConfig
      });
      
      // Combine the results into a wiki-like format
      const combinedResults = {
        id: 'chunked-analysis',
        title: `${repository.owner}/${repository.repo} Repository Analysis`,
        sections: [
          {
            id: 'structure',
            title: 'Repository Structure',
            content: structureResponse
          },
          {
            id: 'components',
            title: 'Key Components',
            content: componentsResponse
          },
          {
            id: 'architecture',
            title: 'Architecture',
            content: architectureResponse
          }
        ],
        metadata: {
          analysisMethod: 'chunked',
          repositorySize: repoSize,
          analyzedAt: new Date().toISOString(),
          provider: largeRepoConfig.provider,
          model: largeRepoConfig.model
        }
      };
      
      return combinedResults;
    } catch (error) {
      this.logger.error('Chunked analysis failed', { repository, error });
      throw new Error(`Failed to analyze large repository: ${error.message}`);
    }
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
      // Get the recommended config
      const recommendedConfig = this.MODEL_CONFIGS[normalizedLang][sizeCategory];
      
      // Validate it's available or get an alternative
      return this.validateAndGetAvailableModelConfig(recommendedConfig, sizeCategory);
    }
    
    // Fall back to default configuration if specific language not found
    const defaultConfig = this.MODEL_CONFIGS.default[sizeCategory];
    return this.validateAndGetAvailableModelConfig(defaultConfig, sizeCategory);
  }
  
  /**
   * Handle API errors
   * @param error Error object
   * @param defaultMessage Default error message
   * @returns Error object
   */
  private handleApiError(error: any, defaultMessage: string): Error {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const data = error.response?.data;
      
      if (status === 413) {
        return new Error('Repository is too large for analysis. Please try a smaller repository or use chunked analysis.');
      }
      
      if (status === 401 || status === 403) {
        // Authentication or authorization error
        return new Error('API authentication failed. Please check your API keys.');
      }
      
      if (data?.detail) {
        if (typeof data.detail === 'string') {
          return new Error(`DeepWiki API error (${status}): ${data.detail}`);
        } else if (Array.isArray(data.detail)) {
          // Format validation errors
          const messages = data.detail.map((error: any) => {
            return `${error.msg} at ${error.loc.join('.')}`;
          }).join('; ');
          return new Error(`DeepWiki API validation error: ${messages}`);
        }
      }
      
      if (data?.error) {
        if (data.error.includes('API key')) {
          return new Error(`Provider API key error: ${data.error}. Please check your API keys.`);
        }
        return new Error(`DeepWiki API error (${status}): ${data.error}`);
      }
      
      return new Error(`DeepWiki API error (${status}): ${defaultMessage}`);
    }
    
    return error;
  }
  
  /**
   * Set API keys for different providers
   * @param apiKeys API keys for different providers
   */
  setApiKeys(apiKeys: {
    openai?: string;
    google?: string;
    anthropic?: string;
    openrouter?: string;
  }): void {
    this.apiKeys = {
      ...this.apiKeys,
      ...apiKeys
    };
    
    // Log available providers
    const availableProviders = [];
    if (this.apiKeys?.openai) availableProviders.push('openai');
    if (this.apiKeys?.google) availableProviders.push('google');
    if (this.apiKeys?.anthropic) availableProviders.push('anthropic');
    if (this.apiKeys?.openrouter) availableProviders.push('openrouter');
    
    this.logger.info('Updated available API providers', { providers: availableProviders });
  }
}