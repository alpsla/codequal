/**
 * Model Token Tracker
 * 
 * This service tracks token usage and costs for all model executions,
 * including primary and fallback models. It integrates with Vector DB
 * to get real-time pricing information.
 */

import { createLogger, Logger } from '@codequal/core/utils';
import { ModelVersionSync, ModelPricing } from '@codequal/core/services/model-selection/ModelVersionSync';
import { VectorStorageService } from '@codequal/database';

// Import TokenUsage from token-usage-extractor to avoid duplicate export
import { TokenUsage } from './token-usage-extractor';

/**
 * Detailed token tracking record
 */
export interface TokenTrackingRecord {
  id: string;
  timestamp: Date;
  analysisId: string;
  agentRole: string;
  model: string;
  provider: string;
  tokenUsage: TokenUsage;
  cost: {
    input: number;
    output: number;
    total: number;
  };
  metadata: {
    isPrimary: boolean;
    isFallback: boolean;
    fallbackReason?: string;
    executionTime?: number;
    success: boolean;
    error?: string;
  };
}

/**
 * Aggregated token usage summary
 */
export interface TokenUsageSummary {
  analysisId: string;
  totalTokens: number;
  totalCost: number;
  modelBreakdown: Record<string, {
    model: string;
    provider: string;
    executions: number;
    tokens: TokenUsage;
    cost: {
      input: number;
      output: number;
      total: number;
    };
    primaryExecutions: number;
    fallbackExecutions: number;
  }>;
  agentBreakdown: Record<string, {
    tokens: TokenUsage;
    cost: number;
    executions: number;
  }>;
  fallbackStats: {
    totalFallbacks: number;
    fallbackCost: number;
    fallbackTokens: number;
    fallbackReasons: Record<string, number>;
  };
}

/**
 * Service for tracking model token usage and costs
 */
export class ModelTokenTracker {
  private readonly logger: Logger;
  private records: Map<string, TokenTrackingRecord[]> = new Map();
  private modelPricingCache: Map<string, ModelPricing> = new Map();
  
  constructor(
    private modelVersionSync: ModelVersionSync,
    private vectorStorage?: VectorStorageService
  ) {
    this.logger = createLogger('ModelTokenTracker');
  }
  
  /**
   * Track token usage for a model execution
   */
  async trackUsage(params: {
    analysisId: string;
    agentRole: string;
    model: string;
    provider: string;
    tokenUsage: TokenUsage;
    isPrimary: boolean;
    isFallback: boolean;
    fallbackReason?: string;
    executionTime?: number;
    success: boolean;
    error?: string;
  }): Promise<TokenTrackingRecord> {
    try {
      // Get pricing information from Vector DB
      const pricing = await this.getModelPricing(params.model);
      
      // Calculate costs
      const cost = {
        input: (params.tokenUsage.input / 1_000_000) * pricing.input,
        output: (params.tokenUsage.output / 1_000_000) * pricing.output,
        total: 0
      };
      cost.total = cost.input + cost.output;
      
      // Create tracking record
      const record: TokenTrackingRecord = {
        id: `${params.analysisId}-${params.agentRole}-${Date.now()}`,
        timestamp: new Date(),
        analysisId: params.analysisId,
        agentRole: params.agentRole,
        model: params.model,
        provider: params.provider,
        tokenUsage: params.tokenUsage,
        cost,
        metadata: {
          isPrimary: params.isPrimary,
          isFallback: params.isFallback,
          fallbackReason: params.fallbackReason,
          executionTime: params.executionTime,
          success: params.success,
          error: params.error
        }
      };
      
      // Store record
      const records = this.records.get(params.analysisId) || [];
      records.push(record);
      this.records.set(params.analysisId, records);
      
      // Log the tracking
      this.logger.info('Token usage tracked', {
        analysisId: params.analysisId,
        agentRole: params.agentRole,
        model: params.model,
        tokens: params.tokenUsage.total,
        cost: cost.total.toFixed(4),
        isFallback: params.isFallback
      });
      
      // Store in Vector DB if available
      if (this.vectorStorage) {
        await this.storeInVectorDB(record);
      }
      
      return record;
    } catch (error) {
      this.logger.error('Failed to track token usage', {
        error: error instanceof Error ? error.message : error,
        params
      });
      throw error;
    }
  }
  
  /**
   * Get model pricing from Vector DB or cache
   */
  private async getModelPricing(model: string): Promise<ModelPricing> {
    // Check cache first
    const cached = this.modelPricingCache.get(model);
    if (cached) {
      return cached;
    }
    
    try {
      // Try to get from Vector DB via ModelVersionSync
      const canonicalVersion = await this.modelVersionSync.getCanonicalVersion(
        model.includes('/') ? model.split('/')[0] : 'openrouter',
        model.includes('/') ? model.split('/').slice(1).join('/') : model
      );
      
      if (canonicalVersion && canonicalVersion.pricing) {
        const pricing: ModelPricing = {
          input: canonicalVersion.pricing.input,
          output: canonicalVersion.pricing.output
        };
        this.modelPricingCache.set(model, pricing);
        return pricing;
      }
      
      // Fallback to default pricing if not found
      const defaultPricing: ModelPricing = {
        input: 2.0, // $2 per 1M tokens
        output: 6.0 // $6 per 1M tokens
      };
      
      this.logger.warn('Using default pricing for model', { model });
      return defaultPricing;
    } catch (error) {
      this.logger.error('Failed to get model pricing', {
        model,
        error: error instanceof Error ? error.message : error
      });
      
      // Return conservative default pricing
      return {
        input: 3.0,
        output: 9.0
      };
    }
  }
  
  /**
   * Store tracking record in Vector DB
   */
  private async storeInVectorDB(record: TokenTrackingRecord): Promise<void> {
    if (!this.vectorStorage) {
      return;
    }
    
    try {
      // TODO: Implement Vector DB storage when VectorStorageService supports it
      // For now, just log that we would store it
      this.logger.debug('Would store token tracking record in Vector DB', {
        recordId: record.id,
        analysisId: record.analysisId,
        totalTokens: record.tokenUsage.total,
        totalCost: record.cost.total
      });
      
      // Commented out until VectorStorageService supports storeEmbedding method
      /*
      await this.vectorStorage.storeEmbedding({
        content: JSON.stringify(record),
        metadata: {
          content_type: 'token_tracking',
          analysis_id: record.analysisId,
          agent_role: record.agentRole,
          model: record.model,
          provider: record.provider,
          timestamp: record.timestamp.toISOString(),
          total_tokens: record.tokenUsage.total,
          total_cost: record.cost.total,
          is_fallback: record.metadata.isFallback,
          success: record.metadata.success
        },
        user: {
          id: 'system',
          email: 'system@codequal.ai'
        }
      });
      */
    } catch (error) {
      this.logger.error('Failed to store token tracking in Vector DB', {
        error: error instanceof Error ? error.message : error,
        recordId: record.id
      });
    }
  }
  
  /**
   * Get token usage summary for an analysis
   */
  async getSummary(analysisId: string): Promise<TokenUsageSummary> {
    const records = this.records.get(analysisId) || [];
    
    const summary: TokenUsageSummary = {
      analysisId,
      totalTokens: 0,
      totalCost: 0,
      modelBreakdown: {},
      agentBreakdown: {},
      fallbackStats: {
        totalFallbacks: 0,
        fallbackCost: 0,
        fallbackTokens: 0,
        fallbackReasons: {}
      }
    };
    
    // Process each record
    for (const record of records) {
      // Update totals
      summary.totalTokens += record.tokenUsage.total;
      summary.totalCost += record.cost.total;
      
      // Update model breakdown
      const modelKey = `${record.provider}/${record.model}`;
      if (!summary.modelBreakdown[modelKey]) {
        summary.modelBreakdown[modelKey] = {
          model: record.model,
          provider: record.provider,
          executions: 0,
          tokens: { input: 0, output: 0, total: 0 },
          cost: { input: 0, output: 0, total: 0 },
          primaryExecutions: 0,
          fallbackExecutions: 0
        };
      }
      
      const modelStats = summary.modelBreakdown[modelKey];
      modelStats.executions++;
      modelStats.tokens.input += record.tokenUsage.input;
      modelStats.tokens.output += record.tokenUsage.output;
      modelStats.tokens.total += record.tokenUsage.total;
      modelStats.cost.input += record.cost.input;
      modelStats.cost.output += record.cost.output;
      modelStats.cost.total += record.cost.total;
      
      if (record.metadata.isPrimary) {
        modelStats.primaryExecutions++;
      }
      if (record.metadata.isFallback) {
        modelStats.fallbackExecutions++;
      }
      
      // Update agent breakdown
      if (!summary.agentBreakdown[record.agentRole]) {
        summary.agentBreakdown[record.agentRole] = {
          tokens: { input: 0, output: 0, total: 0 },
          cost: 0,
          executions: 0
        };
      }
      
      const agentStats = summary.agentBreakdown[record.agentRole];
      agentStats.tokens.input += record.tokenUsage.input;
      agentStats.tokens.output += record.tokenUsage.output;
      agentStats.tokens.total += record.tokenUsage.total;
      agentStats.cost += record.cost.total;
      agentStats.executions++;
      
      // Update fallback stats
      if (record.metadata.isFallback) {
        summary.fallbackStats.totalFallbacks++;
        summary.fallbackStats.fallbackCost += record.cost.total;
        summary.fallbackStats.fallbackTokens += record.tokenUsage.total;
        
        const reason = record.metadata.fallbackReason || 'unknown';
        summary.fallbackStats.fallbackReasons[reason] = 
          (summary.fallbackStats.fallbackReasons[reason] || 0) + 1;
      }
    }
    
    return summary;
  }
  
  /**
   * Get detailed records for an analysis
   */
  getRecords(analysisId: string): TokenTrackingRecord[] {
    return this.records.get(analysisId) || [];
  }
  
  /**
   * Clear records for an analysis (for memory management)
   */
  clearRecords(analysisId: string): void {
    this.records.delete(analysisId);
  }
  
  /**
   * Get aggregated statistics across all analyses
   */
  async getAggregatedStats(): Promise<{
    totalTokens: number;
    totalCost: number;
    primaryTokens: number;
    primaryCost: number;
    analysisCount: number;
    modelBreakdown: Record<string, any>;
    fallbackStats: {
      totalFallbacks: number;
      fallbackCost: number;
      fallbackTokens: number;
    };
  }> {
    let totalTokens = 0;
    let totalCost = 0;
    let primaryTokens = 0;
    let primaryCost = 0;
    const analysisCount = this.records.size;
    const modelBreakdown: Record<string, any> = {};
    const fallbackStats = {
      totalFallbacks: 0,
      fallbackCost: 0,
      fallbackTokens: 0
    };
    
    // Aggregate across all analyses
    for (const [analysisId, records] of this.records) {
      for (const record of records) {
        totalTokens += record.tokenUsage.total;
        totalCost += record.cost.total;
        
        if (record.metadata.isPrimary) {
          primaryTokens += record.tokenUsage.total;
          primaryCost += record.cost.total;
        }
        
        if (record.metadata.isFallback) {
          fallbackStats.totalFallbacks++;
          fallbackStats.fallbackCost += record.cost.total;
          fallbackStats.fallbackTokens += record.tokenUsage.total;
        }
        
        // Update model breakdown
        const modelKey = `${record.provider}/${record.model}`;
        if (!modelBreakdown[modelKey]) {
          modelBreakdown[modelKey] = {
            tokens: 0,
            cost: 0,
            executions: 0
          };
        }
        modelBreakdown[modelKey].tokens += record.tokenUsage.total;
        modelBreakdown[modelKey].cost += record.cost.total;
        modelBreakdown[modelKey].executions++;
      }
    }
    
    return {
      totalTokens,
      totalCost,
      primaryTokens,
      primaryCost,
      analysisCount,
      modelBreakdown,
      fallbackStats
    };
  }
  
  /**
   * Export token usage data for reporting
   */
  async exportUsageReport(analysisId: string): Promise<string> {
    const summary = await this.getSummary(analysisId);
    
    let report = `# Token Usage Report\n\n`;
    report += `**Analysis ID:** ${analysisId}\n`;
    report += `**Total Tokens:** ${summary.totalTokens.toLocaleString()}\n`;
    report += `**Total Cost:** $${summary.totalCost.toFixed(4)}\n\n`;
    
    report += `## Model Breakdown\n\n`;
    report += `| Model | Provider | Executions | Tokens | Cost | Primary | Fallback |\n`;
    report += `|-------|----------|------------|--------|------|---------|----------|\n`;
    
    for (const [key, stats] of Object.entries(summary.modelBreakdown)) {
      report += `| ${stats.model} | ${stats.provider} | ${stats.executions} | `;
      report += `${stats.tokens.total.toLocaleString()} | $${stats.cost.total.toFixed(4)} | `;
      report += `${stats.primaryExecutions} | ${stats.fallbackExecutions} |\n`;
    }
    
    report += `\n## Agent Breakdown\n\n`;
    report += `| Agent Role | Executions | Tokens | Cost |\n`;
    report += `|------------|------------|--------|------|\n`;
    
    for (const [role, stats] of Object.entries(summary.agentBreakdown)) {
      report += `| ${role} | ${stats.executions} | `;
      report += `${stats.tokens.total.toLocaleString()} | $${stats.cost.toFixed(4)} |\n`;
    }
    
    if (summary.fallbackStats.totalFallbacks > 0) {
      report += `\n## Fallback Statistics\n\n`;
      report += `- **Total Fallbacks:** ${summary.fallbackStats.totalFallbacks}\n`;
      report += `- **Fallback Cost:** $${summary.fallbackStats.fallbackCost.toFixed(4)}\n`;
      report += `- **Fallback Tokens:** ${summary.fallbackStats.fallbackTokens.toLocaleString()}\n\n`;
      
      report += `### Fallback Reasons\n\n`;
      for (const [reason, count] of Object.entries(summary.fallbackStats.fallbackReasons)) {
        report += `- ${reason}: ${count}\n`;
      }
    }
    
    return report;
  }
}

// Singleton instance
let trackerInstance: ModelTokenTracker | null = null;

/**
 * Get or create the model token tracker instance
 */
export function getModelTokenTracker(
  modelVersionSync?: ModelVersionSync,
  vectorStorage?: VectorStorageService
): ModelTokenTracker {
  if (!trackerInstance && modelVersionSync) {
    trackerInstance = new ModelTokenTracker(modelVersionSync, vectorStorage);
  }
  
  if (!trackerInstance) {
    throw new Error('ModelTokenTracker not initialized. Call with ModelVersionSync first.');
  }
  
  return trackerInstance;
}