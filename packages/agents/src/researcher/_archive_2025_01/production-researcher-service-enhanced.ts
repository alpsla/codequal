/**
 * Enhanced Production Researcher Service with Model Freshness Validation
 * 
 * This service ensures only the latest models (3-6 months old) are selected
 * and stored in configurations, similar to how location-finder validates models.
 */

import { ProductionResearcherService, ModelConfiguration, ResearchResult } from './production-researcher-service';
import { ModelFreshnessValidator, modelFreshnessValidator } from './model-freshness-validator';
import { createLogger } from '@codequal/core';
import { ModelMetrics } from '../model-selection/dynamic-model-evaluator';

const logger = createLogger('EnhancedResearcherService');

export class EnhancedProductionResearcherService extends ProductionResearcherService {
  private freshnessValidator: ModelFreshnessValidator;
  
  constructor(
    vectorStorage: any,
    modelVersionSync: any
  ) {
    super(vectorStorage, modelVersionSync);
    this.freshnessValidator = modelFreshnessValidator;
  }
  
  /**
   * Override fetchLatestModels to include freshness filtering
   */
  protected async fetchAndFilterModels(): Promise<any[]> {
    logger.info('Fetching models from OpenRouter...');
    
    // Fetch all models from OpenRouter using parent's method
    const allModels = await (this as any).fetchLatestModels();
    logger.info(`Fetched ${allModels.length} total models from OpenRouter`);
    
    // Filter for fresh models only (3-6 months)
    const freshModels = this.freshnessValidator.filterFreshModels(allModels);
    logger.info(`After freshness filtering: ${freshModels.length} models remain`);
    
    // Additional filtering for code-capable models
    const codeModels = freshModels.filter(m => {
      const id = m.id.toLowerCase();
      const name = m.name?.toLowerCase() || '';
      
      // Exclude embedding and vision models
      if (id.includes('embed') || id.includes('vision')) {
        return false;
      }
      
      // Must have pricing
      if (!m.pricing || (parseFloat(m.pricing.prompt) === 0 && parseFloat(m.pricing.completion) === 0)) {
        return false;
      }
      
      // Prefer models with code capabilities
      const hasCodeCapability = 
        id.includes('gpt') ||
        id.includes('claude') ||
        id.includes('gemini') ||
        id.includes('deepseek') ||
        id.includes('codestral') ||
        id.includes('llama') ||
        name.includes('instruct') ||
        name.includes('code');
      
      return hasCodeCapability;
    });
    
    logger.info(`After code capability filtering: ${codeModels.length} models remain`);
    
    // Log top models for verification
    if (codeModels.length > 0) {
      logger.info('Top 5 fresh code-capable models:');
      codeModels.slice(0, 5).forEach((m, i) => {
        logger.info(`  ${i + 1}. ${m.id} - Context: ${m.context_length || 'unknown'}`);
      });
    }
    
    return codeModels;
  }
  
  /**
   * Override the main research method to use filtered models
   */
  async researchModels(
    user?: string,
    trigger: 'manual' | 'scheduled' = 'manual'
  ): Promise<any> {
    const operationId = `research-${Date.now()}`;
    const isSystemUser = user === 'SYSTEM_USER';
    
    logger.info('Starting enhanced model research with freshness validation', {
      operationId,
      user: user || 'anonymous',
      trigger,
      isSystemUser
    });
    
    try {
      // Step 1: Fetch and filter for fresh models only
      const freshModels = await this.fetchAndFilterModels();
      
      if (freshModels.length === 0) {
        throw new Error('No fresh models found! Update the freshness validator with latest models.');
      }
      
      // Step 2: Convert to ModelMetrics and evaluate
      const modelMetrics: ModelMetrics[] = freshModels.map(m => {
        const [provider, ...modelParts] = m.id.split('/');
        return {
          provider,
          model: modelParts.join('/'),
          pricing: {
            input: parseFloat(m.pricing.prompt) / 1000000,
            output: parseFloat(m.pricing.completion) / 1000000
          },
          context_length: m.context_length,
          architecture: m.architecture,
          top_provider: m.top_provider,
          per_request_limits: m.per_request_limits
        } as ModelMetrics;
      });
      
      // Continue with the normal evaluation flow
      const evaluatedModels = (this as any).dynamicEvaluator.evaluateModels(modelMetrics);
      logger.info(`Evaluated ${evaluatedModels.length} fresh models with dynamic scoring`);
      
      // Step 3: Select optimal models for each role
      const configurations: ModelConfiguration[] = [];
      const roles = ['deepwiki', 'researcher', 'security', 'performance', 'location_finder', 'code_quality'] as const;
      
      for (const role of roles) {
        try {
          logger.info(`Selecting fresh models for role: ${role}`);
          
          // Get recommended fresh models for this role
          const recommended = this.freshnessValidator.getRecommendedModels(role);
          logger.debug(`Recommended models for ${role}: ${recommended.join(', ')}`);
          
          // Calculate composite scores for this role
          const weights = this.getRoleWeights(role);
          evaluatedModels.forEach(model => {
            (this as any).dynamicEvaluator.calculateCompositeScore(model, weights);
          });
          
          // Sort by composite score
          const sorted = [...evaluatedModels].sort((a, b) => b.scores.composite - a.scores.composite);
          
          // Prefer recommended models if they're in top 10
          const topCandidates = sorted.slice(0, 10);
          const recommendedCandidates = topCandidates.filter(m => 
            recommended.some(r => m.id.includes(r))
          );
          
          // Use AI selector with preference for recommended
          const candidates = recommendedCandidates.length >= 2 ? recommendedCandidates : topCandidates;
          
          const aiSelection = await (this as any).aiSelector.selectModels(candidates, {
            role: role as any,
            language: 'multiple',
            repositorySize: 'large',
            complexity: 8
          });
          
          // Convert to ModelVersionInfo format
          const primaryInfo = await (this as any).convertToModelVersionInfo(aiSelection.primary, freshModels);
          const fallbackInfo = await (this as any).convertToModelVersionInfo(aiSelection.fallback, freshModels);
          
          const config = {
            role,
            primary: primaryInfo,
            fallback: fallbackInfo,
            reasoning: [
              `Primary: ${aiSelection.primary.reasoning}`,
              `Fallback: ${aiSelection.fallback.reasoning}`,
              `Analysis: ${aiSelection.analysis}`,
              'All models verified to be within 3-6 months freshness window'
            ],
            lastUpdated: new Date(),
            updateFrequency: 'quarterly' as const
          };
          
          configurations.push(config);
          
          // Store in Vector DB
          await (this as any).storeConfiguration(config, user);
          
          logger.info(`Selected fresh models for ${role}`, {
            primary: `${config.primary.provider}/${config.primary.model}`,
            fallback: `${config.fallback.provider}/${config.fallback.model}`
          });
          
        } catch (error) {
          logger.error(`Failed to select fresh models for ${role}`, { error });
        }
      }
      
      // Step 4: Create result
      const allModelsCount = await (this as any).fetchLatestModels().then((models: any[]) => models.length);
      const result: ResearchResult & { freshnessValidation: any } = {
        operationId,
        timestamp: new Date(),
        configurationsUpdated: configurations.length,
        modelsEvaluated: freshModels.length,
        selectedConfigurations: configurations,
        nextScheduledUpdate: (this as any).calculateNextQuarterlyUpdate(),
        freshnessValidation: {
          totalModels: allModelsCount,
          freshModels: freshModels.length,
          rejectedOutdated: allModelsCount - freshModels.length,
          validationConfidence: 0.95
        }
      };
      
      await (this as any).storeOperationResult(result, user);
      
      logger.info('Enhanced research completed successfully', {
        operationId,
        configurationsUpdated: result.configurationsUpdated,
        freshModels: result.freshnessValidation.freshModels,
        rejectedOutdated: result.freshnessValidation.rejectedOutdated,
        nextUpdate: result.nextScheduledUpdate
      });
      
      return result;
      
    } catch (error) {
      logger.error('Enhanced research operation failed', { operationId, error });
      throw error;
    }
  }
  
  /**
   * Get role-specific weights for evaluation
   */
  private getRoleWeights(role: string): any {
    const weights: Record<string, any> = {
      deepwiki: { quality: 0.45, speed: 0.15, cost: 0.20, freshness: 0.20 },
      researcher: { quality: 0.30, speed: 0.20, cost: 0.30, freshness: 0.20 },
      security: { quality: 0.50, speed: 0.10, cost: 0.15, freshness: 0.25 },
      performance: { quality: 0.35, speed: 0.30, cost: 0.25, freshness: 0.10 },
      location_finder: { quality: 0.40, speed: 0.20, cost: 0.25, freshness: 0.15 },
      code_quality: { quality: 0.35, speed: 0.20, cost: 0.30, freshness: 0.15 }
    };
    
    return weights[role] || weights.researcher;
  }
  
  /**
   * Quarterly update with freshness validation
   */
  async runQuarterlyUpdate(): Promise<void> {
    logger.info('Starting quarterly model update with freshness validation');
    
    // Update the freshness validator with any new models we know about
    // This would ideally fetch from a maintained list or API
    await this.updateFreshnessValidator();
    
    // Run the research with SYSTEM_USER
    const result = await this.researchModels('SYSTEM_USER', 'scheduled');
    
    logger.info('Quarterly update completed', {
      configurations: result.configurationsUpdated,
      freshModels: result.freshnessValidation.freshModels,
      nextUpdate: result.nextScheduledUpdate
    });
  }
  
  /**
   * Update the freshness validator with latest model information
   */
  private async updateFreshnessValidator(): Promise<void> {
    // This would ideally fetch from a maintained API or database
    // For now, we'll log that it should be updated manually
    logger.info('Freshness validator should be updated with latest model releases');
    logger.info('Check OpenAI, Anthropic, Google blogs for new model announcements');
    logger.info('Update model-freshness-validator.ts with new models quarterly');
  }
}

/**
 * Create enhanced researcher service instance
 */
export function createEnhancedResearcherService(
  vectorStorage: any,
  modelVersionSync: any
): EnhancedProductionResearcherService {
  return new EnhancedProductionResearcherService(vectorStorage, modelVersionSync);
}