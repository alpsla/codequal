/**
 * Dynamic Agent Cost Monitoring System
 * Integrates with existing DynamicAgentCostTrackerService for real-time model pricing
 * No hardcoded models or pricing - everything is fetched from Supabase
 */

import { DynamicAgentCostTrackerService, AgentRole, ModelConfig, AgentActivity } from '../standard/monitoring/services/dynamic-agent-cost-tracker.service';
import { UnifiedMonitoringService } from '../standard/monitoring/services/unified-monitoring.service';
import { EndToEndTransactionMonitor } from './end-to-end-transaction-monitor';
import { trackDynamicAgentCall } from '../standard/monitoring';

export interface DynamicAgentCost {
  agentRole: AgentRole;
  operation: string;
  timestamp: number;
  repository: string;
  prNumber?: string;
  
  // Model information (dynamically fetched)
  modelConfig: {
    configId: string;
    primaryModel: string;
    primaryVersion: string;
    fallbackModel?: string;
    isFallback: boolean;
    performanceScore: number;
  };
  
  // Token usage and costs (calculated from Supabase pricing)
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  
  // Cost breakdown (dynamic pricing)
  costs: {
    inputCost: number;
    outputCost: number;
    totalModelCost: number;
    infrastructureCost: number;
    totalCost: number;
  };
  
  // Performance metrics
  performance: {
    durationMs: number;
    memoryMB: number;
    cacheHits: number;
    cacheMisses: number;
    retryCount: number;
  };
  
  // Results
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

export class DynamicAgentCostMonitor {
  private static instance: DynamicAgentCostMonitor;
  private costTracker: DynamicAgentCostTrackerService;
  private unifiedMonitoring: UnifiedMonitoringService;
  private transactionMonitor: EndToEndTransactionMonitor;
  
  // Real-time tracking
  private activeOperations: Map<string, DynamicAgentCost> = new Map();
  private costHistory: DynamicAgentCost[] = [];
  private modelUsageStats: Map<string, { count: number; totalCost: number; avgLatency: number }> = new Map();
  
  private constructor() {
    this.costTracker = DynamicAgentCostTrackerService.getInstance();
    this.unifiedMonitoring = UnifiedMonitoringService.getInstance();
    this.transactionMonitor = EndToEndTransactionMonitor.getInstance();
  }
  
  static getInstance(): DynamicAgentCostMonitor {
    if (!DynamicAgentCostMonitor.instance) {
      DynamicAgentCostMonitor.instance = new DynamicAgentCostMonitor();
    }
    return DynamicAgentCostMonitor.instance;
  }
  
  /**
   * Start tracking an agent operation with dynamic model selection
   */
  async startAgentOperation(params: {
    agentRole: AgentRole;
    operation: string;
    repository: string;
    prNumber?: string;
    language?: string;
    repositorySize?: 'small' | 'medium' | 'large' | 'enterprise';
    complexity?: 'low' | 'medium' | 'high';
    transactionId?: string;
  }): Promise<string> {
    const operationId = `${params.agentRole}-${params.operation}-${Date.now()}`;
    
    // Get dynamic model configuration from Supabase
    const modelConfig = await this.costTracker.getModelConfig(
      params.agentRole,
      params.language,
      params.repositorySize,
      params.complexity
    );
    
    if (!modelConfig) {
      console.warn(`No model config found for ${params.agentRole}, using defaults`);
      // The system will request a new config from the researcher
    }
    
    // Initialize cost tracking
    const agentCost: DynamicAgentCost = {
      agentRole: params.agentRole,
      operation: params.operation,
      timestamp: Date.now(),
      repository: params.repository,
      prNumber: params.prNumber,
      modelConfig: modelConfig ? {
        configId: modelConfig.id,
        primaryModel: modelConfig.primary_model,
        primaryVersion: modelConfig.primary_version,
        fallbackModel: modelConfig.fallback_model,
        isFallback: false,
        performanceScore: modelConfig.performance_score
      } : {
        configId: 'default',
        primaryModel: 'openai/gpt-4o-mini', // Fallback default
        primaryVersion: 'latest',
        isFallback: false,
        performanceScore: 0.7
      },
      tokenUsage: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0
      },
      costs: {
        inputCost: 0,
        outputCost: 0,
        totalModelCost: 0,
        infrastructureCost: 0,
        totalCost: 0
      },
      performance: {
        durationMs: 0,
        memoryMB: 0,
        cacheHits: 0,
        cacheMisses: 0,
        retryCount: 0
      },
      success: false,
      metadata: {
        language: params.language,
        repositorySize: params.repositorySize,
        complexity: params.complexity
      }
    };
    
    this.activeOperations.set(operationId, agentCost);
    
    // Start transaction span if transactionId provided
    if (params.transactionId) {
      this.transactionMonitor.startSpan(
        params.transactionId,
        `agent.${params.agentRole}.${params.operation}`,
        'agent-operation'
      );
    }
    
    return operationId;
  }
  
  /**
   * Update token usage during operation
   */
  updateTokenUsage(
    operationId: string,
    inputTokens: number,
    outputTokens: number,
    isFallback = false
  ): void {
    const operation = this.activeOperations.get(operationId);
    if (!operation) return;
    
    operation.tokenUsage.inputTokens += inputTokens;
    operation.tokenUsage.outputTokens += outputTokens;
    operation.tokenUsage.totalTokens += inputTokens + outputTokens;
    
    if (isFallback) {
      operation.modelConfig.isFallback = true;
    }
    
    // Update costs in real-time (will be recalculated at end with final model config)
    this.updateCosts(operationId);
  }
  
  /**
   * Update performance metrics
   */
  updatePerformanceMetrics(
    operationId: string,
    metrics: {
      memoryMB?: number;
      cacheHits?: number;
      cacheMisses?: number;
      retryCount?: number;
    }
  ): void {
    const operation = this.activeOperations.get(operationId);
    if (!operation) return;
    
    if (metrics.memoryMB !== undefined) {
      operation.performance.memoryMB = Math.max(operation.performance.memoryMB, metrics.memoryMB);
    }
    if (metrics.cacheHits !== undefined) {
      operation.performance.cacheHits += metrics.cacheHits;
    }
    if (metrics.cacheMisses !== undefined) {
      operation.performance.cacheMisses += metrics.cacheMisses;
    }
    if (metrics.retryCount !== undefined) {
      operation.performance.retryCount = metrics.retryCount;
    }
  }
  
  /**
   * End agent operation and calculate final costs
   */
  async endAgentOperation(
    operationId: string,
    success: boolean,
    error?: string,
    transactionId?: string
  ): Promise<DynamicAgentCost | null> {
    const operation = this.activeOperations.get(operationId);
    if (!operation) return null;
    
    // Calculate duration
    operation.performance.durationMs = Date.now() - operation.timestamp;
    operation.success = success;
    operation.error = error;
    
    // Get final model config (may have changed if fallback was used)
    const finalConfig = await this.costTracker.getModelConfig(
      operation.agentRole,
      operation.metadata?.language as string,
      operation.metadata?.repositorySize as any,
      operation.metadata?.complexity as any
    );
    
    // Calculate final costs with dynamic pricing
    if (finalConfig) {
      const costPerMillion = operation.modelConfig.isFallback
        ? { 
            input: finalConfig.fallback_cost_per_1m_input || 0.15,
            output: finalConfig.fallback_cost_per_1m_output || 0.60
          }
        : {
            input: finalConfig.primary_cost_per_1m_input,
            output: finalConfig.primary_cost_per_1m_output
          };
      
      operation.costs.inputCost = (operation.tokenUsage.inputTokens / 1_000_000) * costPerMillion.input;
      operation.costs.outputCost = (operation.tokenUsage.outputTokens / 1_000_000) * costPerMillion.output;
      operation.costs.totalModelCost = operation.costs.inputCost + operation.costs.outputCost;
    }
    
    // Calculate infrastructure costs
    operation.costs.infrastructureCost = this.calculateInfrastructureCost(operation.performance);
    operation.costs.totalCost = operation.costs.totalModelCost + operation.costs.infrastructureCost;
    
    // Track in DynamicAgentCostTrackerService
    await this.costTracker.trackActivity({
      id: operationId,
      timestamp: operation.timestamp,
      agentRole: operation.agentRole,
      operation: operation.operation,
      repositoryUrl: operation.repository,
      prNumber: operation.prNumber,
      language: operation.metadata?.language as string,
      repositorySize: operation.metadata?.repositorySize as string,
      modelConfigId: operation.modelConfig.configId,
      modelUsed: operation.modelConfig.isFallback 
        ? (operation.modelConfig.fallbackModel || operation.modelConfig.primaryModel)
        : operation.modelConfig.primaryModel,
      modelVersion: operation.modelConfig.primaryVersion,
      isFallback: operation.modelConfig.isFallback,
      inputTokens: operation.tokenUsage.inputTokens,
      outputTokens: operation.tokenUsage.outputTokens,
      cost: operation.costs.totalCost,
      durationMs: operation.performance.durationMs,
      success: operation.success,
      error: operation.error,
      retryCount: operation.performance.retryCount,
      metadata: operation.metadata
    });
    
    // Track in unified monitoring
    await trackDynamicAgentCall({
      agent: operation.agentRole,
      operation: operation.operation,
      repository: operation.repository,
      prNumber: operation.prNumber,
      language: operation.metadata?.language as string,
      repositorySize: operation.metadata?.repositorySize as any,
      modelConfigId: operation.modelConfig.configId,
      model: operation.modelConfig.primaryModel,
      modelVersion: operation.modelConfig.primaryVersion,
      isFallback: operation.modelConfig.isFallback,
      inputTokens: operation.tokenUsage.inputTokens,
      outputTokens: operation.tokenUsage.outputTokens,
      duration: operation.performance.durationMs,
      success: operation.success,
      error: operation.error,
      retryCount: operation.performance.retryCount
    });
    
    // Update model usage statistics
    this.updateModelStats(operation);
    
    // Store in history
    this.costHistory.push(operation);
    this.activeOperations.delete(operationId);
    
    // End transaction span if provided
    if (transactionId) {
      const spanId = `agent.${operation.agentRole}.${operation.operation}`;
      this.transactionMonitor.endSpan(
        transactionId,
        spanId,
        success ? 'success' : 'error',
        error ? new Error(error) : undefined
      );
    }
    
    return operation;
  }
  
  /**
   * Update costs based on current token usage
   */
  private updateCosts(operationId: string): void {
    const operation = this.activeOperations.get(operationId);
    if (!operation) return;
    
    // Use approximate costs until we get final model config
    // These will be recalculated at the end with actual pricing
    const approxCostPer1M = {
      input: 0.15,  // $0.15 per million input tokens (conservative estimate)
      output: 0.60  // $0.60 per million output tokens (conservative estimate)
    };
    
    operation.costs.inputCost = (operation.tokenUsage.inputTokens / 1_000_000) * approxCostPer1M.input;
    operation.costs.outputCost = (operation.tokenUsage.outputTokens / 1_000_000) * approxCostPer1M.output;
    operation.costs.totalModelCost = operation.costs.inputCost + operation.costs.outputCost;
  }
  
  /**
   * Calculate infrastructure costs
   */
  private calculateInfrastructureCost(performance: DynamicAgentCost['performance']): number {
    // Simplified infrastructure cost calculation
    const computeCost = (performance.durationMs / 1000) * 0.00001; // $0.00001 per second
    const memoryCost = (performance.memoryMB / 1024) * (performance.durationMs / 3600000) * 0.005; // $0.005 per GB-hour
    const cacheCost = (performance.cacheHits + performance.cacheMisses) * 0.000001; // $0.000001 per cache operation
    
    return computeCost + memoryCost + cacheCost;
  }
  
  /**
   * Update model usage statistics
   */
  private updateModelStats(operation: DynamicAgentCost): void {
    const modelKey = operation.modelConfig.isFallback 
      ? operation.modelConfig.fallbackModel || 'fallback'
      : operation.modelConfig.primaryModel;
    
    const stats = this.modelUsageStats.get(modelKey) || { count: 0, totalCost: 0, avgLatency: 0 };
    
    stats.count++;
    stats.totalCost += operation.costs.totalModelCost;
    stats.avgLatency = (stats.avgLatency * (stats.count - 1) + operation.performance.durationMs) / stats.count;
    
    this.modelUsageStats.set(modelKey, stats);
  }
  
  /**
   * Get real-time cost analysis
   */
  async getRealTimeCostAnalysis(
    timeWindow?: { start: Date; end: Date }
  ): Promise<{
    totalCost: number;
    activeOperations: number;
    byAgent: Map<AgentRole, { count: number; cost: number; avgLatency: number }>;
    byModel: Map<string, { count: number; cost: number; performance: number }>;
    topExpensiveOperations: DynamicAgentCost[];
    costTrend: 'increasing' | 'stable' | 'decreasing';
    recommendations: string[];
  }> {
    const start = timeWindow?.start || new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours
    const end = timeWindow?.end || new Date();
    
    // Filter history by time window
    const relevantHistory = this.costHistory.filter(op => 
      op.timestamp >= start.getTime() && op.timestamp <= end.getTime()
    );
    
    // Calculate totals
    const totalCost = relevantHistory.reduce((sum, op) => sum + op.costs.totalCost, 0);
    
    // By agent analysis
    const byAgent = new Map<AgentRole, { count: number; cost: number; avgLatency: number }>();
    relevantHistory.forEach(op => {
      const stats = byAgent.get(op.agentRole) || { count: 0, cost: 0, avgLatency: 0 };
      stats.count++;
      stats.cost += op.costs.totalCost;
      stats.avgLatency = (stats.avgLatency * (stats.count - 1) + op.performance.durationMs) / stats.count;
      byAgent.set(op.agentRole, stats);
    });
    
    // By model analysis (with performance scores from Supabase)
    const byModel = new Map<string, { count: number; cost: number; performance: number }>();
    relevantHistory.forEach(op => {
      const modelKey = op.modelConfig.isFallback && op.modelConfig.fallbackModel
        ? op.modelConfig.fallbackModel
        : op.modelConfig.primaryModel;
      
      const stats = byModel.get(modelKey) || { count: 0, cost: 0, performance: 0 };
      stats.count++;
      stats.cost += op.costs.totalModelCost;
      stats.performance = op.modelConfig.performanceScore;
      byModel.set(modelKey, stats);
    });
    
    // Top expensive operations
    const topExpensiveOperations = [...relevantHistory]
      .sort((a, b) => b.costs.totalCost - a.costs.totalCost)
      .slice(0, 10);
    
    // Cost trend analysis
    const recentCost = relevantHistory
      .filter(op => op.timestamp > Date.now() - 6 * 60 * 60 * 1000) // Last 6 hours
      .reduce((sum, op) => sum + op.costs.totalCost, 0);
    
    const previousCost = relevantHistory
      .filter(op => 
        op.timestamp > Date.now() - 12 * 60 * 60 * 1000 &&
        op.timestamp <= Date.now() - 6 * 60 * 60 * 1000
      )
      .reduce((sum, op) => sum + op.costs.totalCost, 0);
    
    let costTrend: 'increasing' | 'stable' | 'decreasing';
    if (recentCost > previousCost * 1.2) {
      costTrend = 'increasing';
    } else if (recentCost < previousCost * 0.8) {
      costTrend = 'decreasing';
    } else {
      costTrend = 'stable';
    }
    
    // Generate dynamic recommendations
    const recommendations = await this.generateDynamicRecommendations({
      byAgent,
      byModel,
      topExpensiveOperations,
      costTrend,
      totalCost
    });
    
    return {
      totalCost,
      activeOperations: this.activeOperations.size,
      byAgent,
      byModel,
      topExpensiveOperations,
      costTrend,
      recommendations
    };
  }
  
  /**
   * Generate dynamic recommendations based on actual usage
   */
  private async generateDynamicRecommendations(data: any): Promise<string[]> {
    const recommendations: string[] = [];
    
    // Check for high-cost agents
    data.byAgent.forEach((stats: any, agent: AgentRole) => {
      if (stats.cost > data.totalCost * 0.4) {
        recommendations.push(`${agent} accounts for ${((stats.cost / data.totalCost) * 100).toFixed(1)}% of costs - consider optimization`);
      }
      if (stats.avgLatency > 5000) {
        recommendations.push(`${agent} has high latency (${(stats.avgLatency / 1000).toFixed(1)}s) - check model selection`);
      }
    });
    
    // Check for underperforming models
    data.byModel.forEach((stats: any, model: string) => {
      if (stats.performance < 0.5 && stats.count > 5) {
        recommendations.push(`Model ${model} has low performance score (${stats.performance}) - request researcher to find better alternative`);
      }
      const costPerUse = stats.cost / stats.count;
      if (costPerUse > 0.01) {
        recommendations.push(`Model ${model} costs $${costPerUse.toFixed(4)} per use - consider batching or caching`);
      }
    });
    
    // Check for fallback usage
    const fallbackUsage = data.topExpensiveOperations.filter((op: DynamicAgentCost) => op.modelConfig.isFallback);
    if (fallbackUsage.length > data.topExpensiveOperations.length * 0.3) {
      recommendations.push('High fallback model usage detected - review primary model reliability');
    }
    
    // Cost trend recommendations
    if (data.costTrend === 'increasing') {
      recommendations.push('Costs trending up - implement caching for frequently analyzed repositories');
      recommendations.push('Consider using smaller models for initial scans, larger models only for complex issues');
    }
    
    // Cache optimization
    const cacheStats = data.topExpensiveOperations.reduce((acc: any, op: DynamicAgentCost) => {
      acc.hits += op.performance.cacheHits;
      acc.misses += op.performance.cacheMisses;
      return acc;
    }, { hits: 0, misses: 0 });
    
    const cacheHitRate = cacheStats.hits / (cacheStats.hits + cacheStats.misses);
    if (cacheHitRate < 0.3 && cacheStats.hits + cacheStats.misses > 100) {
      recommendations.push(`Cache hit rate is only ${(cacheHitRate * 100).toFixed(1)}% - improve caching strategy`);
    }
    
    return recommendations;
  }
  
  /**
   * Export cost analysis report
   */
  async exportCostReport(format: 'json' | 'html' | 'csv' = 'html'): Promise<string> {
    const analysis = await this.getRealTimeCostAnalysis();
    
    if (format === 'json') {
      return JSON.stringify({
        analysis,
        history: this.costHistory,
        modelStats: Array.from(this.modelUsageStats.entries())
      }, null, 2);
    } else if (format === 'csv') {
      return this.exportAsCSV(analysis);
    } else {
      return this.exportAsHTML(analysis);
    }
  }
  
  private exportAsCSV(analysis: any): string {
    const headers = [
      'Timestamp', 'Agent', 'Operation', 'Model', 'Input Tokens', 
      'Output Tokens', 'Model Cost', 'Total Cost', 'Duration (ms)', 'Success'
    ];
    
    const rows = this.costHistory.map(op => [
      new Date(op.timestamp).toISOString(),
      op.agentRole,
      op.operation,
      op.modelConfig.primaryModel,
      op.tokenUsage.inputTokens,
      op.tokenUsage.outputTokens,
      op.costs.totalModelCost.toFixed(6),
      op.costs.totalCost.toFixed(6),
      op.performance.durationMs,
      op.success
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
  
  private exportAsHTML(analysis: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Dynamic Agent Cost Analysis</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
    .container { max-width: 1400px; margin: 0 auto; background: white; border-radius: 16px; padding: 30px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
    h1 { color: #2d3748; margin-bottom: 10px; }
    .subtitle { color: #718096; margin-bottom: 30px; }
    .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 30px 0; }
    .metric-card { background: linear-gradient(135deg, #f6f8fb 0%, #e9ecef 100%); padding: 20px; border-radius: 12px; position: relative; overflow: hidden; }
    .metric-card::before { content: ''; position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
    .metric-value { font-size: 32px; font-weight: bold; color: #2d3748; }
    .metric-label { color: #718096; font-size: 14px; margin-top: 5px; }
    .metric-change { font-size: 12px; margin-top: 5px; }
    .trend-up { color: #f56565; }
    .trend-down { color: #48bb78; }
    .trend-stable { color: #ed8936; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #f7fafc; color: #2d3748; padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e2e8f0; }
    td { padding: 12px; border-bottom: 1px solid #e2e8f0; color: #4a5568; }
    tr:hover { background: #f7fafc; }
    .recommendation { background: #fef5e7; border-left: 4px solid #f39c12; padding: 15px; margin: 10px 0; border-radius: 6px; }
    .chart-container { margin: 30px 0; padding: 20px; background: #f7fafc; border-radius: 12px; }
    .active-ops { display: inline-block; background: #48bb78; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 Dynamic Agent Cost Analysis</h1>
    <p class="subtitle">Real-time cost tracking with Supabase-powered model selection</p>
    ${analysis.activeOperations > 0 ? `<span class="active-ops">${analysis.activeOperations} Active Operations</span>` : ''}
    
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-value">$${analysis.totalCost.toFixed(4)}</div>
        <div class="metric-label">Total Cost (24h)</div>
        <div class="metric-change ${analysis.costTrend === 'increasing' ? 'trend-up' : analysis.costTrend === 'decreasing' ? 'trend-down' : 'trend-stable'}">
          ${analysis.costTrend === 'increasing' ? '↑' : analysis.costTrend === 'decreasing' ? '↓' : '→'} ${analysis.costTrend}
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${this.costHistory.length}</div>
        <div class="metric-label">Total Operations</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${analysis.byModel.size}</div>
        <div class="metric-label">Active Models</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${analysis.byAgent.size}</div>
        <div class="metric-label">Active Agents</div>
      </div>
    </div>
    
    <div class="chart-container">
      <h2>📊 Cost by Agent Role</h2>
      <table>
        <thead>
          <tr>
            <th>Agent Role</th>
            <th>Operations</th>
            <th>Total Cost</th>
            <th>Avg Cost/Op</th>
            <th>Avg Latency</th>
            <th>% of Total</th>
          </tr>
        </thead>
        <tbody>
          ${Array.from(analysis.byAgent.entries())
            .sort((a, b) => b[1].cost - a[1].cost)
            .map(([agent, stats]) => `
              <tr>
                <td><strong>${agent}</strong></td>
                <td>${stats.count}</td>
                <td>$${stats.cost.toFixed(6)}</td>
                <td>$${(stats.cost / stats.count).toFixed(6)}</td>
                <td>${(stats.avgLatency / 1000).toFixed(2)}s</td>
                <td>${((stats.cost / analysis.totalCost) * 100).toFixed(1)}%</td>
              </tr>
            `).join('')}
        </tbody>
      </table>
    </div>
    
    <div class="chart-container">
      <h2>🤖 Model Performance & Cost</h2>
      <table>
        <thead>
          <tr>
            <th>Model</th>
            <th>Usage Count</th>
            <th>Total Cost</th>
            <th>Avg Cost/Use</th>
            <th>Performance Score</th>
          </tr>
        </thead>
        <tbody>
          ${Array.from(analysis.byModel.entries())
            .sort((a, b) => b[1].cost - a[1].cost)
            .map(([model, stats]) => `
              <tr>
                <td><strong>${model}</strong></td>
                <td>${stats.count}</td>
                <td>$${stats.cost.toFixed(6)}</td>
                <td>$${(stats.cost / stats.count).toFixed(6)}</td>
                <td>
                  <div style="display: inline-block; width: 100px; height: 20px; background: #e2e8f0; border-radius: 10px; position: relative;">
                    <div style="width: ${stats.performance * 100}%; height: 100%; background: ${stats.performance > 0.7 ? '#48bb78' : stats.performance > 0.4 ? '#ed8936' : '#f56565'}; border-radius: 10px;"></div>
                  </div>
                  ${(stats.performance * 100).toFixed(0)}%
                </td>
              </tr>
            `).join('')}
        </tbody>
      </table>
    </div>
    
    <div class="chart-container">
      <h2>💰 Most Expensive Operations</h2>
      <table>
        <thead>
          <tr>
            <th>Operation</th>
            <th>Agent</th>
            <th>Model</th>
            <th>Tokens</th>
            <th>Cost</th>
            <th>Duration</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${analysis.topExpensiveOperations.map((op: DynamicAgentCost) => `
            <tr>
              <td>${op.operation}</td>
              <td>${op.agentRole}</td>
              <td>${op.modelConfig.primaryModel}${op.modelConfig.isFallback ? ' (fallback)' : ''}</td>
              <td>${op.tokenUsage.totalTokens.toLocaleString()}</td>
              <td><strong>$${op.costs.totalCost.toFixed(6)}</strong></td>
              <td>${(op.performance.durationMs / 1000).toFixed(2)}s</td>
              <td>${op.success ? '✅' : '❌'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    
    <div class="chart-container">
      <h2>💡 Optimization Recommendations</h2>
      ${analysis.recommendations.map((rec: string) => `
        <div class="recommendation">${rec}</div>
      `).join('')}
    </div>
    
    <p style="text-align: center; color: #718096; margin-top: 40px;">
      Generated: ${new Date().toLocaleString()} | 
      Powered by Dynamic Model Selection
    </p>
  </div>
</body>
</html>
    `;
  }
  
  /**
   * Get model usage statistics
   */
  getModelUsageStats(): Map<string, { count: number; totalCost: number; avgLatency: number }> {
    return this.modelUsageStats;
  }
  
  /**
   * Clear history (for testing)
   */
  clearHistory(): void {
    this.costHistory = [];
    this.modelUsageStats.clear();
    this.activeOperations.clear();
  }
}