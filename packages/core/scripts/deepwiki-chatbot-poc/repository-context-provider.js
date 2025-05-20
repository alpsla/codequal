/**
 * Repository Context Provider
 * 
 * This module is responsible for obtaining context about repositories from DeepWiki.
 * It supports both retrieving pre-generated analyses and generating new analyses on demand.
 */

const DeepWikiKubernetesService = require('./deepwiki-kubernetes');
const config = require('./config');

class RepositoryContextProvider {
  constructor(options = {}) {
    this.deepwikiService = options.deepwikiService || new DeepWikiKubernetesService();
    this.analysisTypes = options.analysisTypes || config.repository.analysisTypes;
    
    // Simple in-memory cache for analyses
    this.analysisCache = new Map();
    this.cacheEnabled = options.cacheEnabled !== undefined ? options.cacheEnabled : config.repository.cacheEnabled;
    this.cacheTTL = options.cacheTTL || config.repository.cacheTTL;
    
    this.initialized = false;
  }

  /**
   * Initialize the repository context provider
   */
  async initialize() {
    if (!this.initialized) {
      await this.deepwikiService.initialize();
      this.initialized = true;
    }
  }

  /**
   * Clean up resources when the provider is no longer needed
   */
  cleanup() {
    this.deepwikiService.cleanup();
    this.initialized = false;
  }

  /**
   * Get context for a repository
   * If the context is not available in cache, generate a new analysis
   * 
   * @param {Object} options - Options for getting context
   * @param {string} options.repositoryUrl - URL of the repository
   * @param {string} options.analysisType - Type of analysis to get
   * @param {boolean} options.forceRefresh - Force a new analysis even if cached
   * @param {string} options.model - Model to use for analysis
   * @param {string[]} options.fallbackModels - Fallback models if primary fails
   * @returns {Promise<Object>} Repository context
   */
  async getRepositoryContext(options) {
    const {
      repositoryUrl,
      analysisType = 'overview',
      forceRefresh = false,
      model = config.openRouter.defaultModel,
      fallbackModels = config.openRouter.fallbackModels
    } = options;
    
    await this.initialize();
    
    // Check cache first if enabled and not forcing refresh
    const cacheKey = `${repositoryUrl}:${analysisType}`;
    if (this.cacheEnabled && !forceRefresh && this.analysisCache.has(cacheKey)) {
      const cachedAnalysis = this.analysisCache.get(cacheKey);
      if (cachedAnalysis.timestamp > Date.now() - this.cacheTTL) {
        console.log(`Using cached analysis for ${repositoryUrl} (${analysisType})`);
        return cachedAnalysis.data;
      }
    }
    
    // Generate new analysis
    console.log(`Generating new analysis for ${repositoryUrl} (${analysisType})`);
    
    const analysis = await this.deepwikiService.analyzeRepository({
      repositoryUrl,
      primaryModel: model,
      fallbackModels,
      promptTemplate: analysisType
    });
    
    // Cache the analysis if it was successful
    if (analysis.success && this.cacheEnabled) {
      this.analysisCache.set(cacheKey, {
        timestamp: Date.now(),
        data: analysis
      });
    }
    
    return analysis;
  }

  /**
   * Get multiple analysis types for a repository
   * 
   * @param {Object} options - Options for getting analyses
   * @param {string} options.repositoryUrl - URL of the repository
   * @param {string[]} options.analysisTypes - Types of analyses to get
   * @param {boolean} options.forceRefresh - Force new analyses even if cached
   * @param {string} options.model - Model to use for analyses
   * @param {string[]} options.fallbackModels - Fallback models if primary fails
   * @returns {Promise<Object>} Repository analyses
   */
  async getMultipleAnalyses(options) {
    const {
      repositoryUrl,
      analysisTypes = this.analysisTypes,
      forceRefresh = false,
      model = config.openRouter.defaultModel,
      fallbackModels = config.openRouter.fallbackModels
    } = options;
    
    const results = {};
    
    for (const analysisType of analysisTypes) {
      try {
        results[analysisType] = await this.getRepositoryContext({
          repositoryUrl,
          analysisType,
          forceRefresh,
          model,
          fallbackModels
        });
      } catch (error) {
        console.error(`Failed to get ${analysisType} analysis for ${repositoryUrl}:`, error.message);
        results[analysisType] = { success: false, error: error.message };
      }
    }
    
    return {
      success: Object.values(results).some(result => result.success),
      analyses: results
    };
  }

  /**
   * Ask a specific question about a repository
   * 
   * @param {Object} options - Options for asking a question
   * @param {string} options.repositoryUrl - URL of the repository
   * @param {string} options.question - Question to ask
   * @param {string} options.model - Model to use
   * @param {string[]} options.fallbackModels - Fallback models if primary fails
   * @returns {Promise<Object>} Answer to the question
   */
  async askRepositoryQuestion(options) {
    const {
      repositoryUrl,
      question,
      model = config.openRouter.defaultModel,
      fallbackModels = config.openRouter.fallbackModels
    } = options;
    
    await this.initialize();
    
    // First try to use DeepWiki's chat capability
    try {
      const response = await this.deepwikiService.getChatCompletion({
        repositoryUrl,
        messages: [
          {
            role: 'user',
            content: question
          }
        ],
        model,
        fallbackModels
      });
      
      return response;
    } catch (error) {
      console.error(`Failed to get answer from DeepWiki chat:`, error.message);
      
      // Fall back to generating a full analysis and then extracting the answer
      console.log('Falling back to generating a targeted analysis for the question');
      
      const promptTemplate = `Please analyze this repository and answer the following specific question:

${question}

Focus your analysis specifically on answering this question with detailed information from the codebase.`;
      
      const analysis = await this.deepwikiService.analyzeRepository({
        repositoryUrl,
        primaryModel: model,
        fallbackModels,
        promptTemplate: 'custom',
        customPrompt: promptTemplate
      });
      
      return analysis;
    }
  }
}

module.exports = RepositoryContextProvider;
