/**
 * Dynamic Model Evaluator
 * 
 * Evaluates models based on their metadata from OpenRouter without hardcoding
 * Uses AI to analyze model capabilities and make intelligent selections
 */

import { Logger } from 'winston';

export interface ModelMetrics {
  provider: string;
  model: string;
  pricing: {
    input: number;
    output: number;
  };
  context_length?: number;
  architecture?: {
    modality?: string;
    tokenizer?: string;
    instruct_type?: string;
    release_date?: string;
  };
  top_provider?: boolean;
  per_request_limits?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
}

export interface EvaluatedModel {
  id: string;
  provider: string;
  model: string;
  scores: {
    quality: number;
    speed: number;
    cost: number;
    freshness: number;
    contextWindow: number;
    composite: number;
  };
  metadata: {
    releaseDate?: Date;
    isPreview: boolean;
    isBeta: boolean;
    isDeprecated: boolean;
    modalityType: string;
  };
  reasoning: string[];
}

export class DynamicModelEvaluator {
  constructor(private logger: Logger) {}

  /**
   * Evaluate models dynamically based on their metadata
   */
  evaluateModels(models: ModelMetrics[]): EvaluatedModel[] {
    return models.map(model => this.evaluateModel(model));
  }

  /**
   * Evaluate a single model based on its metadata
   */
  private evaluateModel(model: ModelMetrics): EvaluatedModel {
    const modelId = `${model.provider}/${model.model}`;
    const reasoning: string[] = [];
    
    // Extract metadata
    const metadata = this.extractMetadata(model, reasoning);
    
    // Calculate scores dynamically
    const scores = {
      quality: this.inferQualityScore(model, metadata, reasoning),
      speed: this.inferSpeedScore(model, metadata, reasoning),
      cost: this.calculateCostScore(model, reasoning),
      freshness: this.calculateFreshnessScore(model, metadata, reasoning),
      contextWindow: this.calculateContextScore(model, reasoning),
      composite: 0 // Will be calculated after
    };
    
    return {
      id: modelId,
      provider: model.provider,
      model: model.model,
      scores,
      metadata,
      reasoning
    };
  }

  /**
   * Extract metadata from model info
   */
  private extractMetadata(model: ModelMetrics, reasoning: string[]): EvaluatedModel['metadata'] {
    const modelName = model.model.toLowerCase();
    
    // Detect preview/beta/deprecated status from name patterns
    const isPreview = modelName.includes('preview') || modelName.includes('exp');
    const isBeta = modelName.includes('beta') || modelName.includes('rc');
    const isDeprecated = modelName.includes('deprecated') || modelName.includes('legacy');
    
    // Parse release date if available
    let releaseDate: Date | undefined;
    if (model.architecture?.release_date) {
      releaseDate = new Date(model.architecture.release_date);
      reasoning.push(`Release date: ${releaseDate.toISOString().split('T')[0]}`);
    }
    
    // Determine modality type
    const modalityType = model.architecture?.modality || 'text';
    
    return {
      releaseDate,
      isPreview,
      isBeta,
      isDeprecated,
      modalityType
    };
  }

  /**
   * Infer quality score based on model metadata
   */
  private inferQualityScore(
    model: ModelMetrics,
    metadata: EvaluatedModel['metadata'],
    reasoning: string[]
  ): number {
    let score = 7.0; // Base score
    
    // Provider reputation (inferred from top_provider flag)
    if (model.top_provider) {
      score += 0.5;
      reasoning.push('Top provider: +0.5');
    }
    
    // Model size inference from name
    const modelName = model.model.toLowerCase();
    
    // Size indicators (larger models generally = higher quality)
    if (modelName.match(/\b(70b|65b|405b|175b)\b/)) {
      score += 1.5;
      reasoning.push('Extra large model: +1.5');
    } else if (modelName.match(/\b(40b|45b|30b|34b)\b/)) {
      score += 1.0;
      reasoning.push('Large model: +1.0');
    } else if (modelName.match(/\b(13b|20b|7b|8b)\b/)) {
      score += 0.5;
      reasoning.push('Medium model: +0.5');
    } else if (modelName.match(/\b(3b|1b|mini|nano|tiny)\b/)) {
      score -= 0.5;
      reasoning.push('Small model: -0.5');
    }
    
    // Generation indicators
    if (modelName.match(/\b(4\.5|3\.7|2\.5|v3|v4)\b/)) {
      score += 0.8;
      reasoning.push('Latest generation: +0.8');
    } else if (modelName.match(/\b(3\.5|2\.0|v2)\b/)) {
      score += 0.3;
      reasoning.push('Current generation: +0.3');
    } else if (modelName.match(/\b(1\.5|1\.0|v1)\b/)) {
      score -= 0.5;
      reasoning.push('Older generation: -0.5');
    }
    
    // Specialized capabilities
    if (modelName.includes('opus') || modelName.includes('ultra')) {
      score += 0.7;
      reasoning.push('Premium tier: +0.7');
    }
    
    // Instruction tuning
    if (model.architecture?.instruct_type || modelName.includes('instruct') || modelName.includes('chat')) {
      score += 0.3;
      reasoning.push('Instruction tuned: +0.3');
    }
    
    // Preview/beta penalty
    if (metadata.isPreview) {
      score -= 0.3;
      reasoning.push('Preview model: -0.3');
    }
    if (metadata.isBeta) {
      score -= 0.2;
      reasoning.push('Beta model: -0.2');
    }
    if (metadata.isDeprecated) {
      score -= 2.0;
      reasoning.push('Deprecated model: -2.0');
    }
    
    return Math.max(0, Math.min(10, score));
  }

  /**
   * Infer speed score based on model characteristics
   */
  private inferSpeedScore(
    model: ModelMetrics,
    metadata: EvaluatedModel['metadata'],
    reasoning: string[]
  ): number {
    let score = 7.0; // Base score
    const modelName = model.model.toLowerCase();
    
    // Speed optimized models
    if (modelName.includes('turbo') || modelName.includes('flash') || modelName.includes('fast')) {
      score += 2.0;
      reasoning.push('Speed optimized: +2.0');
    } else if (modelName.includes('mini') || modelName.includes('nano') || modelName.includes('tiny')) {
      score += 1.5;
      reasoning.push('Lightweight model: +1.5');
    }
    
    // Size-based speed inference (smaller = faster)
    if (modelName.match(/\b(1b|3b)\b/)) {
      score += 1.0;
      reasoning.push('Very small size: +1.0');
    } else if (modelName.match(/\b(7b|8b)\b/)) {
      score += 0.5;
      reasoning.push('Small size: +0.5');
    } else if (modelName.match(/\b(70b|65b|405b)\b/)) {
      score -= 2.0;
      reasoning.push('Very large size: -2.0');
    } else if (modelName.match(/\b(30b|34b|40b)\b/)) {
      score -= 1.0;
      reasoning.push('Large size: -1.0');
    }
    
    // Architecture-based inference
    if (modelName.includes('moe') || modelName.includes('mixture')) {
      score += 0.5;
      reasoning.push('MoE architecture: +0.5');
    }
    
    return Math.max(0, Math.min(10, score));
  }

  /**
   * Calculate cost score
   */
  private calculateCostScore(model: ModelMetrics, reasoning: string[]): number {
    const avgCost = (model.pricing.input + model.pricing.output) / 2;
    
    // Exponential decay scoring: very cheap models get high scores
    let score: number;
    if (avgCost <= 0.0001) { // $0.10 per million
      score = 10;
      reasoning.push('Ultra low cost: 10/10');
    } else if (avgCost <= 0.001) { // $1 per million
      score = 9;
      reasoning.push('Very low cost: 9/10');
    } else if (avgCost <= 0.005) { // $5 per million
      score = 8;
      reasoning.push('Low cost: 8/10');
    } else if (avgCost <= 0.01) { // $10 per million
      score = 7;
      reasoning.push('Moderate cost: 7/10');
    } else if (avgCost <= 0.02) { // $20 per million
      score = 6;
      reasoning.push('Medium cost: 6/10');
    } else if (avgCost <= 0.05) { // $50 per million
      score = 5;
      reasoning.push('High cost: 5/10');
    } else if (avgCost <= 0.1) { // $100 per million
      score = 4;
      reasoning.push('Very high cost: 4/10');
    } else {
      score = 3;
      reasoning.push('Premium cost: 3/10');
    }
    
    return score;
  }

  /**
   * Calculate freshness score based on release date
   */
  private calculateFreshnessScore(
    model: ModelMetrics,
    metadata: EvaluatedModel['metadata'],
    reasoning: string[]
  ): number {
    if (!metadata.releaseDate) {
      // No release date, use name patterns
      const modelName = model.model.toLowerCase();
      
      // Year patterns
      if (modelName.includes('2025') || modelName.includes('25')) {
        reasoning.push('2025 model indicated: 9/10 freshness');
        return 9;
      } else if (modelName.includes('2024') || modelName.includes('24')) {
        reasoning.push('2024 model indicated: 8/10 freshness');
        return 8;
      } else if (modelName.includes('2023') || modelName.includes('23')) {
        reasoning.push('2023 model indicated: 6/10 freshness');
        return 6;
      }
      
      // Version patterns (higher = newer)
      if (modelName.match(/\b(4\.5|4\.1|3\.7|3\.5)\b/)) {
        reasoning.push('Recent version number: 8/10 freshness');
        return 8;
      } else if (modelName.match(/\b(3\.0|2\.5|2\.0)\b/)) {
        reasoning.push('Current version number: 7/10 freshness');
        return 7;
      } else if (modelName.match(/\b(1\.5|1\.0)\b/)) {
        reasoning.push('Older version number: 5/10 freshness');
        return 5;
      }
      
      // Default
      reasoning.push('Unknown release date: 6/10 freshness');
      return 6;
    }
    
    const monthsOld = (Date.now() - metadata.releaseDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    
    if (monthsOld <= 1) {
      reasoning.push(`Brand new (${monthsOld.toFixed(1)} months): 10/10 freshness`);
      return 10;
    } else if (monthsOld <= 3) {
      reasoning.push(`Very fresh (${monthsOld.toFixed(1)} months): 9/10 freshness`);
      return 9;
    } else if (monthsOld <= 6) {
      reasoning.push(`Fresh (${monthsOld.toFixed(1)} months): 8/10 freshness`);
      return 8;
    } else if (monthsOld <= 9) {
      reasoning.push(`Mature (${monthsOld.toFixed(1)} months): 7/10 freshness`);
      return 7;
    } else if (monthsOld <= 12) {
      reasoning.push(`Older (${monthsOld.toFixed(1)} months): 6/10 freshness`);
      return 6;
    } else {
      reasoning.push(`Old (${monthsOld.toFixed(1)} months): 4/10 freshness`);
      return 4;
    }
  }

  /**
   * Calculate context window score
   */
  private calculateContextScore(model: ModelMetrics, reasoning: string[]): number {
    const context = model.context_length || 4096;
    
    if (context >= 1000000) {
      reasoning.push(`Huge context (${context}): 10/10`);
      return 10;
    } else if (context >= 200000) {
      reasoning.push(`Very large context (${context}): 9/10`);
      return 9;
    } else if (context >= 128000) {
      reasoning.push(`Large context (${context}): 8/10`);
      return 8;
    } else if (context >= 32000) {
      reasoning.push(`Good context (${context}): 7/10`);
      return 7;
    } else if (context >= 16000) {
      reasoning.push(`Moderate context (${context}): 6/10`);
      return 6;
    } else if (context >= 8000) {
      reasoning.push(`Basic context (${context}): 5/10`);
      return 5;
    } else {
      reasoning.push(`Limited context (${context}): 4/10`);
      return 4;
    }
  }

  /**
   * Calculate composite score for a specific role
   */
  calculateCompositeScore(
    model: EvaluatedModel,
    weights: {
      quality: number;
      speed: number;
      cost: number;
      freshness: number;
      contextWindow: number;
    }
  ): number {
    const scores = model.scores;
    
    // Apply freshness as a multiplier to quality
    const effectiveQuality = scores.quality * (0.7 + 0.3 * (scores.freshness / 10));
    
    const composite = 
      effectiveQuality * weights.quality +
      scores.speed * weights.speed +
      scores.cost * weights.cost +
      scores.contextWindow * weights.contextWindow;
    
    model.scores.composite = composite;
    model.reasoning.push(
      `Composite: ${composite.toFixed(2)} = ` +
      `Q:${effectiveQuality.toFixed(1)}×${weights.quality} + ` +
      `S:${scores.speed}×${weights.speed} + ` +
      `C:${scores.cost}×${weights.cost} + ` +
      `CTX:${scores.contextWindow}×${weights.contextWindow}`
    );
    
    return composite;
  }
}

/**
 * Role-specific weight profiles
 */
export const DYNAMIC_ROLE_WEIGHTS = {
  deepwiki: {
    quality: 0.45,
    speed: 0.20,
    cost: 0.25,
    freshness: 0.05,
    contextWindow: 0.05
  },
  researcher: {
    quality: 0.40,
    speed: 0.15,
    cost: 0.35,
    freshness: 0.05,
    contextWindow: 0.05
  },
  security: {
    quality: 0.55,
    speed: 0.15,
    cost: 0.20,
    freshness: 0.05,
    contextWindow: 0.05
  },
  architecture: {
    quality: 0.50,
    speed: 0.15,
    cost: 0.20,
    freshness: 0.05,
    contextWindow: 0.10
  },
  performance: {
    quality: 0.40,
    speed: 0.30,
    cost: 0.20,
    freshness: 0.05,
    contextWindow: 0.05
  },
  code_quality: {
    quality: 0.45,
    speed: 0.20,
    cost: 0.25,
    freshness: 0.05,
    contextWindow: 0.05
  },
  dependencies: {
    quality: 0.35,
    speed: 0.25,
    cost: 0.30,
    freshness: 0.05,
    contextWindow: 0.05
  },
  documentation: {
    quality: 0.35,
    speed: 0.20,
    cost: 0.35,
    freshness: 0.05,
    contextWindow: 0.05
  },
  testing: {
    quality: 0.35,
    speed: 0.25,
    cost: 0.30,
    freshness: 0.05,
    contextWindow: 0.05
  },
  translator: {
    quality: 0.40,
    speed: 0.25,
    cost: 0.25,
    freshness: 0.05,
    contextWindow: 0.05
  }
};