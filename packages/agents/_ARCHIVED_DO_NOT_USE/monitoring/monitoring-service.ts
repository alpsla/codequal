/**
 * Comprehensive Monitoring Service for Agent Architecture
 * 
 * Tracks:
 * - Performance metrics (execution time, memory usage)
 * - Error logs and failure rates
 * - Tool usage statistics
 * - Cost tracking for paid tools
 * - Test coverage and validation status
 */

import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import { logger } from '../two-branch/utils/logger';

export interface PerformanceMetrics {
  executionTime: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  cpuUsage: {
    user: number;
    system: number;
  };
}

export interface ToolExecution {
  toolName: string;
  agentName: string;
  language: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  status: 'running' | 'success' | 'failed' | 'skipped';
  error?: string;
  findingsCount?: number;
  performance?: PerformanceMetrics;
  cost?: ToolCost;
}

export interface ToolCost {
  amount: number;
  currency: string;
  billingUnit: 'per-scan' | 'per-line' | 'per-file' | 'per-minute';
  provider?: string;
}

export interface ErrorLog {
  timestamp: Date;
  agentName: string;
  toolName?: string;
  errorType: string;
  message: string;
  stack?: string;
  context?: any;
}

export interface TestValidation {
  agentName: string;
  language: string;
  toolName: string;
  tested: boolean;
  testDate?: Date;
  testResults?: {
    passed: boolean;
    coverage: number;
    failures?: string[];
  };
}

export interface MonitoringReport {
  timestamp: Date;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  totalCost: number;
  errorRate: number;
  toolUsageStats: Map<string, ToolUsageStats>;
  performanceTrends: PerformanceTrend[];
  testCoverage: TestCoverageReport;
}

export interface ToolUsageStats {
  toolName: string;
  executionCount: number;
  successCount: number;
  failureCount: number;
  averageDuration: number;
  totalCost: number;
  lastUsed: Date;
}

export interface PerformanceTrend {
  period: string;
  averageExecutionTime: number;
  peakMemoryUsage: number;
  errorRate: number;
}

export interface TestCoverageReport {
  totalAgents: number;
  testedAgents: number;
  totalTools: number;
  testedTools: number;
  coveragePercentage: number;
  untested: Array<{
    agent: string;
    language: string;
    tool: string;
  }>;
}

class MonitoringService extends EventEmitter {
  private static instance: MonitoringService;
  private executions: ToolExecution[] = [];
  private errors: ErrorLog[] = [];
  private testValidations: Map<string, TestValidation> = new Map();
  private metricsInterval?: NodeJS.Timeout;
  private readonly dataDir: string;
  private readonly maxExecutionsInMemory = 1000;
  private readonly maxErrorsInMemory = 500;

  // Cost configuration for paid tools
  private readonly toolCosts: Map<string, ToolCost> = new Map([
    ['snyk', { amount: 0.01, currency: 'USD', billingUnit: 'per-scan', provider: 'Snyk' }],
    ['sonarqube', { amount: 0.005, currency: 'USD', billingUnit: 'per-line', provider: 'SonarSource' }],
    ['veracode', { amount: 0.02, currency: 'USD', billingUnit: 'per-scan', provider: 'Veracode' }],
    ['checkmarx', { amount: 0.015, currency: 'USD', billingUnit: 'per-scan', provider: 'Checkmarx' }],
    ['fortify', { amount: 0.018, currency: 'USD', billingUnit: 'per-scan', provider: 'MicroFocus' }],
  ]);

  private constructor() {
    super();
    this.dataDir = path.join(process.cwd(), '.monitoring');
    this.ensureDataDirectory();
    this.loadPersistedData();
    this.startMetricsCollection();
  }

  public static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  private ensureDataDirectory(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  private loadPersistedData(): void {
    try {
      // Load test validations
      const validationsFile = path.join(this.dataDir, 'test-validations.json');
      if (fs.existsSync(validationsFile)) {
        const data = JSON.parse(fs.readFileSync(validationsFile, 'utf-8'));
        this.testValidations = new Map(data);
      }

      // Load recent executions
      const executionsFile = path.join(this.dataDir, 'recent-executions.json');
      if (fs.existsSync(executionsFile)) {
        this.executions = JSON.parse(fs.readFileSync(executionsFile, 'utf-8'))
          .slice(-this.maxExecutionsInMemory);
      }
    } catch (error) {
      logger.error('Failed to load persisted monitoring data:', error);
    }
  }

  private persistData(): void {
    try {
      // Persist test validations
      const validationsFile = path.join(this.dataDir, 'test-validations.json');
      fs.writeFileSync(
        validationsFile,
        JSON.stringify(Array.from(this.testValidations.entries()), null, 2)
      );

      // Persist recent executions
      const executionsFile = path.join(this.dataDir, 'recent-executions.json');
      fs.writeFileSync(
        executionsFile,
        JSON.stringify(this.executions.slice(-this.maxExecutionsInMemory), null, 2)
      );
    } catch (error) {
      logger.error('Failed to persist monitoring data:', error);
    }
  }

  private startMetricsCollection(): void {
    // Collect system metrics every 30 seconds
    this.metricsInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 30000);
  }

  private collectSystemMetrics(): void {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    this.emit('metrics', {
      timestamp: new Date(),
      memory: memoryUsage,
      cpu: cpuUsage,
      activeExecutions: this.executions.filter(e => e.status === 'running').length
    });
  }

  /**
   * Start tracking a tool execution
   */
  public startExecution(
    agentName: string,
    toolName: string,
    language: string
  ): string {
    const executionId = `${agentName}-${toolName}-${Date.now()}`;
    const execution: ToolExecution = {
      toolName,
      agentName,
      language,
      startTime: new Date(),
      status: 'running',
      performance: {
        executionTime: 0,
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      }
    };

    this.executions.push(execution);
    
    // Check for cost tracking
    if (this.toolCosts.has(toolName)) {
      execution.cost = this.toolCosts.get(toolName);
    }

    this.emit('execution:start', execution);
    
    // Trim executions if exceeding limit
    if (this.executions.length > this.maxExecutionsInMemory) {
      this.executions = this.executions.slice(-this.maxExecutionsInMemory);
    }

    return executionId;
  }

  /**
   * Complete a tool execution
   */
  public completeExecution(
    executionId: string,
    status: 'success' | 'failed',
    findingsCount?: number,
    error?: string
  ): void {
    const execution = this.executions.find(e => 
      `${e.agentName}-${e.toolName}-${e.startTime.getTime()}` === executionId
    );

    if (execution) {
      execution.endTime = new Date();
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
      execution.status = status;
      execution.findingsCount = findingsCount;
      
      if (error) {
        execution.error = error;
        this.logError(execution.agentName, execution.toolName, error);
      }

      // Update performance metrics
      if (execution.performance) {
        execution.performance.executionTime = execution.duration;
        const currentMemory = process.memoryUsage();
        const currentCpu = process.cpuUsage();
        
        execution.performance.memoryUsage = currentMemory;
        execution.performance.cpuUsage = {
          user: currentCpu.user - execution.performance.cpuUsage.user,
          system: currentCpu.system - execution.performance.cpuUsage.system
        };
      }

      // Calculate cost if applicable
      if (execution.cost) {
        execution.cost.amount = this.calculateCost(execution);
      }

      this.emit('execution:complete', execution);
      this.persistData();
    }
  }

  /**
   * Calculate cost for a tool execution
   */
  private calculateCost(execution: ToolExecution): number {
    if (!execution.cost) return 0;

    switch (execution.cost.billingUnit) {
      case 'per-scan':
        return execution.cost.amount;
      case 'per-minute':
        return (execution.duration || 0) / 60000 * execution.cost.amount;
      case 'per-line':
        // This would need actual line count from the analysis
        return execution.cost.amount * 1000; // Default estimate
      case 'per-file':
        // This would need actual file count from the analysis
        return execution.cost.amount * 10; // Default estimate
      default:
        return execution.cost.amount;
    }
  }

  /**
   * Log an error
   */
  public logError(
    agentName: string,
    toolName: string | undefined,
    error: string | Error
  ): void {
    const errorLog: ErrorLog = {
      timestamp: new Date(),
      agentName,
      toolName,
      errorType: error instanceof Error ? error.name : 'GenericError',
      message: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined
    };

    this.errors.push(errorLog);
    
    // Trim errors if exceeding limit
    if (this.errors.length > this.maxErrorsInMemory) {
      this.errors = this.errors.slice(-this.maxErrorsInMemory);
    }

    this.emit('error:logged', errorLog);
    logger.error(`[${agentName}${toolName ? `/${toolName}` : ''}] ${errorLog.message}`);
  }

  /**
   * Mark a tool as tested
   */
  public markAsTested(
    agentName: string,
    language: string,
    toolName: string,
    testResults?: TestValidation['testResults']
  ): void {
    const key = `${agentName}-${language}-${toolName}`;
    const validation: TestValidation = {
      agentName,
      language,
      toolName,
      tested: true,
      testDate: new Date(),
      testResults
    };

    this.testValidations.set(key, validation);
    this.emit('test:validated', validation);
    this.persistData();
  }

  /**
   * Get test coverage report
   */
  public getTestCoverage(): TestCoverageReport {
    const allCombinations = this.getAllAgentToolCombinations();
    const tested = Array.from(this.testValidations.values()).filter(v => v.tested);
    
    const untested = allCombinations
      .filter(combo => !this.testValidations.has(
        `${combo.agent}-${combo.language}-${combo.tool}`
      ))
      .map(combo => ({
        agent: combo.agent,
        language: combo.language,
        tool: combo.tool
      }));

    return {
      totalAgents: new Set(allCombinations.map(c => c.agent)).size,
      testedAgents: new Set(tested.map(t => t.agentName)).size,
      totalTools: allCombinations.length,
      testedTools: tested.length,
      coveragePercentage: (tested.length / allCombinations.length) * 100,
      untested
    };
  }

  /**
   * Get all possible agent-tool combinations
   */
  private getAllAgentToolCombinations(): Array<{
    agent: string;
    language: string;
    tool: string;
  }> {
    // This would be populated from the tools matrix
    return [
      // JavaScript/TypeScript
      { agent: 'JavaScriptSecurityAgent', language: 'javascript', tool: 'eslint' },
      { agent: 'JavaScriptSecurityAgent', language: 'javascript', tool: 'jshint' },
      { agent: 'JavaScriptSecurityAgent', language: 'javascript', tool: 'semgrep' },
      { agent: 'JavaScriptSecurityAgent', language: 'javascript', tool: 'snyk' },
      
      // Python
      { agent: 'PythonSecurityAgent', language: 'python', tool: 'bandit' },
      { agent: 'PythonSecurityAgent', language: 'python', tool: 'pylint' },
      { agent: 'PythonSecurityAgent', language: 'python', tool: 'safety' },
      { agent: 'PythonSecurityAgent', language: 'python', tool: 'mypy' },
      
      // Java
      { agent: 'JavaSecurityAgent', language: 'java', tool: 'spotbugs' },
      { agent: 'JavaSecurityAgent', language: 'java', tool: 'pmd' },
      { agent: 'JavaSecurityAgent', language: 'java', tool: 'checkstyle' },
      
      // C/C++
      { agent: 'CppSecurityAgent', language: 'cpp', tool: 'cppcheck' },
      { agent: 'CppSecurityAgent', language: 'cpp', tool: 'clang-tidy' },
      { agent: 'CppSecurityAgent', language: 'cpp', tool: 'pvs-studio' },
      
      // Ruby
      { agent: 'RubySecurityAgent', language: 'ruby', tool: 'rubocop' },
      { agent: 'RubySecurityAgent', language: 'ruby', tool: 'brakeman' },
      
      // Go
      { agent: 'GoSecurityAgent', language: 'go', tool: 'gosec' },
      { agent: 'GoSecurityAgent', language: 'go', tool: 'staticcheck' },
      { agent: 'GoSecurityAgent', language: 'go', tool: 'golangci-lint' },
    ];
  }

  /**
   * Generate monitoring report
   */
  public generateReport(period: 'hour' | 'day' | 'week' | 'month' = 'day'): MonitoringReport {
    const now = new Date();
    const periodMs = this.getPeriodMilliseconds(period);
    const startTime = new Date(now.getTime() - periodMs);
    
    const relevantExecutions = this.executions.filter(
      e => e.startTime >= startTime
    );

    const toolStats = new Map<string, ToolUsageStats>();
    let totalCost = 0;

    // Calculate tool usage statistics
    relevantExecutions.forEach(exec => {
      const key = exec.toolName;
      if (!toolStats.has(key)) {
        toolStats.set(key, {
          toolName: exec.toolName,
          executionCount: 0,
          successCount: 0,
          failureCount: 0,
          averageDuration: 0,
          totalCost: 0,
          lastUsed: exec.startTime
        });
      }

      const stats = toolStats.get(key)!;
      stats.executionCount++;
      
      if (exec.status === 'success') {
        stats.successCount++;
      } else if (exec.status === 'failed') {
        stats.failureCount++;
      }

      if (exec.duration) {
        stats.averageDuration = 
          (stats.averageDuration * (stats.executionCount - 1) + exec.duration) / 
          stats.executionCount;
      }

      if (exec.cost) {
        const cost = this.calculateCost(exec);
        stats.totalCost += cost;
        totalCost += cost;
      }

      if (exec.startTime > stats.lastUsed) {
        stats.lastUsed = exec.startTime;
      }
    });

    const successfulExecutions = relevantExecutions.filter(e => e.status === 'success').length;
    const failedExecutions = relevantExecutions.filter(e => e.status === 'failed').length;
    
    return {
      timestamp: now,
      totalExecutions: relevantExecutions.length,
      successfulExecutions,
      failedExecutions,
      averageExecutionTime: this.calculateAverageExecutionTime(relevantExecutions),
      totalCost,
      errorRate: relevantExecutions.length > 0 
        ? (failedExecutions / relevantExecutions.length) * 100 
        : 0,
      toolUsageStats: toolStats,
      performanceTrends: this.calculatePerformanceTrends(relevantExecutions),
      testCoverage: this.getTestCoverage()
    };
  }

  private getPeriodMilliseconds(period: string): number {
    switch (period) {
      case 'hour': return 60 * 60 * 1000;
      case 'day': return 24 * 60 * 60 * 1000;
      case 'week': return 7 * 24 * 60 * 60 * 1000;
      case 'month': return 30 * 24 * 60 * 60 * 1000;
      default: return 24 * 60 * 60 * 1000;
    }
  }

  private calculateAverageExecutionTime(executions: ToolExecution[]): number {
    const validExecutions = executions.filter(e => e.duration);
    if (validExecutions.length === 0) return 0;
    
    const totalTime = validExecutions.reduce((sum, e) => sum + (e.duration || 0), 0);
    return totalTime / validExecutions.length;
  }

  private calculatePerformanceTrends(executions: ToolExecution[]): PerformanceTrend[] {
    // Group executions by hour for trends
    const hourlyGroups = new Map<string, ToolExecution[]>();
    
    executions.forEach(exec => {
      const hourKey = new Date(exec.startTime).toISOString().slice(0, 13);
      if (!hourlyGroups.has(hourKey)) {
        hourlyGroups.set(hourKey, []);
      }
      hourlyGroups.get(hourKey)!.push(exec);
    });

    return Array.from(hourlyGroups.entries()).map(([period, execs]) => ({
      period,
      averageExecutionTime: this.calculateAverageExecutionTime(execs),
      peakMemoryUsage: Math.max(...execs.map(e => 
        e.performance?.memoryUsage?.heapUsed || 0
      )),
      errorRate: (execs.filter(e => e.status === 'failed').length / execs.length) * 100
    }));
  }

  /**
   * Export monitoring data
   */
  public exportData(format: 'json' | 'csv' = 'json'): string {
    const report = this.generateReport('month');
    
    if (format === 'json') {
      return JSON.stringify(report, null, 2);
    } else {
      // CSV export
      const headers = ['Timestamp', 'Tool', 'Agent', 'Language', 'Status', 'Duration', 'Cost', 'Findings'];
      const rows = this.executions.map(e => [
        e.startTime.toISOString(),
        e.toolName,
        e.agentName,
        e.language,
        e.status,
        e.duration || 0,
        e.cost ? this.calculateCost(e) : 0,
        e.findingsCount || 0
      ]);
      
      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
  }

  /**
   * Clean up and stop monitoring
   */
  public stop(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    this.persistData();
    this.removeAllListeners();
  }
}

export const monitoringService = MonitoringService.getInstance();
export default monitoringService;