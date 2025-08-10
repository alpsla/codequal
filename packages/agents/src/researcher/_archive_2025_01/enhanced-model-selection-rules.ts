/**
 * Enhanced Model Selection Rules for Researcher Agent
 * 
 * This module implements sophisticated decision logic for selecting AI models,
 * considering factors beyond simple scoring including stability, ROI, and marginal improvements.
 */

export interface ModelMetadata {
  id: string;
  provider: string;
  model: string;
  version?: string;
  status?: 'stable' | 'preview' | 'beta' | 'deprecated' | 'experimental';
  releaseDate?: Date;
  deprecationDate?: Date;
  knownIssues?: string[];
}

export interface ModelCosts {
  inputCostPerMillion: number;
  outputCostPerMillion: number;
  averageCostPerMillion: number;
  estimatedMonthlyTokens?: number;
  monthlyCost?: number;
}

export interface ModelCapabilities {
  quality: number; // 0-10
  speed: number; // 0-10
  contextWindow: number;
  reasoning: number; // 0-10
  codeQuality: number; // 0-10
  multimodal?: boolean;
  functionCalling?: boolean;
}

export interface ModelSelectionContext {
  agentRole: string;
  taskComplexity: 'simple' | 'moderate' | 'complex';
  budgetConstraints?: {
    maxMonthlyCost?: number;
    maxCostPerMillion?: number;
  };
  performanceRequirements?: {
    minQuality?: number;
    minSpeed?: number;
    minContextWindow?: number;
  };
  stabilityRequirement: 'production' | 'experimental_ok';
}

export interface ModelEvaluation {
  model: ModelMetadata;
  costs: ModelCosts;
  capabilities: ModelCapabilities;
  compositeScore: number;
  adjustedScore: number;
  risks: Risk[];
  recommendations: string[];
  decisionFactors: DecisionFactor[];
}

export interface Risk {
  type: 'stability' | 'cost' | 'performance' | 'deprecation';
  severity: 'low' | 'medium' | 'high';
  description: string;
  mitigation?: string;
}

export interface DecisionFactor {
  factor: string;
  weight: number;
  score: number;
  reasoning: string;
}

/**
 * Enhanced Model Selection Rules Engine
 */
export class ModelSelectionRules {
  // Configuration thresholds
  private static readonly THRESHOLDS = {
    // Score differences
    MARGINAL_SCORE_DIFFERENCE: 0.1, // Less than 1% difference
    SIGNIFICANT_SCORE_DIFFERENCE: 0.5, // More than 5% difference
    
    // Cost thresholds
    ACCEPTABLE_COST_INCREASE: 0.15, // 15% cost increase
    HIGH_COST_INCREASE: 0.30, // 30% cost increase
    
    // Time thresholds
    PREVIEW_MATURITY_DAYS: 30, // Days before preview is considered mature
    DEPRECATION_WARNING_DAYS: 90, // Days before deprecation to warn
    
    // Performance thresholds
    MIN_QUALITY_SCORE: 7.0,
    MIN_SPEED_SCORE: 6.0,
    
    // ROI thresholds
    MIN_ROI_FOR_UPGRADE: 1.5, // 1.5x improvement per dollar spent
  };

  /**
   * Enhanced model evaluation with sophisticated decision logic
   */
  static evaluateModel(
    model: ModelMetadata,
    costs: ModelCosts,
    capabilities: ModelCapabilities,
    context: ModelSelectionContext
  ): ModelEvaluation {
    const risks: Risk[] = [];
    const recommendations: string[] = [];
    const decisionFactors: DecisionFactor[] = [];
    
    // 1. Calculate base composite score
    const weights = this.getContextualWeights(context);
    const compositeScore = this.calculateCompositeScore(capabilities, costs, weights);
    
    // 2. Evaluate stability risks
    const stabilityPenalty = this.evaluateStabilityRisk(model, context, risks, decisionFactors);
    
    // 3. Evaluate cost efficiency
    const costEfficiency = this.evaluateCostEfficiency(costs, context, risks, decisionFactors);
    
    // 4. Check for deprecation
    const deprecationPenalty = this.evaluateDeprecationRisk(model, risks, decisionFactors);
    
    // 5. Calculate adjusted score
    const adjustedScore = compositeScore * (1 - stabilityPenalty) * (1 - deprecationPenalty) * costEfficiency;
    
    // 6. Generate recommendations
    this.generateRecommendations(model, costs, capabilities, context, recommendations);
    
    return {
      model,
      costs,
      capabilities,
      compositeScore,
      adjustedScore,
      risks,
      recommendations,
      decisionFactors
    };
  }

  /**
   * Compare two models with sophisticated decision logic
   */
  static compareModels(
    modelA: ModelEvaluation,
    modelB: ModelEvaluation,
    context: ModelSelectionContext
  ): {
    winner: ModelEvaluation;
    reasoning: string[];
    shouldUpgrade: boolean;
  } {
    const reasoning: string[] = [];
    
    // 1. Check if score difference is marginal
    const scoreDiff = Math.abs(modelA.adjustedScore - modelB.adjustedScore);
    const isMarginal = scoreDiff < this.THRESHOLDS.MARGINAL_SCORE_DIFFERENCE;
    
    if (isMarginal) {
      reasoning.push(`Score difference (${scoreDiff.toFixed(3)}) is marginal - applying additional criteria`);
      
      // 2. Apply tie-breaking rules for marginal differences
      return this.applyTieBreakingRules(modelA, modelB, context, reasoning);
    }
    
    // 3. Significant difference - check ROI
    const higherScorer = modelA.adjustedScore > modelB.adjustedScore ? modelA : modelB;
    const lowerScorer = modelA.adjustedScore > modelB.adjustedScore ? modelB : modelA;
    
    if (higherScorer.costs.averageCostPerMillion > lowerScorer.costs.averageCostPerMillion) {
      // Higher scorer is more expensive - check ROI
      const roi = this.calculateROI(higherScorer, lowerScorer);
      
      if (roi < this.THRESHOLDS.MIN_ROI_FOR_UPGRADE) {
        reasoning.push(`Higher scorer ROI (${roi.toFixed(2)}x) below threshold (${this.THRESHOLDS.MIN_ROI_FOR_UPGRADE}x)`);
        reasoning.push('Selecting lower scorer for better value');
        return {
          winner: lowerScorer,
          reasoning,
          shouldUpgrade: false
        };
      }
    }
    
    reasoning.push(`Clear winner with ${scoreDiff.toFixed(3)} point advantage`);
    return {
      winner: higherScorer,
      reasoning,
      shouldUpgrade: higherScorer !== modelA
    };
  }

  /**
   * Get contextual weights based on use case
   */
  private static getContextualWeights(context: ModelSelectionContext): Record<string, number> {
    const baseWeights = {
      quality: 0.3,
      cost: 0.3,
      speed: 0.2,
      stability: 0.1,
      contextWindow: 0.1
    };
    
    // Adjust weights based on context
    switch (context.agentRole) {
      case 'researcher':
        // Researcher needs balance of cost and quality
        baseWeights.cost = 0.4;
        baseWeights.quality = 0.4;
        baseWeights.speed = 0.2;
        break;
        
      case 'security':
      case 'architecture':
        // High-stakes agents need quality
        baseWeights.quality = 0.5;
        baseWeights.cost = 0.2;
        baseWeights.stability = 0.2;
        break;
        
      case 'documentation':
      case 'testing':
        // Lower-stakes agents prioritize cost
        baseWeights.cost = 0.5;
        baseWeights.quality = 0.3;
        break;
    }
    
    // Adjust for budget constraints
    if (context.budgetConstraints?.maxMonthlyCost) {
      baseWeights.cost += 0.1;
      baseWeights.quality -= 0.1;
    }
    
    return baseWeights;
  }

  /**
   * Calculate composite score with enhanced formula
   */
  private static calculateCompositeScore(
    capabilities: ModelCapabilities,
    costs: ModelCosts,
    weights: Record<string, number>
  ): number {
    // Enhanced cost scoring with better sensitivity
    const costScore = this.calculateCostScore(costs.averageCostPerMillion);
    
    const scores = {
      quality: capabilities.quality,
      cost: costScore,
      speed: capabilities.speed,
      contextWindow: Math.min(10, capabilities.contextWindow / 100000), // 10 points per 100k tokens
      stability: 10 // Will be adjusted based on status
    };
    
    let totalScore = 0;
    for (const [metric, weight] of Object.entries(weights)) {
      totalScore += ((scores as any)[metric] || 0) * weight;
    }
    
    return totalScore;
  }

  /**
   * Enhanced cost scoring with logarithmic scale for better sensitivity
   */
  private static calculateCostScore(costPerMillion: number): number {
    // Logarithmic scale: $0.01 = 10, $0.1 = 9, $1 = 8, $10 = 7, $100 = 6
    if (costPerMillion <= 0.01) return 10;
    if (costPerMillion >= 100) return 0;
    
    // Logarithmic scaling for better differentiation
    const logCost = Math.log10(costPerMillion);
    const score = 10 - ((logCost + 2) * 2.5); // Maps $0.01-$100 to 10-0
    
    return Math.max(0, Math.min(10, score));
  }

  /**
   * Evaluate stability risk with nuanced logic
   */
  private static evaluateStabilityRisk(
    model: ModelMetadata,
    context: ModelSelectionContext,
    risks: Risk[],
    factors: DecisionFactor[]
  ): number {
    let penalty = 0;
    
    if (model.status === 'preview' || model.status === 'beta') {
      const daysSinceRelease = model.releaseDate ? 
        (Date.now() - model.releaseDate.getTime()) / (1000 * 60 * 60 * 24) : 0;
      
      if (context.stabilityRequirement === 'production') {
        if (daysSinceRelease < this.THRESHOLDS.PREVIEW_MATURITY_DAYS) {
          penalty = 0.2; // 20% penalty for immature preview
          risks.push({
            type: 'stability',
            severity: 'medium',
            description: `Model in ${model.status} status for only ${Math.floor(daysSinceRelease)} days`,
            mitigation: 'Wait for stable release or use with caution'
          });
        } else {
          penalty = 0.1; // 10% penalty for mature preview
          risks.push({
            type: 'stability',
            severity: 'low',
            description: `Model in ${model.status} status but mature (${Math.floor(daysSinceRelease)} days)`,
            mitigation: 'Monitor for stable release'
          });
        }
      }
      
      factors.push({
        factor: 'stability',
        weight: 0.1,
        score: 10 * (1 - penalty),
        reasoning: `${model.status} status reduces stability score`
      });
    }
    
    if (model.status === 'experimental') {
      penalty = 0.3; // 30% penalty
      risks.push({
        type: 'stability',
        severity: 'high',
        description: 'Experimental model - high risk of changes',
        mitigation: 'Only use for non-critical tasks'
      });
    }
    
    return penalty;
  }

  /**
   * Evaluate cost efficiency with ROI consideration
   */
  private static evaluateCostEfficiency(
    costs: ModelCosts,
    context: ModelSelectionContext,
    risks: Risk[],
    factors: DecisionFactor[]
  ): number {
    let efficiency = 1.0;
    
    // Check against budget constraints
    if (context.budgetConstraints) {
      if (costs.monthlyCost && context.budgetConstraints.maxMonthlyCost) {
        if (costs.monthlyCost > context.budgetConstraints.maxMonthlyCost) {
          efficiency *= 0.5; // 50% penalty for exceeding budget
          risks.push({
            type: 'cost',
            severity: 'high',
            description: `Monthly cost ($${costs.monthlyCost.toFixed(2)}) exceeds budget ($${context.budgetConstraints.maxMonthlyCost})`,
            mitigation: 'Consider lower-cost alternatives or adjust budget'
          });
        }
      }
    }
    
    factors.push({
      factor: 'cost_efficiency',
      weight: 0.3,
      score: efficiency * 10,
      reasoning: `Cost efficiency based on budget constraints`
    });
    
    return efficiency;
  }

  /**
   * Evaluate deprecation risk
   */
  private static evaluateDeprecationRisk(
    model: ModelMetadata,
    risks: Risk[],
    factors: DecisionFactor[]
  ): number {
    let penalty = 0;
    
    if (model.status === 'deprecated') {
      penalty = 0.5; // 50% penalty
      risks.push({
        type: 'deprecation',
        severity: 'high',
        description: 'Model is deprecated',
        mitigation: 'Migrate to recommended alternative immediately'
      });
    } else if (model.deprecationDate) {
      const daysUntilDeprecation = (model.deprecationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      
      if (daysUntilDeprecation < this.THRESHOLDS.DEPRECATION_WARNING_DAYS) {
        penalty = 0.2; // 20% penalty
        risks.push({
          type: 'deprecation',
          severity: 'medium',
          description: `Model deprecating in ${Math.floor(daysUntilDeprecation)} days`,
          mitigation: 'Plan migration to alternative'
        });
      }
    }
    
    // Check for old model patterns
    if (model.model.includes('0613') || model.model.includes('0314')) {
      penalty = Math.max(penalty, 0.1); // At least 10% penalty
      risks.push({
        type: 'deprecation',
        severity: 'low',
        description: 'Model uses old versioning pattern',
        mitigation: 'Consider newer versions'
      });
    }
    
    return penalty;
  }

  /**
   * Calculate ROI for model upgrade
   */
  private static calculateROI(
    higherScorer: ModelEvaluation,
    lowerScorer: ModelEvaluation
  ): number {
    const qualityImprovement = higherScorer.capabilities.quality - lowerScorer.capabilities.quality;
    const costIncrease = higherScorer.costs.averageCostPerMillion / lowerScorer.costs.averageCostPerMillion;
    
    // ROI = Quality improvement per unit of cost increase
    return qualityImprovement / (costIncrease - 1);
  }

  /**
   * Apply sophisticated tie-breaking rules
   */
  private static applyTieBreakingRules(
    modelA: ModelEvaluation,
    modelB: ModelEvaluation,
    context: ModelSelectionContext,
    reasoning: string[]
  ): {
    winner: ModelEvaluation;
    reasoning: string[];
    shouldUpgrade: boolean;
  } {
    // Rule 1: Prefer stable over preview
    if (modelA.model.status === 'stable' && modelB.model.status !== 'stable') {
      reasoning.push('Tie-breaker: Preferring stable model over preview/beta');
      return { winner: modelA, reasoning, shouldUpgrade: false };
    }
    if (modelB.model.status === 'stable' && modelA.model.status !== 'stable') {
      reasoning.push('Tie-breaker: Preferring stable model over preview/beta');
      return { winner: modelB, reasoning, shouldUpgrade: true };
    }
    
    // Rule 2: Prefer lower cost when quality is similar
    const costDiff = Math.abs(modelA.costs.averageCostPerMillion - modelB.costs.averageCostPerMillion) / 
                     Math.min(modelA.costs.averageCostPerMillion, modelB.costs.averageCostPerMillion);
    
    if (costDiff > this.THRESHOLDS.ACCEPTABLE_COST_INCREASE) {
      const cheaper = modelA.costs.averageCostPerMillion < modelB.costs.averageCostPerMillion ? modelA : modelB;
      reasoning.push(`Tie-breaker: Preferring ${costDiff > this.THRESHOLDS.HIGH_COST_INCREASE ? 'significantly' : ''} cheaper option (${(costDiff * 100).toFixed(0)}% cost difference)`);
      return { winner: cheaper, reasoning, shouldUpgrade: cheaper === modelB };
    }
    
    // Rule 3: Prefer newer model if costs are similar
    if (modelA.model.releaseDate && modelB.model.releaseDate) {
      const ageDiff = Math.abs(modelA.model.releaseDate.getTime() - modelB.model.releaseDate.getTime());
      if (ageDiff > 30 * 24 * 60 * 60 * 1000) { // More than 30 days
        const newer = modelA.model.releaseDate > modelB.model.releaseDate ? modelA : modelB;
        reasoning.push('Tie-breaker: Preferring newer model');
        return { winner: newer, reasoning, shouldUpgrade: newer === modelB };
      }
    }
    
    // Rule 4: Prefer model with fewer risks
    const riskScoreA = modelA.risks.reduce((sum, r) => sum + (r.severity === 'high' ? 3 : r.severity === 'medium' ? 2 : 1), 0);
    const riskScoreB = modelB.risks.reduce((sum, r) => sum + (r.severity === 'high' ? 3 : r.severity === 'medium' ? 2 : 1), 0);
    
    if (riskScoreA !== riskScoreB) {
      const lowerRisk = riskScoreA < riskScoreB ? modelA : modelB;
      reasoning.push(`Tie-breaker: Preferring model with lower risk score (${Math.min(riskScoreA, riskScoreB)} vs ${Math.max(riskScoreA, riskScoreB)})`);
      return { winner: lowerRisk, reasoning, shouldUpgrade: lowerRisk === modelB };
    }
    
    // Rule 5: Default to current (modelA) to avoid unnecessary changes
    reasoning.push('Tie-breaker: Keeping current model (avoiding unnecessary change)');
    return { winner: modelA, reasoning, shouldUpgrade: false };
  }

  /**
   * Generate actionable recommendations
   */
  private static generateRecommendations(
    model: ModelMetadata,
    costs: ModelCosts,
    capabilities: ModelCapabilities,
    context: ModelSelectionContext,
    recommendations: string[]
  ): void {
    // Cost recommendations
    if (costs.monthlyCost && context.budgetConstraints?.maxMonthlyCost) {
      const budgetUsage = (costs.monthlyCost / context.budgetConstraints.maxMonthlyCost) * 100;
      if (budgetUsage > 80) {
        recommendations.push(`Monitor costs closely - using ${budgetUsage.toFixed(0)}% of budget`);
      }
    }
    
    // Performance recommendations
    if (capabilities.quality < this.THRESHOLDS.MIN_QUALITY_SCORE) {
      recommendations.push('Consider higher quality model for complex tasks');
    }
    
    if (capabilities.speed < this.THRESHOLDS.MIN_SPEED_SCORE && context.taskComplexity === 'simple') {
      recommendations.push('Consider faster model for simple, high-volume tasks');
    }
    
    // Stability recommendations
    if (model.status === 'preview' || model.status === 'beta') {
      recommendations.push('Monitor for stable release and plan migration');
      recommendations.push('Implement fallback to stable model for critical tasks');
    }
    
    // Context window recommendations
    if (capabilities.contextWindow < 32000) {
      recommendations.push('May need chunking strategy for large documents');
    }
  }
}

/**
 * Model Selection Decision Engine
 * 
 * Main entry point for sophisticated model selection
 */
export class ModelSelectionEngine {
  private rules = ModelSelectionRules;
  
  /**
   * Select the best model from candidates using enhanced rules
   */
  selectBestModel(
    candidates: Array<{
      metadata: ModelMetadata;
      costs: ModelCosts;
      capabilities: ModelCapabilities;
    }>,
    context: ModelSelectionContext
  ): {
    selected: ModelEvaluation;
    runnerUp?: ModelEvaluation;
    reasoning: string[];
    allEvaluations: ModelEvaluation[];
  } {
    // Evaluate all candidates
    const evaluations = candidates.map(candidate =>
      this.rules.evaluateModel(
        candidate.metadata,
        candidate.costs,
        candidate.capabilities,
        context
      )
    );
    
    // Sort by adjusted score
    evaluations.sort((a, b) => b.adjustedScore - a.adjustedScore);
    
    if (evaluations.length === 0) {
      throw new Error('No candidates provided');
    }
    
    if (evaluations.length === 1) {
      return {
        selected: evaluations[0],
        reasoning: ['Only one candidate available'],
        allEvaluations: evaluations
      };
    }
    
    // Compare top two candidates
    const comparison = this.rules.compareModels(
      evaluations[0],
      evaluations[1],
      context
    );
    
    return {
      selected: comparison.winner,
      runnerUp: comparison.winner === evaluations[0] ? evaluations[1] : evaluations[0],
      reasoning: comparison.reasoning,
      allEvaluations: evaluations
    };
  }
  
  /**
   * Validate model selection decision
   */
  validateSelection(
    selected: ModelEvaluation,
    context: ModelSelectionContext
  ): {
    isValid: boolean;
    warnings: string[];
    blockers: string[];
  } {
    const warnings: string[] = [];
    const blockers: string[] = [];
    
    // Check hard requirements
    if (context.performanceRequirements) {
      if (selected.capabilities.quality < (context.performanceRequirements.minQuality || 0)) {
        blockers.push(`Quality ${selected.capabilities.quality} below minimum ${context.performanceRequirements.minQuality}`);
      }
      
      if (selected.capabilities.contextWindow < (context.performanceRequirements.minContextWindow || 0)) {
        blockers.push(`Context window ${selected.capabilities.contextWindow} below minimum ${context.performanceRequirements.minContextWindow}`);
      }
    }
    
    // Check budget constraints
    if (context.budgetConstraints?.maxCostPerMillion) {
      if (selected.costs.averageCostPerMillion > context.budgetConstraints.maxCostPerMillion) {
        blockers.push(`Cost $${selected.costs.averageCostPerMillion}/M exceeds maximum $${context.budgetConstraints.maxCostPerMillion}/M`);
      }
    }
    
    // Generate warnings
    selected.risks.forEach(risk => {
      if (risk.severity === 'high') {
        warnings.push(`HIGH RISK: ${risk.description}`);
      } else if (risk.severity === 'medium') {
        warnings.push(`Medium risk: ${risk.description}`);
      }
    });
    
    return {
      isValid: blockers.length === 0,
      warnings,
      blockers
    };
  }
}