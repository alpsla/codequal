/**
 * DeepWiki Model Selector
 * 
 * @deprecated Use UnifiedModelSelector from '../model-selection/unified-model-selector' instead.
 * This class is maintained for backward compatibility only.
 * 
 * Migration guide:
 * 1. Import from '../model-selection/unified-model-selector'
 * 2. Use createUnifiedModelSelector() instead of createDeepWikiModelSelector()
 * 3. Call selectModel('deepwiki', context) instead of selectModel(context)
 * 
 * Dynamically selects optimal AI models for DeepWiki repository analysis
 * based on repository context, size, and complexity.
 * 
 * Scoring weights optimized for deep repository analysis:
 * - Quality: 50% (accuracy and comprehension crucial)
 * - Cost: 30% (manage high-volume analysis costs)
 * - Speed: 20% (background process, can be slower)
 */

import { ModelVersionInfo, ModelVersionSync } from '@codequal/core';
import { createLogger } from '@codequal/core/utils';
import { VectorStorageService } from '@codequal/database';
import { DeepWikiConfigStorage } from './deepwiki-config-storage';

export interface DeepWikiModelScore {
  id: string;
  provider: string;
  model: string;
  inputCost: number;
  outputCost: number;
  avgCost: number;
  contextWindow: number;
  quality: number;
  speed: number;
  priceScore: number;
  compositeScore: number;
}

export interface RepositoryContext {
  url: string;
  size: 'small' | 'medium' | 'large' | 'enterprise';
  primaryLanguage: string;
  languages: string[];
  frameworks: string[];
  fileCount: number;
  totalLines: number;
  complexity: number; // 1-10 scale
  analysisDepth: 'quick' | 'standard' | 'comprehensive';
  prContext?: {
    changedFiles: number;
    additions: number;
    deletions: number;
  };
}

export interface DeepWikiModelSelection {
  primary: ModelVersionInfo;
  fallback: ModelVersionInfo;
  context: RepositoryContext;
  estimatedTokens: number;
  estimatedCost: number;
  scores: {
    primary: DeepWikiModelScore;
    fallback: DeepWikiModelScore;
  };
  reasoning: string;
}

/**
 * Scoring weights for DeepWiki analysis
 * Different from researcher role due to different requirements
 */
export const DEEPWIKI_SCORING_WEIGHTS = {
  quality: 0.50,  // Deep understanding of codebase structure
  cost: 0.30,     // Control costs for large-scale analysis
  speed: 0.20     // Background process, can tolerate slower speeds
} as const;

export class DeepWikiModelSelector {
  private readonly logger = createLogger('DeepWikiModelSelector');
  private modelVersionSync: ModelVersionSync;
  private vectorStorage?: VectorStorageService;
  private configStorage: DeepWikiConfigStorage;
  private configCache = new Map<string, DeepWikiModelSelection>();

  constructor(
    modelVersionSync: ModelVersionSync,
    vectorStorage?: VectorStorageService
  ) {
    this.modelVersionSync = modelVersionSync;
    this.vectorStorage = vectorStorage;
    this.configStorage = new DeepWikiConfigStorage();
  }

  /**
   * Select optimal model based on repository context
   */
  async selectModel(context: RepositoryContext): Promise<DeepWikiModelSelection> {
    const cacheKey = this.getCacheKey(context);
    
    // Check cache first
    if (this.configCache.has(cacheKey)) {
      this.logger.debug('Using cached model selection', { cacheKey });
      return this.configCache.get(cacheKey)!;
    }

    // Check Vector DB for stored configuration
    const storedConfig = await this.getStoredConfiguration(context);
    if (storedConfig) {
      this.configCache.set(cacheKey, storedConfig);
      return storedConfig;
    }

    // Calculate new selection
    const selection = await this.calculateOptimalModel(context);
    
    // Store in Vector DB for future use
    await this.storeConfiguration(selection);
    
    // Cache locally
    this.configCache.set(cacheKey, selection);
    
    return selection;
  }

  /**
   * Calculate optimal model based on context
   */
  private async calculateOptimalModel(context: RepositoryContext): Promise<DeepWikiModelSelection> {
    // Get available models from all providers
    const providers = ['openai', 'anthropic', 'google', 'openrouter'];
    const availableModels: ModelVersionInfo[] = [];
    
    for (const provider of providers) {
      const providerModels = this.modelVersionSync.getModelsForProvider(provider);
      availableModels.push(...providerModels);
    }

    // Score each model for DeepWiki use case
    const scoredModels: DeepWikiModelScore[] = availableModels.map((model: ModelVersionInfo) => {
      // Default cost values if not available
      const inputCost = 1.0; // Default $1/1M tokens
      const outputCost = 2.0; // Default $2/1M tokens
      const contextWindow = 128000; // Default 128k context
      
      const quality = this.calculateQualityScore(model, context);
      const speed = this.calculateSpeedScore(model);
      const priceScore = this.calculatePriceScore(model, context);
      
      const compositeScore = 
        quality * DEEPWIKI_SCORING_WEIGHTS.quality +
        speed * DEEPWIKI_SCORING_WEIGHTS.speed +
        priceScore * DEEPWIKI_SCORING_WEIGHTS.cost;

      return {
        id: `${model.provider}/${model.model}`,
        provider: model.provider,
        model: model.model,
        inputCost,
        outputCost,
        avgCost: (inputCost + outputCost) / 2,
        contextWindow,
        quality,
        speed,
        priceScore,
        compositeScore
      };
    });

    // Sort by composite score
    scoredModels.sort((a, b) => b.compositeScore - a.compositeScore);

    // Select primary and fallback
    const primary = scoredModels[0];
    const fallback = this.selectFallback(scoredModels, primary);

    // Estimate token usage
    const estimatedTokens = this.estimateTokenUsage(context);
    const estimatedCost = this.calculateEstimatedCost(primary, estimatedTokens);

    const selection: DeepWikiModelSelection = {
      primary: this.toModelVersionInfo(primary),
      fallback: this.toModelVersionInfo(fallback),
      context,
      estimatedTokens,
      estimatedCost,
      scores: {
        primary,
        fallback
      },
      reasoning: this.generateReasoning(context, primary, fallback)
    };

    this.logger.info('Model selection complete', {
      repository: context.url,
      primary: primary.id,
      fallback: fallback.id,
      estimatedCost,
      reasoning: selection.reasoning
    });

    return selection;
  }

  /**
   * Calculate quality score based on model and context
   */
  calculateQualityScore(model: any, context: RepositoryContext): number {
    let baseQuality = this.inferDeepWikiQuality(model.id, model.contextWindow);
    
    // Adjust based on repository context
    if (context.size === 'enterprise' || context.complexity > 8) {
      // Need high-quality models for complex repos
      if (model.id.includes('opus') || model.id.includes('gpt-4.5')) {
        baseQuality += 0.5;
      }
    } else if (context.size === 'small' && context.complexity < 4) {
      // Can use efficient models for simple repos
      if (model.id.includes('mini') || model.id.includes('nano')) {
        baseQuality += 0.3;
      }
    }

    // Language-specific adjustments
    if (context.primaryLanguage) {
      const lang = context.primaryLanguage.toLowerCase();
      if (lang === 'rust' || lang === 'c++' || lang === 'scala') {
        // Complex languages need better models
        if (model.id.includes('opus') || model.id.includes('gpt-4')) {
          baseQuality += 0.2;
        }
      }
    }

    // Context window importance for large repos
    if (context.fileCount > 1000 && model.contextWindow < 100000) {
      baseQuality -= 0.5;
    }

    return Math.min(Math.max(baseQuality, 0), 10);
  }

  /**
   * Infer quality score for DeepWiki analysis
   */
  inferDeepWikiQuality(modelId: string, contextWindow: number): number {
    const id = modelId.toLowerCase();
    let score = 7.0; // default
    
    // Latest high-capability models ideal for code analysis
    if (id.includes('opus-4') || id.includes('claude-opus-4')) score = 9.8;
    else if (id.includes('gpt-4.5')) score = 9.7;
    else if (id.includes('sonnet-4') || id.includes('claude-sonnet-4')) score = 9.5;
    else if (id.includes('gpt-4.1') && !id.includes('nano')) score = 9.3;
    else if (id.includes('claude-3.7-sonnet')) score = 9.2;
    else if (id.includes('opus') || id.includes('gpt-4-turbo')) score = 9.0;
    
    // Good mid-range models for standard analysis
    else if (id.includes('gpt-4.1-nano')) score = 8.5;
    else if (id.includes('claude-3.5-sonnet')) score = 8.7;
    else if (id.includes('gpt-4o') && !id.includes('mini')) score = 8.6;
    else if (id.includes('gemini') && id.includes('pro')) score = 8.4;
    else if (id.includes('deepseek') && id.includes('r1')) score = 8.3;
    
    // Efficient models for simple repos
    else if (id.includes('gpt-4o-mini')) score = 7.8;
    else if (id.includes('claude') && id.includes('haiku')) score = 7.5;
    else if (id.includes('gemini') && id.includes('flash')) score = 7.6;
    else if (id.includes('mistral') && id.includes('large')) score = 7.4;
    
    // Code-specific model boost
    if (id.includes('code') || id.includes('coder')) score += 0.4;
    
    // Large context windows crucial for repo analysis
    if (contextWindow >= 100000) score += 0.3;
    if (contextWindow >= 200000) score += 0.5;
    
    return Math.min(score, 10);
  }

  /**
   * Calculate speed score
   */
  calculateSpeedScore(model: any): number {
    const id = model.id.toLowerCase();
    
    // Fast models
    if (id.includes('haiku') || id.includes('flash')) return 9.5;
    if (id.includes('gpt-4o-mini')) return 9.0;
    if (id.includes('nano')) return 8.8;
    if (id.includes('mini')) return 8.5;
    
    // Medium speed
    if (id.includes('sonnet') || id.includes('gpt-4o')) return 7.5;
    if (id.includes('mistral')) return 7.0;
    
    // Slower but powerful
    if (id.includes('opus') || id.includes('gpt-4.5')) return 5.0;
    if (id.includes('gpt-4-turbo')) return 6.0;
    
    return 7.0; // default
  }

  /**
   * Calculate price score (inverse of cost)
   */
  calculatePriceScore(model: any, context: RepositoryContext): number {
    const avgCost = (model.inputCost + model.outputCost) / 2;
    const estimatedTokens = this.estimateTokenUsage(context);
    const estimatedCost = (estimatedTokens / 1_000_000) * avgCost;
    
    // Score based on cost per analysis
    if (estimatedCost < 0.01) return 10.0;  // Less than 1 cent
    if (estimatedCost < 0.05) return 9.0;   // Less than 5 cents
    if (estimatedCost < 0.10) return 8.0;   // Less than 10 cents
    if (estimatedCost < 0.50) return 7.0;   // Less than 50 cents
    if (estimatedCost < 1.00) return 6.0;   // Less than $1
    if (estimatedCost < 2.00) return 5.0;   // Less than $2
    if (estimatedCost < 5.00) return 3.0;   // Less than $5
    
    return 1.0; // Very expensive
  }

  /**
   * Estimate token usage based on repository context
   */
  private estimateTokenUsage(context: RepositoryContext): number {
    let baseTokens = 10000; // Minimum for any analysis
    
    // Size-based estimation
    const sizeMultipliers = {
      small: 1,
      medium: 3,
      large: 10,
      enterprise: 30
    };
    baseTokens *= sizeMultipliers[context.size];
    
    // Complexity adjustment
    baseTokens *= (1 + context.complexity / 10);
    
    // File count adjustment
    if (context.fileCount > 100) {
      baseTokens *= Math.log10(context.fileCount);
    }
    
    // Analysis depth adjustment
    const depthMultipliers = {
      quick: 0.3,
      standard: 1.0,
      comprehensive: 2.5
    };
    baseTokens *= depthMultipliers[context.analysisDepth];
    
    // PR context adjustment (incremental analysis)
    if (context.prContext && context.prContext.changedFiles < 10) {
      baseTokens *= 0.2; // Only analyze changes
    }
    
    return Math.round(baseTokens);
  }

  /**
   * Select appropriate fallback model
   */
  private selectFallback(scoredModels: DeepWikiModelScore[], primary: DeepWikiModelScore): DeepWikiModelScore {
    // Find a model that's different provider and good quality
    for (const model of scoredModels) {
      if (model.id === primary.id) continue;
      
      // Different provider preferred
      if (model.provider !== primary.provider && model.quality >= 7.5) {
        return model;
      }
    }
    
    // If no different provider, get next best
    return scoredModels[1] || primary;
  }

  /**
   * Generate human-readable reasoning
   */
  private generateReasoning(
    context: RepositoryContext,
    primary: DeepWikiModelScore,
    fallback: DeepWikiModelScore
  ): string {
    const reasons = [];
    
    // Repository size reasoning
    reasons.push(`Repository size: ${context.size} (${context.fileCount} files, ${context.totalLines} lines)`);
    
    // Complexity reasoning
    if (context.complexity > 7) {
      reasons.push(`High complexity (${context.complexity}/10) requires advanced model capabilities`);
    } else if (context.complexity < 4) {
      reasons.push(`Low complexity (${context.complexity}/10) allows for efficient model usage`);
    }
    
    // Cost reasoning
    const costPerAnalysis = this.calculateEstimatedCost(primary, this.estimateTokenUsage(context));
    reasons.push(`Estimated cost: $${costPerAnalysis.toFixed(2)} per analysis`);
    
    // Model selection reasoning
    reasons.push(`Selected ${primary.id} for optimal balance of quality (${primary.quality.toFixed(1)}) and cost`);
    reasons.push(`Fallback: ${fallback.id} provides ${fallback.provider} redundancy`);
    
    return reasons.join('. ');
  }

  /**
   * Store configuration in storage
   */
  private async storeConfiguration(selection: DeepWikiModelSelection): Promise<void> {
    try {
      await this.configStorage.storeRepositoryConfig(selection.context.url, selection as any);
      this.logger.debug('Stored DeepWiki configuration', { repository: selection.context.url });
    } catch (error) {
      this.logger.error('Failed to store configuration', { error });
    }
  }

  /**
   * Retrieve stored configuration from storage
   */
  private async getStoredConfiguration(context: RepositoryContext): Promise<DeepWikiModelSelection | null> {
    try {
      const stored = await this.configStorage.getRepositoryConfig(context.url);
      
      if (stored) {
        // Reconstruct selection from stored data
        const primary = stored.primary_model.split('/');
        const fallback = stored.fallback_model.split('/');
        
        return {
          primary: { 
            provider: primary[0], 
            model: primary.slice(1).join('/'),
            versionId: 'latest'
          } as ModelVersionInfo,
          fallback: { 
            provider: fallback[0], 
            model: fallback.slice(1).join('/'),
            versionId: 'latest'
          } as ModelVersionInfo,
          context: stored.context,
          estimatedTokens: stored.estimatedTokens || this.estimateTokenUsage(context),
          estimatedCost: stored.estimatedCost || 0,
          scores: stored.scores,
          reasoning: stored.reasoning
        };
      }
      
      return null;
    } catch (error) {
      this.logger.error('Failed to retrieve stored configuration', { error });
      return null;
    }
  }

  /**
   * Calculate estimated cost
   */
  private calculateEstimatedCost(model: DeepWikiModelScore, tokens: number): number {
    const costPerMillion = (model.inputCost + model.outputCost) / 2;
    return (tokens / 1_000_000) * costPerMillion;
  }

  /**
   * Convert to ModelVersionInfo
   */
  private toModelVersionInfo(score: DeepWikiModelScore): ModelVersionInfo {
    return {
      provider: score.provider,
      model: score.model,
      versionId: 'latest'
    } as ModelVersionInfo;
  }

  /**
   * Generate cache key
   */
  private getCacheKey(context: RepositoryContext): string {
    return `${context.url}:${context.size}:${context.analysisDepth}`;
  }
}

// Export singleton factory
export function createDeepWikiModelSelector(
  modelVersionSync: ModelVersionSync,
  vectorStorage?: VectorStorageService
): DeepWikiModelSelector {
  return new DeepWikiModelSelector(modelVersionSync, vectorStorage);
}

// Export helper functions for model initializer
export function scoreModelsForDeepWiki(models: any[]): DeepWikiModelScore[] {
  const selector = new DeepWikiModelSelector(null as any);
  return models
    .filter(m => {
      const id = m.id.toLowerCase();
      return !id.includes('embed') && 
             !id.includes('vision') && 
             !id.includes('sonar') && 
             !id.includes('online') && 
             !id.includes('base') && 
             m.pricing &&
             (parseFloat(m.pricing.prompt) > 0 || parseFloat(m.pricing.completion) > 0);
    })
    .map(m => {
      const inputCost = parseFloat(m.pricing.prompt) * 1000000;
      const outputCost = parseFloat(m.pricing.completion) * 1000000;
      const avgCost = (inputCost + outputCost) / 2;
      
      const quality = selector.inferDeepWikiQuality(m.id, m.context_length || 0);
      const speed = selector.calculateSpeedScore(m);
      const priceScore = selector.calculatePriceScore(m, {
        url: '',
        size: 'medium',
        primaryLanguage: 'javascript',
        languages: [],
        frameworks: [],
        fileCount: 100,
        totalLines: 10000,
        complexity: 5,
        analysisDepth: 'standard'
      });
      
      const compositeScore = 
        quality * DEEPWIKI_SCORING_WEIGHTS.quality +
        priceScore * DEEPWIKI_SCORING_WEIGHTS.cost +
        speed * DEEPWIKI_SCORING_WEIGHTS.speed;
      
      const [provider, ...modelParts] = m.id.split('/');
      
      return {
        id: m.id,
        provider,
        model: modelParts.join('/'),
        inputCost,
        outputCost,
        avgCost,
        contextWindow: m.context_length || 0,
        quality,
        speed,
        priceScore,
        compositeScore
      };
    })
    .sort((a, b) => b.compositeScore - a.compositeScore);
}

export function createDeepWikiSelectionPrompt(topModels: DeepWikiModelScore[]): string {
  const top5 = topModels.slice(0, 5);
  
  return `Pick the best 2 models for DeepWiki repository analysis from this ranked list:

${top5.map((m, i) => 
  `${i + 1}. ${m.id} - Score: ${m.compositeScore.toFixed(2)} - Quality: ${m.quality.toFixed(1)} - Cost: $${m.avgCost.toFixed(2)}/1M - Context: ${m.contextWindow.toLocaleString()}`
).join('\n')}

DeepWiki Requirements:
- Deep understanding of code structure and patterns
- Large context window for analyzing entire repositories
- Balance between quality (50%), cost (30%), and speed (20%)
- Ability to identify architectural patterns and security issues

Output only 2 CSV rows for #1 and #2:
provider,model,input,output,DEEPWIKI,context`;
}

export function parseDeepWikiSelection(response: string): {
  primary?: ModelVersionInfo;
  fallback?: ModelVersionInfo;
} {
  const lines = response.split('\n')
    .filter(line => line.trim() && line.includes(','))
    .map(line => {
      const parts = line.split(',').map(p => p.trim());
      if (parts.length >= 6) {
        return {
          provider: parts[0],
          model: parts[1],
          versionId: 'latest',
          pricing: {
            input: parseFloat(parts[2]),
            output: parseFloat(parts[3])
          },
          capabilities: {
            contextWindow: parseInt(parts[5]) || 128000
          }
        } as ModelVersionInfo;
      }
      return undefined;
    })
    .filter((item): item is ModelVersionInfo => item !== undefined);
  
  return {
    primary: lines[0],
    fallback: lines[1]
  };
}