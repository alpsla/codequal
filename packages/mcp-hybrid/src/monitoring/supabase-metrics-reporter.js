"use strict";
/**
 * Supabase Metrics Reporter for MCP Tool Execution
 * Sends tool execution metrics to Supabase for Grafana monitoring
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricsReporter = exports.SupabaseMetricsReporter = void 0;
const core_1 = require("@codequal/core");
class SupabaseMetricsReporter {
    constructor() {
        this.logger = core_1.logging.createLogger('SupabaseMetricsReporter');
        this.batchQueue = [];
        this.batchTimer = null;
        this.BATCH_SIZE = 50;
        this.BATCH_INTERVAL_MS = 5000;
        this.supabaseUrl = process.env.SUPABASE_URL || '';
        this.supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
        if (!this.supabaseUrl || !this.supabaseKey) {
            this.logger.warn('Supabase credentials not configured - metrics will not be sent');
        }
    }
    /**
     * Report tool execution metrics
     */
    async reportToolExecution(toolId, toolType, agentRole, repository, prNumber, result, additionalMetrics) {
        const metric = {
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
    async reportPreprocessingPhase(repository, prNumber, phase, durationMs, success, metadata, errorMessage) {
        const metric = {
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
    async reportTavilyUsage(repository, prNumber, agentRole, queriesPerformed, responseTimeMs) {
        // Tavily pricing: $0.001 per query (example)
        const costPerQuery = 0.001;
        const apiCreditsUsed = queriesPerformed;
        const costUsd = queriesPerformed * costPerQuery;
        const metric = {
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
    async queueMetric(table, metric) {
        if (!this.supabaseUrl || !this.supabaseKey) {
            this.logger.debug(`Metric not sent (no credentials): ${table}`, metric);
            return;
        }
        this.batchQueue.push({ table, metric });
        // Send immediately if batch size reached
        if (this.batchQueue.length >= this.BATCH_SIZE) {
            await this.flushBatch();
        }
        else {
            // Schedule batch send
            this.scheduleBatchSend();
        }
    }
    /**
     * Schedule batch send
     */
    scheduleBatchSend() {
        if (this.batchTimer)
            return;
        this.batchTimer = setTimeout(async () => {
            await this.flushBatch();
        }, this.BATCH_INTERVAL_MS);
    }
    /**
     * Flush the batch queue
     */
    async flushBatch() {
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
            this.batchTimer = null;
        }
        if (this.batchQueue.length === 0)
            return;
        const batch = [...this.batchQueue];
        this.batchQueue = [];
        // Group by table
        const groupedMetrics = new Map();
        for (const { table, metric } of batch) {
            if (!groupedMetrics.has(table)) {
                groupedMetrics.set(table, []);
            }
            groupedMetrics.get(table).push(metric);
        }
        // Send each table's metrics
        for (const [table, metrics] of groupedMetrics) {
            try {
                await this.sendToSupabase(table, metrics);
                this.logger.info(`Sent ${metrics.length} metrics to ${table}`);
            }
            catch (error) {
                this.logger.error(`Failed to send metrics to ${table}: ${error}`);
                // Re-queue failed metrics
                metrics.forEach(metric => this.batchQueue.push({ table, metric }));
            }
        }
    }
    /**
     * Send metrics to Supabase
     */
    async sendToSupabase(table, metrics) {
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
    getGrafanaDashboardUrl(repository) {
        const grafanaUrl = process.env.GRAFANA_URL || 'http://localhost:3000';
        return `${grafanaUrl}/d/mcp-tools/${repository.toLowerCase().replace(/\s+/g, '-')}`;
    }
    /**
     * Create summary report
     */
    async createSummaryReport(repository, prNumber, startTime, endTime) {
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
    async shutdown() {
        await this.flushBatch();
    }
}
exports.SupabaseMetricsReporter = SupabaseMetricsReporter;
// Export singleton instance
exports.metricsReporter = new SupabaseMetricsReporter();
// Ensure cleanup on process exit
process.on('exit', () => {
    exports.metricsReporter.shutdown().catch(console.error);
});
process.on('SIGINT', () => {
    exports.metricsReporter.shutdown().then(() => process.exit(0)).catch(console.error);
});
//# sourceMappingURL=supabase-metrics-reporter.js.map