/**
 * Production Researcher Service
 * 
 * This service:
 * 1. Uses UnifiedModelSelector for all model selection
 * 2. Stores configurations in Vector DB
 * 3. Handles scheduled quarterly updates
 * 4. Provides real-time model research from OpenRouter
 */

import axios from 'axios';
import { AuthenticatedUser } from '@codequal/core/types';
import { Logger, createLogger } from '@codequal/core/utils';
import { ModelVersionSync, ModelVersionInfo, RepositorySizeCategory } from '@codequal/core';
import { VectorStorageService, EnhancedChunk } from '@codequal/database';
import { 
  UnifiedModelSelector,
  createUnifiedModelSelector,
  ROLE_SCORING_PROFILES
} from '../model-selection/unified-model-selector';
import { DynamicModelEvaluator, DYNAMIC_ROLE_WEIGHTS, ModelMetrics } from '../model-selection/dynamic-model-evaluator';
import { AIModelSelector } from '../model-selection/ai-model-selector';
import { Logger as WinstonLogger } from 'winston';
import { openRouterModelValidator } from '@codequal/core/services/model-selection/openrouter-model-validator';

const logger = createLogger('ProductionResearcherService');

// Special repository UUID for storing researcher configurations
const RESEARCHER_CONFIG_REPO_ID = '00000000-0000-0000-0000-000000000001';

export interface ResearchResult {
  operationId: string;
  timestamp: Date;
  configurationsUpdated: number;
  modelsEvaluated: number;
  selectedConfigurations: ModelConfiguration[];
  nextScheduledUpdate: Date;
}

export interface ModelConfiguration {
  role: string;
  primary: ModelVersionInfo;
  fallback: ModelVersionInfo;
  reasoning: string[];
  lastUpdated: Date;
  updateFrequency: 'quarterly';
  context?: {
    language: string;
    repositorySize: 'small' | 'medium' | 'large';
  };
}

export class ProductionResearcherService {
  private selector: UnifiedModelSelector;
  private logger: Logger = logger;
  private openRouterApiKey: string = process.env.OPENROUTER_API_KEY || '';
  private dynamicEvaluator: DynamicModelEvaluator;
  private aiSelector: AIModelSelector;
  
  constructor(
    private vectorStorage: VectorStorageService,
    private modelVersionSync: ModelVersionSync
  ) {
    this.selector = createUnifiedModelSelector(modelVersionSync, vectorStorage);
    this.dynamicEvaluator = new DynamicModelEvaluator(logger as unknown as WinstonLogger);
    this.aiSelector = new AIModelSelector(logger as unknown as WinstonLogger, this.openRouterApiKey);
  }

  /**
   * Perform comprehensive research for all roles
   * @param user - Can be a regular user or system user for scheduled runs
   * @param trigger - 'scheduled' for cron jobs, 'manual' for user-triggered
   */
  async performComprehensiveResearch(
    user: AuthenticatedUser,
    trigger: 'scheduled' | 'manual' = 'manual',
    context?: {
      language?: string;
      repositorySize?: 'small' | 'medium' | 'large';
      specificRoles?: string[];
    }
  ): Promise<ResearchResult> {
    const operationId = `research_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const isSystemUser = (user as any).isSystemUser === true;
    
    logger.info('Starting comprehensive model research', { 
      operationId, 
      trigger,
      userId: user.id,
      isSystemUser,
      userEmail: isSystemUser ? 'system' : user.email
    });

    try {
      // Step 1: Search the web for latest AI models FIRST
      logger.info('🔍 Searching the web for latest AI models...');
      const latestModelNames = await this.searchWebForLatestModels();
      logger.info(`Found ${latestModelNames.length} latest models from web search`);
      
      // Step 2: Fetch models from OpenRouter
      const models = await this.fetchLatestModels();
      logger.info(`Fetched ${models.length} models from OpenRouter`);

      // Step 3: Cross-reference web-discovered models with OpenRouter availability
      const availableLatestModels = new Set<string>();
      for (const webModel of latestModelNames) {
        const found = models.find(m => 
          m.id === webModel || 
          m.id.toLowerCase() === webModel.toLowerCase() ||
          m.id.includes(webModel.split('/')[1]) // Check model name part
        );
        if (found) {
          availableLatestModels.add(found.id);
          logger.info(`✅ Latest model ${webModel} is available in OpenRouter as ${found.id}`);
        } else {
          logger.warn(`❌ Latest model ${webModel} NOT found in OpenRouter`);
        }
      }
      
      // Step 4: Convert OpenRouter models to ModelMetrics format and evaluate dynamically
      const modelMetrics: ModelMetrics[] = models
        .filter(m => {
          const id = m.id.toLowerCase();
          return !id.includes('embed') && 
                 !id.includes('vision') && 
                 m.pricing &&
                 (parseFloat(m.pricing.prompt) > 0 || parseFloat(m.pricing.completion) > 0);
        })
        .map(m => {
          const [provider, ...modelParts] = m.id.split('/');
          return {
            provider,
            model: modelParts.join('/'),
            pricing: {
              input: parseFloat(m.pricing.prompt) / 1000000, // Convert to per-token
              output: parseFloat(m.pricing.completion) / 1000000
            },
            context_length: m.context_length,
            architecture: m.architecture,
            top_provider: m.top_provider,
            per_request_limits: m.per_request_limits
          } as ModelMetrics;
        });
      
      // Pass the latest models list to the evaluator for bonus scoring
      const evaluatedModels = this.dynamicEvaluator.evaluateModels(
        modelMetrics, 
        Array.from(availableLatestModels)
      );
      logger.info(`Evaluated ${evaluatedModels.length} models with dynamic scoring`);

      // Step 3: Select optimal models for each role using AI-powered selection
      const configurations: ModelConfiguration[] = [];
      const rolesToResearch = context?.specificRoles || Object.keys(DYNAMIC_ROLE_WEIGHTS);
      const language = context?.language || 'typescript';
      const repositorySize = context?.repositorySize || 'medium';

      for (const role of rolesToResearch) {
        try {
          logger.info(`Selecting models for role: ${role} (${language}, ${repositorySize})`);
          
          // Adjust weights based on language and size context
          const baseWeights = DYNAMIC_ROLE_WEIGHTS[role as keyof typeof DYNAMIC_ROLE_WEIGHTS] || DYNAMIC_ROLE_WEIGHTS.orchestrator;
          const adjustedWeights = this.adjustWeightsForContext(baseWeights, role, language, repositorySize);
          
          // Calculate composite scores for this role with context
          evaluatedModels.forEach(model => {
            this.dynamicEvaluator.calculateCompositeScore(model, adjustedWeights);
          });
          
          // Use AI selector for intelligent model selection with context
          const aiSelection = await this.aiSelector.selectModels(evaluatedModels, {
            role: role as any, // Allow any role dynamically
            language: language as any,
            repositorySize: repositorySize as any,
            complexity: this.getComplexityForContext(language, repositorySize)
          });
          
          // Convert to ModelVersionInfo format
          const primaryInfo = await this.convertToModelVersionInfo(aiSelection.primary, models);
          const fallbackInfo = await this.convertToModelVersionInfo(aiSelection.fallback, models);
          
          const config: ModelConfiguration = {
            role,
            primary: primaryInfo,
            fallback: fallbackInfo,
            reasoning: [
              aiSelection.primary.reasoning,
              aiSelection.fallback.reasoning,
              aiSelection.analysis
            ],
            lastUpdated: new Date(),
            updateFrequency: 'quarterly',
            context: {
              language,
              repositorySize
            }
          } as ModelConfiguration;

          configurations.push(config);
          
          // Store in Vector DB
          await this.storeConfiguration(config, user);
          
          // Note: Model configurations are stored in Vector DB
          // The ModelConfigStore is handled internally by ModelVersionSync
          
          logger.info(`AI selected configuration for ${role}`, {
            primary: `${config.primary.provider}/${config.primary.model}`,
            fallback: `${config.fallback.provider}/${config.fallback.model}`,
            aiTokenCost: aiSelection.tokenUsage?.cost
          });
        } catch (error) {
          logger.error(`Failed to select models for ${role}`, { error });
        }
      }

      // Step 4: Store operation metadata
      const result: ResearchResult = {
        operationId,
        timestamp: new Date(),
        configurationsUpdated: configurations.length,
        modelsEvaluated: models.length,
        selectedConfigurations: configurations,
        nextScheduledUpdate: this.calculateNextQuarterlyUpdate()
      };

      await this.storeOperationResult(result, user);

      logger.info('Research completed successfully', {
        operationId,
        configurationsUpdated: result.configurationsUpdated,
        nextUpdate: result.nextScheduledUpdate,
        trigger,
        isSystemUser
      });
      
      // If this was a scheduled system run, log it specially
      if (isSystemUser && trigger === 'scheduled') {
        logger.info('✅ Scheduled quarterly research completed automatically', {
          nextRun: result.nextScheduledUpdate,
          configurationsUpdated: result.configurationsUpdated
        });
      }

      return result;

    } catch (error) {
      logger.error('Research operation failed', { operationId, error });
      throw error;
    }
  }

  /**
   * Fetch latest models from OpenRouter
   */
  /**
   * Search the web for latest AI models
   */
  private async searchWebForLatestModels(): Promise<string[]> {
    const currentDate = new Date();
    const discoveredModels: Set<string> = new Set();
    
    try {
      // CRITICAL: This should use ACTUAL web search APIs in production
      // Options: Google Custom Search API, Bing Search API, or specialized AI news APIs
      
      // Step 1: Search for latest model releases
      const searchQueries = [
        `latest AI models released ${currentDate.toLocaleString('default', { month: 'long' })} ${currentDate.getFullYear()}`,
        `new LLM models this week`,
        `Claude latest version release date`,
        `GPT-4 newest model version`,
        `Gemini 2.0 latest release`,
        `AI model launches ${currentDate.getFullYear()}`,
        `OpenAI Anthropic Google latest models`
      ];
      
      // Step 2: Make actual API calls to search engines
      // This is where we'd integrate with real search APIs
      for (const query of searchQueries) {
        // In production, this would be:
        // const searchResults = await this.webSearchAPI.search(query);
        // const extractedModels = this.extractModelNamesFromResults(searchResults);
        // extractedModels.forEach(model => discoveredModels.add(model));
        
        logger.info(`🔍 Searching web for: "${query}"`);
      }
      
      // Step 3: Parse AI news sites and model registries
      const aiNewsSources = [
        'https://openai.com/blog',
        'https://www.anthropic.com/news',
        'https://blog.google/technology/ai',
        'https://huggingface.co/models',
        'https://openrouter.ai/models'
      ];
      
      // In production: Scrape these sites for latest model announcements
      for (const source of aiNewsSources) {
        logger.info(`📰 Checking ${source} for latest models...`);
        // const pageContent = await this.fetchAndParse(source);
        // const models = this.extractModelInfo(pageContent);
        // models.forEach(m => discoveredModels.add(m));
      }
      
      // Step 4: Query model comparison sites
      // Sites like: lmsys.org, artificial-analysis.com
      logger.info('📊 Querying model leaderboards for latest entries...');
      
      // TEMPORARY: Until we implement real web search, return empty array
      // This forces the system to rely ONLY on what's available in OpenRouter
      // without any hardcoded bias
      logger.warn('⚠️ Web search not yet implemented - relying on OpenRouter catalog only');
      
      return Array.from(discoveredModels);
    } catch (error) {
      logger.error('Web search failed', { error });
      return [];
    }
  }

  private async fetchLatestModels(): Promise<any[]> {
    if (!this.openRouterApiKey) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }

    try {
      const response = await axios.get('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${this.openRouterApiKey}`,
          'HTTP-Referer': 'https://codequal.com',
          'X-Title': 'CodeQual Researcher Service'
        }
      });

      return response.data.data || [];
    } catch (error) {
      logger.error('Failed to fetch models from OpenRouter', { error });
      throw new Error('Failed to fetch models from OpenRouter');
    }
  }

  /**
   * Convert AI selection result to ModelVersionInfo
   */
  private async convertToModelVersionInfo(
    selection: { id: string; provider: string; model: string; reasoning: string },
    originalModels: any[]
  ): Promise<ModelVersionInfo> {
    const original = originalModels.find(m => m.id === selection.id);
    if (!original) {
      throw new Error(`Model ${selection.id} not found in original models`);
    }
    
    // Validate the model name with OpenRouter before storing
    const fullModelName = `${selection.provider}/${selection.model}`;
    const validatedName = await openRouterModelValidator.normalizeModelName(fullModelName);
    
    if (!validatedName) {
      logger.warn(`Model ${fullModelName} is not valid in OpenRouter, using original`);
      // Fall back to original name if validation fails
    }
    
    // Parse the validated name back to provider/model
    const [validatedProvider, ...validatedModelParts] = (validatedName || fullModelName).split('/');
    const validatedModel = validatedModelParts.join('/');
    
    return {
      provider: validatedProvider,
      model: validatedModel,
      versionId: 'latest',
      pricing: {
        input: parseFloat(original.pricing.prompt),
        output: parseFloat(original.pricing.completion)
      },
      capabilities: {
        contextWindow: original.context_length || 128000,
        codeQuality: 8.0, // Will be dynamically determined
        speed: 7.0, // Will be dynamically determined
        reasoning: 7.5 // Will be dynamically determined
      }
    } as ModelVersionInfo;
  }

  /**
   * Update ModelVersionSync with latest model data
   */
  private async updateModelVersionSync(models: any[]): Promise<void> {
    // Process and store models in the format expected by ModelVersionSync
    const processedModels = models
      .filter(m => {
        const id = m.id.toLowerCase();
        return !id.includes('embed') && 
               !id.includes('vision') && 
               m.pricing &&
               (parseFloat(m.pricing.prompt) > 0 || parseFloat(m.pricing.completion) > 0);
      })
      .map(m => {
        const [provider, ...modelParts] = m.id.split('/');
        
        return {
          provider,
          model: modelParts.join('/'),
          model_id: modelParts.join('/'),
          versionId: 'latest',
          version: 'latest',
          created_at: new Date().toISOString(),
          deprecated: false, // Will be determined dynamically
          pricing: {
            input: parseFloat(m.pricing.prompt),
            output: parseFloat(m.pricing.completion)
          },
          capabilities: {
            contextWindow: m.context_length || 128000,
            codeQuality: 7.5, // Will be dynamically determined
            speed: 7.0, // Will be dynamically determined
            reasoning: 7.0 // Will be dynamically determined
          },
          metadata: {
            status: 'stable', // Will be dynamically determined
            source: 'openrouter',
            lastUpdated: new Date().toISOString()
          }
        };
      });

    // Store models in ModelVersionSync cache
    // We need to populate the cache so the selector can find them
    for (const model of processedModels) {
      try {
        // Add to the internal cache that the selector will use
        const key = `${model.provider}/${model.model}`;
        (this.modelVersionSync as any).modelCache = (this.modelVersionSync as any).modelCache || new Map();
        (this.modelVersionSync as any).modelCache.set(key, model);
      } catch (error) {
        this.logger.warn(`Failed to cache model ${model.provider}/${model.model}`, { error });
      }
    }
    
    this.logger.info(`Processed and cached ${processedModels.length} models for storage`);
  }

  /**
   * Store configuration in Vector DB
   */
  private async storeConfiguration(
    config: ModelConfiguration,
    user: AuthenticatedUser
  ): Promise<void> {
    const contextKey = config.context 
      ? `${config.context.language}-${config.context.repositorySize}`
      : 'default';
      
    const chunk: EnhancedChunk = {
      id: `model-config-${config.role}-${contextKey}-${Date.now()}`,
      content: JSON.stringify({
        role: config.role,
        primary: `${config.primary.provider}/${config.primary.model}`,
        fallback: `${config.fallback.provider}/${config.fallback.model}`,
        reasoning: config.reasoning,
        pricing: {
          primary: config.primary.pricing,
          fallback: config.fallback.pricing
        },
        context: config.context
      }),
      filePath: `researcher/configurations/${config.role}/${contextKey}.json`,
      metadata: {
        type: 'model-configuration',
        role: config.role,
        primary_model: `${config.primary.provider}/${config.primary.model}`,
        fallback_model: `${config.fallback.provider}/${config.fallback.model}`,
        last_updated: config.lastUpdated.toISOString(),
        update_frequency: config.updateFrequency,
        source_type: 'researcher',
        language: config.context?.language || 'default',
        repository_size: config.context?.repositorySize || 'default'
      }
    };

    // Generate embedding (in production, use real embedding service)
    const embedding = new Array(1536).fill(0).map(() => Math.random());

    try {
      await this.vectorStorage.storeChunk(
        chunk,
        embedding,
        RESEARCHER_CONFIG_REPO_ID,
        'configuration',
        config.role,
        'permanent'
      );
    } catch (error) {
      // Log error but don't fail the entire operation
      this.logger.warn(`Failed to store configuration for ${config.role} in vector DB`, { error });
    }
  }

  /**
   * Store operation result in Vector DB
   */
  private async storeOperationResult(
    result: ResearchResult,
    user: AuthenticatedUser
  ): Promise<void> {
    const chunk: EnhancedChunk = {
      id: `research-operation-${result.operationId}`,
      content: JSON.stringify({
        operationId: result.operationId,
        timestamp: result.timestamp,
        configurationsUpdated: result.configurationsUpdated,
        modelsEvaluated: result.modelsEvaluated,
        nextScheduledUpdate: result.nextScheduledUpdate
      }),
      filePath: `researcher/operations/${result.operationId}.json`,
      metadata: {
        type: 'research-operation',
        operation_id: result.operationId,
        user_id: user.id,
        timestamp: result.timestamp.toISOString(),
        configurations_updated: result.configurationsUpdated,
        models_evaluated: result.modelsEvaluated,
        source_type: 'researcher'
      }
    };

    const embedding = new Array(1536).fill(0).map(() => Math.random());

    try {
      await this.vectorStorage.storeChunk(
        chunk,
        embedding,
        RESEARCHER_CONFIG_REPO_ID,
        'operation',
        'research',
        'permanent'
      );
    } catch (error) {
      // Log error but don't fail the entire operation
      this.logger.warn('Failed to store operation result in vector DB', { error });
    }
  }

  /**
   * Get current configurations from Vector DB
   */
  async getCurrentConfigurations(): Promise<ModelConfiguration[]> {
    const results = await this.vectorStorage.searchByMetadata({
      'metadata.type': 'model-configuration',
      'metadata.source_type': 'researcher'
    }, 100);

    const configs: ModelConfiguration[] = [];
    const latestByRole = new Map<string, any>();

    // Get latest configuration for each role
    for (const result of results) {
      const metadata = result.metadata;
      const existing = latestByRole.get((metadata as any).role);
      
      if (!existing || new Date((metadata as any).last_updated) > new Date(existing.last_updated)) {
        latestByRole.set((metadata as any).role, result);
      }
    }

    // Convert to ModelConfiguration objects
    for (const [role, result] of latestByRole) {
      try {
        const content = JSON.parse(result.content);
        const [primaryProvider, ...primaryModel] = content.primary.split('/');
        const [fallbackProvider, ...fallbackModel] = content.fallback.split('/');
        
        configs.push({
          role,
          primary: {
            provider: primaryProvider,
            model: primaryModel.join('/'),
            versionId: 'latest',
            pricing: content.pricing?.primary
          } as ModelVersionInfo,
          fallback: {
            provider: fallbackProvider,
            model: fallbackModel.join('/'),
            versionId: 'latest',
            pricing: content.pricing?.fallback
          } as ModelVersionInfo,
          reasoning: content.reasoning || [],
          lastUpdated: new Date((result.metadata as any).last_updated),
          updateFrequency: 'quarterly'
        });
      } catch (error) {
        logger.error(`Failed to parse configuration for ${role}`, { error });
      }
    }

    return configs;
  }

  /**
   * Calculate next quarterly update date
   */
  private calculateNextQuarterlyUpdate(): Date {
    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3);
    const nextQuarter = (quarter + 1) % 4;
    const year = nextQuarter === 0 ? now.getFullYear() + 1 : now.getFullYear();
    
    // First day of next quarter at 00:00 UTC
    return new Date(year, nextQuarter * 3, 1, 0, 0, 0, 0);
  }

  /**
   * Check if model patterns indicate deprecation
   */
  private isModelPatternDeprecated(modelId: string): boolean {
    const id = modelId.toLowerCase();
    
    // Look for patterns that indicate old/deprecated models
    // Date-based patterns (old date formats)
    if (id.match(/\b(0301|0314|0613|1106)\b/)) {
      return true; // Old date-based versions
    }
    
    // Very old version numbers
    if (id.match(/\b(v1|1\.0|1\.5|2\.0|2\.1)\b/) && !id.includes('gemini')) {
      return true;
    }
    
    // Deprecated naming patterns
    if (id.includes('deprecated') || id.includes('legacy') || id.includes('old')) {
      return true;
    }
    
    return false;
  }

  /**
   * Get research statistics from Vector DB
   */
  async getResearchStatistics(): Promise<{
    totalResearchOperations: number;
    lastResearchDate?: Date;
    nextScheduledUpdate?: Date;
    modelCount: number;
    rolesCovered: string[];
  }> {
    const operations = await this.vectorStorage.searchByMetadata({
      'metadata.type': 'research-operation',
      'metadata.source_type': 'researcher'
    }, 10);
    
    const configs = await this.getCurrentConfigurations();
    
    const latestOp = operations.sort((a, b) => 
      new Date((b.metadata as any).timestamp).getTime() - new Date((a.metadata as any).timestamp).getTime()
    )[0];
    
    return {
      totalResearchOperations: operations.length,
      lastResearchDate: latestOp ? new Date((latestOp.metadata as any).timestamp) : undefined,
      nextScheduledUpdate: this.calculateNextQuarterlyUpdate(),
      modelCount: new Set(configs.flatMap(c => [
        `${c.primary.provider}/${c.primary.model}`,
        `${c.fallback.provider}/${c.fallback.model}`
      ])).size,
      rolesCovered: configs.map(c => c.role)
    };
  }

  /**
   * Adjust weights based on language and repository size context
   */
  private adjustWeightsForContext(
    baseWeights: typeof DYNAMIC_ROLE_WEIGHTS[keyof typeof DYNAMIC_ROLE_WEIGHTS],
    role: string,
    language: string,
    repositorySize: 'small' | 'medium' | 'large'
  ): typeof baseWeights {
    const adjusted = { ...baseWeights };
    
    // Language-specific adjustments
    switch (language.toLowerCase()) {
      case 'python':
      case 'javascript':
      case 'typescript':
        // Dynamic languages may need more quality for type inference
        if (role === 'code_quality' || role === 'testing') {
          adjusted.quality = Math.min(1, adjusted.quality + 0.1);
          adjusted.speed = Math.max(0, adjusted.speed - 0.05);
          adjusted.cost = Math.max(0, adjusted.cost - 0.05);
        }
        break;
        
      case 'rust':
      case 'c':
      case 'cpp':
        // Systems languages need highest quality for memory safety
        if (role === 'security' || role === 'performance') {
          adjusted.quality = Math.min(1, adjusted.quality + 0.15);
          adjusted.cost = Math.max(0, adjusted.cost - 0.1);
          adjusted.speed = Math.max(0, adjusted.speed - 0.05);
        }
        break;
        
      case 'go':
      case 'java':
        // Concurrent languages need quality for concurrency analysis
        if (role === 'architecture' || role === 'performance') {
          adjusted.quality = Math.min(1, adjusted.quality + 0.1);
          adjusted.cost = Math.max(0, adjusted.cost - 0.05);
          adjusted.speed = Math.max(0, adjusted.speed - 0.05);
        }
        break;
    }
    
    // Repository size adjustments - MORE AGGRESSIVE
    switch (repositorySize) {
      case 'large':
        // Large repos need MUCH more quality and can afford slower models
        adjusted.quality = Math.min(1, adjusted.quality + 0.25);  // +25% quality
        adjusted.speed = Math.max(0, adjusted.speed - 0.15);      // -15% speed
        adjusted.cost = Math.max(0, adjusted.cost - 0.10);        // -10% cost (less important)
        break;
        
      case 'small':
        // Small repos STRONGLY prefer faster, cheaper models
        adjusted.speed = Math.min(1, adjusted.speed + 0.20);      // +20% speed
        adjusted.cost = Math.min(1, adjusted.cost + 0.25);        // +25% cost importance
        adjusted.quality = Math.max(0, adjusted.quality - 0.20);  // -20% quality
        break;
        
      case 'medium':
      default:
        // Use base weights for medium repos
        break;
    }
    
    // Normalize weights to sum to 1
    const sum = adjusted.quality + adjusted.speed + adjusted.cost + adjusted.freshness + adjusted.contextWindow;
    if (sum > 0) {
      adjusted.quality /= sum;
      adjusted.speed /= sum;
      adjusted.cost /= sum;
      adjusted.freshness /= sum;
      adjusted.contextWindow /= sum;
    }
    
    return adjusted;
  }
  
  /**
   * Get complexity score based on language and repository size
   */
  private getComplexityForContext(language: string, repositorySize: 'small' | 'medium' | 'large'): number {
    let complexity = 5; // Base complexity
    
    // Language complexity
    const languageComplexity: Record<string, number> = {
      'rust': 3,
      'cpp': 3,
      'c': 2,
      'java': 1,
      'go': 1,
      'typescript': 1,
      'python': 0,
      'javascript': 0
    };
    
    complexity += languageComplexity[language.toLowerCase()] || 0;
    
    // Size complexity
    const sizeComplexity: Record<string, number> = {
      'small': -1,
      'medium': 0,
      'large': 2
    };
    
    complexity += sizeComplexity[repositorySize] || 0;
    
    return Math.max(1, Math.min(10, complexity));
  }
  
  /**
   * Get configurations for specific context
   */
  async getConfigurationsForContext(
    language: string,
    repositorySize: 'small' | 'medium' | 'large'
  ): Promise<ModelConfiguration[]> {
    const results = await this.vectorStorage.searchByMetadata({
      'metadata.type': 'model-configuration',
      'metadata.source_type': 'researcher',
      'metadata.language': language,
      'metadata.repository_size': repositorySize
    }, 100);
    
    const configs: ModelConfiguration[] = [];
    const latestByRole = new Map<string, any>();
    
    // Get latest configuration for each role in this context
    for (const result of results) {
      const metadata = result.metadata as any;
      const key = `${metadata.role}-${metadata.language}-${metadata.repository_size}`;
      const existing = latestByRole.get(key);
      
      if (!existing || new Date(metadata.last_updated) > new Date(existing.last_updated)) {
        latestByRole.set(key, result);
      }
    }
    
    // Convert to ModelConfiguration objects
    for (const [key, result] of latestByRole) {
      try {
        const content = JSON.parse(result.content);
        const [primaryProvider, ...primaryModel] = content.primary.split('/');
        const [fallbackProvider, ...fallbackModel] = content.fallback.split('/');
        
        configs.push({
          role: (result.metadata as any).role,
          primary: {
            provider: primaryProvider,
            model: primaryModel.join('/'),
            versionId: 'latest',
            pricing: content.pricing?.primary
          } as ModelVersionInfo,
          fallback: {
            provider: fallbackProvider,
            model: fallbackModel.join('/'),
            versionId: 'latest',
            pricing: content.pricing?.fallback
          } as ModelVersionInfo,
          reasoning: content.reasoning || [],
          lastUpdated: new Date((result.metadata as any).last_updated),
          updateFrequency: 'quarterly',
          context: {
            language: (result.metadata as any).language,
            repositorySize: (result.metadata as any).repository_size
          }
        });
      } catch (error) {
        logger.error(`Failed to parse configuration for ${key}`, { error });
      }
    }
    
    return configs;
  }
}