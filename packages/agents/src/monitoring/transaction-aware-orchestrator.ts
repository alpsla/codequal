/**
 * Transaction-aware orchestrator wrapper that integrates end-to-end monitoring
 * Ensures complete data flow tracking from MCP tools through agents to final output
 */

import { EndToEndTransactionMonitor, Transaction } from './end-to-end-transaction-monitor';
import { UnifiedMonitoringService } from '../standard/monitoring/services/unified-monitoring.service';
import { EnhancedMCPOrchestrator } from '../two-branch/orchestrators/enhanced-mcp-orchestrator';
import { ComparisonOrchestrator } from '../standard/orchestrator/comparison-orchestrator';

export class TransactionAwareOrchestrator {
  private transactionMonitor: EndToEndTransactionMonitor;
  private unifiedMonitoring: UnifiedMonitoringService;
  private currentTransaction: Transaction | null = null;

  constructor(
    private orchestrator: EnhancedMCPOrchestrator | ComparisonOrchestrator,
    transactionMonitor?: EndToEndTransactionMonitor,
    unifiedMonitoring?: UnifiedMonitoringService
  ) {
    this.transactionMonitor = transactionMonitor || EndToEndTransactionMonitor.getInstance();
    this.unifiedMonitoring = unifiedMonitoring || UnifiedMonitoringService.getInstance();
  }

  /**
   * Analyze PR with full transaction monitoring
   */
  async analyzePullRequest(
    owner: string,
    repo: string,
    prNumber: number,
    options?: {
      useCache?: boolean;
      skipEducation?: boolean;
      transactionName?: string;
    }
  ): Promise<any> {
    // Start transaction
    const transactionName = options?.transactionName || `PR_Analysis_${owner}/${repo}#${prNumber}`;
    this.currentTransaction = this.transactionMonitor.startTransaction(
      transactionName,
      'pr-analysis',
      { owner, repo, prNumber, ...options }
    );

    const transactionSpan = this.transactionMonitor.startSpan(
      this.currentTransaction.id,
      'orchestrator.analyzePR',
      'orchestration'
    );

    try {
      // Track data flow initiation
      this.transactionMonitor.trackDataFlow(
        this.currentTransaction.id,
        'input',
        'orchestrator',
        { owner, repo, prNumber },
        JSON.stringify({ owner, repo, prNumber }).length
      );

      // Wrap the original orchestrator call
      const monitoringId = this.unifiedMonitoring.startPerformance('transaction.pr.analysis');
      
      let result: any;
      if (this.orchestrator instanceof EnhancedMCPOrchestrator) {
        result = await this.wrapEnhancedOrchestrator(owner, repo, prNumber, options);
      } else {
        result = await this.wrapComparisonOrchestrator(owner, repo, prNumber);
      }

      // Track final output
      this.transactionMonitor.trackDataFlow(
        this.currentTransaction.id,
        'orchestrator',
        'output',
        { reportGenerated: true, issuesFound: result.issues?.length || 0 },
        JSON.stringify(result).length
      );

      // End monitoring
      this.unifiedMonitoring.endPerformance(monitoringId, true);
      this.transactionMonitor.endSpan(this.currentTransaction.id, transactionSpan.id, 'success');

      // Generate transaction report
      const report = this.transactionMonitor.generateTransactionReport(this.currentTransaction.id);
      console.log('Transaction Report:', {
        duration: report.duration,
        spanCount: report.spanCount,
        criticalPath: report.criticalPath.map(s => s.name),
        metrics: report.metrics
      });

      return {
        ...result,
        transactionId: this.currentTransaction.id,
        transactionReport: report
      };
    } catch (error) {
      this.transactionMonitor.endSpan(this.currentTransaction.id, transactionSpan.id, 'error', error);
      this.transactionMonitor.trackError(
        this.currentTransaction.id,
        error as Error,
        { component: 'orchestrator', operation: 'analyzePR' }
      );
      throw error;
    } finally {
      this.transactionMonitor.endTransaction(this.currentTransaction.id);
      this.currentTransaction = null;
    }
  }

  /**
   * Wrap EnhancedMCPOrchestrator with transaction tracking
   */
  private async wrapEnhancedOrchestrator(
    owner: string,
    repo: string,
    prNumber: number,
    options?: any
  ): Promise<any> {
    const orchestrator = this.orchestrator as EnhancedMCPOrchestrator;
    
    // Hook into agent executions
    const originalAnalyze = orchestrator.analyzePullRequest.bind(orchestrator);
    
    // Temporarily replace to add monitoring
    orchestrator.analyzePullRequest = async (o: string, r: string, pr: number) => {
      const span = this.transactionMonitor.startSpan(
        this.currentTransaction!.id,
        'enhanced.orchestrator.analyze',
        'orchestration'
      );

      try {
        // Track MCP tool calls
        const mcpSpan = this.transactionMonitor.startSpan(
          this.currentTransaction!.id,
          'mcp.tools.execution',
          'tool-execution'
        );

        const result = await originalAnalyze(o, r, pr);

        this.transactionMonitor.endSpan(this.currentTransaction!.id, mcpSpan.id, 'success');
        this.transactionMonitor.endSpan(this.currentTransaction!.id, span.id, 'success');

        return result;
      } catch (error) {
        this.transactionMonitor.endSpan(this.currentTransaction!.id, span.id, 'error', error);
        throw error;
      }
    };

    const result = await orchestrator.analyzePullRequest(owner, repo, prNumber);
    
    // Restore original
    orchestrator.analyzePullRequest = originalAnalyze;
    
    return result;
  }

  /**
   * Wrap ComparisonOrchestrator with transaction tracking
   */
  private async wrapComparisonOrchestrator(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<any> {
    const orchestrator = this.orchestrator as ComparisonOrchestrator;
    
    const span = this.transactionMonitor.startSpan(
      this.currentTransaction!.id,
      'comparison.orchestrator.execute',
      'orchestration'
    );

    try {
      // Track comparison agent communication
      this.transactionMonitor.trackAgentCommunication(
        this.currentTransaction!.id,
        'orchestrator',
        'comparison-agent',
        'analyze-request',
        { owner, repo, prNumber }
      );

      const result = await orchestrator.orchestrateComparison({
        repositoryUrl: `https://github.com/${owner}/${repo}`,
        prNumber,
        mainBranch: 'main'
      });

      // Track agent response
      this.transactionMonitor.trackAgentCommunication(
        this.currentTransaction!.id,
        'comparison-agent',
        'orchestrator',
        'analysis-complete',
        { issuesFound: result.newIssues?.length || 0 }
      );

      this.transactionMonitor.endSpan(this.currentTransaction!.id, span.id, 'success');
      return result;
    } catch (error) {
      this.transactionMonitor.endSpan(this.currentTransaction!.id, span.id, 'error', error);
      throw error;
    }
  }

  /**
   * Get transaction history
   */
  getTransactionHistory(): Transaction[] {
    return this.transactionMonitor.getTransactionHistory();
  }

  /**
   * Get current transaction if active
   */
  getCurrentTransaction(): Transaction | null {
    return this.currentTransaction;
  }

  /**
   * Export monitoring data
   */
  async exportMonitoringData(format: 'json' | 'html' = 'json'): Promise<string> {
    const history = this.getTransactionHistory();
    
    if (format === 'json') {
      return JSON.stringify(history, null, 2);
    } else {
      return this.generateHTMLReport(history);
    }
  }

  /**
   * Generate HTML monitoring report
   */
  private generateHTMLReport(transactions: Transaction[]): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Transaction Monitoring Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .transaction { border: 1px solid #ddd; margin: 10px 0; padding: 15px; }
    .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
    .metric { background: #f5f5f5; padding: 10px; border-radius: 4px; }
    .metric-value { font-size: 24px; font-weight: bold; color: #333; }
    .metric-label { color: #666; font-size: 12px; }
    .spans { margin-top: 20px; }
    .span { margin-left: 20px; padding: 5px; border-left: 2px solid #4CAF50; }
    .error { border-left-color: #f44336; }
    .timeline { margin-top: 20px; }
    .timeline-bar { height: 20px; background: linear-gradient(to right, #4CAF50, #8BC34A); }
  </style>
</head>
<body>
  <h1>End-to-End Transaction Monitoring Report</h1>
  <p>Generated: ${new Date().toISOString()}</p>
  
  ${transactions.map(tx => `
    <div class="transaction">
      <h2>${tx.name}</h2>
      <p>Type: ${tx.type} | ID: ${tx.id}</p>
      <p>Started: ${new Date(tx.startTime).toLocaleString()} | Duration: ${tx.endTime ? tx.endTime - tx.startTime : 'Active'}ms</p>
      
      <div class="metrics">
        <div class="metric">
          <div class="metric-value">${tx.metrics.mcpToolCalls}</div>
          <div class="metric-label">MCP Tool Calls</div>
        </div>
        <div class="metric">
          <div class="metric-value">${tx.metrics.agentInvocations}</div>
          <div class="metric-label">Agent Invocations</div>
        </div>
        <div class="metric">
          <div class="metric-value">${tx.metrics.apiCalls}</div>
          <div class="metric-label">API Calls</div>
        </div>
        <div class="metric">
          <div class="metric-value">${(tx.metrics.totalDataTransferred / 1024).toFixed(2)}KB</div>
          <div class="metric-label">Data Transferred</div>
        </div>
        <div class="metric">
          <div class="metric-value">${tx.metrics.cacheHits}</div>
          <div class="metric-label">Cache Hits</div>
        </div>
        <div class="metric">
          <div class="metric-value">${tx.metrics.cacheMisses}</div>
          <div class="metric-label">Cache Misses</div>
        </div>
        <div class="metric">
          <div class="metric-value">${(tx.metrics.peakMemoryUsage / 1024 / 1024).toFixed(2)}MB</div>
          <div class="metric-label">Peak Memory</div>
        </div>
        <div class="metric">
          <div class="metric-value">${tx.metrics.errors}</div>
          <div class="metric-label">Errors</div>
        </div>
      </div>
      
      <div class="spans">
        <h3>Execution Timeline</h3>
        ${this.renderSpans(tx.rootSpan)}
      </div>
    </div>
  `).join('')}
</body>
</html>
    `;
  }

  private renderSpans(span: any, indent = 0): string {
    return `
      <div class="span ${span.status === 'error' ? 'error' : ''}" style="margin-left: ${indent * 20}px">
        <strong>${span.name}</strong> (${span.type})
        <br>Duration: ${span.endTime ? span.endTime - span.startTime : 'Active'}ms
        ${span.error ? `<br>Error: ${span.error.message}` : ''}
      </div>
      ${span.children ? span.children.map((child: any) => this.renderSpans(child, indent + 1)).join('') : ''}
    `;
  }
}