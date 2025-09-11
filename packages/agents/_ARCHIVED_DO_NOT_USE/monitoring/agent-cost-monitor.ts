/**
 * Comprehensive Agent Cost Monitoring System
 * Tracks costs for:
 * - AI model usage (tokens, API calls)
 * - Tool executions (paid security tools)
 * - Agent operations (compute time, memory)
 * - Cache operations (Redis costs)
 * - Database operations (Supabase costs)
 */

import { UnifiedMonitoringService } from '../standard/monitoring/services/unified-monitoring.service';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface ModelCost {
  provider: 'openrouter' | 'deepwiki' | 'anthropic' | 'openai';
  model: string;
  inputCostPer1k: number;
  outputCostPer1k: number;
  minimumCost?: number;
}

export interface ToolCost {
  name: string;
  costPerExecution: number;
  costPerFile?: number;
  costPer1kLines?: number;
  monthlyLimit?: number;
}

export interface AgentCost {
  agentName: string;
  operation: string;
  timestamp: number;
  modelCosts: {
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    cost: number;
  }[];
  toolCosts: {
    toolName: string;
    executions: number;
    filesProcessed?: number;
    linesProcessed?: number;
    cost: number;
  }[];
  infrastructureCosts: {
    computeTimeMs: number;
    memoryMB: number;
    cacheOperations: number;
    databaseQueries: number;
    cost: number;
  };
  totalCost: number;
  metadata?: Record<string, any>;
}

export class AgentCostMonitor {
  private static instance: AgentCostMonitor;
  private monitoring: UnifiedMonitoringService;
  private supabase: SupabaseClient | null = null;
  private costHistory: AgentCost[] = [];
  private monthlySpend: Map<string, number> = new Map();
  private dailySpend: Map<string, number> = new Map();

  // Model pricing (per 1k tokens)
  private static readonly MODEL_COSTS: Map<string, ModelCost> = new Map([
    // OpenRouter models
    ['openai/gpt-4-turbo', { provider: 'openrouter', model: 'gpt-4-turbo', inputCostPer1k: 0.01, outputCostPer1k: 0.03 }],
    ['openai/gpt-4o', { provider: 'openrouter', model: 'gpt-4o', inputCostPer1k: 0.005, outputCostPer1k: 0.015 }],
    ['openai/gpt-4o-mini', { provider: 'openrouter', model: 'gpt-4o-mini', inputCostPer1k: 0.00015, outputCostPer1k: 0.0006 }],
    ['anthropic/claude-3-opus', { provider: 'openrouter', model: 'claude-3-opus', inputCostPer1k: 0.015, outputCostPer1k: 0.075 }],
    ['anthropic/claude-3-sonnet', { provider: 'openrouter', model: 'claude-3-sonnet', inputCostPer1k: 0.003, outputCostPer1k: 0.015 }],
    ['anthropic/claude-3-haiku', { provider: 'openrouter', model: 'claude-3-haiku', inputCostPer1k: 0.00025, outputCostPer1k: 0.00125 }],
    ['meta-llama/llama-3-70b', { provider: 'openrouter', model: 'llama-3-70b', inputCostPer1k: 0.00059, outputCostPer1k: 0.00079 }],
    ['google/gemini-pro', { provider: 'openrouter', model: 'gemini-pro', inputCostPer1k: 0.000125, outputCostPer1k: 0.000375 }],
    
    // DeepWiki models (internal pricing)
    ['deepwiki/analyzer-v2', { provider: 'deepwiki', model: 'analyzer-v2', inputCostPer1k: 0.002, outputCostPer1k: 0.002 }],
    ['deepwiki/security-scanner', { provider: 'deepwiki', model: 'security-scanner', inputCostPer1k: 0.003, outputCostPer1k: 0.003 }],
  ]);

  // Tool pricing
  private static readonly TOOL_COSTS: Map<string, ToolCost> = new Map([
    // Security scanning tools
    ['snyk', { name: 'snyk', costPerExecution: 0.01, costPerFile: 0.0001, monthlyLimit: 1000 }],
    ['sonarqube', { name: 'sonarqube', costPerExecution: 0.005, costPer1kLines: 0.001, monthlyLimit: 5000 }],
    ['veracode', { name: 'veracode', costPerExecution: 0.02, costPerFile: 0.0002, monthlyLimit: 2000 }],
    ['checkmarx', { name: 'checkmarx', costPerExecution: 0.015, costPer1kLines: 0.002, monthlyLimit: 3000 }],
    ['fortify', { name: 'fortify', costPerExecution: 0.018, costPerFile: 0.00015, monthlyLimit: 2500 }],
    ['blackduck', { name: 'blackduck', costPerExecution: 0.025, costPerFile: 0.0003, monthlyLimit: 1500 }],
    ['coverity', { name: 'coverity', costPerExecution: 0.03, costPer1kLines: 0.003, monthlyLimit: 1000 }],
    ['prisma-cloud', { name: 'prisma-cloud', costPerExecution: 0.012, costPerFile: 0.00012, monthlyLimit: 4000 }],
    
    // Code quality tools
    ['codeql', { name: 'codeql', costPerExecution: 0.008, costPer1kLines: 0.0008 }],
    ['semgrep', { name: 'semgrep', costPerExecution: 0.003, costPer1kLines: 0.0003 }],
    ['trivy', { name: 'trivy', costPerExecution: 0.002, costPerFile: 0.00005 }],
    
    // Language-specific tools (free/open-source)
    ['eslint', { name: 'eslint', costPerExecution: 0 }],
    ['pylint', { name: 'pylint', costPerExecution: 0 }],
    ['rubocop', { name: 'rubocop', costPerExecution: 0 }],
    ['golangci-lint', { name: 'golangci-lint', costPerExecution: 0 }],
    ['clippy', { name: 'clippy', costPerExecution: 0 }],
    ['phpstan', { name: 'phpstan', costPerExecution: 0 }],
  ]);

  // Infrastructure pricing (per unit)
  private static readonly INFRASTRUCTURE_COSTS = {
    computePerHourMs: 0.0000001, // $0.36/hour = 0.0001/second = 0.0000001/ms
    memoryPerGBHour: 0.005,       // $0.005 per GB-hour
    cacheOperationCost: 0.00001,  // Redis operation cost
    databaseQueryCost: 0.00002,   // Supabase query cost
  };

  private constructor() {
    this.monitoring = UnifiedMonitoringService.getInstance();
    this.initializeSupabase();
  }

  static getInstance(): AgentCostMonitor {
    if (!AgentCostMonitor.instance) {
      AgentCostMonitor.instance = new AgentCostMonitor();
    }
    return AgentCostMonitor.instance;
  }

  private initializeSupabase(): void {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
  }

  /**
   * Track agent operation with comprehensive cost calculation
   */
  async trackAgentOperation(params: {
    agentName: string;
    operation: string;
    modelUsage?: Array<{
      provider: string;
      model: string;
      inputTokens: number;
      outputTokens: number;
    }>;
    toolUsage?: Array<{
      toolName: string;
      executions?: number;
      filesProcessed?: number;
      linesProcessed?: number;
    }>;
    infrastructure?: {
      computeTimeMs: number;
      memoryMB: number;
      cacheOperations?: number;
      databaseQueries?: number;
    };
    metadata?: Record<string, any>;
  }): Promise<AgentCost> {
    const timestamp = Date.now();
    
    // Calculate model costs
    const modelCosts = (params.modelUsage || []).map(usage => {
      const modelCost = this.calculateModelCost(
        usage.provider,
        usage.model,
        usage.inputTokens,
        usage.outputTokens
      );
      
      return {
        provider: usage.provider,
        model: usage.model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        cost: modelCost
      };
    });

    // Calculate tool costs
    const toolCosts = (params.toolUsage || []).map(usage => {
      const cost = this.calculateToolCost(
        usage.toolName,
        usage.executions || 1,
        usage.filesProcessed,
        usage.linesProcessed
      );
      
      return {
        toolName: usage.toolName,
        executions: usage.executions || 1,
        filesProcessed: usage.filesProcessed,
        linesProcessed: usage.linesProcessed,
        cost
      };
    });

    // Calculate infrastructure costs
    const infrastructureCosts = this.calculateInfrastructureCost(
      params.infrastructure || { computeTimeMs: 0, memoryMB: 0 }
    );

    // Calculate total cost
    const totalModelCost = modelCosts.reduce((sum, m) => sum + m.cost, 0);
    const totalToolCost = toolCosts.reduce((sum, t) => sum + t.cost, 0);
    const totalCost = totalModelCost + totalToolCost + infrastructureCosts.cost;

    // Create cost record
    const costRecord: AgentCost = {
      agentName: params.agentName,
      operation: params.operation,
      timestamp,
      modelCosts,
      toolCosts,
      infrastructureCosts,
      totalCost,
      metadata: params.metadata
    };

    // Store in history
    this.costHistory.push(costRecord);

    // Update daily and monthly spend
    this.updateSpendTracking(params.agentName, totalCost);

    // Track in unified monitoring
    this.monitoring.trackCost({
      timestamp,
      service: params.agentName as any,
      operation: params.operation,
      cost: totalCost,
      tokens: modelCosts.reduce((sum, m) => sum + m.inputTokens + m.outputTokens, 0),
      metadata: {
        modelCosts: totalModelCost,
        toolCosts: totalToolCost,
        infrastructureCosts: infrastructureCosts.cost,
        ...params.metadata
      }
    });

    // Store in Supabase if available
    if (this.supabase) {
      await this.persistCostRecord(costRecord);
    }

    return costRecord;
  }

  /**
   * Calculate model cost based on token usage
   */
  private calculateModelCost(
    provider: string,
    model: string,
    inputTokens: number,
    outputTokens: number
  ): number {
    const modelKey = `${provider}/${model}`;
    const modelCost = AgentCostMonitor.MODEL_COSTS.get(modelKey) || 
                      AgentCostMonitor.MODEL_COSTS.get(model);

    if (!modelCost) {
      // Default fallback pricing
      console.warn(`Unknown model pricing for ${modelKey}, using default`);
      return (inputTokens * 0.001 + outputTokens * 0.002) / 1000;
    }

    const inputCost = (inputTokens / 1000) * modelCost.inputCostPer1k;
    const outputCost = (outputTokens / 1000) * modelCost.outputCostPer1k;
    const totalCost = inputCost + outputCost;

    // Apply minimum cost if specified
    return modelCost.minimumCost ? Math.max(totalCost, modelCost.minimumCost) : totalCost;
  }

  /**
   * Calculate tool cost based on usage
   */
  private calculateToolCost(
    toolName: string,
    executions: number,
    filesProcessed?: number,
    linesProcessed?: number
  ): number {
    const toolCost = AgentCostMonitor.TOOL_COSTS.get(toolName.toLowerCase());
    
    if (!toolCost) {
      return 0; // Unknown tool, assume free
    }

    let cost = toolCost.costPerExecution * executions;

    if (toolCost.costPerFile && filesProcessed) {
      cost += toolCost.costPerFile * filesProcessed;
    }

    if (toolCost.costPer1kLines && linesProcessed) {
      cost += (linesProcessed / 1000) * toolCost.costPer1kLines;
    }

    // Check monthly limit
    if (toolCost.monthlyLimit) {
      const monthKey = this.getCurrentMonthKey();
      const monthlyUsage = this.getMonthlyToolUsage(toolName, monthKey);
      
      if (monthlyUsage + executions > toolCost.monthlyLimit) {
        console.warn(`Tool ${toolName} approaching monthly limit: ${monthlyUsage}/${toolCost.monthlyLimit}`);
      }
    }

    return cost;
  }

  /**
   * Calculate infrastructure cost
   */
  private calculateInfrastructureCost(infrastructure: {
    computeTimeMs: number;
    memoryMB: number;
    cacheOperations?: number;
    databaseQueries?: number;
  }): { computeTimeMs: number; memoryMB: number; cacheOperations: number; databaseQueries: number; cost: number } {
    const computeCost = infrastructure.computeTimeMs * AgentCostMonitor.INFRASTRUCTURE_COSTS.computePerHourMs;
    const memoryCost = (infrastructure.memoryMB / 1024) * (infrastructure.computeTimeMs / 3600000) * AgentCostMonitor.INFRASTRUCTURE_COSTS.memoryPerGBHour;
    const cacheCost = (infrastructure.cacheOperations || 0) * AgentCostMonitor.INFRASTRUCTURE_COSTS.cacheOperationCost;
    const dbCost = (infrastructure.databaseQueries || 0) * AgentCostMonitor.INFRASTRUCTURE_COSTS.databaseQueryCost;

    return {
      computeTimeMs: infrastructure.computeTimeMs,
      memoryMB: infrastructure.memoryMB,
      cacheOperations: infrastructure.cacheOperations || 0,
      databaseQueries: infrastructure.databaseQueries || 0,
      cost: computeCost + memoryCost + cacheCost + dbCost
    };
  }

  /**
   * Update spend tracking
   */
  private updateSpendTracking(agentName: string, cost: number): void {
    // Update daily spend
    const dayKey = this.getCurrentDayKey();
    const dailyKey = `${dayKey}:${agentName}`;
    this.dailySpend.set(dailyKey, (this.dailySpend.get(dailyKey) || 0) + cost);

    // Update monthly spend
    const monthKey = this.getCurrentMonthKey();
    const monthlyKey = `${monthKey}:${agentName}`;
    this.monthlySpend.set(monthlyKey, (this.monthlySpend.get(monthlyKey) || 0) + cost);
  }

  /**
   * Get monthly tool usage
   */
  private getMonthlyToolUsage(toolName: string, monthKey: string): number {
    const monthlyUsage = this.costHistory
      .filter(record => {
        const recordMonth = new Date(record.timestamp).toISOString().slice(0, 7);
        return recordMonth === monthKey && 
               record.toolCosts.some(t => t.toolName === toolName);
      })
      .reduce((sum, record) => {
        const toolRecord = record.toolCosts.find(t => t.toolName === toolName);
        return sum + (toolRecord?.executions || 0);
      }, 0);

    return monthlyUsage;
  }

  /**
   * Persist cost record to Supabase
   */
  private async persistCostRecord(record: AgentCost): Promise<void> {
    if (!this.supabase) return;

    try {
      await this.supabase.from('agent_costs').insert({
        agent_name: record.agentName,
        operation: record.operation,
        timestamp: new Date(record.timestamp).toISOString(),
        model_costs: record.modelCosts,
        tool_costs: record.toolCosts,
        infrastructure_costs: record.infrastructureCosts,
        total_cost: record.totalCost,
        metadata: record.metadata
      });
    } catch (error) {
      console.error('Failed to persist cost record:', error);
    }
  }

  /**
   * Get cost report for an agent
   */
  async getAgentCostReport(
    agentName: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    agent: string;
    period: { start: Date; end: Date };
    totalCost: number;
    modelCosts: number;
    toolCosts: number;
    infrastructureCosts: number;
    operationBreakdown: Map<string, number>;
    modelBreakdown: Map<string, { tokens: number; cost: number }>;
    toolBreakdown: Map<string, { executions: number; cost: number }>;
    dailySpend: Array<{ date: string; cost: number }>;
    recommendations: string[];
  }> {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
    const end = endDate || new Date();

    const relevantRecords = this.costHistory.filter(record => 
      record.agentName === agentName &&
      record.timestamp >= start.getTime() &&
      record.timestamp <= end.getTime()
    );

    // Calculate totals
    const totalCost = relevantRecords.reduce((sum, r) => sum + r.totalCost, 0);
    const modelCosts = relevantRecords.reduce((sum, r) => 
      sum + r.modelCosts.reduce((ms, m) => ms + m.cost, 0), 0
    );
    const toolCosts = relevantRecords.reduce((sum, r) => 
      sum + r.toolCosts.reduce((ts, t) => ts + t.cost, 0), 0
    );
    const infrastructureCosts = relevantRecords.reduce((sum, r) => 
      sum + r.infrastructureCosts.cost, 0
    );

    // Operation breakdown
    const operationBreakdown = new Map<string, number>();
    relevantRecords.forEach(record => {
      operationBreakdown.set(
        record.operation,
        (operationBreakdown.get(record.operation) || 0) + record.totalCost
      );
    });

    // Model breakdown
    const modelBreakdown = new Map<string, { tokens: number; cost: number }>();
    relevantRecords.forEach(record => {
      record.modelCosts.forEach(mc => {
        const key = `${mc.provider}/${mc.model}`;
        const existing = modelBreakdown.get(key) || { tokens: 0, cost: 0 };
        modelBreakdown.set(key, {
          tokens: existing.tokens + mc.inputTokens + mc.outputTokens,
          cost: existing.cost + mc.cost
        });
      });
    });

    // Tool breakdown
    const toolBreakdown = new Map<string, { executions: number; cost: number }>();
    relevantRecords.forEach(record => {
      record.toolCosts.forEach(tc => {
        const existing = toolBreakdown.get(tc.toolName) || { executions: 0, cost: 0 };
        toolBreakdown.set(tc.toolName, {
          executions: existing.executions + tc.executions,
          cost: existing.cost + tc.cost
        });
      });
    });

    // Daily spend
    const dailySpend: Array<{ date: string; cost: number }> = [];
    const dailyMap = new Map<string, number>();
    
    relevantRecords.forEach(record => {
      const date = new Date(record.timestamp).toISOString().slice(0, 10);
      dailyMap.set(date, (dailyMap.get(date) || 0) + record.totalCost);
    });

    Array.from(dailyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([date, cost]) => {
        dailySpend.push({ date, cost });
      });

    // Generate recommendations
    const recommendations = this.generateCostRecommendations({
      totalCost,
      modelCosts,
      toolCosts,
      modelBreakdown,
      toolBreakdown,
      dailySpend
    });

    return {
      agent: agentName,
      period: { start, end },
      totalCost,
      modelCosts,
      toolCosts,
      infrastructureCosts,
      operationBreakdown,
      modelBreakdown,
      toolBreakdown,
      dailySpend,
      recommendations
    };
  }

  /**
   * Generate cost optimization recommendations
   */
  private generateCostRecommendations(data: any): string[] {
    const recommendations: string[] = [];

    // Check if model costs are high
    if (data.modelCosts > data.totalCost * 0.7) {
      recommendations.push('Consider using cheaper models for non-critical operations');
      
      // Check which models are most expensive
      const expensiveModels = Array.from(data.modelBreakdown.entries())
        .filter(([_, stats]) => stats.cost > data.modelCosts * 0.3)
        .map(([model]) => model);
      
      if (expensiveModels.includes('openai/gpt-4-turbo')) {
        recommendations.push('Replace GPT-4 Turbo with GPT-4o-mini for simple tasks');
      }
      if (expensiveModels.includes('anthropic/claude-3-opus')) {
        recommendations.push('Use Claude-3-Haiku instead of Opus for routine analysis');
      }
    }

    // Check for expensive tools
    const expensiveTools = Array.from(data.toolBreakdown.entries())
      .filter(([_, stats]) => stats.cost > 0.1)
      .sort((a, b) => b[1].cost - a[1].cost);

    if (expensiveTools.length > 0) {
      recommendations.push(`Consider batching ${expensiveTools[0][0]} executions to reduce costs`);
    }

    // Check daily spend trends
    if (data.dailySpend.length > 7) {
      const lastWeek = data.dailySpend.slice(-7);
      const weeklyAvg = lastWeek.reduce((sum, d) => sum + d.cost, 0) / 7;
      const previousWeekAvg = data.dailySpend.slice(-14, -7).reduce((sum, d) => sum + d.cost, 0) / 7;
      
      if (weeklyAvg > previousWeekAvg * 1.5) {
        recommendations.push('Cost trend increasing - review recent usage patterns');
      }
    }

    // Check for optimization opportunities
    if (data.toolBreakdown.has('snyk') && data.toolBreakdown.has('trivy')) {
      recommendations.push('Consider using only one vulnerability scanner to avoid redundancy');
    }

    return recommendations;
  }

  /**
   * Get overall cost summary
   */
  async getOverallCostSummary(): Promise<{
    totalSpend: number;
    todaySpend: number;
    monthlySpend: number;
    topAgents: Array<{ agent: string; cost: number }>;
    topModels: Array<{ model: string; cost: number }>;
    topTools: Array<{ tool: string; cost: number }>;
    costTrend: 'increasing' | 'stable' | 'decreasing';
    projectedMonthlyCost: number;
  }> {
    const now = Date.now();
    const todayKey = this.getCurrentDayKey();
    const monthKey = this.getCurrentMonthKey();

    // Calculate totals
    const totalSpend = this.costHistory.reduce((sum, r) => sum + r.totalCost, 0);
    
    const todaySpend = Array.from(this.dailySpend.entries())
      .filter(([key]) => key.startsWith(todayKey))
      .reduce((sum, [_, cost]) => sum + cost, 0);

    const monthlySpend = Array.from(this.monthlySpend.entries())
      .filter(([key]) => key.startsWith(monthKey))
      .reduce((sum, [_, cost]) => sum + cost, 0);

    // Top agents
    const agentCosts = new Map<string, number>();
    this.costHistory.forEach(record => {
      agentCosts.set(record.agentName, 
        (agentCosts.get(record.agentName) || 0) + record.totalCost
      );
    });
    const topAgents = Array.from(agentCosts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([agent, cost]) => ({ agent, cost }));

    // Top models
    const modelCosts = new Map<string, number>();
    this.costHistory.forEach(record => {
      record.modelCosts.forEach(mc => {
        const key = `${mc.provider}/${mc.model}`;
        modelCosts.set(key, (modelCosts.get(key) || 0) + mc.cost);
      });
    });
    const topModels = Array.from(modelCosts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([model, cost]) => ({ model, cost }));

    // Top tools
    const toolCostMap = new Map<string, number>();
    this.costHistory.forEach(record => {
      record.toolCosts.forEach(tc => {
        toolCostMap.set(tc.toolName, 
          (toolCostMap.get(tc.toolName) || 0) + tc.cost
        );
      });
    });
    const topTools = Array.from(toolCostMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tool, cost]) => ({ tool, cost }));

    // Cost trend analysis
    const lastWeek = this.costHistory.filter(r => 
      r.timestamp > now - 7 * 24 * 60 * 60 * 1000
    ).reduce((sum, r) => sum + r.totalCost, 0);

    const previousWeek = this.costHistory.filter(r => 
      r.timestamp > now - 14 * 24 * 60 * 60 * 1000 &&
      r.timestamp <= now - 7 * 24 * 60 * 60 * 1000
    ).reduce((sum, r) => sum + r.totalCost, 0);

    let costTrend: 'increasing' | 'stable' | 'decreasing';
    if (lastWeek > previousWeek * 1.1) {
      costTrend = 'increasing';
    } else if (lastWeek < previousWeek * 0.9) {
      costTrend = 'decreasing';
    } else {
      costTrend = 'stable';
    }

    // Project monthly cost
    const dayOfMonth = new Date().getDate();
    const projectedMonthlyCost = (monthlySpend / dayOfMonth) * 30;

    return {
      totalSpend,
      todaySpend,
      monthlySpend,
      topAgents,
      topModels,
      topTools,
      costTrend,
      projectedMonthlyCost
    };
  }

  /**
   * Export cost data
   */
  async exportCostData(format: 'json' | 'csv' | 'html' = 'json'): Promise<string> {
    if (format === 'json') {
      return JSON.stringify(this.costHistory, null, 2);
    } else if (format === 'csv') {
      return this.exportAsCSV();
    } else {
      return this.exportAsHTML();
    }
  }

  private exportAsCSV(): string {
    const headers = ['Timestamp', 'Agent', 'Operation', 'Model Costs', 'Tool Costs', 'Infrastructure', 'Total Cost'];
    const rows = this.costHistory.map(record => [
      new Date(record.timestamp).toISOString(),
      record.agentName,
      record.operation,
      record.modelCosts.reduce((sum, m) => sum + m.cost, 0).toFixed(4),
      record.toolCosts.reduce((sum, t) => sum + t.cost, 0).toFixed(4),
      record.infrastructureCosts.cost.toFixed(4),
      record.totalCost.toFixed(4)
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  private exportAsHTML(): string {
    const summary = this.getOverallCostSummary();
    
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Agent Cost Monitoring Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
    h1 { color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px; }
    h2 { color: #666; margin-top: 30px; }
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
    .metric-card { background: #f9f9f9; padding: 15px; border-radius: 6px; border-left: 4px solid #4CAF50; }
    .metric-value { font-size: 28px; font-weight: bold; color: #333; }
    .metric-label { color: #666; font-size: 12px; margin-top: 5px; }
    .cost-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .cost-table th { background: #4CAF50; color: white; padding: 10px; text-align: left; }
    .cost-table td { padding: 10px; border-bottom: 1px solid #ddd; }
    .cost-table tr:hover { background: #f5f5f5; }
    .trend-up { color: #f44336; }
    .trend-down { color: #4CAF50; }
    .trend-stable { color: #FFC107; }
    .chart { margin: 20px 0; padding: 20px; background: #f9f9f9; border-radius: 6px; }
    .recommendation { background: #FFF3E0; padding: 10px; margin: 10px 0; border-left: 4px solid #FF9800; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔧 Agent Cost Monitoring Report</h1>
    <p>Generated: ${new Date().toLocaleString()}</p>
    
    <div class="summary-grid">
      <div class="metric-card">
        <div class="metric-value">$${this.costHistory.reduce((sum, r) => sum + r.totalCost, 0).toFixed(2)}</div>
        <div class="metric-label">Total Spend</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">$${(this.costHistory.filter(r => 
          new Date(r.timestamp).toDateString() === new Date().toDateString()
        ).reduce((sum, r) => sum + r.totalCost, 0)).toFixed(2)}</div>
        <div class="metric-label">Today's Spend</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${this.costHistory.length}</div>
        <div class="metric-label">Total Operations</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${new Set(this.costHistory.map(r => r.agentName)).size}</div>
        <div class="metric-label">Active Agents</div>
      </div>
    </div>

    <h2>📊 Cost Breakdown by Agent</h2>
    <table class="cost-table">
      <thead>
        <tr>
          <th>Agent</th>
          <th>Operations</th>
          <th>Model Costs</th>
          <th>Tool Costs</th>
          <th>Infrastructure</th>
          <th>Total Cost</th>
        </tr>
      </thead>
      <tbody>
        ${this.generateAgentTableRows()}
      </tbody>
    </table>

    <h2>🤖 Top Models by Cost</h2>
    <table class="cost-table">
      <thead>
        <tr>
          <th>Model</th>
          <th>Total Tokens</th>
          <th>Total Cost</th>
          <th>Avg Cost/1k Tokens</th>
        </tr>
      </thead>
      <tbody>
        ${this.generateModelTableRows()}
      </tbody>
    </table>

    <h2>🛠️ Tool Usage & Costs</h2>
    <table class="cost-table">
      <thead>
        <tr>
          <th>Tool</th>
          <th>Executions</th>
          <th>Total Cost</th>
          <th>Avg Cost/Execution</th>
        </tr>
      </thead>
      <tbody>
        ${this.generateToolTableRows()}
      </tbody>
    </table>

    <h2>💡 Cost Optimization Recommendations</h2>
    ${this.generateRecommendationsHTML()}
  </div>
</body>
</html>
    `;
  }

  private generateAgentTableRows(): string {
    const agentStats = new Map<string, any>();
    
    this.costHistory.forEach(record => {
      if (!agentStats.has(record.agentName)) {
        agentStats.set(record.agentName, {
          operations: 0,
          modelCosts: 0,
          toolCosts: 0,
          infrastructureCosts: 0,
          totalCost: 0
        });
      }
      
      const stats = agentStats.get(record.agentName);
      stats.operations++;
      stats.modelCosts += record.modelCosts.reduce((sum, m) => sum + m.cost, 0);
      stats.toolCosts += record.toolCosts.reduce((sum, t) => sum + t.cost, 0);
      stats.infrastructureCosts += record.infrastructureCosts.cost;
      stats.totalCost += record.totalCost;
    });

    return Array.from(agentStats.entries())
      .sort((a, b) => b[1].totalCost - a[1].totalCost)
      .map(([agent, stats]) => `
        <tr>
          <td><strong>${agent}</strong></td>
          <td>${stats.operations}</td>
          <td>$${stats.modelCosts.toFixed(4)}</td>
          <td>$${stats.toolCosts.toFixed(4)}</td>
          <td>$${stats.infrastructureCosts.toFixed(4)}</td>
          <td><strong>$${stats.totalCost.toFixed(4)}</strong></td>
        </tr>
      `).join('');
  }

  private generateModelTableRows(): string {
    const modelStats = new Map<string, any>();
    
    this.costHistory.forEach(record => {
      record.modelCosts.forEach(mc => {
        const key = `${mc.provider}/${mc.model}`;
        if (!modelStats.has(key)) {
          modelStats.set(key, { tokens: 0, cost: 0 });
        }
        const stats = modelStats.get(key);
        stats.tokens += mc.inputTokens + mc.outputTokens;
        stats.cost += mc.cost;
      });
    });

    return Array.from(modelStats.entries())
      .sort((a, b) => b[1].cost - a[1].cost)
      .slice(0, 10)
      .map(([model, stats]) => `
        <tr>
          <td>${model}</td>
          <td>${stats.tokens.toLocaleString()}</td>
          <td>$${stats.cost.toFixed(4)}</td>
          <td>$${((stats.cost / stats.tokens) * 1000).toFixed(6)}</td>
        </tr>
      `).join('');
  }

  private generateToolTableRows(): string {
    const toolStats = new Map<string, any>();
    
    this.costHistory.forEach(record => {
      record.toolCosts.forEach(tc => {
        if (!toolStats.has(tc.toolName)) {
          toolStats.set(tc.toolName, { executions: 0, cost: 0 });
        }
        const stats = toolStats.get(tc.toolName);
        stats.executions += tc.executions;
        stats.cost += tc.cost;
      });
    });

    return Array.from(toolStats.entries())
      .filter(([_, stats]) => stats.cost > 0)
      .sort((a, b) => b[1].cost - a[1].cost)
      .map(([tool, stats]) => `
        <tr>
          <td>${tool}</td>
          <td>${stats.executions}</td>
          <td>$${stats.cost.toFixed(4)}</td>
          <td>$${(stats.cost / stats.executions).toFixed(6)}</td>
        </tr>
      `).join('');
  }

  private generateRecommendationsHTML(): string {
    // Simplified recommendations for HTML
    const recommendations = [
      'Monitor high-cost agents and consider optimization',
      'Review model selection for cost-effectiveness',
      'Batch tool executions where possible',
      'Implement caching to reduce redundant API calls'
    ];

    return recommendations.map(rec => 
      `<div class="recommendation">${rec}</div>`
    ).join('');
  }

  private getCurrentDayKey(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private getCurrentMonthKey(): string {
    return new Date().toISOString().slice(0, 7);
  }

  /**
   * Clear cost history (for testing)
   */
  clearHistory(): void {
    this.costHistory = [];
    this.monthlySpend.clear();
    this.dailySpend.clear();
  }
}