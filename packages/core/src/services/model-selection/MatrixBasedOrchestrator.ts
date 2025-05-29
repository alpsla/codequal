/**
 * Matrix-Based Model Orchestrator
 * 
 * This orchestrator uses the Dynamic Model Configuration Matrix to intelligently
 * select optimal models for any analysis scenario. It replaces hardcoded model
 * selection logic with data-driven decisions.
 */

import { ModelConfigurationMatrixService, AnalysisParameters, ModelConfig } from './ModelConfigurationMatrix';
import { Logger } from '../../utils/logger';

/**
 * Analysis context from repository or PR analysis
 */
export interface AnalysisContext {
  // Repository characteristics
  repositoryId?: string;
  primaryLanguage?: string;
  totalFiles: number;
  totalLines: number;
  
  // Analysis requirements
  analysisType: 'pr_review' | 'architecture' | 'security' | 'performance' | 'documentation';
  urgencyLevel?: 'low' | 'medium' | 'high';
  qualityRequirement?: 'basic' | 'good' | 'excellent' | 'perfect';
  costSensitivity?: 'low' | 'medium' | 'high';
  
  // Special requirements
  requiresArchitecturalAnalysis?: boolean;
  requiresSecurityScan?: boolean;
  requiresPerformanceAnalysis?: boolean;
  fileCount: number;
  
  // User preferences
  userTier?: 'free' | 'pro' | 'enterprise';
  timeoutPreference?: 'fast' | 'medium' | 'thorough';
}

/**
 * Model selection result
 */
export interface ModelSelectionResult {
  selectedConfig: ModelConfig;
  configId: string;
  reasoning: string;
  fallbackConfigs: ModelConfig[];
  estimatedCost: number;
  estimatedTimeMs: number;
  parameters: AnalysisParameters;
}

/**
 * Matrix-Based Model Orchestrator
 */
export class MatrixBasedOrchestrator {
  constructor(
    private configMatrix: ModelConfigurationMatrixService,
    private logger: Logger
  ) {}

  /**
   * Select optimal model configuration for analysis
   */
  async selectModelForAnalysis(context: AnalysisContext): Promise<ModelSelectionResult> {
    try {
      // Map context to analysis parameters
      const parameters = await this.mapContextToParameters(context);
      
      this.logger.info('Selecting model for analysis', { 
        context: { 
          repositoryId: context.repositoryId,
          analysisType: context.analysisType,
          language: parameters.language,
          repoSize: parameters.repoSize
        },
        parameters 
      });

      // Get optimal configuration from matrix
      const config = await this.configMatrix.getConfiguration(parameters);
      
      if (!config) {
        throw new Error(`No configuration found for parameters: ${JSON.stringify(parameters)}`);
      }

      // Generate fallback configurations
      const fallbackConfigs = await this.generateFallbackConfigs(config.fallbackConfigs);

      // Generate reasoning
      const reasoning = this.generateSelectionReasoning(parameters, config);

      const result: ModelSelectionResult = {
        selectedConfig: config.modelConfig,
        configId: config.configId,
        reasoning,
        fallbackConfigs,
        estimatedCost: this.calculateEstimatedCost(config, context),
        estimatedTimeMs: config.expectedMetrics.avgResponseTimeMs,
        parameters
      };

      this.logger.info('Model selection completed', {
        configId: config.configId,
        model: `${config.modelConfig.provider}/${config.modelConfig.model}`,
        estimatedCost: result.estimatedCost,
        estimatedTimeMs: result.estimatedTimeMs
      });

      return result;
    } catch (error) {
      this.logger.error('Error selecting model for analysis', { context, error });
      throw error;
    }
  }

  /**
   * Map analysis context to standardized parameters
   */
  private async mapContextToParameters(context: AnalysisContext): Promise<AnalysisParameters> {
    // Determine speed requirement
    const speed = this.determineSpeed(context);
    
    // Determine complexity level
    const complexity = this.determineComplexity(context);
    
    // Determine primary language
    const language = await this.determinePrimaryLanguage(context);
    
    // Categorize repository size
    const repoSize = this.categorizeRepoSize(context.totalFiles, context.totalLines);
    
    // Determine cost sensitivity
    const costSensitivity = this.determineCostSensitivity(context);
    
    // Determine quality requirement
    const qualityRequirement = this.determineQualityRequirement(context);
    
    // Infer special features
    const features = this.inferFeatures(context);

    return {
      speed,
      complexity,
      language,
      repoSize,
      costSensitivity,
      qualityRequirement,
      analysisType: context.analysisType,
      features
    };
  }

  /**
   * Determine speed requirement from context
   */
  private determineSpeed(context: AnalysisContext): 'fast' | 'medium' | 'slow' {
    if (context.timeoutPreference === 'fast' || context.urgencyLevel === 'high') {
      return 'fast';
    }
    if (context.timeoutPreference === 'thorough' || context.qualityRequirement === 'perfect') {
      return 'slow';
    }
    return 'medium';
  }

  /**
   * Determine complexity level from context
   */
  private determineComplexity(context: AnalysisContext): 'simple' | 'moderate' | 'complex' {
    if (context.analysisType === 'architecture' || 
        context.requiresArchitecturalAnalysis ||
        context.totalFiles > 100) {
      return 'complex';
    }
    if (context.analysisType === 'security' || 
        context.requiresSecurityScan ||
        context.fileCount > 10) {
      return 'moderate';
    }
    return 'simple';
  }

  /**
   * Determine primary language from context
   */
  private async determinePrimaryLanguage(context: AnalysisContext): Promise<string> {
    if (context.primaryLanguage) {
      return context.primaryLanguage.toLowerCase();
    }
    
    // Fallback to 'javascript' as most common
    // In production, this would analyze the repository
    return 'javascript';
  }

  /**
   * Categorize repository size
   */
  private categorizeRepoSize(totalFiles: number, totalLines: number): 'small' | 'medium' | 'large' | 'enterprise' {
    if (totalFiles > 1000 || totalLines > 100000) {
      return 'enterprise';
    }
    if (totalFiles > 100 || totalLines > 10000) {
      return 'large';
    }
    if (totalFiles > 20 || totalLines > 1000) {
      return 'medium';
    }
    return 'small';
  }

  /**
   * Determine cost sensitivity from context
   */
  private determineCostSensitivity(context: AnalysisContext): 'low' | 'medium' | 'high' {
    if (context.costSensitivity) {
      return context.costSensitivity;
    }
    
    // Default based on user tier
    switch (context.userTier) {
      case 'enterprise':
        return 'low';
      case 'pro':
        return 'medium';
      case 'free':
      default:
        return 'high';
    }
  }

  /**
   * Determine quality requirement from context
   */
  private determineQualityRequirement(context: AnalysisContext): 'basic' | 'good' | 'excellent' | 'perfect' {
    if (context.qualityRequirement) {
      return context.qualityRequirement;
    }
    
    // Default based on analysis type and user tier
    if (context.analysisType === 'security' || context.userTier === 'enterprise') {
      return 'excellent';
    }
    if (context.analysisType === 'architecture' || context.userTier === 'pro') {
      return 'good';
    }
    return 'basic';
  }

  /**
   * Infer special features from context
   */
  private inferFeatures(context: AnalysisContext): {
    needsReasoning: boolean;
    needsCodeExecution: boolean;
    needsWebSearch: boolean;
    needsMultiFile: boolean;
  } {
    return {
      needsReasoning: context.analysisType === 'architecture' || 
                     context.requiresArchitecturalAnalysis === true,
      needsCodeExecution: context.analysisType === 'security' || 
                         context.analysisType === 'performance',
      needsWebSearch: context.analysisType === 'documentation',
      needsMultiFile: context.fileCount > 1 || context.totalFiles > 5
    };
  }

  /**
   * Generate fallback configurations from model paths
   */
  private async generateFallbackConfigs(fallbackPaths: string[]): Promise<ModelConfig[]> {
    const fallbacks: ModelConfig[] = [];
    
    for (const path of fallbackPaths) {
      // Parse model path (e.g., "openrouter/deepseek/deepseek-chat")
      const parts = path.split('/');
      if (parts.length >= 2) {
        const provider = parts[0];
        const model = parts.slice(1).join('/');
        
        fallbacks.push({
          provider,
          model,
          modelPath: path,
          temperature: 0.3,
          topP: 0.9,
          maxTokens: 2000,
          streamResponse: true,
          includeThinking: false,
          useCache: true
        });
      }
    }
    
    return fallbacks;
  }

  /**
   * Generate human-readable reasoning for model selection
   */
  private generateSelectionReasoning(
    parameters: AnalysisParameters,
    config: any
  ): string {
    const reasons: string[] = [];
    
    // Speed reasoning
    if (parameters.speed === 'fast') {
      reasons.push('fast response required');
    } else if (parameters.speed === 'slow') {
      reasons.push('thorough analysis prioritized');
    }
    
    // Cost reasoning
    if (parameters.costSensitivity === 'high') {
      reasons.push('cost-optimized model selected');
    } else if (parameters.costSensitivity === 'low') {
      reasons.push('premium model for best quality');
    }
    
    // Quality reasoning
    if (parameters.qualityRequirement === 'perfect') {
      reasons.push('highest quality model required');
    }
    
    // Language-specific reasoning
    reasons.push(`optimized for ${parameters.language} code analysis`);
    
    // Complexity reasoning
    if (parameters.complexity === 'complex') {
      reasons.push('complex analysis requires advanced reasoning');
    }
    
    // Analysis type reasoning
    if (parameters.analysisType === 'security') {
      reasons.push('security analysis requires precise, low-temperature responses');
    } else if (parameters.analysisType === 'architecture') {
      reasons.push('architectural analysis benefits from reasoning capabilities');
    }

    const reasoning = `Selected ${config.modelConfig.provider}/${config.modelConfig.model} because: ${reasons.join(', ')}.`;
    
    return reasoning;
  }

  /**
   * Calculate estimated cost for the analysis
   */
  private calculateEstimatedCost(config: any, context: AnalysisContext): number {
    const baseTokens = Math.min(context.totalLines * 0.25, 4000); // Rough token estimate
    const costPer1k = config.expectedMetrics.costPer1kTokens;
    
    return (baseTokens / 1000) * costPer1k;
  }

  /**
   * Record model selection result for learning
   */
  async recordSelectionResult(
    configId: string,
    success: boolean,
    actualResponseTimeMs: number,
    actualCost?: number
  ): Promise<void> {
    try {
      await this.configMatrix.updateUsageStats(configId, success, actualResponseTimeMs);
      
      this.logger.info('Recorded selection result', {
        configId,
        success,
        actualResponseTimeMs,
        actualCost
      });
    } catch (error) {
      this.logger.error('Error recording selection result', { configId, error });
    }
  }
}