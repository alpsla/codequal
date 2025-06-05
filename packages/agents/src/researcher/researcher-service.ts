/**
 * RESEARCHER Service - Service layer for managing the RESEARCHER agent
 * 
 * This service integrates the RESEARCHER agent with the broader system:
 * 1. Manages scheduled research operations
 * 2. Provides API endpoints for manual research triggers
 * 3. Handles configuration persistence to Vector DB
 * 4. Monitors research performance and results
 */

import { AuthenticatedUser } from '@codequal/core/types';
import { Logger, createLogger } from '@codequal/core/utils';
import { ResearcherAgent, ResearchConfig } from './researcher-agent';
import { VectorContextService } from '../multi-agent/vector-context-service';
import { CANONICAL_MODEL_VERSIONS } from '@codequal/core/services/model-selection/ModelVersionSync';

// Special repository UUID for storing researcher configurations
const RESEARCHER_CONFIG_REPO_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Research operation result
 */
export interface ResearchOperation {
  /**
   * Unique operation ID
   */
  operationId: string;
  
  /**
   * User who triggered the research
   */
  userId: string;
  
  /**
   * Start timestamp
   */
  startedAt: Date;
  
  /**
   * End timestamp
   */
  completedAt?: Date;
  
  /**
   * Operation status
   */
  status: 'running' | 'completed' | 'failed';
  
  /**
   * Number of configurations updated
   */
  configurationsUpdated: number;
  
  /**
   * Total cost savings achieved
   */
  totalCostSavings: number;
  
  /**
   * Performance improvements count
   */
  performanceImprovements: number;
  
  /**
   * Error message if failed
   */
  error?: string;
}

/**
 * RESEARCHER Service implementation
 */
export class ResearcherService {
  private logger: Logger;
  private activeOperations: Map<string, ResearchOperation> = new Map();
  private researchHistory: ResearchOperation[] = [];
  
  constructor(
    private authenticatedUser: AuthenticatedUser,
    private vectorContextService?: VectorContextService
  ) {
    this.logger = createLogger('ResearcherService');
    this.logger.info('RESEARCHER Service initialized', {
      userId: this.authenticatedUser.id,
      configRepoId: RESEARCHER_CONFIG_REPO_ID
    });
  }
  
  /**
   * Trigger a manual research and configuration update
   */
  async triggerResearch(config?: Partial<ResearchConfig>): Promise<{
    operationId: string;
    status: 'started';
    estimatedDuration: string;
  }> {
    const operationId = `research_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const operation: ResearchOperation = {
      operationId,
      userId: this.authenticatedUser.id,
      startedAt: new Date(),
      status: 'running',
      configurationsUpdated: 0,
      totalCostSavings: 0,
      performanceImprovements: 0
    };
    
    this.activeOperations.set(operationId, operation);
    
    this.logger.info('🚀 Starting manual research operation', {
      operationId,
      userId: this.authenticatedUser.id,
      config
    });
    
    // Execute research asynchronously
    this.executeResearch(operationId, config).catch(error => {
      this.logger.error('❌ Research operation failed', {
        operationId,
        error
      });
      
      const failedOperation = this.activeOperations.get(operationId);
      if (failedOperation) {
        failedOperation.status = 'failed';
        failedOperation.error = error.message;
        failedOperation.completedAt = new Date();
        
        this.researchHistory.push(failedOperation);
        this.activeOperations.delete(operationId);
      }
    });
    
    return {
      operationId,
      status: 'started',
      estimatedDuration: config?.researchDepth === 'deep' ? '10-15 minutes' : '3-5 minutes'
    };
  }
  
  /**
   * Execute the research operation
   */
  private async executeResearch(
    operationId: string,
    config?: Partial<ResearchConfig>
  ): Promise<void> {
    const operation = this.activeOperations.get(operationId);
    if (!operation) {
      throw new Error(`Operation ${operationId} not found`);
    }
    
    // Create RESEARCHER agent
    const researcherAgent = new ResearcherAgent(this.authenticatedUser, config);
    
    // Conduct research and update
    const result = await researcherAgent.conductResearchAndUpdate();
    
    // Update operation with results
    operation.status = 'completed';
    operation.completedAt = new Date();
    operation.configurationsUpdated = result.summary.configurationsUpdated;
    operation.totalCostSavings = result.summary.totalCostSavings;
    operation.performanceImprovements = Object.values(result.summary.performanceImprovements).reduce((sum, val) => sum + val, 0);
    
    // Store results in Vector DB if available
    if (this.vectorContextService) {
      await this.storeResearchResults(operationId, result);
    }
    
    // Move to history
    this.researchHistory.push(operation);
    this.activeOperations.delete(operationId);
    
    this.logger.info('✅ Research operation completed successfully', {
      operationId,
      summary: result.summary
    });
  }
  
  /**
   * Store research results in Vector DB using the proper repository UUID
   */
  private async storeResearchResults(
    operationId: string,
    result: any
  ): Promise<void> {
    if (!this.vectorContextService) return;
    
    try {
      // Transform configuration updates to analysis results format
      const analysisResults = result.configurationUpdates.map((update: any) => ({
        type: 'model_configuration',
        severity: 'high', // Model configs are high priority
        findings: [{
          type: `${update.context.language}/${update.context.sizeCategory}/${update.context.agentRole}`,
          severity: 'high',
          location: 'model_config',
          description: JSON.stringify({
            provider: update.recommendedModel.provider,
            model: update.recommendedModel.model,
            versionId: update.recommendedModel.versionId,
            capabilities: update.recommendedModel.capabilities,
            pricing: update.recommendedModel.pricing,
            tier: update.recommendedModel.tier,
            preferredFor: update.recommendedModel.preferredFor,
            reason: update.reason,
            previousModel: update.currentModel ? {
              provider: update.currentModel.provider,
              model: update.currentModel.model
            } : null
          }),
          suggestion: update.reason
        }],
        metrics: {
          ...update.expectedImprovement,
          priority: update.priority,
          operationId: operationId
        },
        recommendations: [
          update.reason,
          `Expected improvement: ${JSON.stringify(update.expectedImprovement)}`
        ],
        summary: `Optimal model configuration for ${update.context.language}/${update.context.sizeCategory}/${update.context.agentRole}: ${update.recommendedModel.provider}/${update.recommendedModel.model}`,
        categories: [
          'model_configuration',
          update.context.language,
          update.context.sizeCategory,
          update.context.agentRole,
          update.recommendedModel.provider
        ]
      }));

      // Add a summary result for the entire operation
      analysisResults.push({
        type: 'research_operation_summary',
        severity: 'high',
        findings: [{
          type: 'operation_summary',
          severity: 'high',
          location: 'research_operation',
          description: JSON.stringify({
            operationId,
            timestamp: new Date().toISOString(),
            modelsResearched: result.summary.modelsResearched,
            configurationsUpdated: result.summary.configurationsUpdated,
            totalCostSavings: result.summary.totalCostSavings,
            performanceImprovements: result.summary.performanceImprovements
          }),
          suggestion: `Research operation completed with ${result.summary.configurationsUpdated} configuration updates`
        }],
        metrics: result.summary,
        recommendations: [
          `Updated ${result.summary.configurationsUpdated} model configurations`,
          `Achieved ${result.summary.totalCostSavings}% average cost savings`,
          `Improved performance for ${result.summary.performanceImprovements} configurations`
        ],
        summary: `Research operation ${operationId} completed successfully`,
        categories: ['research_operation', 'summary']
      });

      // Store all results in the researcher configuration repository
      await this.vectorContextService.storeAnalysisResults(
        RESEARCHER_CONFIG_REPO_ID, // Use the proper UUID
        analysisResults,
        this.authenticatedUser.id
      );
      
      this.logger.info('📝 Stored research results in Vector DB', {
        operationId,
        repositoryId: RESEARCHER_CONFIG_REPO_ID,
        configurationsStored: result.configurationUpdates.length,
        totalResults: analysisResults.length
      });
      
    } catch (error) {
      this.logger.error('❌ Failed to store research results', {
        operationId,
        repositoryId: RESEARCHER_CONFIG_REPO_ID,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
  
  /**
   * Get status of a research operation
   */
  async getOperationStatus(operationId: string): Promise<ResearchOperation | null> {
    // Check active operations first
    const activeOperation = this.activeOperations.get(operationId);
    if (activeOperation) {
      return activeOperation;
    }
    
    // Check history
    const historicalOperation = this.researchHistory.find(op => op.operationId === operationId);
    return historicalOperation || null;
  }
  
  /**
   * Get all active research operations
   */
  async getActiveOperations(): Promise<ResearchOperation[]> {
    return Array.from(this.activeOperations.values());
  }
  
  /**
   * Get research operation history
   */
  async getOperationHistory(limit = 10): Promise<ResearchOperation[]> {
    return this.researchHistory
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .slice(0, limit);
  }
  
  /**
   * Start scheduled research operations
   */
  async startScheduledResearch(intervalHours = 24): Promise<void> {
    this.logger.info(`🕐 Starting scheduled research every ${intervalHours} hours`);
    
    // Initial research run
    try {
      await this.triggerResearch({
        researchDepth: 'comprehensive',
        prioritizeCost: true
      });
    } catch (error) {
      this.logger.error('❌ Initial scheduled research failed', { error });
    }
    
    // Set up recurring schedule
    setInterval(async () => {
      try {
        this.logger.info('🔄 Starting scheduled research update');
        await this.triggerResearch({
          researchDepth: 'comprehensive',
          prioritizeCost: true
        });
      } catch (error) {
        this.logger.error('❌ Scheduled research failed', { error });
      }
    }, intervalHours * 60 * 60 * 1000);
  }
  
  /**
   * Generate current configuration overview
   */
  async generateConfigurationOverview(): Promise<{
    totalConfigurations: number;
    configurationsByProvider: Record<string, number>;
    configurationsByRole: Record<string, number>;
    averageCostPerMillion: number;
    lastUpdated: Date | null;
  }> {
    try {
      // This would typically query the Vector DB for current configurations
      // For now, we'll generate a summary based on available data
      
      const configurations = Object.values(CANONICAL_MODEL_VERSIONS);
      
      const configurationsByProvider: Record<string, number> = {};
      const configurationsByRole: Record<string, number> = {};
      let totalCost = 0;
      let costCount = 0;
      
      for (const config of configurations) {
        const modelConfig = config as any; // Type assertion for configuration object
        
        // Count by provider
        configurationsByProvider[modelConfig.provider] = (configurationsByProvider[modelConfig.provider] || 0) + 1;
        
        // Count by preferred roles
        if (modelConfig.preferredFor) {
          for (const role of modelConfig.preferredFor) {
            configurationsByRole[role] = (configurationsByRole[role] || 0) + 1;
          }
        }
        
        // Calculate average cost
        if (modelConfig.pricing) {
          totalCost += (modelConfig.pricing.input + modelConfig.pricing.output) / 2;
          costCount++;
        }
      }
      
      const lastOperation = this.researchHistory[this.researchHistory.length - 1];
      
      return {
        totalConfigurations: configurations.length,
        configurationsByProvider,
        configurationsByRole,
        averageCostPerMillion: costCount > 0 ? totalCost / costCount : 0,
        lastUpdated: lastOperation?.completedAt || null
      };
      
    } catch (error) {
      this.logger.error('❌ Failed to generate configuration overview', { error });
      throw error;
    }
  }
  
  /**
   * Get recommended optimizations based on current usage patterns
   */
  async getRecommendedOptimizations(): Promise<{
    costOptimizations: Array<{
      context: string;
      currentCost: number;
      recommendedCost: number;
      savings: number;
    }>;
    performanceOptimizations: Array<{
      context: string;
      currentPerformance: number;
      recommendedPerformance: number;
      improvement: number;
    }>;
    outdatedConfigurations: Array<{
      context: string;
      currentModel: string;
      lastUpdated: Date;
      recommendedUpdate: string;
    }>;
  }> {
    // This would analyze current configurations and suggest optimizations
    // For now, return a structured response
    
    return {
      costOptimizations: [
        {
          context: 'typescript/small/security',
          currentCost: 10.0,
          recommendedCost: 2.5,
          savings: 75
        }
      ],
      performanceOptimizations: [
        {
          context: 'python/large/architecture',
          currentPerformance: 7.5,
          recommendedPerformance: 9.2,
          improvement: 22.7
        }
      ],
      outdatedConfigurations: [
        {
          context: 'java/medium/performance',
          currentModel: 'gpt-4',
          lastUpdated: new Date('2025-01-01'),
          recommendedUpdate: 'claude-3-5-sonnet'
        }
      ]
    };
  }
}
