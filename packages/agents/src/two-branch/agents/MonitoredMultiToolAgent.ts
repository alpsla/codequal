/**
 * MonitoredMultiToolAgent - Wrapper for BaseMultiToolAgent with monitoring integration
 * 
 * Provides automatic monitoring, performance tracking, and cost calculation
 * for all tool executions in the two-branch analysis system.
 */

import { BaseMultiToolAgent, AgentAnalysisResult, ToolResult } from './BaseMultiToolAgent';
import { UnifiedMonitoringService } from '../../standard/monitoring/services/unified-monitoring.service';
import { logger } from '../utils/logger';

export interface MonitoringConfig {
  enabled: boolean;
  trackPerformance: boolean;
  trackCosts: boolean;
  trackErrors: boolean;
  costPerTool?: Map<string, number>;
}

export interface MonitoredToolResult extends ToolResult {
  monitoring?: {
    executionId: string;
    startTime: number;
    endTime: number;
    memoryUsed: number;
    cost?: number;
  };
}

export abstract class MonitoredMultiToolAgent extends BaseMultiToolAgent {
  protected monitoring: UnifiedMonitoringService;
  protected monitoringConfig: MonitoringConfig;
  
  // Default cost configuration for paid tools (USD per execution)
  protected static readonly DEFAULT_TOOL_COSTS = new Map<string, number>([
    ['snyk', 0.01],
    ['sonarqube', 0.005],
    ['veracode', 0.02],
    ['checkmarx', 0.015],
    ['fortify', 0.018],
    ['blackduck', 0.025],
    ['coverity', 0.03],
    ['prisma-cloud', 0.012],
  ]);

  constructor(monitoringConfig?: Partial<MonitoringConfig>) {
    super();
    
    this.monitoring = UnifiedMonitoringService.getInstance();
    this.monitoringConfig = {
      enabled: process.env.ENABLE_MONITORING !== 'false',
      trackPerformance: true,
      trackCosts: true,
      trackErrors: true,
      costPerTool: MonitoredMultiToolAgent.DEFAULT_TOOL_COSTS,
      ...monitoringConfig
    };
  }

  /**
   * Override the analyze method to add monitoring
   */
  public async analyze(input: {
    targetPath?: string;
    findings?: any[];
    language: string;
    context?: any;
  }): Promise<AgentAnalysisResult> {
    const analysisId = `${this.agentName}-${Date.now()}`;
    const startTime = Date.now();
    
    // Start monitoring the analysis
    if (this.monitoringConfig.enabled) {
      this.monitoring.startPerformance(analysisId);
      
      // Track analysis start
      this.monitoring.startAnalysis(
        input.targetPath || 'unknown',
        input.context?.prNumber,
        input.context?.branch
      );
    }

    try {
      // Execute the actual analysis (implemented by subclass)
      const result = await this.executeAnalysis(input);
      
      // Track successful completion
      if (this.monitoringConfig.enabled) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        this.monitoring.endPerformance(analysisId, true);
        
        // Track analysis metrics
        this.monitoring.endAnalysis(
          input.targetPath || 'unknown',
          true,
          {
            issuesFound: result.issues?.length || 0,
            iterations: result.metadata?.iterations,
            locationsResolved: result.metadata?.locationsResolved,
            locationsUnresolved: result.metadata?.locationsUnresolved
          }
        );
        
        // Track costs if applicable
        this.trackToolCosts(result);
        
        // Log performance metrics
        logger.info(`[${this.agentName}] Analysis completed in ${duration}ms with ${result.issues?.length || 0} issues`);
      }
      
      return result;
      
    } catch (error) {
      // Track failure
      if (this.monitoringConfig.enabled) {
        this.monitoring.endPerformance(analysisId, false, error.message);
        
        this.monitoring.endAnalysis(
          input.targetPath || 'unknown',
          false,
          {
            error: error.message
          }
        );
        
        if (this.monitoringConfig.trackErrors) {
          this.monitoring.trackError({
            agent: this.agentName,
            error: error.message,
            stack: error.stack,
            context: input
          });
        }
      }
      
      logger.error(`[${this.agentName}] Analysis failed:`, error);
      throw error;
    }
  }

  /**
   * Abstract method to be implemented by subclasses
   */
  protected abstract executeAnalysis(input: {
    targetPath?: string;
    findings?: any[];
    language: string;
    context?: any;
  }): Promise<AgentAnalysisResult>;

  /**
   * Override runToolsInParallel to add per-tool monitoring
   */
  protected async runToolsInParallel(
    targetPath: string,
    language: string,
    options?: {
      includeTools?: string[];
      excludeTools?: string[];
      timeout?: number;
    }
  ): Promise<ToolResult[]> {
    const results = await super.runToolsInParallel(targetPath, language, options);
    
    // Add monitoring data to each result
    if (this.monitoringConfig.enabled && this.monitoringConfig.trackPerformance) {
      results.forEach(result => {
        const monitoredResult = result as MonitoredToolResult;
        
        // Track tool execution
        this.monitoring.trackPerformance({
          operation: `${this.agentName}.${result.tool}`,
          duration: result.metadata?.executionTime || 0,
          success: !result.metadata?.errors?.length,
          metadata: {
            findingsCount: result.findings?.length || 0,
            language,
            targetPath
          }
        });
      });
    }
    
    return results;
  }

  /**
   * Track costs for tools that have associated costs
   */
  protected trackToolCosts(result: AgentAnalysisResult): void {
    if (!this.monitoringConfig.trackCosts || !this.monitoringConfig.costPerTool) {
      return;
    }

    result.tools?.forEach(toolName => {
      const cost = this.monitoringConfig.costPerTool?.get(toolName.toLowerCase());
      
      if (cost) {
        this.monitoring.trackCost(
          this.getServiceProvider(toolName),
          `${this.agentName}.${toolName}`,
          {
            cost,
            metadata: {
              agent: this.agentName,
              tool: toolName,
              issuesFound: result.issues?.filter(i => 
                i.sources?.includes(toolName)
              ).length || 0
            }
          }
        );
      }
    });
  }

  /**
   * Map tool names to service providers for cost tracking
   */
  protected getServiceProvider(toolName: string): 'deepwiki' | 'openrouter' | 'redis' | 'supabase' {
    // Map tools to their service providers
    const providers = {
      'snyk': 'deepwiki',
      'sonarqube': 'deepwiki',
      'veracode': 'deepwiki',
      'checkmarx': 'deepwiki',
      'fortify': 'deepwiki',
    };
    
    return providers[toolName.toLowerCase()] || 'deepwiki';
  }

  /**
   * Get monitoring metrics for this agent
   */
  public getMonitoringMetrics(): {
    totalExecutions: number;
    averageDuration: number;
    successRate: number;
    totalCost: number;
    errorRate: number;
  } {
    if (!this.monitoringConfig.enabled) {
      return {
        totalExecutions: 0,
        averageDuration: 0,
        successRate: 0,
        totalCost: 0,
        errorRate: 0
      };
    }

    const metrics = this.monitoring.getAggregatedMetrics();
    
    // Filter metrics for this agent
    const agentMetrics = {
      totalExecutions: metrics.performance.totalOperations,
      averageDuration: metrics.performance.averageDuration,
      successRate: metrics.performance.successRate,
      totalCost: metrics.cost.totalCost,
      errorRate: 100 - metrics.performance.successRate
    };
    
    return agentMetrics;
  }

  /**
   * Mark a tool as tested for coverage tracking
   */
  public markToolAsTested(
    toolName: string,
    language: string,
    testResults: {
      passed: boolean;
      coverage: number;
      failures?: string[];
    }
  ): void {
    if (!this.monitoringConfig.enabled) {
      return;
    }

    // This would integrate with the test validation tracking
    this.monitoring.trackPerformance({
      operation: `test.${this.agentName}.${toolName}`,
      duration: 0,
      success: testResults.passed,
      metadata: {
        agent: this.agentName,
        tool: toolName,
        language,
        coverage: testResults.coverage,
        failures: testResults.failures
      }
    });
    
    logger.info(`[${this.agentName}] Tool ${toolName} marked as tested with ${testResults.coverage}% coverage`);
  }

  /**
   * Export monitoring data for reporting
   */
  public exportMonitoringData(format: 'json' | 'csv' = 'json'): string {
    if (!this.monitoringConfig.enabled) {
      return format === 'json' ? '{}' : '';
    }

    const metrics = this.getMonitoringMetrics();
    
    if (format === 'json') {
      return JSON.stringify({
        agent: this.agentName,
        metrics,
        timestamp: new Date().toISOString()
      }, null, 2);
    } else {
      // CSV format
      const headers = ['Metric', 'Value'];
      const rows = Object.entries(metrics).map(([key, value]) => [key, value]);
      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
  }
}