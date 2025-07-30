import { createLogger } from '@codequal/core/utils';

export interface TokenUsageMetric {
  id: string;
  timestamp: Date;
  analysisId: string;
  messageType: 'natural' | 'cap';
  source: string;
  target: string;
  tokenCount: number;
  cost: number;
  compressionRatio?: number;
  messageSize: number;
  platform?: string;
  metadata: {
    agentRole?: string;
    analysisMode?: string;
    messageCategory?: string;
    modelUsed?: string;
    isCompressed?: boolean;
  };
}

export interface TokenAnalyticsSummary {
  analysisId: string;
  totalTokens: number;
  totalCost: number;
  messageCount: number;
  averageTokensPerMessage: number;
  breakdown: {
    bySource: Record<string, { tokens: number; cost: number; count: number }>;
    byMessageType: Record<string, { tokens: number; cost: number; count: number }>;
    byAgentRole: Record<string, { tokens: number; cost: number; count: number }>;
  };
  compressionMetrics?: {
    averageCompressionRatio: number;
    totalSavings: number;
    messagesCompressed: number;
  };
}

/**
 * Service for tracking token usage across agent communications
 * Provides baseline measurement and CAP protocol comparison
 */
export class TokenTrackingService {
  private readonly logger = createLogger('TokenTrackingService');
  private metrics: Map<string, TokenUsageMetric[]> = new Map();

  /**
   * Track token usage for a message
   */
  trackMessage(
    analysisId: string,
    source: string,
    target: string,
    message: string,
    messageType: 'natural' | 'cap',
    metadata: {
      agentRole?: string;
      analysisMode?: string;
      messageCategory?: string;
      modelUsed?: string;
      platform?: string;
      isCompressed?: boolean;
      compressionRatio?: number;
    } = {}
  ): TokenUsageMetric {
    const tokenCount = this.estimateTokenCount(message);
    const cost = this.calculateCost(tokenCount, metadata.modelUsed);
    const messageSize = Buffer.byteLength(message, 'utf8');

    const metric: TokenUsageMetric = {
      id: `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      analysisId,
      messageType,
      source,
      target,
      tokenCount,
      cost,
      compressionRatio: metadata.compressionRatio,
      messageSize,
      platform: metadata.platform,
      metadata
    };

    // Store metric
    if (!this.metrics.has(analysisId)) {
      this.metrics.set(analysisId, []);
    }
    const analysisMetrics = this.metrics.get(analysisId);
    if (analysisMetrics) {
      analysisMetrics.push(metric);
    }

    this.logger.debug('Token usage tracked', {
      analysisId,
      source,
      target,
      tokenCount,
      cost,
      messageType,
      compressionRatio: metadata.compressionRatio
    });

    return metric;
  }

  /**
   * Track agent prompt generation (before sending to LLM)
   */
  trackAgentPrompt(
    analysisId: string,
    agentRole: string,
    prompt: string,
    messageType: 'natural' | 'cap' = 'natural',
    metadata: Partial<TokenUsageMetric['metadata']> = {}
  ): TokenUsageMetric {
    return this.trackMessage(
      analysisId,
      'orchestrator',
      agentRole,
      prompt,
      messageType,
      {
        agentRole,
        messageCategory: 'agent_prompt',
        ...metadata
      }
    );
  }

  /**
   * Track agent response (from LLM)
   */
  trackAgentResponse(
    analysisId: string,
    agentRole: string,
    response: string,
    messageType: 'natural' | 'cap' = 'natural',
    metadata: Partial<TokenUsageMetric['metadata']> = {}
  ): TokenUsageMetric {
    return this.trackMessage(
      analysisId,
      agentRole,
      'orchestrator',
      response,
      messageType,
      {
        agentRole,
        messageCategory: 'agent_response',
        ...metadata
      }
    );
  }

  /**
   * Track cross-agent communication
   */
  trackCrossAgentMessage(
    analysisId: string,
    sourceAgent: string,
    targetAgent: string,
    message: string,
    messageType: 'natural' | 'cap' = 'natural',
    metadata: Partial<TokenUsageMetric['metadata']> = {}
  ): TokenUsageMetric {
    return this.trackMessage(
      analysisId,
      sourceAgent,
      targetAgent,
      message,
      messageType,
      {
        messageCategory: 'cross_agent',
        ...metadata
      }
    );
  }

  /**
   * Start tracking for a specific analysis
   */
  startTracking(analysisId: string): void {
    if (!this.metrics.has(analysisId)) {
      this.metrics.set(analysisId, []);
    }
  }

  /**
   * Stop tracking and return metrics for an analysis
   */
  stopTracking(analysisId: string): TokenAnalyticsSummary | null {
    const analytics = this.getAnalytics(analysisId);
    // Optionally clear the metrics to free memory
    // this.metrics.delete(analysisId);
    return analytics;
  }

  /**
   * Get comprehensive analytics for an analysis
   */
  getAnalytics(analysisId?: string): TokenAnalyticsSummary | null {
    // If no analysisId provided, aggregate all metrics
    if (!analysisId) {
      const allMetrics: TokenUsageMetric[] = [];
      this.metrics.forEach(metrics => allMetrics.push(...metrics));
      
      if (allMetrics.length === 0) {
        return null;
      }
      
      // Create a synthetic analysisId for aggregated data
      analysisId = 'aggregate';
      const tempMetrics = this.metrics.get(analysisId);
      this.metrics.set(analysisId, allMetrics);
      const result = this.getAnalytics(analysisId);
      
      // Restore original state
      if (tempMetrics) {
        this.metrics.set(analysisId, tempMetrics);
      } else {
        this.metrics.delete(analysisId);
      }
      
      return result;
    }
    
    // Original implementation for specific analysisId
    const metrics = this.metrics.get(analysisId);
    if (!metrics || metrics.length === 0) {
      return null;
    }

    const totalTokens = metrics.reduce((sum, m) => sum + m.tokenCount, 0);
    const totalCost = metrics.reduce((sum, m) => sum + m.cost, 0);

    // Breakdown by source
    const bySource: Record<string, { tokens: number; cost: number; count: number }> = {};
    metrics.forEach(m => {
      if (!bySource[m.source]) {
        bySource[m.source] = { tokens: 0, cost: 0, count: 0 };
      }
      bySource[m.source].tokens += m.tokenCount;
      bySource[m.source].cost += m.cost;
      bySource[m.source].count += 1;
    });

    // Breakdown by message type
    const byMessageType: Record<string, { tokens: number; cost: number; count: number }> = {};
    metrics.forEach(m => {
      if (!byMessageType[m.messageType]) {
        byMessageType[m.messageType] = { tokens: 0, cost: 0, count: 0 };
      }
      byMessageType[m.messageType].tokens += m.tokenCount;
      byMessageType[m.messageType].cost += m.cost;
      byMessageType[m.messageType].count += 1;
    });

    // Breakdown by agent role
    const byAgentRole: Record<string, { tokens: number; cost: number; count: number }> = {};
    metrics.forEach(m => {
      const role = m.metadata.agentRole || 'unknown';
      if (!byAgentRole[role]) {
        byAgentRole[role] = { tokens: 0, cost: 0, count: 0 };
      }
      byAgentRole[role].tokens += m.tokenCount;
      byAgentRole[role].cost += m.cost;
      byAgentRole[role].count += 1;
    });

    // Compression metrics
    const compressedMetrics = metrics.filter(m => m.compressionRatio);
    const compressionMetrics = compressedMetrics.length > 0 ? {
      averageCompressionRatio: compressedMetrics.reduce((sum, m) => sum + (m.compressionRatio || 0), 0) / compressedMetrics.length,
      totalSavings: compressedMetrics.reduce((sum, m) => {
        const originalTokens = m.tokenCount / (m.compressionRatio || 1);
        return sum + (originalTokens - m.tokenCount);
      }, 0),
      messagesCompressed: compressedMetrics.length
    } : undefined;

    return {
      analysisId,
      totalTokens,
      totalCost,
      messageCount: metrics.length,
      averageTokensPerMessage: totalTokens / metrics.length,
      breakdown: {
        bySource,
        byMessageType,
        byAgentRole
      },
      compressionMetrics
    };
  }

  /**
   * Compare token usage between natural and CAP messages
   */
  compareMessageTypes(analysisId: string): {
    natural: TokenAnalyticsSummary['breakdown']['byMessageType']['natural'];
    cap: TokenAnalyticsSummary['breakdown']['byMessageType']['cap'];
    savingsPercentage: number;
    avgTokenReduction: number;
  } | null {
    const analytics = this.getAnalytics(analysisId);
    if (!analytics) {
      return null;
    }

    const natural = analytics.breakdown.byMessageType.natural || { tokens: 0, cost: 0, count: 0 };
    const cap = analytics.breakdown.byMessageType.cap || { tokens: 0, cost: 0, count: 0 };

    const totalNaturalTokens = natural.tokens;
    const totalCAPTokens = cap.tokens;

    const savingsPercentage = totalNaturalTokens > 0 ? 
      ((totalNaturalTokens - totalCAPTokens) / totalNaturalTokens) * 100 : 0;

    const avgNaturalTokens = natural.count > 0 ? natural.tokens / natural.count : 0;
    const avgCAPTokens = cap.count > 0 ? cap.tokens / cap.count : 0;
    const avgTokenReduction = avgNaturalTokens > 0 ? 
      ((avgNaturalTokens - avgCAPTokens) / avgNaturalTokens) * 100 : 0;

    return {
      natural,
      cap,
      savingsPercentage,
      avgTokenReduction
    };
  }

  /**
   * Get baseline metrics (before CAP implementation)
   */
  getBaselineMetrics(analysisId: string): TokenAnalyticsSummary | null {
    const metrics = this.metrics.get(analysisId);
    if (!metrics) {
      return null;
    }

    // Filter for only natural language messages (baseline)
    const baselineMetrics = metrics.filter(m => m.messageType === 'natural');
    
    if (baselineMetrics.length === 0) {
      return null;
    }

    // Create temporary analysis ID for baseline calculation
    const tempId = `${analysisId}_baseline`;
    this.metrics.set(tempId, baselineMetrics);
    
    const analytics = this.getAnalytics(tempId);
    
    // Clean up temporary data
    this.metrics.delete(tempId);
    
    return analytics;
  }

  /**
   * Clear metrics for an analysis
   */
  clearMetrics(analysisId: string): void {
    this.metrics.delete(analysisId);
  }

  /**
   * Get all metrics for debugging
   */
  getAllMetrics(analysisId: string): TokenUsageMetric[] {
    return this.metrics.get(analysisId) || [];
  }

  /**
   * Export metrics to JSON for analysis
   */
  exportMetrics(analysisId: string): string {
    const metrics = this.metrics.get(analysisId);
    const analytics = this.getAnalytics(analysisId);
    
    return JSON.stringify({
      metrics: metrics || [],
      analytics,
      exportTimestamp: new Date().toISOString()
    }, null, 2);
  }

  /**
   * Estimate token count for a message
   * Uses rough approximation: ~4 characters per token
   */
  private estimateTokenCount(message: string): number {
    // Basic token estimation
    // More accurate tokenization would use tiktoken or similar
    const characters = message.length;
    const words = message.split(/\s+/).length;
    
    // Average between character-based (chars/4) and word-based (words * 1.3) estimates
    const charBasedTokens = characters / 4;
    const wordBasedTokens = words * 1.3;
    
    return Math.round((charBasedTokens + wordBasedTokens) / 2);
  }

  /**
   * Calculate cost based on token count and model
   * TODO: Integrate with ModelConfigStore to get actual pricing from Vector DB
   */
  private calculateCost(tokenCount: number, _model?: string): number {
    // Default cost per 1K tokens for unknown models
    const defaultRate = 0.002;
    
    // TODO: Replace with actual pricing from Vector DB
    // const modelConfig = await this.modelConfigStore.getModelConfig(_model);
    // const rate = modelConfig?.pricing?.per1KTokens || defaultRate;
    
    return (tokenCount / 1000) * defaultRate;
  }
}

// Singleton instance for global use
export const tokenTracker = new TokenTrackingService();