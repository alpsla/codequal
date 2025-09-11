import { createLogger } from '@codequal/core/utils';
import { TokenTrackingService } from '../../../../apps/api/src/services/token-tracking-service';
import { PerformanceMonitor } from '../e2e/performance-monitor';
import { MonitoringTestReportService, MonitoringTestReport } from './monitoring-test-report';
import { MetricsCollector } from '../../../../packages/core/src/monitoring/production-monitoring';
import * as promClient from 'prom-client';

/**
 * Test runner that collects comprehensive monitoring data during test execution
 */
export class MonitoredTestRunner {
  private readonly logger = createLogger('MonitoredTestRunner');
  private readonly tokenTracker: TokenTrackingService;
  private readonly performanceMonitor: PerformanceMonitor;
  private readonly reportService: MonitoringTestReportService;
  private readonly metricsCollector: MetricsCollector;
  
  private testRunId: string;
  private startTime: number;
  private monitoringData: any = {};
  
  constructor() {
    this.tokenTracker = new TokenTrackingService();
    this.performanceMonitor = new PerformanceMonitor();
    this.reportService = new MonitoringTestReportService();
    this.metricsCollector = new MetricsCollector();
    this.testRunId = `test-run-${Date.now()}`;
  }
  
  /**
   * Run tests with comprehensive monitoring
   */
  async runTests(testSuite: () => Promise<any>): Promise<MonitoringTestReport> {
    this.logger.info('Starting monitored test run', { testRunId: this.testRunId });
    this.startTime = Date.now();
    
    // Start monitoring
    this.performanceMonitor.startMonitoring();
    await this.startMetricsCollection();
    
    let testResults: any = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      failures: []
    };
    
    let report: MonitoringTestReport;
    
    try {
      // Run the test suite
      testResults = await testSuite();
      
    } catch (error) {
      this.logger.error('Test suite failed', { error });
      testResults.failed++;
      testResults.failures.push({
        testName: 'Test Suite',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    } finally {
      // Stop monitoring and collect data
      const endTime = Date.now();
      testResults.duration = endTime - this.startTime;
      
      await this.stopMetricsCollection();
      const performanceData = this.performanceMonitor.stopMonitoring();
      
      // Aggregate all monitoring data
      this.monitoringData = {
        ...this.monitoringData,
        ...performanceData,
        totalExecutionTime: endTime - this.startTime,
        tokenUsage: await this.tokenTracker.getAnalytics(),
        prometheusMetrics: await this.getPrometheusMetrics()
      };
      
      // Generate comprehensive report
      report = await this.reportService.generateTestReport(
        this.testRunId,
        testResults,
        this.monitoringData
      );
      
      // Log summary
      this.logTestSummary(report);
      
      // Save reports
      await this.saveReports(report);
    }
    
    return report;
  }
  
  /**
   * Run a single analysis with monitoring
   */
  async runAnalysisWithMonitoring(
    analysisFunction: () => Promise<any>,
    metadata: {
      repositoryUrl: string;
      prNumber: number;
      analysisMode: string;
    }
  ): Promise<{ result: any; metrics: any }> {
    const startTime = Date.now();
    const analysisId = `analysis-${Date.now()}`;
    
    // Record analysis start
    this.metricsCollector.analysisStarted.inc({
      repository: metadata.repositoryUrl,
      mode: metadata.analysisMode
    });
    
    let result: any;
    let success = false;
    
    try {
      // Track token usage for this analysis
      this.tokenTracker.startTracking(analysisId);
      
      // Run the analysis
      result = await analysisFunction();
      success = true;
      
      // Record success
      this.metricsCollector.analysisCompleted.inc({
        repository: metadata.repositoryUrl,
        mode: metadata.analysisMode,
        status: 'success'
      });
      this.metricsCollector.analysisTime.observe({
        repository: metadata.repositoryUrl,
        mode: metadata.analysisMode,
        status: 'success'
      }, (Date.now() - startTime) / 1000);
      
    } catch (error) {
      // Record failure
      this.metricsCollector.analysisFailed.inc({
        repository: metadata.repositoryUrl,
        mode: metadata.analysisMode,
        error_type: error instanceof Error ? error.constructor.name : 'UnknownError'
      });
      throw error;
      
    } finally {
      // Collect metrics for this analysis
      const tokenMetrics = this.tokenTracker.stopTracking(analysisId);
      const executionTime = Date.now() - startTime;
      
      // Update aggregate monitoring data
      this.updateMonitoringData({
        totalAnalyses: 1,
        successfulAnalyses: success ? 1 : 0,
        failedAnalyses: success ? 0 : 1,
        totalTokens: tokenMetrics?.totalTokens || 0,
        totalCost: tokenMetrics?.totalCost || 0,
        executionTimes: [executionTime]
      });
    }
    
    return { result, metrics: this.monitoringData };
  }
  
  /**
   * Start collecting metrics
   */
  private async startMetricsCollection(): Promise<void> {
    // Initialize counters
    this.monitoringData = {
      totalAnalyses: 0,
      successfulAnalyses: 0,
      failedAnalyses: 0,
      totalTokens: 0,
      totalCost: 0,
      costByModel: {},
      costByComponent: {},
      executionTimes: [],
      errorsByType: {},
      modelMetrics: {}
    };
    
    // Start system metrics collection
    this.startSystemMetrics();
  }
  
  /**
   * Stop collecting metrics
   */
  private async stopMetricsCollection(): Promise<void> {
    // Calculate aggregates
    if (this.monitoringData.executionTimes?.length > 0) {
      const times = this.monitoringData.executionTimes.sort((a: number, b: number) => a - b);
      this.monitoringData.apiLatencyP50 = times[Math.floor(times.length * 0.5)];
      this.monitoringData.apiLatencyP95 = times[Math.floor(times.length * 0.95)];
      this.monitoringData.apiLatencyP99 = times[Math.floor(times.length * 0.99)];
    }
    
    // Calculate error rate
    const total = this.monitoringData.totalAnalyses || 1;
    this.monitoringData.errorRate = this.monitoringData.failedAnalyses / total;
  }
  
  /**
   * Update monitoring data
   */
  private updateMonitoringData(updates: any): void {
    // Merge updates
    Object.keys(updates).forEach(key => {
      if (Array.isArray(this.monitoringData[key]) && Array.isArray(updates[key])) {
        this.monitoringData[key].push(...updates[key]);
      } else if (typeof this.monitoringData[key] === 'number' && typeof updates[key] === 'number') {
        this.monitoringData[key] += updates[key];
      } else if (typeof this.monitoringData[key] === 'object' && typeof updates[key] === 'object') {
        this.monitoringData[key] = { ...this.monitoringData[key], ...updates[key] };
      } else {
        this.monitoringData[key] = updates[key];
      }
    });
  }
  
  /**
   * Start system metrics collection
   */
  private startSystemMetrics(): void {
    const interval = setInterval(() => {
      const usage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      this.monitoringData.memorySnapshots = this.monitoringData.memorySnapshots || [];
      this.monitoringData.cpuSnapshots = this.monitoringData.cpuSnapshots || [];
      
      this.monitoringData.memorySnapshots.push(usage.heapUsed / 1024 / 1024);
      this.monitoringData.cpuSnapshots.push((cpuUsage.user + cpuUsage.system) / 1000000);
    }, 1000);
    
    // Store interval ID for cleanup
    this.monitoringData._metricsInterval = interval;
  }
  
  /**
   * Get Prometheus metrics
   */
  private async getPrometheusMetrics(): Promise<any> {
    try {
      const register = promClient.register;
      const metrics = await register.metrics();
      
      // Parse relevant metrics
      const parsed: any = {};
      const lines = metrics.split('\n');
      
      lines.forEach((line: string) => {
        if (line.includes('codequal_analysis_duration_seconds')) {
          // Extract duration metrics
          const match = line.match(/codequal_analysis_duration_seconds{[^}]+}\s+(\d+\.?\d*)/);
          if (match) {
            parsed.analysisDuration = parseFloat(match[1]);
          }
        }
        // Add more metric parsing as needed
      });
      
      return parsed;
    } catch (error) {
      this.logger.warn('Failed to get Prometheus metrics', { error });
      return {};
    }
  }
  
  /**
   * Log test summary to console
   */
  private logTestSummary(report: MonitoringTestReport): void {
    this.logger.info('Test run completed', {
      testRunId: report.testRunId,
      duration: `${(report.testResults.testDuration / 1000).toFixed(2)}s`,
      passed: report.testResults.passedTests,
      failed: report.testResults.failedTests,
      totalCost: `$${report.costAnalysis.totalCost.toFixed(4)}`,
      errorRate: `${(report.systemHealth.errorRate * 100).toFixed(2)}%`
    });
    
    // Log alerts
    const alerts = this.reportService.generateJsonSummary(report).alerts;
    if (alerts.length > 0) {
      this.logger.warn('Test run alerts', { alerts });
    }
  }
  
  /**
   * Save reports to files
   */
  private async saveReports(report: MonitoringTestReport): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const reportsDir = path.join(process.cwd(), 'test-reports', this.testRunId);
    await fs.mkdir(reportsDir, { recursive: true });
    
    // Save markdown report
    const markdownReport = this.reportService.formatAsMarkdown(report);
    await fs.writeFile(
      path.join(reportsDir, 'monitoring-report.md'),
      markdownReport
    );
    
    // Save JSON report
    await fs.writeFile(
      path.join(reportsDir, 'monitoring-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    // Save summary
    const summary = this.reportService.generateJsonSummary(report);
    await fs.writeFile(
      path.join(reportsDir, 'summary.json'),
      JSON.stringify(summary, null, 2)
    );
    
    this.logger.info('Test reports saved', { directory: reportsDir });
  }
  
  /**
   * Clean up system metrics interval
   */
  private cleanup(): void {
    if (this.monitoringData._metricsInterval) {
      clearInterval(this.monitoringData._metricsInterval);
    }
    
    // Calculate averages for system metrics
    if (this.monitoringData.memorySnapshots?.length > 0) {
      this.monitoringData.avgMemoryUsage = 
        this.monitoringData.memorySnapshots.reduce((a: number, b: number) => a + b, 0) / 
        this.monitoringData.memorySnapshots.length;
      this.monitoringData.peakMemoryUsage = Math.max(...this.monitoringData.memorySnapshots);
    }
    
    if (this.monitoringData.cpuSnapshots?.length > 0) {
      this.monitoringData.avgCpuUsage = 
        this.monitoringData.cpuSnapshots.reduce((a: number, b: number) => a + b, 0) / 
        this.monitoringData.cpuSnapshots.length;
      this.monitoringData.peakCpuUsage = Math.max(...this.monitoringData.cpuSnapshots);
    }
  }
}