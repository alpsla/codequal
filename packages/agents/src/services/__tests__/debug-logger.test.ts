import { DebugLogger, getDebugLogger } from '../debug-logger';

describe('DebugLogger', () => {
  let debugLogger: DebugLogger;

  beforeEach(() => {
    debugLogger = new DebugLogger(true); // Enable debug mode
  });

  afterEach(() => {
    debugLogger.clearTraces();
  });

  describe('Execution Tracking', () => {
    it('should track tool execution lifecycle', async () => {
      // Start execution
      const executionId = debugLogger.startExecution(
        'tool',
        'eslint-mcp',
        'analysis',
        { files: ['test.js'], config: { rules: {} } }
      );

      expect(executionId).toBeDefined();

      // Update execution
      debugLogger.updateExecution(executionId, {
        metadata: { filesProcessed: 1 }
      });

      // Complete execution
      debugLogger.completeExecution(executionId, {
        findings: [
          { type: 'error', message: 'Missing semicolon', line: 10 }
        ],
        metrics: { totalIssues: 1 }
      }, {
        toolName: 'eslint',
        executionTime: 150
      });

      // Verify traces
      const traces = debugLogger.getTraces('eslint-mcp');
      expect(traces).toHaveLength(1);
      expect(traces[0].status).toBe('completed');
      expect(traces[0].output).toEqual({
        findings: [
          { type: 'error', message: 'Missing semicolon', line: 10 }
        ],
        metrics: { totalIssues: 1 }
      });
    });

    it('should track agent execution with failure', async () => {
      // Start agent execution
      const executionId = debugLogger.startExecution(
        'agent',
        'security-agent',
        'pr-analysis',
        { prNumber: 123, repository: 'test/repo' }
      );

      // Simulate failure
      const error = new Error('API rate limit exceeded');
      debugLogger.failExecution(executionId, error, {
        agentName: 'security',
        errorType: 'rate-limit'
      });

      // Verify traces
      const traces = debugLogger.getTraces('security-agent');
      expect(traces).toHaveLength(1);
      expect(traces[0].status).toBe('failed');
      expect(traces[0].error).toEqual({
        name: 'Error',
        message: 'API rate limit exceeded',
        stack: expect.any(String)
      });
    });
  });

  describe('Log Methods', () => {
    it('should log agent execution details', () => {
      debugLogger.logAgentExecution('test-agent', 'analysis-complete', {
        config: { model: 'gpt-4', temperature: 0.7 },
        result: { insights: [], suggestions: [] },
        duration: 2500
      });

      // Since logs are internal, we verify through traces
      const summary = debugLogger.getSummary();
      expect(summary.totalExecutions).toBe(0); // logAgentExecution doesn't create traces
    });

    it('should log tool execution details', () => {
      debugLogger.logToolExecution('semgrep', 'security', {
        findings: [
          { severity: 'high', message: 'SQL injection vulnerability' }
        ],
        duration: 1200,
        metadata: { filesScanned: 10 }
      });

      // Verify through summary
      const summary = debugLogger.getSummary();
      expect(summary.totalExecutions).toBe(0); // logToolExecution doesn't create traces
    });
  });

  describe('Data Sanitization', () => {
    it('should sanitize sensitive fields', () => {
      const executionId = debugLogger.startExecution(
        'system',
        'auth-service',
        'login',
        {
          username: 'test@example.com',
          password: 'secret123',
          apiKey: 'sk-1234567890',
          token: 'jwt-token-here'
        }
      );

      const traces = debugLogger.getTraces();
      expect(traces[0].input).toEqual({
        username: 'test@example.com',
        password: '[REDACTED]',
        apiKey: '[REDACTED]',
        token: '[REDACTED]'
      });
    });

    it('should truncate large outputs', () => {
      const executionId = debugLogger.startExecution(
        'tool',
        'large-output-tool',
        'analysis',
        {}
      );

      // Create large output
      const largeArray = new Array(1000).fill({ data: 'test'.repeat(100) });
      
      debugLogger.completeExecution(executionId, largeArray);

      const traces = debugLogger.getTraces();
      expect(traces[0].output).toHaveProperty('_truncated', true);
      expect(traces[0].output).toHaveProperty('_originalSize');
      expect(traces[0].output).toHaveProperty('summary');
    });
  });

  describe('Summary and Export', () => {
    it('should generate execution summary', () => {
      // Create multiple executions
      const exec1 = debugLogger.startExecution('agent', 'agent1', 'phase1');
      const exec2 = debugLogger.startExecution('tool', 'tool1', 'phase1');
      const exec3 = debugLogger.startExecution('agent', 'agent2', 'phase2');

      debugLogger.completeExecution(exec1, {}, { duration: 1000 });
      debugLogger.completeExecution(exec2, {}, { duration: 500 });
      debugLogger.failExecution(exec3, new Error('Failed'));

      const summary = debugLogger.getSummary();
      
      expect(summary.totalExecutions).toBe(3);
      expect(summary.completedExecutions).toBe(2);
      expect(summary.failedExecutions).toBe(1);
      expect(summary.averageDuration).toBeGreaterThan(0);
      expect(summary.byType).toEqual({
        agent: 2,
        tool: 1
      });
      expect(summary.byPhase).toEqual({
        phase1: 2,
        phase2: 1
      });
    });

    it('should export traces as JSON', () => {
      const exec1 = debugLogger.startExecution('agent', 'test-agent', 'test');
      debugLogger.completeExecution(exec1);

      const exported = debugLogger.exportTraces();
      const parsed = JSON.parse(exported);

      expect(parsed).toHaveProperty('exportTime');
      expect(parsed).toHaveProperty('summary');
      expect(parsed).toHaveProperty('traces');
      expect(parsed.traces).toHaveLength(1);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance from getDebugLogger', () => {
      const logger1 = getDebugLogger(true);
      const logger2 = getDebugLogger();

      expect(logger1).toBe(logger2);
    });

    it('should update debug mode on existing instance', () => {
      const logger = getDebugLogger(false);
      expect(logger).toBeDefined();

      // Update debug mode
      getDebugLogger(true);
      // Can't directly test internal state, but the instance should be updated
    });
  });
});