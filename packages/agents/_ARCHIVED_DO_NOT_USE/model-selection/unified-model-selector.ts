/**
 * Unified Model Selector
 * 
 * Single source of truth for all agent model selection, replacing:
 * - DeepWikiModelSelector
 * - ResearcherModelSelector
 * - And supporting all other agent roles
 * 
 * Features:
 * - Role-specific scoring weights
 * - Enhanced selection logic with ROI analysis
 * - Preview/beta status handling
 * - Context-aware selection
 */

import { ModelVersionInfo, ModelVersionSync } from '@codequal/core';
import { createLogger } from '@codequal/core/utils';
import { VectorStorageService } from '@codequal/database';
import { 
  ModelSelectionEngine,
  ModelMetadata,
  ModelCosts,
  ModelCapabilities as EnhancedModelCapabilities,
  ModelSelectionContext,
  ModelEvaluation
} from './enhanced-model-selection-rules';
import { ModelAvailabilityValidator } from './model-availability-validator';

const logger = createLogger('UnifiedModelSelector');

/**
 * Role-specific scoring profiles
 * Consolidates weights from all agent implementations
 */
export const ROLE_SCORING_PROFILES = {
  // From DeepWikiModelSelector
  deepwiki: {
    quality: 0.50,  // Deep understanding crucial
    cost: 0.30,     // Manage high-volume costs
    speed: 0.20,    // Background process
    description: 'Optimized for deep repository analysis'
  },
  
  // AI Parser - SPEED IS CRITICAL
  'ai-parser': {
    quality: 0.30,  // Good enough parsing
    cost: 0.20,     // Secondary consideration
    speed: 0.50,    // PRIORITY - Fast response crucial for parsing
    description: 'Speed-optimized for rapid parsing tasks',
    metadata: {
      preferredProviders: ['google', 'openai'],  // Known for fast models
      maxResponseTime: 5000,  // 5 seconds max
      requiresFastModel: true
    }
  },
  
  // From ResearcherModelSelector
  researcher: {
    quality: 0.50,  // Research capability
    cost: 0.35,     // Cost efficiency for 3000 daily queries
    speed: 0.15,    // Response time
    description: 'Balanced for model discovery and evaluation'
  },
  
  // Additional roles based on requirements
  security: {
    quality: 0.60,  // Security critical
    cost: 0.20,     // Quality over cost
    speed: 0.20,    // Reasonable response
    description: 'High quality for security analysis'
  },
  
  architecture: {
    quality: 0.60,  // Understanding critical
    cost: 0.25,     // Some cost sensitivity
    speed: 0.15,    // Can be slower
    description: 'Deep understanding of system design'
  },
  
  performance: {
    quality: 0.40,  // Good analysis
    cost: 0.30,     // Cost matters
    speed: 0.30,    // Fast feedback important
    description: 'Quick performance insights'
  },
  
  code_quality: {
    quality: 0.45,  // Accurate analysis
    cost: 0.35,     // Volume considerations
    speed: 0.20,    // Moderate speed
    description: 'Code quality and standards checking'
  },
  
  dependencies: {
    quality: 0.35,  // Basic analysis fine
    cost: 0.45,     // High volume scanning
    speed: 0.20,    // Batch processing
    description: 'Dependency scanning and updates'
  },
  
  documentation: {
    quality: 0.30,  // Good enough quality
    cost: 0.50,     // Very cost sensitive
    speed: 0.20,    // Can be slower
    description: 'High-volume documentation generation'
  },
  
  testing: {
    quality: 0.35,  // Decent test generation
    cost: 0.45,     // Volume considerations
    speed: 0.20,    // Batch processing
    description: 'Test generation and validation'
  },
  
  translator: {
    quality: 0.40,  // Accurate translation
    cost: 0.30,     // Cost sensitive
    speed: 0.30,    // Quick turnaround
    description: 'Code and documentation translation'
  },
  
  location_finder: {
    quality: 0.55,  // Accuracy in finding correct locations is crucial
    cost: 0.25,     // Moderate cost sensitivity for volume processing
    speed: 0.20,    // Reasonable response time for interactive use
    description: 'AI-powered exact issue location identification',
    metadata: {
      preferredProviders: ['anthropic', 'openai'],
      minContextWindow: 32000,
      requiresCodeCapability: true,
      supportsBatching: true,
      languageSpecific: true  // Uses different models per language
    }
  }
};

/**
 * Repository context for model selection
 * Compatible with DeepWiki's RepositoryContext
 */
export interface RepositoryContext {
  url?: string;
  size: 'small' | 'medium' | 'large' | 'enterprise';
  primaryLanguage: string;
  languages?: string[];
  frameworks?: string[];
  fileCount?: number;
  totalLines?: number;
  complexity?: number; // 1-10 scale
  analysisDepth?: 'quick' | 'standard' | 'comprehensive';
  prContext?: {
    changedFiles: number;
    additions: number;
    deletions: number;
  };
}

/**
 * Model selection result
 * Compatible with both DeepWiki and Researcher result formats
 */
export interface UnifiedModelSelection {
  primary: ModelVersionInfo;
  fallback: ModelVersionInfo;
  reasoning: string[];
  scores: {
    primary: ModelScore;
    fallback: ModelScore;
  };
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
    cost: number;
  };
  // For DeepWiki compatibility
  estimatedTokens?: number;
  estimatedCost?: number;
  recommendations?: string[];
}

export interface ModelScore {
  id: string;
  provider: string;
  model: string;
  inputCost: number;
  outputCost: number;
  avgCost: number;
  contextWindow: number;
  quality: number;
  speed: number;
  cost?: number;      // Added for compatibility
  priceScore: number;
  compositeScore: number;
}

/**
 * Unified Model Selector
 */
export class UnifiedModelSelector {
  private selectionEngine: ModelSelectionEngine;
  private modelCache = new Map<string, ModelVersionInfo[]>();
  private providedModels?: ModelVersionInfo[];
  private availabilityValidator: ModelAvailabilityValidator;
  
  constructor(
    private modelVersionSync: ModelVersionSync,
    private vectorStorage?: VectorStorageService
  ) {
    this.selectionEngine = new ModelSelectionEngine();
    this.availabilityValidator = new ModelAvailabilityValidator();
  }
  
  /**
   * Set models directly (for production researcher service)
   */
  setModels(models: ModelVersionInfo[]): void {
    this.providedModels = models;
    // Clear cache to force using provided models
    this.modelCache.clear();
  }

  /**
   * Select model for any agent role
   * Replaces both selectModel() and selectResearcherModel()
   */
  async selectModel(
    role: keyof typeof ROLE_SCORING_PROFILES | string,
    context?: RepositoryContext
  ): Promise<UnifiedModelSelection> {
    logger.info(`Selecting model for role: ${role}`, { context });
    
    // Get available models
    const models = await this.getAvailableModels();
    
    if (models.length === 0) {
      throw new Error('No models available for selection');
    }
    
    // Apply role-specific filtering if metadata exists
    let filteredModels = models;
    const roleProfile = ROLE_SCORING_PROFILES[role as keyof typeof ROLE_SCORING_PROFILES];
    if ((roleProfile as any)?.metadata) {
      const metadata = (roleProfile as any).metadata;
      
      // Filter by preferred providers
      if (metadata.preferredProviders) {
        const preferred = models.filter(m => 
          metadata.preferredProviders.includes(m.provider)
        );
        if (preferred.length > 0) {
          filteredModels = preferred;
          logger.debug(`Filtered to preferred providers: ${metadata.preferredProviders.join(', ')}`);
        }
      }
      
      // Filter by minimum context window
      if (metadata.minContextWindow) {
        filteredModels = filteredModels.filter(m => {
          const contextWindow = (m as any).capabilities?.contextWindow || 
                                (m as any).context_window || 
                                4096;
          return contextWindow >= metadata.minContextWindow;
        });
        logger.debug(`Filtered by min context window: ${metadata.minContextWindow}`);
      }
      
      // Filter by code capability
      if (metadata.requiresCodeCapability) {
        filteredModels = filteredModels.filter(m => {
          const caps = (m as any).capabilities || {};
          return caps.codeQuality !== undefined || caps.code_quality !== undefined;
        });
      }
    }
    
    // Create selection context
    const selectionContext = this.createSelectionContext(role as any, context);
    
    // Convert models to enhanced format
    const candidates = filteredModels.map(m => this.convertToEnhancedFormat(m));
    
    // Run enhanced selection
    const result = this.selectionEngine.selectBestModel(candidates, selectionContext);
    
    // Validate selection
    const validation = this.selectionEngine.validateSelection(result.selected, selectionContext);
    
    if (!validation.isValid) {
      logger.warn('Selection validation failed', { blockers: validation.blockers });
      // Could throw or use fallback logic here
    }
    
    // Find original models
    const primaryModel = models.find(m => this.getModelId(m) === result.selected.model.id);
    const fallbackModel = result.runnerUp ? 
      models.find(m => this.getModelId(m) === result.runnerUp!.model.id) : 
      primaryModel;
    
    if (!primaryModel || !fallbackModel) {
      throw new Error('Failed to map selected models');
    }
    
    // Estimate tokens and cost for DeepWiki compatibility
    const estimatedTokens = context ? this.estimateTokens(context) : 100000;
    const estimatedCost = this.estimateCost(
      estimatedTokens,
      result.selected.costs.inputCostPerMillion,
      result.selected.costs.outputCostPerMillion
    );
    
    return {
      primary: primaryModel,
      fallback: fallbackModel!,
      reasoning: result.reasoning,
      scores: {
        primary: this.convertToModelScore(result.selected),
        fallback: result.runnerUp ? this.convertToModelScore(result.runnerUp) : this.convertToModelScore(result.selected)
      },
      estimatedTokens,
      estimatedCost,
      recommendations: validation.warnings
    };
  }

  /**
   * Get available models from ModelVersionSync
   */
  private async getAvailableModels(): Promise<ModelVersionInfo[]> {
    // Use provided models if available (for production researcher)
    if (this.providedModels && this.providedModels.length > 0) {
      // BUG-034 FIX: Validate provided models are actually available
      const preFiltered = this.availabilityValidator.preFilterModels(this.providedModels);
      logger.info(`Pre-filtered ${this.providedModels.length} models to ${preFiltered.length} (removed known unavailable)`);
      
      // For performance, only deep validate if enabled
      if (process.env.ENABLE_MODEL_AVAILABILITY_CHECK === 'true') {
        const validated = await this.availabilityValidator.filterAvailableModels(preFiltered);
        logger.info(`Validated ${preFiltered.length} models to ${validated.length} available`);
        return validated;
      }
      
      return preFiltered;
    }
    
    // Check cache first
    const cacheKey = 'all_models';
    const cached = this.modelCache.get(cacheKey);
    
    if (cached && this.isCacheValid(cached)) {
      return cached;
    }
    
    // Fetch from ModelVersionSync
    // Use getModelsForProvider for each provider since getAllModels doesn't exist
    const providers = ['openai', 'anthropic', 'google', 'openrouter'];
    const models: ModelVersionInfo[] = [];
    
    for (const provider of providers) {
      const providerModels = this.modelVersionSync.getModelsForProvider(provider);
      models.push(...providerModels);
    }
    
    // BUG-034 FIX: Pre-filter and validate models
    const preFiltered = this.availabilityValidator.preFilterModels(models);
    logger.info(`Pre-filtered ${models.length} models to ${preFiltered.length} (removed known unavailable)`);
    
    // For performance, only deep validate if enabled
    let validatedModels = preFiltered;
    if (process.env.ENABLE_MODEL_AVAILABILITY_CHECK === 'true') {
      validatedModels = await this.availabilityValidator.filterAvailableModels(preFiltered);
      logger.info(`Validated ${preFiltered.length} models to ${validatedModels.length} available`);
    }
    
    // Cache for 5 minutes
    this.modelCache.set(cacheKey, validatedModels);
    
    return validatedModels;
  }

  /**
   * Convert ModelVersionInfo to enhanced format
   */
  private convertToEnhancedFormat(model: ModelVersionInfo): {
    metadata: ModelMetadata;
    costs: ModelCosts;
    capabilities: EnhancedModelCapabilities;
  } {
    const modelId = this.getModelId(model);
    
    // Determine status from model info
    let status: ModelMetadata['status'] = 'stable';
    const metadata = (model as any).metadata;
    if (metadata?.status === 'preview' || modelId.includes('preview')) {
      status = 'preview';
    } else if (metadata?.status === 'beta' || modelId.includes('beta')) {
      status = 'beta';
    } else if (model.deprecated || modelId.includes('deprecated')) {
      status = 'deprecated';
    }
    
    // Calculate costs
    const inputCost = (model.pricing?.input || 0.001) * 1000000; // Convert to per million
    const outputCost = (model.pricing?.output || 0.002) * 1000000;
    const avgCost = (inputCost + outputCost) / 2;
    
    // Extract capabilities
    const caps = model.capabilities || {};
    const capabilities: EnhancedModelCapabilities = {
      quality: caps.codeQuality || (caps as any).code_quality || 7.5,
      speed: caps.speed || 7.0,
      contextWindow: caps.contextWindow || (caps as any).context_window || 4096,
      reasoning: caps.reasoning || 7.0,
      codeQuality: caps.codeQuality || (caps as any).code_quality || 7.5,
      multimodal: (caps as any).multimodal || false,
      functionCalling: (caps as any).function_calling || true
    };
    
    return {
      metadata: {
        id: modelId,
        provider: model.provider,
        model: (model as any).model_id || model.model,
        version: model.versionId || 'latest',
        status,
        releaseDate: (model as any).created_at ? new Date((model as any).created_at) : undefined
      },
      costs: {
        inputCostPerMillion: inputCost,
        outputCostPerMillion: outputCost,
        averageCostPerMillion: avgCost,
        estimatedMonthlyTokens: 90_000_000, // 3M/day * 30
        monthlyCost: (avgCost * 90) / 1000
      },
      capabilities
    };
  }

  /**
   * Create selection context based on role and repository
   */
  private createSelectionContext(
    role: keyof typeof ROLE_SCORING_PROFILES,
    repoContext?: RepositoryContext
  ): ModelSelectionContext {
    // Map repository size to complexity
    const complexityMap = {
      small: 'simple',
      medium: 'moderate',
      large: 'complex',
      enterprise: 'complex'
    } as const;
    
    const taskComplexity = repoContext ? 
      complexityMap[repoContext.size] : 
      'moderate';
    
    // Define performance requirements based on role
    const requirements = this.getPerformanceRequirements(role, repoContext);
    
    // Stability requirements
    const needsStability = ['security', 'architecture', 'deepwiki'].includes(role);
    
    return {
      agentRole: role,
      taskComplexity,
      budgetConstraints: {
        maxMonthlyCost: role === 'documentation' || role === 'testing' ? 50 : 100,
        maxCostPerMillion: role === 'security' || role === 'architecture' ? 50 : 20
      },
      performanceRequirements: requirements,
      stabilityRequirement: needsStability ? 'production' : 'experimental_ok'
    };
  }

  /**
   * Get performance requirements by role
   */
  private getPerformanceRequirements(
    role: string,
    context?: RepositoryContext
  ): ModelSelectionContext['performanceRequirements'] {
    const baseRequirements = {
      minQuality: 7.0,
      minSpeed: 6.0,
      minContextWindow: 32000
    };
    
    // Adjust based on role
    switch (role) {
      case 'security':
      case 'architecture':
      case 'deepwiki':
        baseRequirements.minQuality = 8.5;
        baseRequirements.minContextWindow = 100000;
        break;
        
      case 'researcher':
        baseRequirements.minQuality = 8.0;
        baseRequirements.minSpeed = 7.0;
        break;
        
      case 'documentation':
      case 'testing':
      case 'dependencies':
        baseRequirements.minQuality = 7.0;
        baseRequirements.minSpeed = 8.0;
        break;
    }
    
    // Adjust based on repository context
    if (context) {
      if (context.size === 'large' || context.size === 'enterprise') {
        baseRequirements.minContextWindow = Math.max(baseRequirements.minContextWindow, 100000);
      }
      
      if (context.analysisDepth === 'comprehensive') {
        baseRequirements.minQuality += 0.5;
      }
    }
    
    return baseRequirements;
  }

  /**
   * Convert enhanced evaluation to model score format
   */
  private convertToModelScore(evaluation: ModelEvaluation): ModelScore {
    return {
      id: evaluation.model.id,
      provider: evaluation.model.provider,
      model: evaluation.model.model,
      inputCost: evaluation.costs.inputCostPerMillion,
      outputCost: evaluation.costs.outputCostPerMillion,
      avgCost: evaluation.costs.averageCostPerMillion,
      contextWindow: evaluation.capabilities.contextWindow,
      quality: evaluation.capabilities.quality,
      speed: evaluation.capabilities.speed,
      priceScore: 10 - (evaluation.costs.averageCostPerMillion / 10), // Simple conversion
      compositeScore: evaluation.adjustedScore
    };
  }

  /**
   * Estimate tokens based on repository context
   */
  private estimateTokens(context: RepositoryContext): number {
    const baseTokens = {
      small: 5000,      // ~5k tokens for small repos
      medium: 20000,    // ~20k tokens for medium repos
      large: 50000,     // ~50k tokens for large repos
      enterprise: 100000 // ~100k tokens for enterprise repos
    };
    
    let tokens = baseTokens[context.size];
    
    // Adjust for analysis depth
    if (context.analysisDepth === 'comprehensive') {
      tokens *= 2;
    } else if (context.analysisDepth === 'quick') {
      tokens *= 0.5;
    }
    
    // Adjust for PR context
    if (context.prContext) {
      const prSize = context.prContext.additions + context.prContext.deletions;
      tokens = Math.min(tokens, prSize * 100); // Roughly 100 tokens per line
    }
    
    return Math.round(tokens);
  }

  /**
   * Estimate cost based on tokens and pricing
   */
  private estimateCost(
    tokens: number,
    inputCostPerMillion: number,
    outputCostPerMillion: number
  ): number {
    // Assume 70% input, 30% output
    const inputTokens = tokens * 0.7;
    const outputTokens = tokens * 0.3;
    
    const inputCost = (inputTokens / 1_000_000) * inputCostPerMillion;
    const outputCost = (outputTokens / 1_000_000) * outputCostPerMillion;
    
    return inputCost + outputCost;
  }

  /**
   * Helper to get model ID
   */
  private getModelId(model: ModelVersionInfo): string {
    return `${model.provider}/${(model as any).model_id || model.model}`;
  }

  /**
   * Check if cache is still valid (5 minutes)
   */
  private isCacheValid(models: ModelVersionInfo[]): boolean {
    // Simple time-based cache for now
    // In production, could check model update timestamps
    return true; // Always valid for now
  }

  /**
   * Clear model cache
   */
  clearCache(): void {
    this.modelCache.clear();
  }
}

/**
 * Factory function for compatibility with existing code
 */
export function createUnifiedModelSelector(
  modelVersionSync: ModelVersionSync,
  vectorStorage?: VectorStorageService
): UnifiedModelSelector {
  return new UnifiedModelSelector(modelVersionSync, vectorStorage);
}

/**
 * Compatibility exports for drop-in replacement
 */
export type DeepWikiModelSelector = UnifiedModelSelector;
export type ResearcherModelSelector = UnifiedModelSelector;
export const createDeepWikiModelSelector = createUnifiedModelSelector;
export const createResearcherModelSelector = createUnifiedModelSelector;

// Export compatible types
export type DeepWikiModelSelection = UnifiedModelSelection;
export type ResearcherSelectionResult = UnifiedModelSelection;
export type DeepWikiModelScore = ModelScore;
export type ResearcherModelScore = ModelScore;