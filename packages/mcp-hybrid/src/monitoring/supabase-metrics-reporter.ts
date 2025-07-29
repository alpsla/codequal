/**
 * Supabase Metrics Reporter for MCP Tool Execution
 * Sends tool execution metrics to Supabase for Grafana monitoring
 */

import { ToolResult, AgentRole } from '../core/interfaces';
import { logging } from '@codequal/core';

export interface ToolExecutionMetric {
  tool_id: string;
  tool_type: 'mcp' | 'direct';
  agent_role: AgentRole;
  repository_id: string;
  pr_number: number;
  execution_time_ms: number;
  success: boolean;
  findings_count: number;
  critical_findings: number;
  error_code?: string;
  error_message?: string;
  created_at: Date;
  // Additional metrics
  changed_files_count?: number;
  memory_usage_mb?: number;
  cpu_usage_percent?: number;
}

export interface PreprocessingMetric {
  repository_id: string;
  pr_number: number;
  phase: string;
  duration_ms: number;
  success: boolean;
  error_message?: string;
  metadata?: Record<string, any>;
  created_at: Date;
}

export interface TavilyUsageMetric {
  repository_id: string;
  pr_number: number;
  agent_role: AgentRole;
  queries_performed: number;
  api_credits_used: number;
  cost_usd: number;
  response_time_ms: number;
  created_at: Date;
}

export class SupabaseMetricsReporter {
  private logger = logging.createLogger('SupabaseMetricsReporter');
  private supabaseUrl: string;
  private supabaseKey: string;
  private batchQueue: Array<any> = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 50;
  private readonly BATCH_INTERVAL_MS = 5000;
  
  constructor() {
    this.supabaseUrl = process.env.SUPABASE_URL || '';
    this.supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    
    if (!this.supabaseUrl || !this.supabaseKey) {
      this.logger.warn('Supabase credentials not configured - metrics will not be sent');
    }
  }
  
  /**
   * Report tool execution metrics
   */
  async reportToolExecution(
    toolId: string,
    toolType: 'mcp' | 'direct',
    agentRole: AgentRole,
    repository: string,
    prNumber: number,
    result: ToolResult,
    additionalMetrics?: {
      changedFilesCount?: number;
      memoryUsageMB?: number;
      cpuUsagePercent?: number;
    }
  ): Promise<void> {
    const metric: ToolExecutionMetric = {
      tool_id: toolId,
      tool_type: toolType,
      agent_role: agentRole,
      repository_id: repository,
      pr_number: prNumber,
      execution_time_ms: result.executionTime,
      success: result.success,
      findings_count: result.findings?.length || 0,
      critical_findings: result.findings?.filter(f => f.severity === 'critical').length || 0,
      error_code: result.error?.code,
      error_message: result.error?.message,
      created_at: new Date(),
      ...additionalMetrics
    };
    
    await this.queueMetric('tool_executions', metric);
  }
  
  /**
   * Report preprocessing phase metrics
   */
  async reportPreprocessingPhase(
    repository: string,
    prNumber: number,
    phase: string,
    durationMs: number,
    success: boolean,
    metadata?: Record<string, any>,
    errorMessage?: string
  ): Promise<void> {
    const metric: PreprocessingMetric = {
      repository_id: repository,
      pr_number: prNumber,
      phase,
      duration_ms: durationMs,
      success,
      error_message: errorMessage,
      metadata,
      created_at: new Date()
    };
    
    await this.queueMetric('preprocessing_metrics', metric);
  }
  
  /**
   * Report Tavily API usage for cost tracking
   */
  async reportTavilyUsage(
    repository: string,
    prNumber: number,
    agentRole: AgentRole,
    queriesPerformed: number,
    responseTimeMs: number
  ): Promise<void> {
    // Tavily pricing: $0.001 per query (example)
    const costPerQuery = 0.001;
    const apiCreditsUsed = queriesPerformed;
    const costUsd = queriesPerformed * costPerQuery;
    
    const metric: TavilyUsageMetric = {
      repository_id: repository,
      pr_number: prNumber,
      agent_role: agentRole,
      queries_performed: queriesPerformed,
      api_credits_used: apiCreditsUsed,
      cost_usd: costUsd,
      response_time_ms: responseTimeMs,
      created_at: new Date()
    };
    
    await this.queueMetric('tavily_usage_metrics', metric);
  }
  
  /**
   * Queue metric for batch sending
   */
  private async queueMetric(table: string, metric: any): Promise<void> {
    if (!this.supabaseUrl || !this.supabaseKey) {
      this.logger.debug(`Metric not sent (no credentials): ${table}`, metric);
      return;
    }
    
    this.batchQueue.push({ table, metric });
    
    // Send immediately if batch size reached
    if (this.batchQueue.length >= this.BATCH_SIZE) {
      await this.flushBatch();
    } else {
      // Schedule batch send
      this.scheduleBatchSend();
    }
  }
  
  /**
   * Schedule batch send
   */
  private scheduleBatchSend(): void {
    if (this.batchTimer) return;
    
    this.batchTimer = setTimeout(async () => {
      await this.flushBatch();
    }, this.BATCH_INTERVAL_MS);
  }
  
  /**
   * Flush the batch queue
   */
  async flushBatch(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    
    if (this.batchQueue.length === 0) return;
    
    const batch = [...this.batchQueue];
    this.batchQueue = [];
    
    // Group by table
    const groupedMetrics = new Map<string, any[]>();
    for (const { table, metric } of batch) {
      if (!groupedMetrics.has(table)) {
        groupedMetrics.set(table, []);
      }
      groupedMetrics.get(table)!.push(metric);
    }
    
    // Send each table's metrics
    for (const [table, metrics] of groupedMetrics) {
      try {
        await this.sendToSupabase(table, metrics);
        this.logger.info(`Sent ${metrics.length} metrics to ${table}`);
      } catch (error) {
        this.logger.error(`Failed to send metrics to ${table}: ${error}`);
        // Re-queue failed metrics
        metrics.forEach(metric => this.batchQueue.push({ table, metric }));
      }
    }
  }
  
  /**
   * Send metrics to Supabase
   */
  private async sendToSupabase(table: string, metrics: any[]): Promise<void> {
    const response = await fetch(`${this.supabaseUrl}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': this.supabaseKey,
        'Authorization': `Bearer ${this.supabaseKey}`,
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(metrics)
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Supabase error: ${response.status} - ${error}`);
    }
  }
  
  /**
   * Get monitoring dashboard URL
   */
  getGrafanaDashboardUrl(repository: string): string {
    const grafanaUrl = process.env.GRAFANA_URL || 'http://localhost:3000';
    return `${grafanaUrl}/d/mcp-tools/${repository.toLowerCase().replace(/\s+/g, '-')}`;
  }
  
  /**
   * Create summary report
   */
  async createSummaryReport(
    repository: string,
    prNumber: number,
    startTime: Date,
    endTime: Date
  ): Promise<{
    totalTools: number;
    successRate: number;
    avgExecutionTime: number;
    totalFindings: number;
    criticalFindings: number;
    tavilyCost: number;
    dashboardUrl: string;
  }> {
    // In real implementation, would query Supabase for aggregates
    // Mock for now
    return {
      totalTools: 15,
      successRate: 93.3,
      avgExecutionTime: 745,
      totalFindings: 42,
      criticalFindings: 3,
      tavilyCost: 0.024,
      dashboardUrl: this.getGrafanaDashboardUrl(repository)
    };
  }
  
  /**
   * Ensure cleanup on shutdown
   */
  async shutdown(): Promise<void> {
    await this.flushBatch();
  }
}

// Export singleton instance
export const metricsReporter = new SupabaseMetricsReporter();

// Ensure cleanup on process exit
process.on('exit', () => {
  metricsReporter.shutdown().catch(console.error);
});

process.on('SIGINT', () => {
  metricsReporter.shutdown().then(() => process.exit(0)).catch(console.error);
});