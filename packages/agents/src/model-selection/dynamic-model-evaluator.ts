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
  evaluateModels(models: ModelMetrics[], latestModels?: string[]): EvaluatedModel[] {
    return models.map(model => this.evaluateModel(model, latestModels));
  }

  /**
   * Evaluate a single model based on its metadata
   */
  private evaluateModel(model: ModelMetrics, latestModels?: string[]): EvaluatedModel {
    const modelId = `${model.provider}/${model.model}`;
    const reasoning: string[] = [];
    
    // Check if this is one of the web-discovered latest models
    const isLatestFromWeb = latestModels?.includes(modelId);
    if (isLatestFromWeb) {
      reasoning.push('🌟 WEB-VERIFIED LATEST MODEL - Priority selection');
    }
    
    // Extract metadata
    const metadata = this.extractMetadata(model, reasoning);
    
    // Calculate scores dynamically
    const scores = {
      quality: this.inferQualityScore(model, metadata, reasoning),
      speed: this.inferSpeedScore(model, metadata, reasoning),
      cost: this.calculateCostScore(model, reasoning),
      freshness: isLatestFromWeb ? 10 : this.calculateFreshnessScore(model, metadata, reasoning),
      contextWindow: this.calculateContextScore(model, reasoning),
      composite: 0 // Will be calculated after
    };
    
    // Boost quality score for web-verified latest models
    if (isLatestFromWeb) {
      scores.quality = Math.min(10, scores.quality + 2);
      reasoning.push(`Quality boosted +2 for web-verified latest model`);
    }
    
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
    
    // Generation indicators - Extract and compare version numbers
    const versionMatch = modelName.match(/(?:claude-|gemini-|gpt-)?([0-9]+(?:\.[0-9]+)?)/);
    if (versionMatch) {
      const version = parseFloat(versionMatch[1]);
      
      // Claude versions
      if (modelName.includes('claude')) {
        if (version >= 4.0 || modelName.includes('sonnet-4')) {
          score += 1.5;
          reasoning.push(`Claude ${version >= 4.0 ? version : '4'}: +1.5 (latest generation)`);
        } else if (version >= 3.5) {
          score += 0.8;
          reasoning.push(`Claude ${version}: +0.8 (current generation)`);
        } else if (version >= 3.0) {
          score += 0.3;
          reasoning.push(`Claude ${version}: +0.3 (previous generation)`);
        } else {
          score -= 0.5;
          reasoning.push(`Claude ${version}: -0.5 (old generation)`);
        }
      }
      // Gemini versions
      else if (modelName.includes('gemini')) {
        if (version >= 2.5) {
          score += 1.5;
          reasoning.push(`Gemini ${version}: +1.5 (latest generation)`);
        } else if (version >= 2.0) {
          score += 0.8;
          reasoning.push(`Gemini ${version}: +0.8 (current generation)`);
        } else if (version >= 1.5) {
          score += 0.3;
          reasoning.push(`Gemini ${version}: +0.3 (previous generation)`);
        } else {
          score -= 0.5;
          reasoning.push(`Gemini ${version}: -0.5 (old generation)`);
        }
      }
      // GPT versions
      else if (modelName.includes('gpt')) {
        if (version >= 4.5) {
          score += 1.5;
          reasoning.push(`GPT ${version}: +1.5 (latest generation)`);
        } else if (version >= 4.0) {
          score += 0.8;
          reasoning.push(`GPT ${version}: +0.8 (current generation)`);
        } else if (version >= 3.5) {
          score += 0.3;
          reasoning.push(`GPT ${version}: +0.3 (previous generation)`);
        } else {
          score -= 0.5;
          reasoning.push(`GPT ${version}: -0.5 (old generation)`);
        }
      }
      // Generic version scoring for other models
      else {
        if (version >= 4.0) {
          score += 1.2;
          reasoning.push(`Version ${version}: +1.2 (latest)`);
        } else if (version >= 3.0) {
          score += 0.6;
          reasoning.push(`Version ${version}: +0.6 (current)`);
        } else if (version >= 2.0) {
          score += 0.3;
          reasoning.push(`Version ${version}: +0.3 (recent)`);
        }
      }
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
    const modelName = model.model.toLowerCase();
    
    if (!metadata.releaseDate) {
      // Check for date patterns in model name
      const dateMatch = modelName.match(/20(\d{2})(\d{2})(\d{2})/);
      if (dateMatch) {
        const year = parseInt('20' + dateMatch[1]);
        const month = parseInt(dateMatch[2]);
        const modelDate = new Date(year, month - 1, 1);
        const monthsOld = (Date.now() - modelDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
        metadata.releaseDate = modelDate;
        // Fall through to date-based calculation
      } else {
        // Year patterns
        if (modelName.includes('2025') || modelName.includes('-25')) {
          reasoning.push('2025 model: 9/10 freshness');
          return 9;
        } else if (modelName.includes('2024') || modelName.includes('-24')) {
          // Check if it's late 2024
          if (modelName.includes('1022') || modelName.includes('11') || modelName.includes('12')) {
            reasoning.push('Late 2024 model: 8/10 freshness');
            return 8;
          }
          reasoning.push('2024 model: 6/10 freshness');
          return 6;
        } else if (modelName.includes('2023') || modelName.includes('-23')) {
          reasoning.push('⚠️ 2023 model (outdated): 3/10 freshness');
          return 3;
        }
        
        // Version patterns (higher = newer)
        if (modelName.match(/\b(4\.5|4\.1|3\.7)\\b/)) {
          reasoning.push('High version number: 8/10 freshness');
          return 8;
        } else if (modelName.match(/\b(3\.5|3\.0|2\.5)\\b/)) {
          reasoning.push('Medium version number: 6/10 freshness');
          return 6;
        } else if (modelName.match(/\b(2\.0|1\.5|1\.0)\\b/)) {
          reasoning.push('⚠️ Low version number: 4/10 freshness');
          return 4;
        }
        
        // Default - assume it's old if we can't identify it
        reasoning.push('⚠️ Unknown release date (likely old): 4/10 freshness');
        return 4;
      }
    }
    
    const monthsOld = (Date.now() - metadata.releaseDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    
    // ULTRA STRICT freshness requirements - only latest models
    if (monthsOld <= 1) {
      reasoning.push(`✅ Brand new (${monthsOld.toFixed(1)} months): 10/10 freshness`);
      return 10;
    } else if (monthsOld <= 2) {
      reasoning.push(`✅ Very fresh (${monthsOld.toFixed(1)} months): 9/10 freshness`);
      return 9;
    } else if (monthsOld <= 3) {
      reasoning.push(`Acceptable (${monthsOld.toFixed(1)} months): 7/10 freshness`);
      return 7;
    } else if (monthsOld <= 4) {
      reasoning.push(`⚠️ Getting old (${monthsOld.toFixed(1)} months): 4/10 freshness`);
      return 4;
    } else if (monthsOld <= 6) {
      reasoning.push(`❌ OLD (${monthsOld.toFixed(1)} months): 2/10 freshness`);
      return 2;
    } else {
      reasoning.push(`❌ UNACCEPTABLE (${monthsOld.toFixed(1)} months): 0/10 freshness`);
      return 0;
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
    
    // Apply freshness as an EXTREME multiplier to quality
    // Models with low freshness get MASSIVELY penalized
    let freshnessMultiplier: number;
    if (scores.freshness === 0) {
      freshnessMultiplier = 0; // Completely unusable if older than 6 months
    } else if (scores.freshness < 3) {
      freshnessMultiplier = 0.1; // 10% quality for very old models (4-6 months)
    } else if (scores.freshness < 5) {
      freshnessMultiplier = 0.3; // 30% quality for old models (3-4 months)  
    } else if (scores.freshness < 7) {
      freshnessMultiplier = 0.6; // 60% quality for borderline models (2-3 months)
    } else {
      freshnessMultiplier = 1.0; // Full quality only for models <2 months old
    }
    const effectiveQuality = scores.quality * freshnessMultiplier;
    
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
    quality: 0.60,      // CRITICAL - Deep code understanding essential
    speed: 0.05,        // Can be slow, runs in background
    cost: 0.20,         // Some cost sensitivity for high volume
    freshness: 0.15,    // Keep freshness consistent
    contextWindow: 0.00
  },
  researcher: {
    quality: 0.55,      // HIGH - Needs to find accurate information
    speed: 0.10,        // Moderate speed needed
    cost: 0.20,         // Cost matters for frequent queries
    freshness: 0.15,    // Keep freshness consistent
    contextWindow: 0.00
  },
  security: {
    quality: 0.60,      // CRITICAL - Security accuracy paramount
    speed: 0.05,        // Can take time for thorough analysis
    cost: 0.20,         // Worth paying for security
    freshness: 0.15,    // Keep freshness consistent
    contextWindow: 0.00
  },
  architecture: {
    quality: 0.55,      // HIGH - Architectural decisions critical
    speed: 0.10,        // Can take time to analyze
    cost: 0.20,         // Worth investment
    freshness: 0.15,    // Keep freshness consistent
    contextWindow: 0.00
  },
  performance: {
    quality: 0.40,      // MODERATE - Balance with speed
    speed: 0.25,        // Speed important for perf analysis
    cost: 0.20,         // Cost conscious
    freshness: 0.15,    // Keep freshness consistent
    contextWindow: 0.00
  },
  code_quality: {
    quality: 0.50,      // HIGH - Accuracy important
    speed: 0.15,        // Moderate speed needed
    cost: 0.20,         // Balanced cost
    freshness: 0.15,    // Keep freshness consistent
    contextWindow: 0.00
  },
  dependencies: {
    quality: 0.35,      // MODERATE - Basic accuracy sufficient
    speed: 0.20,        // Should be reasonably fast
    cost: 0.30,         // Cost sensitive for frequent checks
    freshness: 0.15,    // Keep freshness consistent
    contextWindow: 0.00
  },
  documentation: {
    quality: 0.30,      // LOW - Basic clarity sufficient
    speed: 0.15,        // Moderate speed
    cost: 0.40,         // Very cost sensitive
    freshness: 0.15,    // Keep freshness consistent
    contextWindow: 0.00
  },
  testing: {
    quality: 0.50,      // HIGH - Test accuracy crucial
    speed: 0.15,        // Can take time
    cost: 0.20,         // Worth the investment
    freshness: 0.15,    // Keep freshness consistent
    contextWindow: 0.00
  },
  translator: {
    quality: 0.35,      // MODERATE - Basic translation sufficient
    speed: 0.25,        // Should be fast
    cost: 0.25,         // Cost conscious
    freshness: 0.15,    // Keep freshness consistent
    contextWindow: 0.00
  },
  location_finder: {
    quality: 0.65,      // HIGHEST - Must find exact locations
    speed: 0.05,        // Can take time for accuracy
    cost: 0.15,         // Worth paying for precision
    freshness: 0.15,    // Keep freshness consistent
    contextWindow: 0.00
  },
  educational: {
    quality: 0.25,      // LOW - Just needs to find resources
    speed: 0.20,        // Should be reasonably quick
    cost: 0.40,         // VERY cost sensitive - high volume
    freshness: 0.15,    // Keep freshness consistent
    contextWindow: 0.00
  },
  orchestrator: {
    quality: 0.45,      // MODERATE - Routing decisions
    speed: 0.20,        // Needs to be fast for routing
    cost: 0.20,         // Balanced cost
    freshness: 0.15,    // Keep freshness consistent
    contextWindow: 0.00
  },
  report_generation: {
    quality: 0.40,      // MODERATE - Clear reporting
    speed: 0.15,        // Can take some time
    cost: 0.30,         // Cost sensitive
    freshness: 0.15,    // Keep freshness consistent
    contextWindow: 0.00
  }
};