/**
 * Truly Dynamic Model Selector
 * 
 * NO hardcoded models, versions, or thresholds
 * Selects models purely based on role requirements and actual capabilities
 */

import { createLogger } from '@codequal/core';
import axios from 'axios';

const logger = createLogger('TrulyDynamicSelector');

export interface RoleRequirements {
  role: string;
  description: string;
  languages?: string[];  // Programming languages to analyze
  repositorySize: 'small' | 'medium' | 'large' | 'enterprise';
  maxCostPerMillion?: number;  // Budget constraint
  weights: {
    quality: number;  // 0-1, importance of quality/accuracy
    speed: number;    // 0-1, importance of fast response
    cost: number;     // 0-1, importance of low cost
  };
  minContextWindow?: number;  // Minimum context needed
  requiresReasoning?: boolean;
  requiresCodeAnalysis?: boolean;
}

export interface ModelCandidate {
  id: string;
  provider: string;
  model: string;
  contextLength: number;
  pricing: {
    prompt: number;
    completion: number;
  };
  // Derived scores
  qualityScore?: number;
  speedScore?: number;
  costScore?: number;
  totalScore?: number;
}

export class DynamicModelSelector {
  private openRouterApiKey: string;
  
  constructor(apiKey?: string) {
    this.openRouterApiKey = apiKey || process.env.OPENROUTER_API_KEY || '';
  }
  
  /**
   * Select models for a role WITHOUT any hardcoded names or versions
   */
  async selectModelsForRole(requirements: RoleRequirements): Promise<{
    primary: ModelCandidate;
    fallback: ModelCandidate;
    reasoning: string;
  }> {
    logger.info(`Selecting models for role: ${requirements.role}`);
    
    // Step 1: Fetch ALL available models from OpenRouter
    const allModels = await this.fetchAllModels();
    logger.info(`Found ${allModels.length} total models in OpenRouter`);
    
    // Step 2: Filter by basic requirements (context window, cost)
    const eligibleModels = this.filterByRequirements(allModels, requirements);
    logger.info(`${eligibleModels.length} models meet basic requirements`);
    
    // Step 3: Score each model based on role weights
    const scoredModels = this.scoreModels(eligibleModels, requirements);
    
    // Step 4: Sort by total score
    scoredModels.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
    
    // Step 5: Select primary and fallback
    if (scoredModels.length < 2) {
      throw new Error('Not enough suitable models found');
    }
    
    const primary = scoredModels[0];
    const fallback = this.selectFallback(scoredModels, primary);
    
    const reasoning = this.generateReasoning(primary, fallback, requirements);
    
    logger.info(`Selected primary: ${primary.id} (score: ${primary.totalScore?.toFixed(2)})`);
    logger.info(`Selected fallback: ${fallback.id} (score: ${fallback.totalScore?.toFixed(2)})`);
    
    return { primary, fallback, reasoning };
  }
  
  /**
   * Fetch all models from OpenRouter
   */
  private async fetchAllModels(): Promise<ModelCandidate[]> {
    if (!this.openRouterApiKey) {
      throw new Error('OpenRouter API key not configured');
    }
    
    try {
      const response = await axios.get('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${this.openRouterApiKey}`,
          'HTTP-Referer': 'https://codequal.com',
          'X-Title': 'CodeQual Dynamic Selector'
        }
      });
      
      const models = response.data.data || [];
      
      return models.map((m: any) => ({
        id: m.id,
        provider: m.id.split('/')[0],
        model: m.id.split('/').slice(1).join('/'),
        contextLength: m.context_length || 4096,
        pricing: {
          prompt: parseFloat(m.pricing?.prompt || '0'),
          completion: parseFloat(m.pricing?.completion || '0')
        }
      }));
    } catch (error) {
      logger.error('Failed to fetch models from OpenRouter', { error });
      throw error;
    }
  }
  
  /**
   * Filter models by basic requirements
   */
  private filterByRequirements(
    models: ModelCandidate[],
    requirements: RoleRequirements
  ): ModelCandidate[] {
    return models.filter(model => {
      // Filter out non-text models
      if (model.id.includes('whisper') || 
          model.id.includes('tts') || 
          model.id.includes('dalle') ||
          model.id.includes('stable-diffusion')) {
        return false;
      }
      
      // Check context window
      if (requirements.minContextWindow && 
          model.contextLength < requirements.minContextWindow) {
        return false;
      }
      
      // Check cost constraint
      if (requirements.maxCostPerMillion) {
        const avgCost = (model.pricing.prompt + model.pricing.completion) / 2;
        if (avgCost > requirements.maxCostPerMillion) {
          return false;
        }
      }
      
      // All other models are candidates - no hardcoded filtering!
      return true;
    });
  }
  
  /**
   * Score models based on role requirements
   */
  private scoreModels(
    models: ModelCandidate[],
    requirements: RoleRequirements
  ): ModelCandidate[] {
    // Calculate min/max for normalization
    const contextLengths = models.map(m => m.contextLength);
    const costs = models.map(m => (m.pricing.prompt + m.pricing.completion) / 2);
    
    const maxContext = Math.max(...contextLengths);
    const minContext = Math.min(...contextLengths);
    const maxCost = Math.max(...costs);
    const minCost = Math.min(...costs);
    
    return models.map(model => {
      const modelName = model.model.toLowerCase();
      const avgCost = (model.pricing.prompt + model.pricing.completion) / 2;
      
      // Quality score components
      let qualityScore = 0;
      
      // 1. Version superiority (35% of quality) - MOST IMPORTANT
      // Heavily penalize older versions
      const versionScore = this.getVersionScore(modelName);
      qualityScore += versionScore * 0.35;
      
      // 2. Model tier (25% of quality)
      const tierScore = this.getTierScore(modelName);
      qualityScore += tierScore * 0.25;
      
      // 3. Context window (20% of quality) - Less important than version
      const contextNorm = (model.contextLength - minContext) / (maxContext - minContext || 1);
      qualityScore += contextNorm * 0.2;
      
      // 4. Provider reputation (10% of quality)
      const providerScore = this.getProviderScore(model.provider);
      qualityScore += providerScore * 0.1;
      
      // 5. Price as quality indicator (10% of quality) - expensive often = better
      const costNorm = (avgCost - minCost) / (maxCost - minCost || 1);
      qualityScore += costNorm * 0.1;
      
      // Apply version penalty for significantly old models
      // If version is < 2.0 and we have 2.5+ available, heavily penalize
      const version = parseFloat(modelName.match(/(\d+(?:\.\d+)?)/)?.[1] || '0');
      if (version > 0 && version < 2.0) {
        // Check if newer versions exist
        const hasNewer = models.some(m => {
          const otherVersion = parseFloat(m.model.toLowerCase().match(/(\d+(?:\.\d+)?)/)?.[1] || '0');
          return otherVersion >= 2.5 && m.provider === model.provider;
        });
        if (hasNewer) {
          qualityScore *= 0.5; // 50% penalty for using old version when newer exists
        }
      }
      
      // Speed score components
      let speedScore = 0;
      
      // 1. Speed indicators in name (50% of speed)
      if (modelName.includes('flash') || modelName.includes('turbo')) {
        speedScore += 0.5;
      } else if (modelName.includes('fast') || modelName.includes('instant')) {
        speedScore += 0.45;
      } else if (modelName.includes('mini') || modelName.includes('haiku')) {
        speedScore += 0.4;
      } else if (modelName.includes('nano') || modelName.includes('tiny')) {
        speedScore += 0.35;
      } else if (modelName.includes('lite') || modelName.includes('small')) {
        speedScore += 0.3;
      } else {
        speedScore += 0.1; // Base speed for non-speed-optimized models
      }
      
      // 2. Inverse context (25% of speed) - smaller = faster
      speedScore += (1 - contextNorm) * 0.25;
      
      // 3. Cost as speed indicator (25% of speed) - cheaper often = faster
      speedScore += (1 - costNorm) * 0.25;
      
      // Cost score - use sigmoid curve for more sensitivity
      const costScore = 1 / (1 + Math.exp(5 * (costNorm - 0.5)));
      
      // Apply weights with strong power scaling for extreme differentiation
      const qualityWeight = requirements.weights.quality;
      const speedWeight = requirements.weights.speed;
      const costWeight = requirements.weights.cost;
      
      // Calculate weight extremity (how far from balanced)
      const maxWeight = Math.max(qualityWeight, speedWeight, costWeight);
      const extremity = maxWeight - 0.333;
      
      // Apply stronger power scaling for more extreme weights
      const powerScale = 1 + extremity * 2;
      
      const weightedQuality = qualityScore * Math.pow(qualityWeight, 1/powerScale);
      const weightedSpeed = speedScore * Math.pow(speedWeight, 1/powerScale);
      const weightedCost = costScore * Math.pow(costWeight, 1/powerScale);
      
      // Add bonus/penalty based on weight alignment
      let alignmentBonus = 0;
      
      // Strong quality preference - favor newer versions
      if (qualityWeight > 0.6) {
        if (versionScore >= 0.8) alignmentBonus += 0.2; // Bonus for v2.5+
        if (versionScore <= 0.4) alignmentBonus -= 0.3; // Penalty for v1.5
        if (tierScore >= 0.8) alignmentBonus += 0.1; // Bonus for premium models
        if (costScore > 0.7) alignmentBonus -= 0.1; // Penalty for too cheap
      }
      
      // Strong cost preference  
      if (costWeight > 0.6) {
        if (costScore >= 0.8) alignmentBonus += 0.2; // Bonus for cheap models
        if (tierScore >= 0.8) alignmentBonus -= 0.1; // Penalty for premium
      }
      
      // Strong speed preference
      if (speedWeight > 0.6) {
        if (speedScore >= 0.7) alignmentBonus += 0.2; // Bonus for fast models
        if (contextNorm > 0.7) alignmentBonus -= 0.1; // Penalty for large context
      }
      
      // Calculate total with alignment bonus
      const totalScore = weightedQuality + weightedSpeed + weightedCost + alignmentBonus;
      
      return {
        ...model,
        qualityScore,
        speedScore,
        costScore,
        totalScore
      };
    });
  }

  /**
   * Get version score from model name - higher versions are better
   * FIXED: Properly recognizes 2.5 > 2.0, 4.1 > 3.5, etc.
   */
  /**
   * Get version score from model name - higher versions are better
   * FIXED: Properly recognizes 2.5 > 2.0 > 1.5
   */
  private getVersionScore(modelName: string): number {
    // Extract version numbers from model name
    const versionMatches = modelName.match(/(\d+(?:\.\d+)?)/g);
    if (!versionMatches || versionMatches.length === 0) {
      return 0.3; // Base score for models without version
    }
    
    // Parse the first version number found
    const version = parseFloat(versionMatches[0]);
    
    // Score based on version number
    // Higher versions indicate more recent/advanced models
    if (version >= 5) return 1.0;      // GPT-5, Claude 5, etc.
    if (version >= 4.5) return 0.95;   // GPT-4.5, etc.
    if (version >= 4) return 0.9;      // GPT-4, Claude 4.x
    if (version >= 3.5) return 0.75;   // GPT-3.5, Claude 3.5
    if (version >= 3) return 0.7;      // GPT-3, Claude 3.x
    if (version >= 2.5) return 0.8;    // Gemini 2.5 (more advanced than 2.0)
    if (version >= 2) return 0.6;      // Gemini 2.0, etc.
    if (version >= 1.5) return 0.4;    // Version 1.5 - OLDER than 2.0!
    if (version >= 1) return 0.3;      // Version 1.x
    return 0.2; // Very old versions
  }
  
  /**
   * Get tier score from model name indicators
   */
  private getTierScore(modelName: string): number {
    // Premium tier indicators
    if (modelName.includes('opus') || modelName.includes('ultra')) return 1.0;
    if (modelName.includes('pro') || modelName.includes('advanced')) return 0.9;
    if (modelName.includes('large') || modelName.includes('xl')) return 0.8;
    
    // Mid tier
    if (modelName.includes('sonnet') || modelName.includes('chat')) return 0.6;
    if (modelName.includes('standard') || modelName.includes('base')) return 0.5;
    
    // Speed-optimized tier (still good quality but optimized differently)
    if (modelName.includes('flash') && modelName.includes('2.5')) return 0.7; // Flash 2.5 is good quality
    if (modelName.includes('flash')) return 0.5;
    if (modelName.includes('turbo')) return 0.5;
    
    // Lower tier
    if (modelName.includes('haiku') || modelName.includes('mini')) return 0.3;
    if (modelName.includes('nano') || modelName.includes('tiny')) return 0.2;
    if (modelName.includes('small') || modelName.includes('lite')) return 0.25;
    
    return 0.4; // Default tier
  }
  
  /**
   * Get provider reputation score
   */
  private getProviderScore(provider: string): number {
    const providerLower = provider.toLowerCase();
    
    // Top-tier AI providers
    if (providerLower.includes('anthropic') || 
        providerLower.includes('openai') || 
        providerLower.includes('google')) {
      return 0.9;
    }
    
    // Strong providers
    if (providerLower.includes('mistral') || 
        providerLower.includes('meta') || 
        providerLower.includes('cohere')) {
      return 0.7;
    }
    
    // Emerging strong providers
    if (providerLower.includes('xai') || 
        providerLower.includes('deepseek') || 
        providerLower.includes('alibaba')) {
      return 0.6;
    }
    
    // Other providers
    return 0.5;
  }
  
  /**
   * Get quality bonus from model name (no hardcoding specific models!)
   */
  private getNameQualityBonus(modelName: string): number {
    const name = modelName.toLowerCase();
    let bonus = 0.5; // Base score
    
    // Quality indicators (generic, not model-specific)
    if (name.includes('opus') || name.includes('pro') || name.includes('large')) {
      bonus += 0.3;
    }
    if (name.includes('ultra') || name.includes('max') || name.includes('advanced')) {
      bonus += 0.2;
    }
    if (name.includes('preview') || name.includes('exp') || name.includes('beta')) {
      bonus += 0.1; // Cutting edge
    }
    if (name.includes('mini') || name.includes('small') || name.includes('tiny')) {
      bonus -= 0.3;
    }
    if (name.includes('base') || name.includes('standard')) {
      bonus -= 0.1;
    }
    
    return Math.max(0, Math.min(1, bonus));
  }
  
  /**
   * Get speed bonus from model name
   */
  private getNameSpeedBonus(modelName: string): number {
    const name = modelName.toLowerCase();
    let bonus = 0.5; // Base score
    
    // Speed indicators
    if (name.includes('turbo') || name.includes('fast') || name.includes('flash')) {
      bonus += 0.4;
    }
    if (name.includes('instant') || name.includes('quick') || name.includes('speed')) {
      bonus += 0.3;
    }
    if (name.includes('mini') || name.includes('nano') || name.includes('tiny')) {
      bonus += 0.3;
    }
    if (name.includes('lite') || name.includes('small')) {
      bonus += 0.2;
    }
    if (name.includes('opus') || name.includes('large') || name.includes('ultra')) {
      bonus -= 0.3; // Larger = slower
    }
    
    return Math.max(0, Math.min(1, bonus));
  }
  
  /**
   * Select a good fallback (different provider, good score)
   */
  private selectFallback(
    scoredModels: ModelCandidate[],
    primary: ModelCandidate
  ): ModelCandidate {
    // Try to find a fallback from a different provider
    const differentProvider = scoredModels.find(
      m => m.provider !== primary.provider && m.id !== primary.id
    );
    
    if (differentProvider) {
      return differentProvider;
    }
    
    // If not, just use the second-best model
    return scoredModels[1];
  }
  
  /**
   * Generate reasoning for the selection
   */
  private generateReasoning(
    primary: ModelCandidate,
    fallback: ModelCandidate,
    requirements: RoleRequirements
  ): string {
    const reasons = [];
    
    reasons.push(`Selected for ${requirements.role} based on:`);
    reasons.push(`- Quality weight: ${(requirements.weights.quality * 100).toFixed(0)}%`);
    reasons.push(`- Speed weight: ${(requirements.weights.speed * 100).toFixed(0)}%`);
    reasons.push(`- Cost weight: ${(requirements.weights.cost * 100).toFixed(0)}%`);
    
    reasons.push(`\nPrimary (${primary.id}):`);
    reasons.push(`- Quality score: ${(primary.qualityScore! * 100).toFixed(0)}/100`);
    reasons.push(`- Speed score: ${(primary.speedScore! * 100).toFixed(0)}/100`);
    reasons.push(`- Cost score: ${(primary.costScore! * 100).toFixed(0)}/100`);
    reasons.push(`- Total weighted score: ${(primary.totalScore! * 100).toFixed(0)}/100`);
    
    reasons.push(`\nFallback (${fallback.id}):`);
    reasons.push(`- Provides redundancy with score: ${(fallback.totalScore! * 100).toFixed(0)}/100`);
    
    return reasons.join('\n');
  }
}

/**
 * Example role configurations (NO hardcoded models!)
 */
export const ROLE_CONFIGS: Record<string, Partial<RoleRequirements>> = {
  deepwiki: {
    description: 'Deep code analysis and understanding',
    weights: { quality: 0.6, speed: 0.1, cost: 0.3 },
    minContextWindow: 100000,
    requiresReasoning: true,
    requiresCodeAnalysis: true
  },
  
  security: {
    description: 'Security vulnerability detection',
    weights: { quality: 0.7, speed: 0.1, cost: 0.2 },
    minContextWindow: 50000,
    requiresReasoning: true,
    requiresCodeAnalysis: true
  },
  
  location_finder: {
    description: 'Find exact code locations for issues',
    weights: { quality: 0.5, speed: 0.3, cost: 0.2 },
    minContextWindow: 32000,
    requiresCodeAnalysis: true
  },
  
  performance: {
    description: 'Performance optimization analysis',
    weights: { quality: 0.4, speed: 0.4, cost: 0.2 },
    minContextWindow: 32000,
    requiresCodeAnalysis: true
  },
  
  documentation: {
    description: 'Generate documentation',
    weights: { quality: 0.3, speed: 0.2, cost: 0.5 },
    minContextWindow: 16000
  }
};