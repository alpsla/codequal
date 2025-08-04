/**
 * Model Selection Service
 * 
 * This service runs independently via scheduler to evaluate and update model configurations.
 * It works with the Researcher Agent to evaluate models quarterly and stores the results
 * in Supabase. The orchestrator simply pulls these configurations without any validation.
 * 
 * Flow:
 * 1. Scheduler triggers quarterly evaluation (every 3 months)
 * 2. Researcher Agent evaluates current models
 * 3. Results are stored in Supabase configuration
 * 4. Orchestrator pulls configuration when initialized (no evaluation)
 * 
 * This service runs INDEPENDENTLY of the orchestrator.
 */

import { IConfigProvider } from '../orchestrator/interfaces/config-provider.interface';
import { ResearcherAgent } from '../../researcher/researcher-agent';
import { ModelSelection, AnalysisConfig } from '../orchestrator/interfaces/config-provider.interface';
import { IMonitoringService } from './interfaces/monitoring-service.interface';

export interface ModelEvaluationResult {
  modelId: string;
  provider: string;
  score: number;
  benchmarks: {
    quality: number;
    speed: number;
    cost: number;
    recency: number;
  };
  reasoning: string;
  evaluatedAt: Date;
}

export interface IModelSelectionService {
  /**
   * Run quarterly model evaluation
   */
  runQuarterlyEvaluation(): Promise<ModelEvaluationResult[]>;
  
  /**
   * Get current best model for a specific task
   */
  getBestModel(taskType: string, repoType: string): Promise<ModelSelection>;
  
  /**
   * Check if evaluation is due
   */
  isEvaluationDue(): Promise<boolean>;
  
  /**
   * Get last evaluation date
   */
  getLastEvaluationDate(): Promise<Date | null>;
}

export class ModelSelectionService implements IModelSelectionService {
  private readonly EVALUATION_INTERVAL_DAYS = 90; // 3 months
  
  constructor(
    private configProvider: IConfigProvider,
    private researcherAgent: ResearcherAgent,
    private logger?: any,
    private monitoringService?: IMonitoringService
  ) {}
  
  async runQuarterlyEvaluation(): Promise<ModelEvaluationResult[]> {
    this.log('info', 'Starting quarterly model evaluation');
    const startTime = Date.now();
    
    try {
      // Get current model landscape from researcher
      const research = await this.researcherAgent.research();
      
      // Evaluate different model types
      const evaluations: ModelEvaluationResult[] = [];
      
      // Evaluate for different repository types
      const repoTypes = ['node-fullstack', 'python-backend', 'java-enterprise', 'general'];
      const taskTypes = ['comparison', 'security-audit', 'performance-analysis'];
      
      for (const repoType of repoTypes) {
        for (const taskType of taskTypes) {
          const evaluation = await this.evaluateModelForTask(
            research,
            taskType,
            repoType
          );
          evaluations.push(evaluation);
          
          // Update configuration with best model
          await this.updateModelConfiguration(evaluation, taskType, repoType);
        }
      }
      
      // Store evaluation timestamp
      await this.storeEvaluationTimestamp(new Date());
      
      const duration = Date.now() - startTime;
      this.log('info', 'Quarterly evaluation completed', {
        modelsEvaluated: evaluations.length,
        timestamp: new Date(),
        duration
      });
      
      // Record success metrics
      if (this.monitoringService) {
        await this.monitoringService.metric({
          name: 'researcher.evaluation.success',
          value: 1,
          tags: { component: 'model-selection-service' }
        });
        await this.monitoringService.metric({
          name: 'researcher.evaluation.duration',
          value: duration,
          unit: 'ms',
          tags: { component: 'model-selection-service' }
        });
      }
      
      return evaluations;
      
    } catch (error) {
      this.log('error', 'Quarterly evaluation failed', error);
      
      // Send alert
      if (this.monitoringService) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        
        await this.monitoringService.alert({
          severity: 'critical',
          component: 'model-selection-service',
          message: `Failed to complete model evaluation: ${errorMessage}`,
          metadata: {
            error: errorStack || error,
            timestamp: new Date(),
            lastSuccessfulEvaluation: await this.getLastEvaluationDate()
          }
        });
        
        await this.monitoringService.metric({
          name: 'researcher.evaluation.failure',
          value: 1,
          tags: { component: 'model-selection-service' }
        });
      }
      
      throw error;
    }
  }
  
  async getBestModel(taskType: string, repoType: string): Promise<ModelSelection> {
    // First check if we have a stored configuration
    const config = await this.configProvider.getConfig('system', repoType);
    
    if (config && config.modelPreferences) {
      return config.modelPreferences.primary;
    }
    
    // If no config, check if evaluation is due
    if (await this.isEvaluationDue()) {
      this.log('info', 'Model evaluation is due, triggering evaluation');
      await this.runQuarterlyEvaluation();
      
      // Try again after evaluation
      const updatedConfig = await this.configProvider.getConfig('system', repoType);
      if (updatedConfig && updatedConfig.modelPreferences) {
        return updatedConfig.modelPreferences.primary;
      }
    }
    
    // Return default if all else fails
    return {
      provider: 'openai',
      modelId: 'gpt-4o',
      temperature: 0.3,
      maxTokens: 4000
    };
  }
  
  async isEvaluationDue(): Promise<boolean> {
    const lastEvaluation = await this.getLastEvaluationDate();
    
    if (!lastEvaluation) {
      return true; // Never evaluated
    }
    
    const daysSinceLastEvaluation = Math.floor(
      (Date.now() - lastEvaluation.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    return daysSinceLastEvaluation >= this.EVALUATION_INTERVAL_DAYS;
  }
  
  async getLastEvaluationDate(): Promise<Date | null> {
    // Get from system configuration
    const config = await this.configProvider.getConfig('system', 'evaluation');
    
    // For now, use updatedAt as a proxy for last evaluation date
    if (config && config.updatedAt) {
      return config.updatedAt;
    }
    
    return null;
  }
  
  private async evaluateModelForTask(
    research: any,
    taskType: string,
    repoType: string
  ): Promise<ModelEvaluationResult> {
    // In a real implementation, this would run benchmarks
    // For now, we'll use the researcher's recommendation
    
    const score = this.calculateModelScore(research, taskType, repoType);
    
    return {
      modelId: research.model,
      provider: research.provider,
      score,
      benchmarks: {
        quality: 0.9,
        speed: 0.8,
        cost: 0.7,
        recency: 1.0
      },
      reasoning: `Selected ${research.model} for ${taskType} in ${repoType} repositories based on quarterly evaluation`,
      evaluatedAt: new Date()
    };
  }
  
  private calculateModelScore(research: any, taskType: string, repoType: string): number {
    // Simple scoring algorithm
    let score = 0.8; // Base score
    
    // Adjust based on task type
    if (taskType === 'security-audit') {
      score += 0.1; // Premium for security tasks
    }
    
    // Adjust based on repo complexity
    if (repoType === 'java-enterprise') {
      score += 0.05; // Complex repos need better models
    }
    
    return Math.min(score, 1.0);
  }
  
  private async updateModelConfiguration(
    evaluation: ModelEvaluationResult,
    taskType: string,
    repoType: string
  ): Promise<void> {
    const config: AnalysisConfig = {
      userId: 'system',
      teamId: 'default',
      repoType,
      language: this.getLanguageForRepoType(repoType),
      modelPreferences: {
        primary: {
          provider: evaluation.provider,
          modelId: evaluation.modelId,
          temperature: 0.3,
          maxTokens: 4000
        },
        fallback: {
          provider: 'openai',
          modelId: 'gpt-4-turbo',
          temperature: 0.3,
          maxTokens: 4000
        }
      },
      weights: {
        security: 0.25,
        performance: 0.20,
        codeQuality: 0.25,
        architecture: 0.20,
        dependencies: 0.10
      },
      thresholds: {
        critical: 90,
        high: 70,
        medium: 50,
        low: 30
      },
      features: {
        enableEducation: true,
        enableSkillTracking: true,
        enableDependencyAnalysis: true,
        enableArchitectureReview: true,
        enablePerformanceProfiling: true
      },
      version: '2.0',
      updatedAt: evaluation.evaluatedAt
    };
    
    await this.configProvider.saveConfig(config);
  }
  
  private async storeEvaluationTimestamp(timestamp: Date): Promise<void> {
    const evaluationConfig: AnalysisConfig = {
      userId: 'system',
      teamId: 'default',
      repoType: 'evaluation',
      language: 'none',
      modelPreferences: {
        primary: {
          provider: 'none',
          modelId: 'none'
        }
      },
      weights: {
        security: 0,
        performance: 0,
        codeQuality: 0,
        architecture: 0,
        dependencies: 0
      },
      thresholds: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      },
      features: {
        enableEducation: false,
        enableSkillTracking: false,
        enableDependencyAnalysis: false,
        enableArchitectureReview: false,
        enablePerformanceProfiling: false
      },
      version: '1.0',
      updatedAt: timestamp
    };
    
    await this.configProvider.saveConfig(evaluationConfig);
  }
  
  private getLanguageForRepoType(repoType: string): string {
    const languageMap: Record<string, string> = {
      'node-fullstack': 'typescript',
      'python-backend': 'python',
      'java-enterprise': 'java',
      'general': 'mixed'
    };
    
    return languageMap[repoType] || 'unknown';
  }
  
  private log(level: string, message: string, data?: any) {
    if (this.logger) {
      this.logger[level](message, data);
    } else {
      console.log(`[ModelSelectionService] ${level}: ${message}`, data || '');
    }
  }
}