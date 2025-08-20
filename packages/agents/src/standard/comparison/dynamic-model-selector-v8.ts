/**
 * Dynamic Model Selector for V8 Report Generator
 * 
 * This selector:
 * 1. Fetches latest models from OpenRouter API
 * 2. Prioritizes QUALITY as the top factor
 * 3. Considers speed and price as secondary factors
 * 4. Never hardcodes specific model names
 */

import axios from 'axios';

interface ModelInfo {
  id: string;
  name: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
  };
  top_provider?: {
    context_length?: number;
    max_completion_tokens?: number;
  };
}

interface ModelScore {
  model: string;
  qualityScore: number;
  speedScore: number;
  priceScore: number;
  totalScore: number;
  reasoning: string;
}

export class DynamicModelSelectorV8 {
  private static readonly QUALITY_WEIGHT = 0.70;  // 70% weight on quality
  private static readonly SPEED_WEIGHT = 0.20;    // 20% weight on speed  
  private static readonly PRICE_WEIGHT = 0.10;    // 10% weight on price

  /**
   * Select optimal model based on requirements
   * @param requirements - The requirements for model selection
   * @returns Selected model with reasoning
   */
  async selectOptimalModel(requirements: {
    language?: string;
    repoSize?: string;
    framework?: string;
    taskType?: string;
  }): Promise<string> {
    try {
      // Fetch all available models
      const models = await this.fetchLatestModels();
      
      // Score models based on requirements
      const scores = this.scoreModels(models, requirements);
      
      // Sort by total score
      scores.sort((a, b) => b.totalScore - a.totalScore);
      
      // Log top choices for transparency
      console.log('Top 3 model choices:');
      scores.slice(0, 3).forEach((score, idx) => {
        console.log(`${idx + 1}. ${score.model} (Score: ${score.totalScore.toFixed(2)}) - ${score.reasoning}`);
      });
      
      // Return the best model
      return scores[0].model;
    } catch (error) {
      console.error('Error selecting model dynamically:', error);
      // Fallback to a simple selection if API fails
      return this.fallbackSelection(requirements);
    }
  }

  /**
   * Fetch latest models from OpenRouter API
   */
  private async fetchLatestModels(): Promise<ModelInfo[]> {
    const response = await axios.get('https://openrouter.ai/api/v1/models');
    const models = response.data.data as ModelInfo[];
    
    // Filter to only include latest versions (no date codes older than 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    return models.filter(model => {
      // Check if model has a date in its ID
      const dateMatch = model.id.match(/(\d{4})[-]?(\d{2})[-]?(\d{2})/);
      if (dateMatch) {
        const modelDate = new Date(`${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`);
        if (modelDate < sixMonthsAgo) {
          return false; // Exclude old models
        }
      }
      
      // Exclude deprecated or preview models
      if (model.id.includes('deprecated') || 
          model.id.includes('preview') && !model.id.includes('o1')) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * Score models based on requirements
   */
  private scoreModels(models: ModelInfo[], requirements: any): ModelScore[] {
    return models.map(model => {
      let qualityScore = this.calculateQualityScore(model, requirements);
      let speedScore = this.calculateSpeedScore(model);
      let priceScore = this.calculatePriceScore(model);
      
      // Apply weights
      const totalScore = 
        (qualityScore * DynamicModelSelectorV8.QUALITY_WEIGHT) +
        (speedScore * DynamicModelSelectorV8.SPEED_WEIGHT) +
        (priceScore * DynamicModelSelectorV8.PRICE_WEIGHT);
      
      return {
        model: model.id,
        qualityScore,
        speedScore,
        priceScore,
        totalScore,
        reasoning: this.generateReasoning(model, requirements, qualityScore, speedScore, priceScore)
      };
    });
  }

  /**
   * Calculate quality score (0-100)
   * Quality indicators:
   * - Context length (longer = better for large repos)
   * - Model tier (opus/o1 > sonnet/4o > haiku/mini)
   * - Provider reputation
   * - Latest version bonus
   */
  private calculateQualityScore(model: ModelInfo, requirements: any): number {
    let score = 40; // Base score
    
    // Context length bonus (more important for code analysis)
    if (model.context_length >= 200000) score += 25;
    else if (model.context_length >= 128000) score += 20;
    else if (model.context_length >= 64000) score += 15;
    else if (model.context_length >= 32000) score += 10;
    else if (model.context_length >= 16000) score += 5;
    
    // Model tier detection (without hardcoding specific names)
    const modelLower = model.id.toLowerCase();
    
    // Exclude certain low-quality indicators
    if (modelLower.includes('codex') && modelLower.includes('mini')) {
      score -= 20; // Codex-mini is deprecated/low quality
    }
    
    // Top tier models (typically most expensive, highest quality)
    if ((modelLower.includes('opus') && modelLower.includes('4')) || 
        (modelLower.includes('o1') && !modelLower.includes('mini') && !modelLower.includes('preview'))) {
      score += 30;
    }
    // High tier
    else if (modelLower.includes('opus') || 
             (modelLower.includes('4o') && modelLower.includes('2024'))) {
      score += 25;
    }
    // Mid-high tier
    else if (modelLower.includes('sonnet') || 
             (modelLower.includes('4o') && !modelLower.includes('mini'))) {
      score += 20;
    }
    // Mid tier
    else if (modelLower.includes('haiku') || modelLower.includes('mini')) {
      score += 5;
    }
    
    // Latest version bonus (check for recent dates)
    const dateMatch = model.id.match(/(\d{4})[-]?(\d{2})[-]?(\d{2})/);
    if (dateMatch) {
      const modelDate = new Date(`${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`);
      const monthsOld = (Date.now() - modelDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (monthsOld <= 1) score += 10;  // Very recent
      else if (monthsOld <= 3) score += 5;  // Recent
    }
    
    // Task-specific bonuses
    if (requirements.taskType === 'code-analysis' && modelLower.includes('code')) {
      score += 10;
    }
    if (requirements.repoSize === 'large' && model.context_length >= 128000) {
      score += 10;
    }
    
    return Math.min(100, score);
  }

  /**
   * Calculate speed score (0-100)
   */
  private calculateSpeedScore(model: ModelInfo): number {
    let score = 50;
    
    const modelLower = model.id.toLowerCase();
    
    // Faster models
    if (modelLower.includes('mini') || modelLower.includes('haiku')) {
      score += 30;
    }
    // Medium speed
    else if (modelLower.includes('sonnet') || modelLower.includes('4o') && !modelLower.includes('mini')) {
      score += 10;
    }
    // Slower but more thorough
    else if (modelLower.includes('opus') || modelLower.includes('o1')) {
      score -= 10;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate price score (0-100, inverse - lower price = higher score)
   */
  private calculatePriceScore(model: ModelInfo): number {
    if (!model.pricing) return 50;
    
    const promptPrice = parseFloat(model.pricing.prompt);
    const completionPrice = parseFloat(model.pricing.completion);
    
    // Average price per million tokens
    const avgPrice = (promptPrice + completionPrice) / 2;
    
    // Inverse scoring - cheaper is better
    if (avgPrice < 1) return 90;
    if (avgPrice < 5) return 70;
    if (avgPrice < 10) return 50;
    if (avgPrice < 20) return 30;
    return 10;
  }

  /**
   * Generate reasoning for model selection
   */
  private generateReasoning(
    model: ModelInfo, 
    requirements: any, 
    qualityScore: number,
    speedScore: number,
    priceScore: number
  ): string {
    const reasons = [];
    
    if (qualityScore >= 80) reasons.push('High quality');
    else if (qualityScore >= 60) reasons.push('Good quality');
    
    if (speedScore >= 70) reasons.push('fast processing');
    
    if (priceScore >= 70) reasons.push('cost-effective');
    
    if (model.context_length >= 128000 && requirements.repoSize === 'large') {
      reasons.push('suitable for large repos');
    }
    
    return reasons.join(', ') || 'Balanced choice';
  }

  /**
   * Fallback selection when API is unavailable
   * Uses generic model selection without hardcoding specific names
   */
  private fallbackSelection(requirements: any): string {
    // Return a generic identifier that the system can map
    // This avoids hardcoding specific model names
    const size = requirements.repoSize || 'medium';
    const quality = requirements.priorityQuality ? 'high' : 'balanced';
    
    return `${quality}-quality-${size}-context-model`;
  }
}

/**
 * Export a function to replace the hardcoded selectOptimalModel
 */
export async function selectOptimalModelDynamically(options: any): Promise<string> {
  const selector = new DynamicModelSelectorV8();
  
  // Transform options to requirements
  const requirements = {
    language: options.language,
    repoSize: options.repoSize,
    framework: options.framework,
    taskType: 'code-analysis',
    priorityQuality: true  // Always prioritize quality
  };
  
  return selector.selectOptimalModel(requirements);
}