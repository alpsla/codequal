/**
 * Simple Model Freshness Validator
 * 
 * Uses version numbers to determine freshness - no hardcoded lists
 * Just checks if model version is recent based on numeric comparison
 */

import { createLogger } from '@codequal/core';

const logger = createLogger('SimpleFreshnessValidator');

export interface ModelInfo {
  id: string;
  provider: string;
  model: string;
  context_length?: number;
  pricing?: any;
}

export class SimpleFreshnessValidator {
  
  /**
   * Determine if a model is fresh based on version number
   * Higher version = fresher model
   */
  isModelFresh(model: ModelInfo): boolean {
    const modelId = model.id.toLowerCase();
    const [provider, ...modelParts] = modelId.split('/');
    const modelName = modelParts.join('/');
    
    // Extract version number from model name
    const version = this.extractVersion(modelName);
    
    // Determine minimum fresh version by provider
    const minFreshVersion = this.getMinFreshVersion(provider);
    
    // Compare versions
    const isFresh = version >= minFreshVersion;
    
    if (isFresh) {
      logger.info(`✅ Model ${model.id} is fresh (version ${version} >= ${minFreshVersion})`);
    } else {
      logger.debug(`❌ Model ${model.id} is outdated (version ${version} < ${minFreshVersion})`);
    }
    
    return isFresh;
  }
  
  /**
   * Extract version number from model name
   * Examples:
   * - claude-opus-4.1 -> 4.1
   * - gpt-5 -> 5.0
   * - gemini-2.5-pro -> 2.5
   * - claude-3.5-sonnet -> 3.5
   */
  private extractVersion(modelName: string): number {
    // Match patterns like 4.1, 3.5, 2.0, 5, etc.
    const patterns = [
      /(\d+\.\d+)/,  // Matches 4.1, 3.5, 2.5
      /(\d+)(?![\d.])/,  // Matches single digit like 5, 4
      /-(\d+)$/,  // Matches version at end like -4
    ];
    
    for (const pattern of patterns) {
      const match = modelName.match(pattern);
      if (match) {
        return parseFloat(match[1]);
      }
    }
    
    // If no version found, assume it's old
    return 0;
  }
  
  /**
   * Get minimum version considered "fresh" for each provider
   * This is dynamic - we consider roughly the latest 2 major versions as fresh
   */
  private getMinFreshVersion(provider: string): number {
    switch (provider) {
      case 'anthropic':
        // Claude 4.x and 3.5+ are fresh
        return 3.5;
      
      case 'openai':
        // GPT-4+ are fresh
        return 4.0;
      
      case 'google':
        // Gemini 2.0+ are fresh
        return 2.0;
      
      case 'meta':
        // Llama 3+ are fresh
        return 3.0;
      
      case 'mistral':
        // Latest versions
        return 2.0;
      
      default:
        // For other providers, consider recent versions
        return 1.0;
    }
  }
  
  /**
   * Filter models to only include fresh ones
   */
  filterFreshModels(models: ModelInfo[]): ModelInfo[] {
    return models.filter(model => this.isModelFresh(model));
  }
  
  /**
   * Get the best models by version number
   */
  getBestModelsByVersion(models: ModelInfo[]): ModelInfo[] {
    // Group by provider
    const byProvider = new Map<string, ModelInfo[]>();
    
    for (const model of models) {
      const provider = model.id.split('/')[0];
      if (!byProvider.has(provider)) {
        byProvider.set(provider, []);
      }
      byProvider.get(provider)!.push(model);
    }
    
    // Get best from each provider
    const best: ModelInfo[] = [];
    
    for (const [provider, providerModels] of byProvider) {
      // Sort by version (extracted from model name)
      const sorted = providerModels.sort((a, b) => {
        const versionA = this.extractVersion(a.model || a.id);
        const versionB = this.extractVersion(b.model || b.id);
        return versionB - versionA; // Descending order
      });
      
      // Take top 2 from each provider
      best.push(...sorted.slice(0, 2));
    }
    
    return best;
  }
  
  /**
   * Simple scoring based on version and capabilities
   */
  scoreModel(model: ModelInfo): number {
    let score = 0;
    
    const modelName = model.model || model.id.split('/')[1];
    const version = this.extractVersion(modelName);
    const provider = model.id.split('/')[0];
    
    // Version scoring (higher = better)
    score += version * 10;
    
    // Context window bonus
    if (model.context_length) {
      if (model.context_length >= 1000000) score += 30;
      else if (model.context_length >= 200000) score += 20;
      else if (model.context_length >= 128000) score += 10;
      else if (model.context_length >= 32000) score += 5;
    }
    
    // Provider reputation bonus
    if (['anthropic', 'openai', 'google'].includes(provider)) {
      score += 10;
    }
    
    // Model type bonus
    if (modelName.includes('opus')) score += 15;  // Most capable
    if (modelName.includes('pro')) score += 10;   // Pro versions
    if (modelName.includes('sonnet')) score += 8; // Balanced
    if (modelName.includes('chat')) score += 5;   // Chat optimized
    
    return score;
  }
}

export const simpleFreshnessValidator = new SimpleFreshnessValidator();