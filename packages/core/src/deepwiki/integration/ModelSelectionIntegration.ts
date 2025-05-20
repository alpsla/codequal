/**
 * Model Selection Integration with Three-Tier Analysis
 * 
 * This file provides integration between the RepositoryModelSelectionService
 * and the ThreeTierAnalysisService to ensure optimal model selection
 * for different repository contexts and analysis tiers.
 */

import { ThreeTierAnalysisService, AnalysisDepth, AnalysisResult } from '../ThreeTierAnalysisService';
import { 
  AnalysisTier, 
  RepositoryModelSelectionService,
  RepositoryCalibrationService,
  // ModelConfigStore is imported but not used
  CalibrationDecision,
  ModelSelectionStrategy
} from '../../services/model-selection';
import { ModelVersionSync } from '../../services/model-selection/ModelVersionSync';
import { RepositoryContext } from '../../types/repository';
import { Logger } from '../../utils/logger';
import { ModelConfig, DeepWikiProvider } from '../DeepWikiClient';

/**
 * Model selection integration handler
 */
export class ModelSelectionIntegration {
  /**
   * Constructor
   * @param logger Logger instance
   * @param modelSelectionService Repository model selection service
   * @param calibrationService Repository calibration service
   * @param analysisService Three-tier analysis service
   * @param modelVersionSync Model version synchronization service
   */
  constructor(
    private logger: Logger,
    private modelSelectionService: RepositoryModelSelectionService,
    private calibrationService: RepositoryCalibrationService,
    private analysisService: ThreeTierAnalysisService,
    private modelVersionSync: ModelVersionSync
  ) {
    this.logger.info('ModelSelectionIntegration initialized');
    this.modelVersionSync.logModelVersionReport();
  }
  
  /**
   * Analyze a repository with optimal model selection
   * 
   * @param repository Repository context
   * @param tier Analysis tier
   * @param strategy Optional strategy override
   * @returns Analysis result
   */
  async analyzeRepository(
    repository: RepositoryContext,
    tier: AnalysisTier = AnalysisTier.COMPREHENSIVE,
    strategy?: ModelSelectionStrategy
  ): Promise<AnalysisResult> {
    // Check if repository needs calibration
    const calibrationDecision = this.modelSelectionService.checkCalibrationNeeded(repository);
    
    // If calibration is needed and it's a quick calibration that can be done automatically
    if (calibrationDecision.requiresCalibration && 
        (calibrationDecision.calibrationType === 'partial' || 
         (calibrationDecision.estimatedCalibrationTime !== undefined && 
          calibrationDecision.estimatedCalibrationTime <= 5))) {
      
      this.logger.info('Auto-calibrating repository', {
        repository: `${repository.owner}/${repository.repo}`,
        calibrationType: calibrationDecision.calibrationType,
        estimatedTime: calibrationDecision.estimatedCalibrationTime
      });
      
      try {
        // Run quick calibration in the background
        this.runBackgroundCalibration(repository, calibrationDecision);
        
        // Use temporary config for current analysis
        const modelConfig = calibrationDecision.temporaryConfig || 
          this.modelSelectionService.getModelForRepository(repository, tier, strategy);
        
        // Standardize and run analysis with temporary config
        const standardizedConfig = this.standardizeModelConfig(modelConfig);
        return this.analysisService.analyzeRepository(repository, {
          depth: this.convertAnalysisTier(tier),
          modelConfig: standardizedConfig
        });
      } catch (error) {
        this.logger.error('Error during auto-calibration', {
          repository: `${repository.owner}/${repository.repo}`,
          error
        });
        
        // Continue with temporary config if calibration fails
        const modelConfig = calibrationDecision.temporaryConfig || 
          this.modelSelectionService.getModelForRepository(repository, tier, strategy);
        
        // Standardize config before using
        const standardizedConfig = this.standardizeModelConfig(modelConfig);
        return this.analysisService.analyzeRepository(repository, {
          depth: this.convertAnalysisTier(tier),
          modelConfig: standardizedConfig
        });
      }
    } else {
      // No calibration needed or calibration is too extensive to do automatically
      const modelConfig = calibrationDecision.requiresCalibration
        ? calibrationDecision.temporaryConfig
        : calibrationDecision.selectedConfig;
      
      // Use selected config or fall back to default
      const configToUse = modelConfig || 
        this.modelSelectionService.getModelForRepository(repository, tier, strategy);
      
      // Standardize and run analysis with the selected model
      const standardizedConfig = this.standardizeModelConfig(configToUse);
      return this.analysisService.analyzeRepository(repository, {
        depth: this.convertAnalysisTier(tier),
        modelConfig: standardizedConfig
      });
    }
  }
  
  /**
   * Analyze a PR with optimal model selection
   * 
   * @param repository Repository context
   * @param prId PR ID
   * @param prSize PR size in bytes
   * @param tier Analysis tier
   * @param strategy Optional strategy override
   * @returns Analysis result
   */
  async analyzePR(
    repository: RepositoryContext,
    prId: string,
    prSize: number,
    tier: AnalysisTier = AnalysisTier.QUICK,
    strategy?: ModelSelectionStrategy
  ): Promise<AnalysisResult> {
    // Check if repository needs calibration
    const calibrationDecision = this.modelSelectionService.checkCalibrationNeeded(repository);
    
    // If calibration is needed and it's a quick calibration
    if (calibrationDecision.requiresCalibration && 
        (calibrationDecision.calibrationType === 'partial' || 
         (calibrationDecision.estimatedCalibrationTime !== undefined && 
          calibrationDecision.estimatedCalibrationTime <= 5))) {
      
      this.logger.info('Auto-calibrating repository for PR analysis', {
        repository: `${repository.owner}/${repository.repo}`,
        prId,
        calibrationType: calibrationDecision.calibrationType,
        estimatedTime: calibrationDecision.estimatedCalibrationTime
      });
      
      try {
        // Run quick calibration in the background
        this.runBackgroundCalibration(repository, calibrationDecision);
      } catch (error) {
        this.logger.error('Error during auto-calibration for PR', {
          repository: `${repository.owner}/${repository.repo}`,
          prId,
          error
        });
      }
    }
    
    // Get model for PR analysis (whether calibration is needed or not)
    const modelConfig = this.modelSelectionService.getModelForPR(
      repository,
      prSize,
      tier,
      strategy
    );
    
    // Standardize and run PR analysis with the selected model
    const standardizedConfig = this.standardizeModelConfig(modelConfig);
    return this.analysisService.analyzePR(repository, prId, {
      depth: this.convertAnalysisTier(tier),
      modelConfig: standardizedConfig
    });
  }
  
  /**
   * Run calibration in the background
   * 
   * @param repository Repository context
   * @param decision Calibration decision
   */
  private async runBackgroundCalibration(
    repository: RepositoryContext,
    decision: CalibrationDecision
  ): Promise<void> {
    try {
      // Run calibration in the background
      const calibrationPromise = this.calibrationService.calibrateRepository(
        repository,
        decision,
        { 
          // Quick calibration options
          runsPerModel: 1, 
          evaluateQuality: false,
          timeout: 60,
          updateConfig: true
        }
      );
      
      // Log when calibration completes
      calibrationPromise.then(
        result => {
          this.logger.info('Background calibration completed', {
            repository: `${repository.owner}/${repository.repo}`,
            recommendedModel: `${result.recommendedConfig.provider}/${result.recommendedConfig.model}`
          });
        },
        error => {
          this.logger.error('Background calibration failed', {
            repository: `${repository.owner}/${repository.repo}`,
            error
          });
        }
      );
    } catch (error) {
      this.logger.error('Error starting background calibration', {
        repository: `${repository.owner}/${repository.repo}`,
        error
      });
    }
  }
  
  /**
   * Convert analysis tier to DeepWiki tier
   * 
   * @param tier Analysis tier
   * @returns DeepWiki tier
   */
  private convertAnalysisTier(tier: AnalysisTier): AnalysisDepth {
    switch (tier) {
      case AnalysisTier.QUICK:
        return AnalysisDepth.QUICK;
      case AnalysisTier.COMPREHENSIVE:
        return AnalysisDepth.COMPREHENSIVE;
      case AnalysisTier.TARGETED:
        return AnalysisDepth.TARGETED;
      default:
        return AnalysisDepth.COMPREHENSIVE;
    }
  }
  
  /**
   * Standardize model configuration to ensure using the canonical version
   * 
   * @param config Model configuration
   * @returns Standardized model configuration
   */
  private standardizeModelConfig(config: ModelConfig<DeepWikiProvider>): ModelConfig<DeepWikiProvider> {
    try {
      return this.modelVersionSync.standardizeModelConfig(config);
    } catch (error) {
      this.logger.warn('Error standardizing model config', { error });
      return config; // Return original if standardization fails
    }
  }
}

/**
 * Format repository size for display
 * 
 * @param sizeBytes Size in bytes
 * @returns Formatted size string
 */
// This function is defined but not used
function _formatRepositorySize(sizeBytes: number): string {
  if (sizeBytes < 1024) {
    return `${sizeBytes} bytes`;
  } else if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  } else if (sizeBytes < 1024 * 1024 * 1024) {
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  } else {
    return `${(sizeBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
}
