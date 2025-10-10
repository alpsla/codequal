/**
 * Supabase Metrics Reporter for MCP Tool Execution
 * Sends tool execution metrics to Supabase for Grafana monitoring
 */
import { ToolResult, AgentRole } from '../core/interfaces';
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
export declare class SupabaseMetricsReporter {
    private logger;
    private supabaseUrl;
    private supabaseKey;
    private batchQueue;
    private batchTimer;
    private readonly BATCH_SIZE;
    private readonly BATCH_INTERVAL_MS;
    constructor();
    /**
     * Report tool execution metrics
     */
    reportToolExecution(toolId: string, toolType: 'mcp' | 'direct', agentRole: AgentRole, repository: string, prNumber: number, result: ToolResult, additionalMetrics?: {
        changedFilesCount?: number;
        memoryUsageMB?: number;
        cpuUsagePercent?: number;
    }): Promise<void>;
    /**
     * Report preprocessing phase metrics
     */
    reportPreprocessingPhase(repository: string, prNumber: number, phase: string, durationMs: number, success: boolean, metadata?: Record<string, any>, errorMessage?: string): Promise<void>;
    /**
     * Report Tavily API usage for cost tracking
     */
    reportTavilyUsage(repository: string, prNumber: number, agentRole: AgentRole, queriesPerformed: number, responseTimeMs: number): Promise<void>;
    /**
     * Queue metric for batch sending
     */
    private queueMetric;
    /**
     * Schedule batch send
     */
    private scheduleBatchSend;
    /**
     * Flush the batch queue
     */
    flushBatch(): Promise<void>;
    /**
     * Send metrics to Supabase
     */
    private sendToSupabase;
    /**
     * Get monitoring dashboard URL
     */
    getGrafanaDashboardUrl(repository: string): string;
    /**
     * Create summary report
     */
    createSummaryReport(repository: string, prNumber: number, startTime: Date, endTime: Date): Promise<{
        totalTools: number;
        successRate: number;
        avgExecutionTime: number;
        totalFindings: number;
        criticalFindings: number;
        tavilyCost: number;
        dashboardUrl: string;
    }>;
    /**
     * Ensure cleanup on shutdown
     */
    shutdown(): Promise<void>;
}
export declare const metricsReporter: SupabaseMetricsReporter;
//# sourceMappingURL=supabase-metrics-reporter.d.ts.map