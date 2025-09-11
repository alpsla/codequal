/**
 * Integration test for end-to-end transaction monitoring
 * Demonstrates complete data flow tracking from MCP tools through agents to final output
 */

import { EndToEndTransactionMonitor } from '../end-to-end-transaction-monitor';
import { TransactionAwareOrchestrator } from '../transaction-aware-orchestrator';
import { TransactionAwareAgent } from '../transaction-aware-agent';
import { UnifiedMonitoringService } from '../../standard/monitoring/services/unified-monitoring.service';
import { EnhancedMCPOrchestrator } from '../../two-branch/orchestrators/enhanced-mcp-orchestrator';
import { RubySecurityAgent } from '../../two-branch/agents/RubySecurityAgent';
import { PythonSecurityAgent } from '../../two-branch/agents/PythonSecurityAgent';
import { TypeScriptSecurityAgent } from '../../two-branch/agents/TypeScriptSecurityAgent';

describe('End-to-End Transaction Monitoring', () => {
  let transactionMonitor: EndToEndTransactionMonitor;
  let unifiedMonitoring: UnifiedMonitoringService;
  let orchestrator: TransactionAwareOrchestrator;
  let agents: Map<string, TransactionAwareAgent>;

  beforeEach(() => {
    // Initialize monitoring services
    transactionMonitor = EndToEndTransactionMonitor.getInstance();
    unifiedMonitoring = UnifiedMonitoringService.getInstance();

    // Create base orchestrator
    const baseOrchestrator = new EnhancedMCPOrchestrator({
      useCache: false,
      mcpService: {} as any,
      comparisonService: {} as any,
      gitDiffService: {} as any,
      educatorAgent: {} as any,
      repositoryManager: {} as any
    });

    // Wrap with transaction awareness
    orchestrator = new TransactionAwareOrchestrator(
      baseOrchestrator,
      transactionMonitor,
      unifiedMonitoring
    );

    // Create and wrap agents
    agents = new Map([
      ['ruby', new TransactionAwareAgent(new RubySecurityAgent({} as any), 'RubySecurityAgent')],
      ['python', new TransactionAwareAgent(new PythonSecurityAgent({} as any), 'PythonSecurityAgent')],
      ['typescript', new TransactionAwareAgent(new TypeScriptSecurityAgent({} as any), 'TypeScriptSecurityAgent')]
    ]);
  });

  describe('Transaction Flow Tracking', () => {
    it('should track complete PR analysis transaction', async () => {
      // Start a transaction
      const transaction = transactionMonitor.startTransaction(
        'test-pr-analysis',
        'pr-analysis',
        { test: true }
      );

      // Simulate orchestrator span
      const orchSpan = transactionMonitor.startSpan(
        transaction.id,
        'orchestrator.main',
        'orchestration'
      );

      // Track data flow from input
      transactionMonitor.trackDataFlow(
        transaction.id,
        'input',
        'orchestrator',
        { owner: 'test', repo: 'repo', pr: 1 },
        100
      );

      // Simulate MCP tool calls
      const mcpSpan = transactionMonitor.startSpan(
        transaction.id,
        'mcp.github.fetch',
        'mcp-tool',
        orchSpan.id
      );
      transactionMonitor.updateMetrics(transaction.id, { mcpToolCalls: 1 });
      transactionMonitor.endSpan(transaction.id, mcpSpan.id, 'success');

      // Simulate agent invocations
      for (const [lang, agent] of agents) {
        const agentSpan = transactionMonitor.startSpan(
          transaction.id,
          `agent.${lang}.analyze`,
          'agent-operation',
          orchSpan.id
        );

        // Track agent communication
        transactionMonitor.trackAgentCommunication(
          transaction.id,
          'orchestrator',
          `${lang}-agent`,
          'analyze-request',
          { files: 10 }
        );

        // Track data flow through agent
        transactionMonitor.trackDataFlow(
          transaction.id,
          'orchestrator',
          `${lang}-agent`,
          { files: 10 },
          1000
        );

        transactionMonitor.updateMetrics(transaction.id, { agentInvocations: 1 });

        // Simulate tool execution within agent
        const toolSpan = transactionMonitor.startSpan(
          transaction.id,
          `tool.${lang}.eslint`,
          'tool-execution',
          agentSpan.id
        );
        transactionMonitor.updateMetrics(transaction.id, { mcpToolCalls: 1 });
        transactionMonitor.endSpan(transaction.id, toolSpan.id, 'success');

        // Track response
        transactionMonitor.trackDataFlow(
          transaction.id,
          `${lang}-agent`,
          'orchestrator',
          { issues: 5 },
          500
        );

        transactionMonitor.trackAgentCommunication(
          transaction.id,
          `${lang}-agent`,
          'orchestrator',
          'analyze-response',
          { issues: 5 }
        );

        transactionMonitor.endSpan(transaction.id, agentSpan.id, 'success');
      }

      // Track comparison phase
      const comparisonSpan = transactionMonitor.startSpan(
        transaction.id,
        'comparison.execute',
        'comparison',
        orchSpan.id
      );
      transactionMonitor.trackDataFlow(
        transaction.id,
        'agents',
        'comparison',
        { totalIssues: 15 },
        1500
      );
      transactionMonitor.endSpan(transaction.id, comparisonSpan.id, 'success');

      // Track report generation
      const reportSpan = transactionMonitor.startSpan(
        transaction.id,
        'report.generate',
        'report-generation',
        orchSpan.id
      );
      transactionMonitor.trackDataFlow(
        transaction.id,
        'comparison',
        'report',
        { newIssues: 10, fixedIssues: 5 },
        2000
      );
      transactionMonitor.endSpan(transaction.id, reportSpan.id, 'success');

      // End orchestrator span
      transactionMonitor.endSpan(transaction.id, orchSpan.id, 'success');

      // End transaction
      transactionMonitor.endTransaction(transaction.id);

      // Generate report
      const report = transactionMonitor.generateTransactionReport(transaction.id);

      // Assertions
      expect(report).toBeDefined();
      expect(report.transactionId).toBe(transaction.id);
      expect(report.metrics.mcpToolCalls).toBe(4); // 1 github + 3 agent tools
      expect(report.metrics.agentInvocations).toBe(3);
      expect(report.metrics.totalDataTransferred).toBeGreaterThan(0);
      expect(report.spanCount).toBeGreaterThan(0);
      expect(report.criticalPath).toBeDefined();
      expect(report.criticalPath.length).toBeGreaterThan(0);
    });

    it('should track error scenarios', async () => {
      const transaction = transactionMonitor.startTransaction(
        'test-error-flow',
        'pr-analysis',
        {}
      );

      const span = transactionMonitor.startSpan(
        transaction.id,
        'failing.operation',
        'agent-operation'
      );

      // Track error
      const error = new Error('Test error');
      transactionMonitor.trackError(transaction.id, error, {
        component: 'test-agent',
        operation: 'analyze'
      });

      transactionMonitor.endSpan(transaction.id, span.id, 'error', error);
      transactionMonitor.endTransaction(transaction.id);

      const report = transactionMonitor.generateTransactionReport(transaction.id);

      expect(report.metrics.errors).toBe(1);
      expect(report.errors).toHaveLength(1);
      expect(report.errors[0].message).toBe('Test error');
    });

    it('should track cache performance', async () => {
      const transaction = transactionMonitor.startTransaction(
        'test-cache-flow',
        'repository-scan',
        {}
      );

      // Simulate cache operations
      transactionMonitor.updateMetrics(transaction.id, {
        cacheHits: 5,
        cacheMisses: 2
      });

      transactionMonitor.endTransaction(transaction.id);

      const report = transactionMonitor.generateTransactionReport(transaction.id);

      expect(report.metrics.cacheHits).toBe(5);
      expect(report.metrics.cacheMisses).toBe(2);
      expect(report.performance.cacheHitRate).toBeCloseTo(0.714, 2); // 5/7
    });

    it('should identify performance bottlenecks', async () => {
      const transaction = transactionMonitor.startTransaction(
        'test-bottleneck',
        'pr-analysis',
        {}
      );

      // Create spans with different durations
      const fastSpan = transactionMonitor.startSpan(
        transaction.id,
        'fast.operation',
        'agent-operation'
      );
      await new Promise(resolve => setTimeout(resolve, 10));
      transactionMonitor.endSpan(transaction.id, fastSpan.id, 'success');

      const slowSpan = transactionMonitor.startSpan(
        transaction.id,
        'slow.operation',
        'api-call'
      );
      await new Promise(resolve => setTimeout(resolve, 100));
      transactionMonitor.endSpan(transaction.id, slowSpan.id, 'success');

      transactionMonitor.endTransaction(transaction.id);

      const report = transactionMonitor.generateTransactionReport(transaction.id);
      const bottlenecks = transactionMonitor.identifyBottlenecks(transaction.id);

      expect(bottlenecks).toHaveLength(1);
      expect(bottlenecks[0].name).toBe('slow.operation');
      expect(bottlenecks[0].duration).toBeGreaterThanOrEqual(100);
    });
  });

  describe('TransactionAwareOrchestrator', () => {
    it('should wrap orchestrator with transaction monitoring', async () => {
      // Mock the orchestrator's analyzePullRequest method
      const mockAnalyze = jest.fn().mockResolvedValue({
        issues: [{ id: 1, message: 'Test issue' }],
        summary: { total: 1 }
      });
      
      orchestrator['orchestrator'].analyzePullRequest = mockAnalyze;

      // Execute with monitoring
      const result = await orchestrator.analyzePullRequest('owner', 'repo', 123, {
        transactionName: 'test-orchestrator-wrap'
      });

      // Verify result includes transaction data
      expect(result.transactionId).toBeDefined();
      expect(result.transactionReport).toBeDefined();
      expect(result.issues).toHaveLength(1);

      // Verify orchestrator was called
      expect(mockAnalyze).toHaveBeenCalledWith('owner', 'repo', 123);

      // Check transaction history
      const history = orchestrator.getTransactionHistory();
      expect(history.length).toBeGreaterThan(0);
      expect(history[history.length - 1].name).toContain('test-orchestrator-wrap');
    });

    it('should generate monitoring reports', async () => {
      // Create some transactions
      const tx = transactionMonitor.startTransaction('report-test', 'pr-analysis', {});
      transactionMonitor.updateMetrics(tx.id, {
        mcpToolCalls: 10,
        agentInvocations: 5,
        totalDataTransferred: 10240
      });
      transactionMonitor.endTransaction(tx.id);

      // Generate JSON report
      const jsonReport = await orchestrator.exportMonitoringData('json');
      expect(jsonReport).toBeDefined();
      expect(JSON.parse(jsonReport)).toBeInstanceOf(Array);

      // Generate HTML report
      const htmlReport = await orchestrator.exportMonitoringData('html');
      expect(htmlReport).toContain('<!DOCTYPE html>');
      expect(htmlReport).toContain('Transaction Monitoring Report');
      expect(htmlReport).toContain('MCP Tool Calls');
    });
  });

  describe('TransactionAwareAgent', () => {
    it('should wrap agent methods with monitoring', async () => {
      const rubyAgent = agents.get('ruby')!;
      
      // Set transaction context
      const tx = transactionMonitor.startTransaction('agent-test', 'pr-analysis', {});
      rubyAgent.setTransactionContext({
        transactionId: tx.id,
        agentName: 'RubySecurityAgent',
        operation: 'analyze'
      });

      // Mock agent method
      const mockAnalyze = jest.fn().mockResolvedValue({
        issues: [{ type: 'security', message: 'SQL injection' }]
      });
      rubyAgent.getAgent()['analyze'] = mockAnalyze;

      // Execute wrapped method
      await rubyAgent.getAgent()['analyze']('test-file.rb');

      // Clear context
      rubyAgent.clearTransactionContext();
      transactionMonitor.endTransaction(tx.id);

      // Verify monitoring was applied
      const report = transactionMonitor.generateTransactionReport(tx.id);
      expect(report.metrics.agentInvocations).toBeGreaterThan(0);
    });

    it('should track tool costs', async () => {
      const agent = agents.get('python')!;
      
      // Mock tool with cost
      const mockTool = {
        name: 'snyk',
        execute: jest.fn().mockResolvedValue({ vulnerabilities: [] })
      };
      
      agent.getAgent()['tools'] = [mockTool];
      
      // Execute with monitoring
      const tx = transactionMonitor.startTransaction('cost-test', 'pr-analysis', {});
      agent.setTransactionContext({
        transactionId: tx.id,
        agentName: 'PythonSecurityAgent',
        operation: 'scan'
      });

      await agent['wrapToolExecution'](
        mockTool.execute,
        ['file1.py', 'file2.py']
      );

      agent.clearTransactionContext();
      transactionMonitor.endTransaction(tx.id);

      // Check cost metrics
      const metrics = agent.getMetrics();
      expect(metrics.costMetrics).toBeDefined();
    });

    it('should track inter-agent communication', () => {
      const pythonAgent = agents.get('python')!;
      const rubyAgent = agents.get('ruby')!;

      const tx = transactionMonitor.startTransaction('comm-test', 'pr-analysis', {});
      
      pythonAgent.setTransactionContext({
        transactionId: tx.id,
        agentName: 'PythonSecurityAgent',
        operation: 'collaborate'
      });

      // Track communication
      pythonAgent.trackAgentCommunication(
        'RubySecurityAgent',
        'share-findings',
        { sharedIssues: 3 }
      );

      transactionMonitor.endTransaction(tx.id);

      // Verify communication was tracked
      const report = transactionMonitor.generateTransactionReport(tx.id);
      expect(report.agentCommunications).toBeDefined();
      expect(report.agentCommunications).toHaveLength(1);
      expect(report.agentCommunications[0].from).toBe('PythonSecurityAgent');
      expect(report.agentCommunications[0].to).toBe('RubySecurityAgent');
    });
  });

  describe('Performance Analysis', () => {
    it('should calculate transaction statistics', async () => {
      // Create multiple transactions
      for (let i = 0; i < 5; i++) {
        const tx = transactionMonitor.startTransaction(`perf-test-${i}`, 'pr-analysis', {});
        
        // Add varying metrics
        transactionMonitor.updateMetrics(tx.id, {
          mcpToolCalls: Math.floor(Math.random() * 10) + 1,
          agentInvocations: Math.floor(Math.random() * 5) + 1,
          totalDataTransferred: Math.floor(Math.random() * 10000) + 1000
        });

        await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
        transactionMonitor.endTransaction(tx.id);
      }

      // Get aggregate statistics
      const history = transactionMonitor.getTransactionHistory();
      const stats = transactionMonitor.getAggregateStatistics();

      expect(stats.totalTransactions).toBe(history.length);
      expect(stats.averageDuration).toBeGreaterThan(0);
      expect(stats.averageToolCalls).toBeGreaterThan(0);
      expect(stats.successRate).toBeGreaterThanOrEqual(0);
      expect(stats.successRate).toBeLessThanOrEqual(1);
    });
  });
});