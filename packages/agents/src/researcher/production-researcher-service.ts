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
    trigger: 'scheduled' | 'manual' = 'manual'
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
      // Step 1: Fetch latest models from OpenRouter
      const models = await this.fetchLatestModels();
      logger.info(`Fetched ${models.length} models from OpenRouter`);

      // Step 2: Convert OpenRouter models to ModelMetrics format and evaluate dynamically
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
      
      const evaluatedModels = this.dynamicEvaluator.evaluateModels(modelMetrics);
      logger.info(`Evaluated ${evaluatedModels.length} models with dynamic scoring`);

      // Step 3: Select optimal models for each role using AI-powered selection
      const configurations: ModelConfiguration[] = [];
      const roles = Object.keys(DYNAMIC_ROLE_WEIGHTS) as Array<keyof typeof DYNAMIC_ROLE_WEIGHTS>;

      for (const role of roles) {
        try {
          logger.info(`Selecting models for role: ${role}`);
          
          // Calculate composite scores for this role
          const weights = DYNAMIC_ROLE_WEIGHTS[role];
          evaluatedModels.forEach(model => {
            this.dynamicEvaluator.calculateCompositeScore(model, weights);
          });
          
          // Use AI selector for intelligent model selection
          const aiSelection = await this.aiSelector.selectModels(evaluatedModels, {
            role,
            language: 'multiple',
            repositorySize: 'large',
            complexity: 8
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
            updateFrequency: 'quarterly'
          };

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
    const chunk: EnhancedChunk = {
      id: `model-config-${config.role}-${Date.now()}`,
      content: JSON.stringify({
        role: config.role,
        primary: `${config.primary.provider}/${config.primary.model}`,
        fallback: `${config.fallback.provider}/${config.fallback.model}`,
        reasoning: config.reasoning,
        pricing: {
          primary: config.primary.pricing,
          fallback: config.fallback.pricing
        }
      }),
      filePath: `researcher/configurations/${config.role}.json`,
      metadata: {
        type: 'model-configuration',
        role: config.role,
        primary_model: `${config.primary.provider}/${config.primary.model}`,
        fallback_model: `${config.fallback.provider}/${config.fallback.model}`,
        last_updated: config.lastUpdated.toISOString(),
        update_frequency: config.updateFrequency,
        source_type: 'researcher'
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
}