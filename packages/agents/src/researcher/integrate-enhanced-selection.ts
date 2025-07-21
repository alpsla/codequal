/**
 * Integration module to connect Enhanced Model Selection Rules
 * with existing ModelVersionSync and ResearcherAgent
 */

import { ModelVersionSync } from '@codequal/core/services/model-selection/ModelVersionSync';
import { 
  ModelSelectionEngine,
  ModelMetadata,
  ModelCosts,
  ModelCapabilities,
  ModelSelectionContext,
  ModelEvaluation
} from './enhanced-model-selection-rules';

export interface ModelVersionSyncEnhanced extends ModelVersionSync {
  selectModelWithEnhancedRules(
    repositoryId: string,
    language: string,
    sizeCategory: string,
    agentRole: string
  ): Promise<{
    primary: any;
    fallback: any;
    evaluation: ModelEvaluation;
    reasoning: string[];
  }>;
}

/**
 * Enhanced Model Version Sync
 * Integrates sophisticated selection rules with existing infrastructure
 */
export class EnhancedModelVersionSync {
  private engine = new ModelSelectionEngine();
  
  /**
   * Convert existing model data to enhanced format
   */
  private convertToEnhancedFormat(model: any): {
    metadata: ModelMetadata;
    costs: ModelCosts;
    capabilities: ModelCapabilities;
  } {
    // Parse model status from name/version
    let status: ModelMetadata['status'] = 'stable';
    if (model.model.includes('preview') || model.model.includes('Preview')) {
      status = 'preview';
    } else if (model.model.includes('beta') || model.model.includes('Beta')) {
      status = 'beta';
    } else if (model.model.includes('experimental')) {
      status = 'experimental';
    } else if (model.deprecated) {
      status = 'deprecated';
    }
    
    // Extract version from model name
    const versionMatch = model.model.match(/(\d+\.?\d*)/);
    const version = versionMatch ? versionMatch[1] : undefined;
    
    // Parse dates
    const releaseDate = model.created ? new Date(model.created * 1000) : undefined;
    const deprecationDate = model.deprecation_date ? new Date(model.deprecation_date) : undefined;
    
    // Calculate costs
    const inputCost = parseFloat(model.pricing?.input || model.price_per_million_input_tokens || '0') / 1000000;
    const outputCost = parseFloat(model.pricing?.output || model.price_per_million_output_tokens || '0') / 1000000;
    const avgCost = (inputCost + outputCost) / 2;
    
    // Estimate capabilities
    const capabilities: ModelCapabilities = {
      quality: this.estimateQuality(model),
      speed: this.estimateSpeed(model),
      contextWindow: model.context_window || model.context_length || 4096,
      reasoning: this.estimateReasoning(model),
      codeQuality: this.estimateCodeQuality(model),
      multimodal: model.multimodal || false,
      functionCalling: model.function_calling || false
    };
    
    return {
      metadata: {
        id: model.id,
        provider: model.provider,
        model: model.model,
        version,
        status,
        releaseDate,
        deprecationDate,
        knownIssues: model.known_issues || []
      },
      costs: {
        inputCostPerMillion: inputCost * 1000000,
        outputCostPerMillion: outputCost * 1000000,
        averageCostPerMillion: avgCost * 1000000,
        estimatedMonthlyTokens: 90_000_000, // 3M/day * 30
        monthlyCost: (avgCost * 1000000 * 90) / 1000000
      },
      capabilities
    };
  }
  
  /**
   * Estimate quality score based on model characteristics
   */
  private estimateQuality(model: any): number {
    const modelName = model.model.toLowerCase();
    
    // Known high-quality models
    if (modelName.includes('gpt-4') || modelName.includes('claude-3-opus')) return 9.5;
    if (modelName.includes('claude-3.5-sonnet') || modelName.includes('gemini-pro')) return 9.2;
    if (modelName.includes('claude-3-sonnet') || modelName.includes('gpt-3.5')) return 9.0;
    if (modelName.includes('gemini') && modelName.includes('flash')) return 8.5;
    if (modelName.includes('mixtral') || modelName.includes('llama-3')) return 8.2;
    if (modelName.includes('deepseek')) return 8.0;
    
    // Size-based estimation
    if (modelName.includes('70b') || modelName.includes('405b')) return 8.5;
    if (modelName.includes('8b') || modelName.includes('7b')) return 7.5;
    
    // Default
    return 7.0;
  }
  
  /**
   * Estimate speed score
   */
  private estimateSpeed(model: any): number {
    const modelName = model.model.toLowerCase();
    
    if (modelName.includes('flash') || modelName.includes('turbo')) return 9.5;
    if (modelName.includes('haiku') || modelName.includes('8b')) return 9.0;
    if (modelName.includes('sonnet') || modelName.includes('70b')) return 7.5;
    if (modelName.includes('opus') || modelName.includes('405b')) return 6.0;
    
    return 7.0;
  }
  
  /**
   * Estimate reasoning capability
   */
  private estimateReasoning(model: any): number {
    const modelName = model.model.toLowerCase();
    
    if (modelName.includes('o1') || modelName.includes('reasoning')) return 9.5;
    if (modelName.includes('gpt-4') || modelName.includes('opus')) return 9.0;
    if (modelName.includes('sonnet') || modelName.includes('gemini-pro')) return 8.5;
    if (modelName.includes('turbo') || modelName.includes('flash')) return 7.5;
    
    return 7.0;
  }
  
  /**
   * Estimate code quality capability
   */
  private estimateCodeQuality(model: any): number {
    const modelName = model.model.toLowerCase();
    
    if (modelName.includes('code') || modelName.includes('coder')) return 9.0;
    if (modelName.includes('gpt-4') || modelName.includes('claude')) return 8.5;
    if (modelName.includes('deepseek') && modelName.includes('coder')) return 8.8;
    if (modelName.includes('sonnet')) return 8.3;
    
    return 7.5;
  }
  
  /**
   * Create context based on agent role and repository
   */
  private createSelectionContext(
    agentRole: string,
    sizeCategory: string,
    budgetConfig?: any
  ): ModelSelectionContext {
    // Map size to complexity
    const complexityMap = {
      small: 'simple',
      medium: 'moderate',
      large: 'complex',
      'extra-large': 'complex'
    } as const;
    
    const taskComplexity = complexityMap[sizeCategory as keyof typeof complexityMap] || 'moderate';
    
    // Define budget constraints
    const budgetConstraints = budgetConfig || {
      maxMonthlyCost: 100, // Default $100/month
      maxCostPerMillion: 20 // Default $20/M tokens
    };
    
    // Define performance requirements based on role
    const performanceRequirements = this.getPerformanceRequirements(agentRole);
    
    // Stability requirement based on role
    const stabilityRequirement = ['security', 'architecture'].includes(agentRole) 
      ? 'production' 
      : 'experimental_ok';
    
    return {
      agentRole,
      taskComplexity,
      budgetConstraints,
      performanceRequirements,
      stabilityRequirement
    };
  }
  
  /**
   * Get performance requirements by role
   */
  private getPerformanceRequirements(role: string): ModelSelectionContext['performanceRequirements'] {
    switch (role) {
      case 'security':
      case 'architecture':
        return {
          minQuality: 8.5,
          minSpeed: 6.0,
          minContextWindow: 32000
        };
        
      case 'researcher':
        return {
          minQuality: 7.5,
          minSpeed: 7.0,
          minContextWindow: 32000
        };
        
      case 'documentation':
      case 'testing':
        return {
          minQuality: 7.0,
          minSpeed: 8.0,
          minContextWindow: 16000
        };
        
      default:
        return {
          minQuality: 7.5,
          minSpeed: 7.0,
          minContextWindow: 32000
        };
    }
  }
  
  /**
   * Select model with enhanced rules
   */
  async selectModelWithEnhancedRules(
    models: any[],
    language: string,
    sizeCategory: string,
    agentRole: string,
    budgetConfig?: any
  ): Promise<{
    primary: any;
    fallback: any;
    evaluation: ModelEvaluation;
    reasoning: string[];
    warnings?: string[];
  }> {
    // Convert models to enhanced format
    const candidates = models.map(m => this.convertToEnhancedFormat(m));
    
    // Create selection context
    const context = this.createSelectionContext(agentRole, sizeCategory, budgetConfig);
    
    // Run enhanced selection
    const result = this.engine.selectBestModel(candidates, context);
    
    // Validate selection
    const validation = this.engine.validateSelection(result.selected, context);
    
    // Find original models
    const primaryOriginal = models.find(m => m.id === result.selected.model.id);
    const fallbackOriginal = result.runnerUp ? 
      models.find(m => m.id === result.runnerUp!.model.id) : 
      primaryOriginal;
    
    return {
      primary: primaryOriginal,
      fallback: fallbackOriginal,
      evaluation: result.selected,
      reasoning: result.reasoning
    };
  }
}

/**
 * Patch existing ModelVersionSync to use enhanced rules
 */
export function enhanceModelVersionSync(
  originalSync: ModelVersionSync
): ModelVersionSyncEnhanced {
  const enhancedSync = new EnhancedModelVersionSync();
  
  // Create enhanced version that delegates to original but uses new rules
  const enhanced = Object.create(originalSync) as ModelVersionSyncEnhanced;
  
  // Override the selection method
  enhanced.selectModelWithEnhancedRules = async function(
    repositoryId: string,
    language: string,
    sizeCategory: string,
    agentRole: string
  ) {
    // Get models from original sync
    // Since getAllModels doesn't exist, we'll pass empty array
    // In production, this would fetch from database
    const relevantModels: any[] = [];
    
    // Use enhanced selection
    return enhancedSync.selectModelWithEnhancedRules(
      relevantModels,
      language,
      sizeCategory,
      agentRole
    );
  };
  
  return enhanced;
}

/**
 * Example usage in ResearcherAgent
 */
export async function selectResearcherModel(
  modelSync: ModelVersionSyncEnhanced,
  repositoryId: string
): Promise<{
  provider: string;
  model: string;
  reasoning: string;
}> {
  const result = await modelSync.selectModelWithEnhancedRules(
    repositoryId,
    'typescript', // Researcher analyzes all languages
    'medium', // Moderate complexity
    'researcher'
  );
  
  // Log warnings if any
  // Warnings are no longer part of the result structure
  
  return {
    provider: result.evaluation.model.provider,
    model: result.evaluation.model.model,
    reasoning: result.reasoning.join('. ')
  };
}