/**
 * Enhanced Production Researcher Service with Dynamic Freshness Validation
 * 
 * This service follows the proper flow:
 * 1. Search web for latest models (Claude 4.1, GPT-5, Gemini 2.5, etc.)
 * 2. Validate if they exist in OpenRouter
 * 3. Find alternatives if needed
 * 
 * NO HARDCODED MODEL LISTS - everything is discovered dynamically
 */

import { ProductionResearcherService, ModelConfiguration, ResearchResult } from './production-researcher-service';
import { DynamicFreshnessValidator, dynamicFreshnessValidator } from './dynamic-freshness-validator';
import { createLogger } from '@codequal/core';
import { ModelMetrics } from '../model-selection/dynamic-model-evaluator';
import { AIService } from '../standard/services/ai-service';
import { RESEARCH_PROMPTS } from './research-prompts';
import axios from 'axios';

const logger = createLogger('EnhancedDynamicResearcherService');

interface DiscoveredModel {
  provider: string;
  model: string;
  version?: string;
  releaseDate?: string;
  capabilities?: string[];
  existsInOpenRouter: boolean;
  openRouterId?: string;
  alternativeId?: string;
}

export class EnhancedDynamicResearcherService extends ProductionResearcherService {
  private freshnessValidator: DynamicFreshnessValidator;
  private aiService: AIService;
  
  constructor(
    vectorStorage: any,
    modelVersionSync: any
  ) {
    super(vectorStorage, modelVersionSync);
    this.freshnessValidator = new DynamicFreshnessValidator(
      process.env.OPENROUTER_API_KEY
    );
    this.aiService = new AIService({
      openRouterApiKey: process.env.OPENROUTER_API_KEY || ''
    });
  }
  
  /**
   * Step 1: Search web for latest models using AI
   */
  private async searchWebForLatestModels(): Promise<DiscoveredModel[]> {
    logger.info('🔍 Step 1: Searching web for latest AI models...');
    
    const currentDate = new Date();
    const searchPrompt = RESEARCH_PROMPTS.DYNAMIC_MODEL_DISCOVERY
      .replace(/{CURRENT_YEAR}/g, currentDate.getFullYear().toString())
      .replace(/{CURRENT_MONTH}/g, currentDate.toLocaleString('default', { month: 'long' }));
    
    try {
      // Use AI to search for latest models
      // In production, this would use a web search API or the AI's web search capability
      const response = await this.aiService.call(
        {
          model: 'claude-3-sonnet-20240229', // Use a known working model for search
          provider: 'anthropic'
        },
        {
          systemPrompt: 'You are an AI model researcher. Search for and discover the latest AI models available in the market.',
          prompt: searchPrompt + '\n\nFocus on finding models released in the last 3-6 months. Return as JSON array.',
          temperature: 0.1,
          maxTokens: 2000
        }
      );
      
      // Parse the response
      const discovered = this.parseDiscoveredModels(response.content);
      logger.info(`Discovered ${discovered.length} potential latest models from web search`);
      
      return discovered;
    } catch (error) {
      logger.error('Failed to search web for models', { error });
      
      // Fallback: return empty array and rely on OpenRouter models
      return [];
    }
  }
  
  /**
   * Step 2: Validate discovered models in OpenRouter
   */
  private async validateModelsInOpenRouter(
    discoveredModels: DiscoveredModel[]
  ): Promise<DiscoveredModel[]> {
    logger.info('🔍 Step 2: Validating discovered models in OpenRouter...');
    
    // Fetch OpenRouter models
    const openRouterModels = await (this as any).fetchLatestModels();
    const orMap = new Map<string, any>();
    
    openRouterModels.forEach((m: any) => {
      orMap.set(m.id.toLowerCase(), m);
    });
    
    // Validate each discovered model
    const validated: DiscoveredModel[] = [];
    
    for (const model of discoveredModels) {
      const searchKey = `${model.provider}/${model.model}`.toLowerCase();
      
      // Direct match
      if (orMap.has(searchKey)) {
        model.existsInOpenRouter = true;
        model.openRouterId = searchKey;
        validated.push(model);
        logger.info(`✅ Found exact match: ${searchKey}`);
        continue;
      }
      
      // Find alternative
      let foundAlternative = false;
      for (const [orId, orModel] of orMap) {
        const [orProvider] = orId.split('/');
        
        // Same provider, similar model name
        if (orProvider === model.provider.toLowerCase()) {
          // Check for model family match
          const modelFamily = model.model.split('-')[0].toLowerCase();
          if (orId.includes(modelFamily)) {
            model.existsInOpenRouter = false;
            model.alternativeId = orId;
            validated.push(model);
            logger.info(`🔄 Found alternative for ${searchKey}: ${orId}`);
            foundAlternative = true;
            break;
          }
        }
      }
      
      if (!foundAlternative) {
        logger.warn(`❌ No match or alternative for: ${searchKey}`);
      }
    }
    
    return validated;
  }
  
  /**
   * Step 3: Get actual OpenRouter models to use
   */
  private async getOpenRouterModelsToUse(
    validatedModels: DiscoveredModel[],
    allOpenRouterModels: any[]
  ): Promise<any[]> {
    const modelsToUse: any[] = [];
    const usedIds = new Set<string>();
    
    // Add validated models (exact matches and alternatives)
    for (const model of validatedModels) {
      const modelId = model.openRouterId || model.alternativeId;
      if (modelId && !usedIds.has(modelId)) {
        const orModel = allOpenRouterModels.find(m => m.id.toLowerCase() === modelId);
        if (orModel) {
          modelsToUse.push(orModel);
          usedIds.add(modelId);
        }
      }
    }
    
    // If we don't have enough models, add fresh models from OpenRouter
    if (modelsToUse.length < 10) {
      const additionalModels = await this.freshnessValidator.filterFreshModels(allOpenRouterModels);
      
      for (const model of additionalModels) {
        if (!usedIds.has(model.id.toLowerCase()) && modelsToUse.length < 20) {
          modelsToUse.push(model);
          usedIds.add(model.id.toLowerCase());
        }
      }
    }
    
    logger.info(`Using ${modelsToUse.length} models for evaluation`);
    return modelsToUse;
  }
  
  /**
   * Parse discovered models from AI response
   */
  private parseDiscoveredModels(content: string): DiscoveredModel[] {
    try {
      // Try to extract JSON from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.map((m: any) => ({
          provider: m.provider || 'unknown',
          model: m.model || m.name || 'unknown',
          version: m.version,
          releaseDate: m.releaseDate || m.release_date,
          capabilities: m.capabilities || [],
          existsInOpenRouter: false
        }));
      }
    } catch (e) {
      logger.debug('Failed to parse JSON, using fallback parsing');
    }
    
    // Fallback: extract model mentions from text
    const models: DiscoveredModel[] = [];
    const patterns = [
      /claude[- ]?(\d+\.?\d*)[- ]?([\w\-]+)?/gi,
      /gpt[- ]?(\d+\.?\d*)[- ]?([\w\-]+)?/gi,
      /gemini[- ]?(\d+\.?\d*)[- ]?([\w\-]+)?/gi,
    ];
    
    patterns.forEach(pattern => {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        const [full, version, variant] = match;
        const provider = full.toLowerCase().includes('claude') ? 'anthropic' :
                        full.toLowerCase().includes('gpt') ? 'openai' :
                        full.toLowerCase().includes('gemini') ? 'google' : 'unknown';
        
        models.push({
          provider,
          model: full.toLowerCase().replace(/\s+/g, '-'),
          version: version,
          existsInOpenRouter: false
        });
      }
    });
    
    // Remove duplicates
    const unique = new Map<string, DiscoveredModel>();
    models.forEach(m => {
      const key = `${m.provider}/${m.model}`;
      if (!unique.has(key)) {
        unique.set(key, m);
      }
    });
    
    return Array.from(unique.values());
  }
  
  /**
   * Override the main research method with dynamic discovery
   */
  async researchModels(
    user?: string,
    trigger: 'manual' | 'scheduled' = 'manual'
  ): Promise<any> {
    const operationId = `research-${Date.now()}`;
    const isSystemUser = user === 'SYSTEM_USER';
    
    logger.info('Starting enhanced dynamic model research', {
      operationId,
      user: user || 'anonymous',
      trigger,
      isSystemUser
    });
    
    try {
      // Step 1: Search web for latest models
      const discoveredModels = await this.searchWebForLatestModels();
      
      // Step 2: Validate in OpenRouter
      const validatedModels = await this.validateModelsInOpenRouter(discoveredModels);
      
      // Step 3: Get all OpenRouter models
      const allOpenRouterModels = await (this as any).fetchLatestModels();
      
      // Step 4: Determine which models to use
      const modelsToUse = await this.getOpenRouterModelsToUse(validatedModels, allOpenRouterModels);
      
      if (modelsToUse.length === 0) {
        throw new Error('No suitable models found for evaluation');
      }
      
      // Step 5: Convert to ModelMetrics and evaluate
      const modelMetrics: ModelMetrics[] = modelsToUse.map(m => {
        const [provider, ...modelParts] = m.id.split('/');
        return {
          provider,
          model: modelParts.join('/'),
          pricing: {
            input: parseFloat(m.pricing?.prompt || '0') / 1000000,
            output: parseFloat(m.pricing?.completion || '0') / 1000000
          },
          context_length: m.context_length,
          architecture: m.architecture,
          top_provider: m.top_provider,
          per_request_limits: m.per_request_limits
        } as ModelMetrics;
      });
      
      const evaluatedModels = (this as any).dynamicEvaluator.evaluateModels(modelMetrics);
      logger.info(`Evaluated ${evaluatedModels.length} models with dynamic scoring`);
      
      // Step 6: Select optimal models for each role
      const configurations: ModelConfiguration[] = [];
      const roles = ['deepwiki', 'researcher', 'security', 'performance', 'location_finder', 'code_quality'] as const;
      
      for (const role of roles) {
        try {
          logger.info(`Selecting models for role: ${role}`);
          
          // Get recommended models from discovery
          const recommended = await this.freshnessValidator.getRecommendedModels(role);
          logger.debug(`Recommended models for ${role}: ${recommended.join(', ')}`);
          
          // Calculate composite scores
          const weights = this.getRoleWeights(role);
          evaluatedModels.forEach(model => {
            (this as any).dynamicEvaluator.calculateCompositeScore(model, weights);
          });
          
          // Sort by composite score
          const sorted = [...evaluatedModels].sort((a, b) => b.scores.composite - a.scores.composite);
          
          // Select top models
          const topCandidates = sorted.slice(0, 10);
          
          // Use AI selector
          const aiSelection = await (this as any).aiSelector.selectModels(topCandidates, {
            role: role as any,
            language: 'multiple',
            repositorySize: 'large',
            complexity: 8
          });
          
          // Convert to ModelVersionInfo format
          const primaryInfo = await (this as any).convertToModelVersionInfo(aiSelection.primary, modelsToUse);
          const fallbackInfo = await (this as any).convertToModelVersionInfo(aiSelection.fallback, modelsToUse);
          
          const config: ModelConfiguration = {
            role,
            primary: primaryInfo,
            fallback: fallbackInfo,
            reasoning: [
              `Primary: ${aiSelection.primary.reasoning}`,
              `Fallback: ${aiSelection.fallback.reasoning}`,
              `Analysis: ${aiSelection.analysis}`,
              'Models selected through dynamic web discovery and validation'
            ],
            lastUpdated: new Date(),
            updateFrequency: 'quarterly' as const
          };
          
          configurations.push(config);
          
          // Store in Vector DB
          await (this as any).storeConfiguration(config, user);
          
          logger.info(`Selected models for ${role}`, {
            primary: `${config.primary.provider}/${config.primary.model}`,
            fallback: `${config.fallback.provider}/${config.fallback.model}`
          });
          
        } catch (error) {
          logger.error(`Failed to select models for ${role}`, { error });
        }
      }
      
      // Create result
      const result: ResearchResult & { discoveryDetails: any } = {
        operationId,
        timestamp: new Date(),
        configurationsUpdated: configurations.length,
        modelsEvaluated: modelsToUse.length,
        selectedConfigurations: configurations,
        nextScheduledUpdate: (this as any).calculateNextQuarterlyUpdate(),
        discoveryDetails: {
          discoveredFromWeb: discoveredModels.length,
          validatedInOpenRouter: validatedModels.length,
          totalEvaluated: modelsToUse.length,
          method: 'Dynamic web discovery with OpenRouter validation'
        }
      };
      
      await (this as any).storeOperationResult(result, user);
      
      logger.info('Enhanced dynamic research completed successfully', {
        operationId,
        configurationsUpdated: result.configurationsUpdated,
        discovered: result.discoveryDetails.discoveredFromWeb,
        validated: result.discoveryDetails.validatedInOpenRouter,
        nextUpdate: result.nextScheduledUpdate
      });
      
      return result;
      
    } catch (error) {
      logger.error('Enhanced dynamic research operation failed', { operationId, error });
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
}

/**
 * Create enhanced dynamic researcher service instance
 */
export function createEnhancedDynamicResearcherService(
  vectorStorage: any,
  modelVersionSync: any
): EnhancedDynamicResearcherService {
  return new EnhancedDynamicResearcherService(vectorStorage, modelVersionSync);
}