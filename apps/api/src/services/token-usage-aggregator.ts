/**
 * Token Usage Aggregator
 * 
 * This service aggregates token usage data from the EnhancedMultiAgentExecutor
 * and prepares it for storage and reporting in the ResultOrchestrator.
 */

import { createLogger, Logger } from '@codequal/core/utils';
import { ModelTokenTracker, TokenUsageSummary } from '@codequal/agents';

/**
 * Aggregated token usage data for a complete analysis
 */
export interface AggregatedTokenUsage {
  analysisId: string;
  totalTokens: number;
  totalCost: number;
  byAgent: Record<string, {
    tokens: number;
    cost: number;
    model: string;
    provider: string;
    executionCount: number;
    fallbackUsed: boolean;
  }>;
  byModel: Record<string, {
    tokens: number;
    cost: number;
    executions: number;
    agents: string[];
  }>;
  fallbackStats: {
    totalFallbacks: number;
    fallbackCost: number;
    fallbackTokens: number;
    fallbacksByAgent: Record<string, number>;
  };
  timestamp: Date;
  duration: number;
}

/**
 * Service for aggregating token usage across multiple agents
 */
export class TokenUsageAggregator {
  private readonly logger: Logger;
  
  constructor() {
    this.logger = createLogger('TokenUsageAggregator');
  }
  
  /**
   * Aggregate token usage from multi-agent execution results
   */
  async aggregateUsage(
    analysisId: string,
    executionResults: any,
    tokenTracker?: ModelTokenTracker,
    duration?: number
  ): Promise<AggregatedTokenUsage | null> {
    try {
      // Get summary from token tracker if available
      let tokenSummary: TokenUsageSummary | null = null;
      if (tokenTracker) {
        try {
          tokenSummary = await tokenTracker.getSummary(analysisId);
        } catch (error) {
          this.logger.warn('Failed to get token summary from tracker', {
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
      
      // Initialize aggregated data
      const aggregated: AggregatedTokenUsage = {
        analysisId,
        totalTokens: 0,
        totalCost: 0,
        byAgent: {},
        byModel: {},
        fallbackStats: {
          totalFallbacks: 0,
          fallbackCost: 0,
          fallbackTokens: 0,
          fallbacksByAgent: {}
        },
        timestamp: new Date(),
        duration: duration || 0
      };
      
      // Use token tracker data if available
      if (tokenSummary) {
        aggregated.totalTokens = tokenSummary.totalTokens;
        aggregated.totalCost = tokenSummary.totalCost;
        
        // Aggregate by agent
        for (const [role, stats] of Object.entries(tokenSummary.agentBreakdown)) {
          aggregated.byAgent[role] = {
            tokens: stats.tokens.total,
            cost: stats.cost,
            model: 'dynamic', // Model is selected dynamically
            provider: 'openrouter',
            executionCount: stats.executions,
            fallbackUsed: false // Will be updated from fallback stats
          };
        }
        
        // Aggregate by model
        for (const [modelKey, stats] of Object.entries(tokenSummary.modelBreakdown)) {
          aggregated.byModel[modelKey] = {
            tokens: stats.tokens.total,
            cost: stats.cost.total,
            executions: stats.executions,
            agents: [] // We don't have agent mapping in the current structure
          };
        }
        
        // Copy fallback stats
        aggregated.fallbackStats = {
          totalFallbacks: tokenSummary.fallbackStats.totalFallbacks,
          fallbackCost: tokenSummary.fallbackStats.fallbackCost,
          fallbackTokens: tokenSummary.fallbackStats.fallbackTokens,
          fallbacksByAgent: {}
        };
        
        // Update fallback usage in byAgent
        for (const [reason, count] of Object.entries(tokenSummary.fallbackStats.fallbackReasons)) {
          // Extract agent from reason if possible
          const agentMatch = reason.match(/agent[:\s]+(\w+)/i);
          if (agentMatch) {
            const agent = agentMatch[1];
            aggregated.fallbackStats.fallbacksByAgent[agent] = 
              (aggregated.fallbackStats.fallbacksByAgent[agent] || 0) + count;
            
            if (aggregated.byAgent[agent]) {
              aggregated.byAgent[agent].fallbackUsed = true;
            }
          }
        }
      }
      
      // Fallback: Extract from execution results if no token tracker data
      if (!tokenSummary && executionResults) {
        this.extractFromExecutionResults(executionResults, aggregated);
      }
      
      // Log summary
      this.logger.info('Token usage aggregated', {
        analysisId,
        totalTokens: aggregated.totalTokens,
        totalCost: aggregated.totalCost.toFixed(4),
        agentCount: Object.keys(aggregated.byAgent).length,
        modelCount: Object.keys(aggregated.byModel).length,
        fallbackCount: aggregated.fallbackStats.totalFallbacks
      });
      
      return aggregated;
      
    } catch (error) {
      this.logger.error('Failed to aggregate token usage', {
        analysisId,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }
  
  /**
   * Extract token usage from execution results (fallback method)
   */
  private extractFromExecutionResults(
    executionResults: any,
    aggregated: AggregatedTokenUsage
  ): void {
    // Try to extract from results.results which contains agent results
    const agentResults = executionResults.results || {};
    
    for (const [agentId, result] of Object.entries(agentResults)) {
      if (typeof result !== 'object' || !result) continue;
      
      const agentResult = result as any;
      
      // Try to find token usage in various places
      const tokenUsage = 
        agentResult.tokenUsage ||
        agentResult.result?.tokenUsage ||
        agentResult.metadata?.tokenUsage ||
        agentResult.resources?.tokenUsage;
      
      if (tokenUsage && typeof tokenUsage === 'object') {
        const tokens = tokenUsage.total || 
                       (tokenUsage.input + tokenUsage.output) || 
                       0;
        
        const cost = agentResult.cost || 
                    agentResult.resources?.estimatedCost ||
                    (tokens / 1000) * 0.002; // Default estimate
        
        aggregated.totalTokens += tokens;
        aggregated.totalCost += cost;
        
        // Extract agent role from agentId or config
        const agentRole = agentResult.agentConfig?.role || 
                         agentResult.config?.role ||
                         agentId.split('-').pop() || 
                         agentId;
        
        aggregated.byAgent[agentRole] = {
          tokens,
          cost,
          model: agentResult.model || 'unknown',
          provider: agentResult.provider || 'openrouter',
          executionCount: 1,
          fallbackUsed: agentResult.usedFallback || false
        };
        
        // Update fallback stats
        if (agentResult.usedFallback) {
          aggregated.fallbackStats.totalFallbacks++;
          aggregated.fallbackStats.fallbackCost += cost;
          aggregated.fallbackStats.fallbackTokens += tokens;
          aggregated.fallbackStats.fallbacksByAgent[agentRole] = 1;
        }
      }
    }
  }
  
  /**
   * Format usage data for reporting
   */
  formatUsageReport(usage: AggregatedTokenUsage): string {
    let report = '## Token Usage Summary\n\n';
    
    report += `- **Analysis ID:** ${usage.analysisId}\n`;
    report += `- **Total Tokens:** ${usage.totalTokens.toLocaleString()}\n`;
    report += `- **Total Cost:** $${usage.totalCost.toFixed(4)}\n`;
    report += `- **Duration:** ${(usage.duration / 1000).toFixed(1)}s\n`;
    report += `- **Timestamp:** ${usage.timestamp.toISOString()}\n\n`;
    
    if (Object.keys(usage.byAgent).length > 0) {
      report += '### Usage by Agent\n\n';
      report += '| Agent | Tokens | Cost | Model | Fallback |\n';
      report += '|-------|--------|------|-------|----------|\n';
      
      for (const [agent, stats] of Object.entries(usage.byAgent)) {
        report += `| ${agent} | ${stats.tokens.toLocaleString()} | $${stats.cost.toFixed(4)} | ${stats.model} | ${stats.fallbackUsed ? 'Yes' : 'No'} |\n`;
      }
      report += '\n';
    }
    
    if (Object.keys(usage.byModel).length > 0) {
      report += '### Usage by Model\n\n';
      report += '| Model | Tokens | Cost | Executions |\n';
      report += '|-------|--------|------|------------|\n';
      
      for (const [model, stats] of Object.entries(usage.byModel)) {
        report += `| ${model} | ${stats.tokens.toLocaleString()} | $${stats.cost.toFixed(4)} | ${stats.executions} |\n`;
      }
      report += '\n';
    }
    
    if (usage.fallbackStats.totalFallbacks > 0) {
      report += '### Fallback Usage\n\n';
      report += `- **Total Fallbacks:** ${usage.fallbackStats.totalFallbacks}\n`;
      report += `- **Fallback Cost:** $${usage.fallbackStats.fallbackCost.toFixed(4)}\n`;
      report += `- **Fallback Tokens:** ${usage.fallbackStats.fallbackTokens.toLocaleString()}\n\n`;
    }
    
    return report;
  }
}

// Export singleton instance
let aggregatorInstance: TokenUsageAggregator | null = null;

export function getTokenUsageAggregator(): TokenUsageAggregator {
  if (!aggregatorInstance) {
    aggregatorInstance = new TokenUsageAggregator();
  }
  return aggregatorInstance;
}