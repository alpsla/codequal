import { createLogger } from '@codequal/core/utils';
import { ModelTokenTracker } from '@codequal/agents';

const logger = createLogger('TokenMetricsProvider');

export interface TokenMetrics {
  total_tokens: number;
  total_cost: number;
  primary_model_tokens: number;
  primary_model_cost: number;
  fallback_tokens: number;
  fallback_cost: number;
  fallback_count: number;
  avg_tokens_per_analysis: number;
  avg_cost_per_analysis: number;
  models_used: string[];
}

/**
 * Provides token usage metrics for monitoring systems
 */
export class TokenMetricsProvider {
  private tokenTracker: ModelTokenTracker | null = null;
  private metricsCache: TokenMetrics | null = null;
  private lastUpdate = 0;
  private CACHE_DURATION = 30000; // 30 seconds

  /**
   * Initialize with token tracker instance
   */
  initialize(tokenTracker: ModelTokenTracker): void {
    this.tokenTracker = tokenTracker;
    logger.info('Token metrics provider initialized');
  }

  /**
   * Get current token metrics for Prometheus/Grafana
   */
  async getMetrics(): Promise<Record<string, number>> {
    const metrics = await this.getTokenMetrics();
    
    return {
      token_usage_total: metrics.total_tokens,
      token_cost_usd_total: metrics.total_cost,
      token_usage_primary: metrics.primary_model_tokens,
      token_cost_primary_usd: metrics.primary_model_cost,
      token_usage_fallback: metrics.fallback_tokens,
      token_cost_fallback_usd: metrics.fallback_cost,
      fallback_executions_total: metrics.fallback_count,
      avg_tokens_per_analysis: metrics.avg_tokens_per_analysis,
      avg_cost_per_analysis_usd: metrics.avg_cost_per_analysis,
      unique_models_count: metrics.models_used.length
    };
  }

  /**
   * Get detailed token metrics
   */
  private async getTokenMetrics(): Promise<TokenMetrics> {
    const now = Date.now();
    
    // Use cache if fresh
    if (this.metricsCache && (now - this.lastUpdate) < this.CACHE_DURATION) {
      return this.metricsCache;
    }

    // Default metrics if tracker not initialized
    if (!this.tokenTracker) {
      return this.getDefaultMetrics();
    }

    try {
      // Get aggregated stats from token tracker
      const stats = await this.tokenTracker.getAggregatedStats();
      
      const metrics: TokenMetrics = {
        total_tokens: stats.totalTokens,
        total_cost: stats.totalCost,
        primary_model_tokens: stats.primaryTokens || 0,
        primary_model_cost: stats.primaryCost || 0,
        fallback_tokens: stats.fallbackStats?.fallbackTokens || 0,
        fallback_cost: stats.fallbackStats?.fallbackCost || 0,
        fallback_count: stats.fallbackStats?.totalFallbacks || 0,
        avg_tokens_per_analysis: stats.analysisCount > 0 ? 
          Math.round(stats.totalTokens / stats.analysisCount) : 0,
        avg_cost_per_analysis: stats.analysisCount > 0 ? 
          stats.totalCost / stats.analysisCount : 0,
        models_used: Object.keys(stats.modelBreakdown || {})
      };

      // Update cache
      this.metricsCache = metrics;
      this.lastUpdate = now;

      return metrics;
    } catch (error) {
      logger.error('Failed to get token metrics', { error });
      return this.getDefaultMetrics();
    }
  }

  /**
   * Get default metrics when tracker is not available
   */
  private getDefaultMetrics(): TokenMetrics {
    return {
      total_tokens: 0,
      total_cost: 0,
      primary_model_tokens: 0,
      primary_model_cost: 0,
      fallback_tokens: 0,
      fallback_cost: 0,
      fallback_count: 0,
      avg_tokens_per_analysis: 0,
      avg_cost_per_analysis: 0,
      models_used: []
    };
  }

  /**
   * Format metrics for Grafana dashboard
   */
  formatForGrafana(): Record<string, any> {
    const metrics = this.metricsCache || this.getDefaultMetrics();
    
    return {
      token_usage: {
        total: metrics.total_tokens,
        primary: metrics.primary_model_tokens,
        fallback: metrics.fallback_tokens
      },
      costs: {
        total_usd: metrics.total_cost,
        primary_usd: metrics.primary_model_cost,
        fallback_usd: metrics.fallback_cost,
        average_per_analysis_usd: metrics.avg_cost_per_analysis
      },
      fallback_stats: {
        count: metrics.fallback_count,
        percentage: metrics.total_tokens > 0 ? 
          (metrics.fallback_tokens / metrics.total_tokens) * 100 : 0
      },
      model_diversity: {
        unique_models: metrics.models_used.length,
        models: metrics.models_used
      }
    };
  }
}

// Export singleton
export const tokenMetricsProvider = new TokenMetricsProvider();