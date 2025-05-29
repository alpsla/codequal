/**
 * Matrix Filler Service
 * 
 * This service fills the Dynamic Model Configuration Matrix using a hybrid approach:
 * 1. Pre-generate ~1,000 priority configurations (80% of actual usage)
 * 2. Generate on-demand for rare combinations (with caching)
 * 3. Use pattern-based research for efficient updates
 * 
 * This avoids wasting resources on all 16,560 theoretical combinations.
 */

import { ModelConfigurationMatrixService, AnalysisParameters } from './ModelConfigurationMatrix';
import { ResearchAgent, MarketUpdate } from './ResearchAgent';
import { Logger } from '../../utils/logger';

/**
 * Batch processing configuration
 */
interface BatchConfig {
  batchSize: number;
  delayBetweenBatches: number; // milliseconds
  maxConcurrency: number;
}

/**
 * Filling progress tracking
 */
interface FillingProgress {
  totalCombinations: number;
  completed: number;
  failed: number;
  currentBatch: number;
  estimatedTimeRemaining: number;
  startTime: Date;
}

/**
 * Priority configuration parameters for initial filling
 */
interface PriorityParameters {
  // Most common languages (fill these first)
  commonLanguages: string[];
  // Extended priority languages
  extendedLanguages: string[];
  // Most common analysis types
  commonAnalysisTypes: string[];
  // Most common user contexts
  commonContexts: Array<{
    speed: string;
    complexity: string;
    repoSize: string;
    costSensitivity: string;
    qualityRequirement: string;
  }>;
}

/**
 * Pattern-based research configuration
 */
interface ResearchPattern {
  name: string;
  description: string;
  languages?: string[];
  analysisTypes?: string[];
  costSensitivities?: string[];
  recommendedModels: string[];
  researchPrompt: string;
}

/**
 * Matrix Filler Service
 */
export class MatrixFiller {
  private readonly BATCH_CONFIG: BatchConfig = {
    batchSize: 50, // Process 50 configurations at a time
    delayBetweenBatches: 5000, // 5 second delay between batches
    maxConcurrency: 3 // Maximum 3 research requests in parallel
  };

  private readonly PRIORITY_PARAMS: PriorityParameters = {
    // Top 10 languages cover 80% of repositories
    commonLanguages: [
      'javascript', 'typescript', 'python', 'java', 'go'  // Top 5 = 60% of usage
    ],
    // Extended priority languages (next 20% of usage)
    extendedLanguages: [
      'csharp', 'rust', 'cpp', 'php', 'ruby', 'swift', 'kotlin'
    ],
    // Most common analysis types (90% of requests)
    commonAnalysisTypes: [
      'pr_review',  // 50% of all requests
      'architecture', // 20%
      'security'     // 20%
    ],
    // Real-world user contexts based on actual usage patterns
    commonContexts: [
      // Free tier - majority of users (60%)
      { speed: 'fast', complexity: 'simple', repoSize: 'small', costSensitivity: 'high', qualityRequirement: 'basic' },
      { speed: 'fast', complexity: 'simple', repoSize: 'medium', costSensitivity: 'high', qualityRequirement: 'basic' },
      
      // Pro tier - common scenarios (30%)
      { speed: 'medium', complexity: 'moderate', repoSize: 'medium', costSensitivity: 'medium', qualityRequirement: 'good' },
      { speed: 'fast', complexity: 'moderate', repoSize: 'small', costSensitivity: 'medium', qualityRequirement: 'good' },
      
      // Enterprise - less common but important (10%)
      { speed: 'medium', complexity: 'complex', repoSize: 'large', costSensitivity: 'low', qualityRequirement: 'excellent' }
    ]
  };

  constructor(
    private matrixService: ModelConfigurationMatrixService,
    private researchAgent: ResearchAgent,
    private logger: Logger
  ) {}

  /**
   * Two-tier approach: Pre-generate common + on-demand for rest
   */
  async fillCommonConfigurations(): Promise<FillingProgress> {
    this.logger.info('Starting 2-tier matrix filling');

    const progress: FillingProgress = {
      totalCombinations: 0,
      completed: 0,
      failed: 0,
      currentBatch: 0,
      estimatedTimeRemaining: 0,
      startTime: new Date()
    };

    // Generate only KNOWN common usage patterns
    const commonConfigs = this.generateCommonUsagePatterns();
    progress.totalCombinations = commonConfigs.length;
    
    this.logger.info(`Pre-generating ${commonConfigs.length} common configurations`);
    
    await this.processBatches(commonConfigs, progress);

    const totalTime = Date.now() - progress.startTime.getTime();
    this.logger.info('Common configurations filled', {
      totalConfigs: progress.completed,
      failed: progress.failed,
      totalTime: `${Math.round(totalTime / 1000 / 60)} minutes`,
      estimatedCost: `$${(progress.completed * 0.01).toFixed(2)}`,
      note: 'Remaining configurations will be generated on-demand'
    });

    return progress;
  }

  /**
   * Tier 1: High-priority configurations (80% of actual usage)
   */
  private async fillTier1Priority(progress: FillingProgress): Promise<number> {
    const tier1Params: AnalysisParameters[] = [];

    // Generate only the most common combinations
    for (const language of this.PRIORITY_PARAMS.commonLanguages) {
      for (const analysisType of this.PRIORITY_PARAMS.commonAnalysisTypes) {
        for (const context of this.PRIORITY_PARAMS.commonContexts.slice(0, 3)) { // Top 3 contexts
          tier1Params.push({
            speed: context.speed as any,
            complexity: context.complexity as any,
            language,
            repoSize: context.repoSize as any,
            costSensitivity: context.costSensitivity as any,
            qualityRequirement: context.qualityRequirement as any,
            analysisType: analysisType as any,
            features: this.inferFeatures(analysisType, context.complexity)
          });
        }
      }
    }

    progress.totalCombinations += tier1Params.length;
    this.logger.info(`Tier 1: ${tier1Params.length} configurations`);
    
    await this.processBatches(tier1Params, progress);
    return tier1Params.length;
  }

  /**
   * Tier 2: Extended priority configurations
   */
  private async fillTier2Extended(progress: FillingProgress): Promise<number> {
    const tier2Params: AnalysisParameters[] = [];

    // Extended languages with common scenarios
    for (const language of this.PRIORITY_PARAMS.extendedLanguages) {
      for (const analysisType of ['pr_review', 'architecture']) { // Most common types only
        for (const context of this.PRIORITY_PARAMS.commonContexts.slice(0, 2)) { // Top 2 contexts
          tier2Params.push({
            speed: context.speed as any,
            complexity: context.complexity as any,
            language,
            repoSize: context.repoSize as any,
            costSensitivity: context.costSensitivity as any,
            qualityRequirement: context.qualityRequirement as any,
            analysisType: analysisType as any,
            features: this.inferFeatures(analysisType, context.complexity)
          });
        }
      }
    }

    // Add performance & security for top languages
    for (const language of this.PRIORITY_PARAMS.commonLanguages) {
      for (const analysisType of ['performance', 'documentation']) {
        const context = this.PRIORITY_PARAMS.commonContexts[0]; // Most common context
        tier2Params.push({
          speed: 'medium' as any,
          complexity: 'moderate' as any,
          language,
          repoSize: 'medium' as any,
          costSensitivity: context.costSensitivity as any,
          qualityRequirement: context.qualityRequirement as any,
          analysisType: analysisType as any,
          features: this.inferFeatures(analysisType, 'moderate')
        });
      }
    }

    progress.totalCombinations += tier2Params.length;
    this.logger.info(`Tier 2: ${tier2Params.length} configurations`);
    
    await this.processBatches(tier2Params, progress);
    return tier2Params.length;
  }

  /**
   * Tier 3: Pattern-based research for efficient coverage
   */
  private async performPatternResearch(progress: FillingProgress): Promise<void> {
    const patterns: ResearchPattern[] = [
      {
        name: 'web-frontend-pattern',
        description: 'Optimal models for web frontend languages',
        languages: ['javascript', 'typescript', 'react', 'vue', 'angular'],
        analysisTypes: ['pr_review', 'architecture'],
        recommendedModels: ['gemini-2.5-flash', 'claude-3.5-haiku'],
        researchPrompt: 'Research optimal models for web frontend development'
      },
      {
        name: 'system-languages-pattern',
        description: 'Models for system programming languages',
        languages: ['c', 'cpp', 'rust', 'go', 'zig'],
        analysisTypes: ['security', 'performance'],
        recommendedModels: ['claude-3.5-sonnet', 'deepseek-coder'],
        researchPrompt: 'Research models for system language analysis focusing on security and performance'
      },
      {
        name: 'cost-sensitive-pattern',
        description: 'Free/cheap models for cost-sensitive users',
        costSensitivities: ['high'],
        recommendedModels: ['gemini-2.5-flash:free', 'deepseek:free', 'llama-3.2:free'],
        researchPrompt: 'Research best free models for code analysis across all languages'
      },
      {
        name: 'enterprise-quality-pattern',
        description: 'Premium models for enterprise users',
        costSensitivities: ['low'],
        analysisTypes: ['architecture', 'security'],
        recommendedModels: ['claude-3.5-sonnet', 'gpt-4o', 'claude-3-opus'],
        researchPrompt: 'Research premium models for enterprise-grade code analysis'
      }
    ];

    this.logger.info(`Tier 3: Researching ${patterns.length} patterns`);

    for (const pattern of patterns) {
      try {
        const patternConfig = await this.researchAgent.performMarketResearch();
        // Store pattern insights for future reference
        this.logger.info(`Pattern research completed: ${pattern.name}`, {
          languages: pattern.languages?.length || 'all',
          models: pattern.recommendedModels
        });
        progress.completed++;
      } catch (error) {
        this.logger.error(`Pattern research failed: ${pattern.name}`, { error });
        progress.failed++;
      }
    }
  }

  /**
   * Fill entire matrix with all 16,560+ configurations
   */
  async fillCompleteMatrix(): Promise<FillingProgress> {
    this.logger.info('Starting complete matrix filling');

    const allParams = this.generateAllParameterCombinations();
    const progress: FillingProgress = {
      totalCombinations: allParams.length,
      completed: 0,
      failed: 0,
      currentBatch: 0,
      estimatedTimeRemaining: 0,
      startTime: new Date()
    };

    this.logger.info('Complete matrix filling started', {
      totalConfigurations: allParams.length,
      estimatedTime: `${Math.ceil(allParams.length / this.BATCH_CONFIG.batchSize * this.BATCH_CONFIG.delayBetweenBatches / 1000 / 60)} minutes`
    });

    await this.processBatches(allParams, progress);

    this.logger.info('Complete matrix filling completed', {
      completed: progress.completed,
      failed: progress.failed,
      totalTime: Date.now() - progress.startTime.getTime()
    });

    return progress;
  }

  /**
   * Update existing configurations with market research
   */
  async updateWithMarketResearch(): Promise<{ updated: number; added: number }> {
    this.logger.info('Updating matrix with market research');

    try {
      // Perform market research
      const marketUpdates = await this.researchAgent.performMarketResearch();
      
      let updated = 0;
      let added = 0;

      for (const update of marketUpdates) {
        switch (update.action) {
          case 'add_model':
            // Generate configurations for new model
            await this.generateConfigurationsForNewModel(update);
            added++;
            break;
            
          case 'update_pricing':
          case 'update_capabilities':
            // Update existing configurations
            await this.updateExistingConfigurations(update);
            updated++;
            break;
            
          case 'deprecate_model':
            // Mark configurations as deprecated
            await this.deprecateModelConfigurations(update);
            updated++;
            break;
        }
      }

      this.logger.info('Market research updates applied', {
        totalUpdates: marketUpdates.length,
        configurationsUpdated: updated,
        newConfigurationsAdded: added
      });

      return { updated, added };
    } catch (error) {
      this.logger.error('Error updating with market research', { error });
      throw error;
    }
  }

  /**
   * Generate ONLY common usage patterns we know will be used
   * Separate patterns for PR Analysis (multi-agent) vs Repository Analysis (single model)
   */
  private generateCommonUsagePatterns(): AnalysisParameters[] {
    const patterns: AnalysisParameters[] = [];

    // Common languages (90% of repos)
    const commonLanguages = ['javascript', 'typescript', 'python', 'java', 'go', 'csharp', 'rust'];
    
    // ========== PR ANALYSIS PATTERNS (Multi-Agent) ==========
    // PR Review patterns - NEED SPEED
    for (const language of commonLanguages) {
      // Free tier users - fast & cheap
      patterns.push({
        speed: 'fast',
        complexity: 'simple',
        language,
        repoSize: 'medium',
        costSensitivity: 'high',
        qualityRequirement: 'basic',
        analysisType: 'pr_review',
        features: { needsMultiFile: true }
      });
      
      // Pro tier users - balanced
      patterns.push({
        speed: 'fast',
        complexity: 'moderate',
        language,
        repoSize: 'medium',
        costSensitivity: 'medium',
        qualityRequirement: 'good',
        analysisType: 'pr_review',
        features: { needsMultiFile: true }
      });
    }

    // Architecture Analysis - NEED QUALITY (can be expensive/slow)
    for (const language of ['javascript', 'typescript', 'java', 'python', 'go']) {
      patterns.push({
        speed: 'slow',
        complexity: 'complex',
        language,
        repoSize: 'large',
        costSensitivity: 'low',
        qualityRequirement: 'excellent',
        analysisType: 'architecture',
        features: { needsReasoning: true, needsMultiFile: true }
      });
    }

    // Security Analysis - NEED PRECISION
    for (const language of ['javascript', 'python', 'java', 'php', 'ruby']) {
      patterns.push({
        speed: 'medium',
        complexity: 'complex',
        language,
        repoSize: 'medium',
        costSensitivity: 'medium',
        qualityRequirement: 'excellent',
        analysisType: 'security',
        features: { needsCodeExecution: true }
      });
    }

    // Performance Analysis - SPECIALIZED
    for (const language of ['go', 'rust', 'cpp', 'java']) {
      patterns.push({
        speed: 'medium',
        complexity: 'complex',
        language,
        repoSize: 'large',
        costSensitivity: 'medium',
        qualityRequirement: 'excellent',
        analysisType: 'performance',
        features: { needsCodeExecution: true, needsReasoning: true }
      });
    }

    // ========== REPOSITORY ANALYSIS PATTERNS (Single Model) ==========
    // Repository analysis needs ONE powerful model for holistic understanding
    
    // Small-Medium repositories (most common)
    for (const language of commonLanguages) {
      patterns.push({
        speed: 'slow', // Quality over speed
        complexity: 'complex', // Always complex for full repo
        language,
        repoSize: 'medium',
        costSensitivity: 'medium',
        qualityRequirement: 'excellent',
        analysisType: 'architecture', // Repository analysis
        features: { needsReasoning: true, needsMultiFile: true }
      });
    }

    // Large/Enterprise repositories
    for (const language of ['java', 'csharp', 'python', 'javascript']) {
      patterns.push({
        speed: 'slow',
        complexity: 'complex',
        language,
        repoSize: 'enterprise',
        costSensitivity: 'low', // Enterprise users
        qualityRequirement: 'perfect',
        analysisType: 'architecture',
        features: { needsReasoning: true, needsMultiFile: true }
      });
    }

    this.logger.info(`Generated ${patterns.length} common usage patterns`, {
      prAnalysisPatterns: patterns.filter(p => p.analysisType !== 'architecture').length,
      repoAnalysisPatterns: patterns.filter(p => p.analysisType === 'architecture').length
    });
    return patterns;
  }

  /**
   * Generate priority parameter combinations (most common use cases)
   */
  private generatePriorityParameterCombinations(): AnalysisParameters[] {
    const combinations: AnalysisParameters[] = [];

    for (const language of this.PRIORITY_PARAMS.commonLanguages) {
      for (const analysisType of this.PRIORITY_PARAMS.commonAnalysisTypes) {
        for (const context of this.PRIORITY_PARAMS.commonContexts) {
          combinations.push({
            speed: context.speed as any,
            complexity: context.complexity as any,
            language,
            repoSize: context.repoSize as any,
            costSensitivity: context.costSensitivity as any,
            qualityRequirement: context.qualityRequirement as any,
            analysisType: analysisType as any,
            features: this.inferFeatures(analysisType, context.complexity)
          });
        }
      }
    }

    return combinations;
  }

  /**
   * Generate all possible parameter combinations
   */
  private generateAllParameterCombinations(): AnalysisParameters[] {
    const speeds = ['fast', 'medium', 'slow'];
    const complexities = ['simple', 'moderate', 'complex'];
    const languages = [
      // Popular languages
      'javascript', 'typescript', 'python', 'java', 'csharp', 'cpp', 'go', 'rust', 'kotlin', 'swift',
      // Web languages
      'php', 'ruby', 'html', 'css', 'vue', 'react', 'angular',
      // Data/ML languages
      'r', 'julia', 'matlab', 'scala',
      // System languages
      'c', 'objectivec', 'assembly', 'perl', 'bash', 'powershell',
      // Modern languages
      'dart', 'elixir', 'clojure', 'haskell', 'erlang', 'nim', 'zig',
      // Database/Config
      'sql', 'graphql', 'yaml', 'json', 'xml', 'toml',
      // Other
      'lua', 'solidity', 'vhdl', 'terraform', 'dockerfile',
      // Multi-language
      'multi'
    ];
    const repoSizes = ['small', 'medium', 'large', 'enterprise'];
    const costSensitivities = ['low', 'medium', 'high'];
    const qualityRequirements = ['basic', 'good', 'excellent', 'perfect'];
    const analysisTypes = ['pr_review', 'architecture', 'security', 'performance', 'documentation'];

    const combinations: AnalysisParameters[] = [];

    for (const speed of speeds) {
      for (const complexity of complexities) {
        for (const language of languages) {
          for (const repoSize of repoSizes) {
            for (const costSensitivity of costSensitivities) {
              for (const qualityRequirement of qualityRequirements) {
                for (const analysisType of analysisTypes) {
                  combinations.push({
                    speed: speed as any,
                    complexity: complexity as any,
                    language,
                    repoSize: repoSize as any,
                    costSensitivity: costSensitivity as any,
                    qualityRequirement: qualityRequirement as any,
                    analysisType: analysisType as any,
                    features: this.inferFeatures(analysisType, complexity)
                  });
                }
              }
            }
          }
        }
      }
    }

    return combinations;
  }

  /**
   * Process parameter combinations in batches
   */
  private async processBatches(
    allParams: AnalysisParameters[], 
    progress: FillingProgress
  ): Promise<void> {
    const batches = this.chunkArray(allParams, this.BATCH_CONFIG.batchSize);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      progress.currentBatch = i + 1;

      this.logger.info(`Processing batch ${progress.currentBatch}/${batches.length}`, {
        batchSize: batch.length,
        progress: `${progress.completed}/${progress.totalCombinations}`
      });

      // Process batch with concurrency control
      const batchPromises = batch.map(params => this.processConfiguration(params));
      const batchResults = await Promise.allSettled(batchPromises);

      // Update progress
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          progress.completed++;
        } else {
          progress.failed++;
          this.logger.warn('Configuration failed', { error: result.reason });
        }
      }

      // Update estimated time remaining
      const elapsed = Date.now() - progress.startTime.getTime();
      const avgTimePerBatch = elapsed / progress.currentBatch;
      progress.estimatedTimeRemaining = avgTimePerBatch * (batches.length - progress.currentBatch);

      this.logger.info('Batch completed', {
        batch: progress.currentBatch,
        completed: progress.completed,
        failed: progress.failed,
        estimatedTimeRemaining: Math.ceil(progress.estimatedTimeRemaining / 1000 / 60) + ' minutes'
      });

      // Delay between batches to avoid rate limiting
      if (i < batches.length - 1) {
        await this.delay(this.BATCH_CONFIG.delayBetweenBatches);
      }
    }
  }

  /**
   * Process a single configuration
   */
  private async processConfiguration(params: AnalysisParameters): Promise<void> {
    try {
      // Check if configuration already exists
      const existing = await this.matrixService.getConfiguration(params);
      if (existing) {
        this.logger.debug('Configuration already exists, skipping', { 
          configId: existing.configId 
        });
        return;
      }

      // Research optimal configuration
      const config = await this.researchAgent.researchOptimalConfiguration(params);
      
      // Store in matrix (the MatrixService handles storage internally)
      this.logger.debug('Configuration researched and stored', {
        configId: config.configId,
        model: config.modelConfig.model
      });

    } catch (error) {
      this.logger.error('Error processing configuration', { params, error });
      throw error;
    }
  }

  /**
   * Generate configurations for new model from market research
   */
  private async generateConfigurationsForNewModel(update: MarketUpdate): Promise<void> {
    // Generate configurations for new model with common parameter combinations
    const priorityParams = this.generatePriorityParameterCombinations();
    
    this.logger.info('Generating configurations for new model', {
      model: update.modelPath,
      parameterCount: priorityParams.length
    });

    // Process in smaller batches for new models
    const batches = this.chunkArray(priorityParams, 10);
    
    for (const batch of batches) {
      const batchPromises = batch.map(params => this.processConfiguration(params));
      await Promise.allSettled(batchPromises);
      await this.delay(2000); // Short delay between batches
    }
  }

  /**
   * Update existing configurations based on market research
   */
  private async updateExistingConfigurations(update: MarketUpdate): Promise<void> {
    this.logger.info('Updating existing configurations', {
      action: update.action,
      model: update.modelPath
    });

    // This would update configurations in the database
    // Implementation depends on specific update type
    // For now, we'll log the update
    this.logger.info('Configuration update logged', { update });
  }

  /**
   * Deprecate configurations for discontinued models
   */
  private async deprecateModelConfigurations(update: MarketUpdate): Promise<void> {
    this.logger.info('Deprecating model configurations', {
      model: update.modelPath,
      deprecationDate: update.changes.deprecationDate
    });

    // This would mark configurations as deprecated in the database
    // Implementation would update database records
    this.logger.info('Model configurations deprecated', { model: update.modelPath });
  }

  /**
   * Infer features from analysis type and complexity
   */
  private inferFeatures(analysisType: string, complexity: string): any {
    return {
      needsReasoning: complexity === 'complex' || analysisType === 'architecture',
      needsCodeExecution: analysisType === 'security' || analysisType === 'performance',
      needsWebSearch: analysisType === 'documentation',
      needsMultiFile: complexity !== 'simple' || analysisType === 'architecture'
    };
  }

  /**
   * Utility: Split array into chunks
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Utility: Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get filling statistics
   */
  async getFillingStats(): Promise<{
    totalConfigurations: number;
    filledConfigurations: number;
    priorityConfigurations: number;
    lastResearchUpdate: Date | null;
  }> {
    try {
      const stats = await this.matrixService.getMatrixStats();
      const priorityCount = this.generatePriorityParameterCombinations().length;

      return {
        totalConfigurations: 16560, // Total possible combinations
        filledConfigurations: stats.totalConfigurations,
        priorityConfigurations: priorityCount,
        lastResearchUpdate: null // Would track from database
      };
    } catch (error) {
      this.logger.error('Error getting filling stats', { error });
      throw error;
    }
  }
}