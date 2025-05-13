/**
 * Repository Calibration Service
 * 
 * This service handles the calibration process for repositories
 * that don't match our existing tested configurations. It runs
 * tests with different models, collects results, and updates
 * the repository configuration.
 */

import { Logger } from '../../utils/logger';
import { RepositoryContext } from '../../types/repository';
import { RepositoryModelConfig, RepositorySizeCategory, TestingStatus } from '../../config/models/repository-model-config';
import { ModelConfig } from '../../deepwiki/DeepWikiClient';
import { CalibrationDecision } from './RepositoryModelSelectionService';

/**
 * Provider types to test during calibration
 */
export type CalibrationProvider = 'openai' | 'anthropic' | 'google' | 'deepseek' | 'openrouter';

/**
 * Model names by provider to test during calibration
 */
export const CALIBRATION_MODELS: Record<CalibrationProvider, string[]> = {
  'openai': ['gpt-4o'],
  'anthropic': ['claude-3-7-sonnet'],
  'google': ['gemini-2.5-pro-preview-05-06'],
  'deepseek': ['deepseek-coder', 'deepseek-coder-plus'],
  'openrouter': ['anthropic/claude-3.7-sonnet', 'openai/gpt-4o']
};

/**
 * Calibration test result
 */
export interface CalibrationTestResult {
  /**
   * Model configuration used
   */
  modelConfig: ModelConfig<any>;
  
  /**
   * Response time in seconds
   */
  responseTime: number;
  
  /**
   * Response size in bytes
   */
  responseSize: number;
  
  /**
   * Quality score (if evaluated)
   */
  qualityScore?: number;
  
  /**
   * Any errors encountered
   */
  error?: string;
  
  /**
   * Test timestamp
   */
  timestamp: string;
}

/**
 * Options for calibration
 */
export interface CalibrationOptions {
  /**
   * Providers to test
   */
  providers: CalibrationProvider[];
  
  /**
   * Number of test runs per model
   */
  runsPerModel: number;
  
  /**
   * Whether to evaluate quality manually
   */
  evaluateQuality: boolean;
  
  /**
   * Test timeout in seconds
   */
  timeout: number;
  
  /**
   * Whether to update the configuration with results
   */
  updateConfig: boolean;
}

/**
 * Service for repository calibration
 */
export class RepositoryCalibrationService {
  /**
   * Default calibration options
   */
  private readonly DEFAULT_OPTIONS: CalibrationOptions = {
    providers: ['openai', 'anthropic', 'google', 'deepseek'],
    runsPerModel: 3,
    evaluateQuality: true,
    timeout: 120,
    updateConfig: true
  };
  
  /**
   * Constructor
   * @param logger Logger instance
   * @param deepWikiClient DeepWiki client for repository analysis
   * @param configStore Configuration store for updating results
   */
  constructor(
    private logger: Logger,
    private deepWikiClient: any, // Replace with proper type when available
    private configStore: any // Replace with proper type when available
  ) {
    this.logger.info('RepositoryCalibrationService initialized');
  }
  
  /**
   * Calibrate a repository to find the optimal models
   * 
   * @param repository Repository context
   * @param decision Calibration decision
   * @param options Calibration options
   * @returns Calibration results
   */
  async calibrateRepository(
    repository: RepositoryContext,
    decision: CalibrationDecision,
    options?: Partial<CalibrationOptions>
  ): Promise<{
    results: Record<string, CalibrationTestResult[]>;
    recommendedConfig: RepositoryModelConfig;
  }> {
    // Merge options with defaults
    const fullOptions: CalibrationOptions = {
      ...this.DEFAULT_OPTIONS,
      ...options
    };
    
    // Log calibration start
    this.logger.info('Starting repository calibration', {
      repository: `${repository.owner}/${repository.repo}`,
      language: repository.language,
      calibrationType: decision.calibrationType,
      providers: fullOptions.providers
    });
    
    const sizeCategory = this.getSizeCategory(repository.sizeBytes || 0);
    const results: Record<string, CalibrationTestResult[]> = {};
    
    // Run tests for each provider and model
    for (const provider of fullOptions.providers) {
      for (const modelName of CALIBRATION_MODELS[provider]) {
        const modelKey = `${provider}/${modelName}`;
        results[modelKey] = [];
        
        try {
          // Run multiple tests for each model
          for (let i = 0; i < fullOptions.runsPerModel; i++) {
            const testResult = await this.runCalibrationTest(
              repository,
              {
                provider: provider as any,
                model: modelName as any
              },
              fullOptions.timeout
            );
            
            results[modelKey].push(testResult);
          }
        } catch (error) {
          this.logger.error(`Error running calibration for ${modelKey}`, { error });
          
          // Add error result
          results[modelKey].push({
            modelConfig: {
              provider: provider as any,
              model: modelName as any
            },
            responseTime: 0,
            responseSize: 0,
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
      }
    }
    
    // Calculate averages and determine the best model
    const averages = this.calculateAverages(results);
    const recommendedConfig = this.determineOptimalModel(averages, sizeCategory);
    
    // Update configuration if requested
    if (fullOptions.updateConfig) {
      await this.updateConfiguration(
        repository.language,
        sizeCategory,
        recommendedConfig,
        results
      );
    }
    
    // Log calibration completion
    this.logger.info('Completed repository calibration', {
      repository: `${repository.owner}/${repository.repo}`,
      language: repository.language,
      recommendedConfig
    });
    
    return {
      results,
      recommendedConfig
    };
  }
  
  /**
   * Run a single calibration test
   * 
   * @param repository Repository context
   * @param modelConfig Model configuration
   * @param timeout Timeout in seconds
   * @returns Test result
   */
  private async runCalibrationTest(
    repository: RepositoryContext,
    modelConfig: ModelConfig<any>,
    timeout: number
  ): Promise<CalibrationTestResult> {
    this.logger.info('Running calibration test', {
      repository: `${repository.owner}/${repository.repo}`,
      modelConfig
    });
    
    const startTime = Date.now();
    
    try {
      // Run test with DeepWiki client
      const result = await this.deepWikiClient.getChatCompletionForRepo(
        repository,
        {
          messages: [
            {
              role: 'system',
              content: 'You are a repository analyzer. Provide a comprehensive analysis of the repository structure, architecture, and patterns.'
            },
            {
              role: 'user',
              content: 'Analyze this repository in detail. Describe the main components, architecture patterns, and organization.'
            }
          ],
          modelConfig,
          timeout: timeout * 1000
        }
      );
      
      const endTime = Date.now();
      const responseTime = (endTime - startTime) / 1000;
      
      // Extract response content and calculate size
      const responseContent = result.choices?.[0]?.message?.content || '';
      const responseSize = new TextEncoder().encode(responseContent).length;
      
      this.logger.info('Calibration test completed', {
        repository: `${repository.owner}/${repository.repo}`,
        modelConfig,
        responseTime,
        responseSize
      });
      
      return {
        modelConfig,
        responseTime,
        responseSize,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Calibration test failed', {
        repository: `${repository.owner}/${repository.repo}`,
        modelConfig,
        error
      });
      
      return {
        modelConfig,
        responseTime: 0,
        responseSize: 0,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  /**
   * Calculate average results for each model
   * 
   * @param results Test results by model
   * @returns Average results by model
   */
  private calculateAverages(
    results: Record<string, CalibrationTestResult[]>
  ): Record<string, {
    modelConfig: ModelConfig<any>;
    avgResponseTime: number;
    avgResponseSize: number;
    avgQualityScore?: number;
    successRate: number;
  }> {
    const averages: Record<string, any> = {};
    
    for (const [modelKey, modelResults] of Object.entries(results)) {
      // Filter out errors
      const successfulResults = modelResults.filter(r => !r.error);
      
      if (successfulResults.length === 0) {
        averages[modelKey] = {
          modelConfig: modelResults[0].modelConfig,
          avgResponseTime: 0,
          avgResponseSize: 0,
          successRate: 0
        };
        continue;
      }
      
      // Calculate averages
      const avgResponseTime = successfulResults.reduce((sum, r) => sum + r.responseTime, 0) / successfulResults.length;
      const avgResponseSize = successfulResults.reduce((sum, r) => sum + r.responseSize, 0) / successfulResults.length;
      
      // Calculate quality score if available
      let avgQualityScore;
      const qualityScores = successfulResults.filter(r => r.qualityScore !== undefined).map(r => r.qualityScore);
      if (qualityScores.length > 0) {
        avgQualityScore = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;
      }
      
      // Calculate success rate
      const successRate = successfulResults.length / modelResults.length;
      
      averages[modelKey] = {
        modelConfig: modelResults[0].modelConfig,
        avgResponseTime,
        avgResponseSize,
        avgQualityScore,
        successRate
      };
    }
    
    return averages;
  }
  
  /**
   * Determine the optimal model based on test results
   * 
   * @param averages Average test results by model
   * @param sizeCategory Repository size category
   * @returns Recommended model configuration
   */
  private determineOptimalModel(
    averages: Record<string, {
      modelConfig: ModelConfig<any>;
      avgResponseTime: number;
      avgResponseSize: number;
      avgQualityScore?: number;
      successRate: number;
    }>,
    sizeCategory: RepositorySizeCategory
  ): RepositoryModelConfig {
    const models = Object.values(averages);
    
    // Filter out models with low success rate
    const reliableModels = models.filter(m => m.successRate > 0.8);
    
    if (reliableModels.length === 0) {
      // No reliable models, return default for size category
      this.logger.warn('No reliable models found during calibration', { sizeCategory });
      return {
        provider: 'openai',
        model: 'gpt-4o',
        testResults: {
          status: TestingStatus.PARTIAL,
          avgResponseTime: 0,
          avgResponseSize: 0,
          testCount: 0,
          lastTested: new Date().toISOString()
        },
        notes: 'Default model due to no reliable alternatives during calibration'
      };
    }
    
    // Different selection strategies based on size category
    let selectedModel;
    
    if (sizeCategory === 'small') {
      // For small repos, prioritize speed
      selectedModel = reliableModels.reduce((best, current) => 
        current.avgResponseTime < best.avgResponseTime ? current : best
      , reliableModels[0]);
    } else if (sizeCategory === 'medium') {
      // For medium repos, balance between detail and speed
      selectedModel = reliableModels.reduce((best, current) => {
        const bestScore = (best.avgQualityScore || 0) * 0.7 - (best.avgResponseTime / 10);
        const currentScore = (current.avgQualityScore || 0) * 0.7 - (current.avgResponseTime / 10);
        return currentScore > bestScore ? current : best;
      }, reliableModels[0]);
    } else {
      // For large repos, prioritize detail
      selectedModel = reliableModels.reduce((best, current) => {
        // If quality scores are available, use them
        if (best.avgQualityScore !== undefined && current.avgQualityScore !== undefined) {
          return current.avgQualityScore > best.avgQualityScore ? current : best;
        }
        // Otherwise use response size as a proxy for detail
        return current.avgResponseSize > best.avgResponseSize ? current : best;
      }, reliableModels[0]);
    }
    
    // Create recommended config
    return {
      provider: selectedModel.modelConfig.provider,
      model: selectedModel.modelConfig.model,
      testResults: {
        status: TestingStatus.TESTED,
        avgResponseTime: selectedModel.avgResponseTime,
        avgResponseSize: selectedModel.avgResponseSize,
        qualityScore: selectedModel.avgQualityScore,
        testCount: reliableModels.length,
        lastTested: new Date().toISOString()
      },
      notes: `Selected based on calibration for ${sizeCategory} repository size`
    };
  }
  
  /**
   * Update configuration with calibration results
   * 
   * @param language Repository language
   * @param sizeCategory Repository size category
   * @param recommendedConfig Recommended configuration
   * @param results Test results
   */
  private async updateConfiguration(
    language: string,
    sizeCategory: RepositorySizeCategory,
    recommendedConfig: RepositoryModelConfig,
    results: Record<string, CalibrationTestResult[]>
  ): Promise<void> {
    try {
      // Normalize language
      const normalizedLang = language.toLowerCase();
      
      // Update configuration in store
      await this.configStore.updateModelConfig(
        normalizedLang,
        sizeCategory,
        recommendedConfig
      );
      
      // Store full test results for future reference
      await this.configStore.storeCalibrationResults(
        normalizedLang,
        sizeCategory,
        results
      );
      
      this.logger.info('Updated configuration with calibration results', {
        language: normalizedLang,
        sizeCategory,
        recommendedProvider: recommendedConfig.provider,
        recommendedModel: recommendedConfig.model
      });
    } catch (error) {
      this.logger.error('Failed to update configuration with calibration results', {
        language,
        sizeCategory,
        error
      });
    }
  }
  
  /**
   * Get size category for a repository
   * 
   * @param sizeBytes Repository size in bytes
   * @returns Size category
   */
  private getSizeCategory(sizeBytes: number): RepositorySizeCategory {
    if (sizeBytes < 5 * 1024 * 1024) { // Less than 5MB
      return 'small';
    } else if (sizeBytes < 50 * 1024 * 1024) { // Between 5MB and 50MB
      return 'medium';
    } else {
      return 'large';
    }
  }
}
