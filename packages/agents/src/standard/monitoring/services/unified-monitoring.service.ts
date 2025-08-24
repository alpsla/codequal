/**
 * Unified Monitoring Service
 * Consolidates all monitoring functionality into a single service
 * Tracks performance, memory, costs, and analysis metrics
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { EventEmitter } from 'events';

export interface PerformanceMetric {
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

export interface MemoryMetric {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  operation?: string;
}

export interface AnalysisMetric {
  repositoryUrl: string;
  prNumber?: string;
  branch?: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  iterations?: number;
  issuesFound?: number;
  locationsResolved?: number;
  locationsUnresolved?: number;
  cacheHit?: boolean;
  deepWikiCalls?: number;
  aiCalls?: number;
  success?: boolean;
  error?: string;
}

export interface CostMetric {
  timestamp: number;
  service: 'deepwiki' | 'openrouter' | 'redis' | 'supabase';
  operation: string;
  tokens?: number;
  cost?: number;
  model?: string;
  metadata?: Record<string, any>;
}

export interface MonitoringConfig {
  enabled: boolean;
  metricsDir: string;
  flushInterval: number; // ms
  maxMetricsInMemory: number;
  enablePerformance: boolean;
  enableMemory: boolean;
  enableCost: boolean;
  enableAnalysis: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export class UnifiedMonitoringService extends EventEmitter {
  private static instance: UnifiedMonitoringService;
  
  private performanceMetrics: Map<string, PerformanceMetric> = new Map();
  private memoryMetrics: MemoryMetric[] = [];
  private analysisMetrics: AnalysisMetric[] = [];
  private costMetrics: CostMetric[] = [];
  
  private config: MonitoringConfig;
  private flushTimer?: NodeJS.Timeout;
  private memoryTimer?: NodeJS.Timeout;
  
  private constructor(config?: Partial<MonitoringConfig>) {
    super();
    
    this.config = {
      enabled: process.env.ENABLE_MONITORING !== 'false',
      metricsDir: process.env.METRICS_DIR || '/tmp/codequal-metrics',
      flushInterval: 30000, // 30 seconds
      maxMetricsInMemory: 100,
      enablePerformance: true,
      enableMemory: true,
      enableCost: true,
      enableAnalysis: true,
      logLevel: (process.env.MONITORING_LOG_LEVEL as any) || 'info',
      ...config
    };
    
    if (this.config.enabled) {
      this.initialize();
    }
  }
  
  public static getInstance(config?: Partial<MonitoringConfig>): UnifiedMonitoringService {
    if (!UnifiedMonitoringService.instance) {
      UnifiedMonitoringService.instance = new UnifiedMonitoringService(config);
    }
    return UnifiedMonitoringService.instance;
  }
  
  private async initialize(): Promise<void> {
    // Ensure metrics directory exists
    await fs.mkdir(this.config.metricsDir, { recursive: true });
    
    // Start flush timer
    this.flushTimer = setInterval(() => {
      this.flushMetrics().catch(console.error);
    }, this.config.flushInterval);
    
    // Start memory monitoring
    if (this.config.enableMemory) {
      this.memoryTimer = setInterval(() => {
        this.captureMemorySnapshot();
      }, 10000); // Every 10 seconds
    }
    
    // Handle process exit
    process.on('beforeExit', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
  }
  
  // Performance tracking
  public startOperation(operationId: string, metadata?: Record<string, any>): void {
    if (!this.config.enabled || !this.config.enablePerformance) return;
    
    this.performanceMetrics.set(operationId, {
      operation: operationId,
      startTime: Date.now(),
      success: false,
      metadata
    });
    
    this.emit('operation:start', { operationId, metadata });
  }
  
  public endOperation(operationId: string, success = true, error?: string): PerformanceMetric | undefined {
    if (!this.config.enabled || !this.config.enablePerformance) return;
    
    const metric = this.performanceMetrics.get(operationId);
    if (!metric) return;
    
    metric.endTime = Date.now();
    metric.duration = metric.endTime - metric.startTime;
    metric.success = success;
    metric.error = error;
    
    this.performanceMetrics.delete(operationId);
    this.emit('operation:end', metric);
    
    return metric;
  }
  
  // New methods for performance tracking (more intuitive naming)
  public startPerformanceTracking(name: string, metadata?: Record<string, any>): string {
    const id = `${name}-${Date.now()}-${Math.random()}`;
    this.startOperation(id, metadata);
    return id;
  }
  
  public endPerformanceTracking(name: string, metadata?: Record<string, any>): void {
    // Find the most recent operation with this name
    const operations = Array.from(this.performanceMetrics.keys()).filter(k => k.startsWith(name));
    if (operations.length > 0) {
      const lastOp = operations[operations.length - 1];
      this.endOperation(lastOp, true);
    }
  }
  
  public trackPerformance(name: string, duration: number, metadata?: Record<string, any>): void {
    if (!this.config.enabled || !this.config.enablePerformance) return;
    
    const metric: PerformanceMetric = {
      operation: name,
      startTime: Date.now() - duration,
      endTime: Date.now(),
      duration,
      success: true,
      metadata
    };
    
    this.performanceMetrics.set(`${name}-${Date.now()}`, metric);
    this.emit('performance:tracked', metric);
  }
  
  // Analysis tracking
  public startAnalysis(repositoryUrl: string, prNumber?: string, branch?: string): string {
    if (!this.config.enabled || !this.config.enableAnalysis) return '';
    
    const analysisId = `analysis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const metric: AnalysisMetric = {
      repositoryUrl,
      prNumber,
      branch,
      startTime: Date.now()
    };
    
    this.analysisMetrics.push(metric);
    this.emit('analysis:start', { analysisId, ...metric });
    
    return analysisId;
  }
  
  public updateAnalysis(
    repositoryUrl: string,
    updates: Partial<AnalysisMetric>
  ): void {
    if (!this.config.enabled || !this.config.enableAnalysis) return;
    
    const metric = this.analysisMetrics.find(
      m => m.repositoryUrl === repositoryUrl && !m.endTime
    );
    
    if (metric) {
      Object.assign(metric, updates);
      this.emit('analysis:update', metric);
    }
  }
  
  public endAnalysis(
    repositoryUrl: string,
    success: boolean,
    results?: {
      issuesFound?: number;
      locationsResolved?: number;
      locationsUnresolved?: number;
      iterations?: number;
      error?: string;
    }
  ): void {
    if (!this.config.enabled || !this.config.enableAnalysis) return;
    
    const metric = this.analysisMetrics.find(
      m => m.repositoryUrl === repositoryUrl && !m.endTime
    );
    
    if (metric) {
      metric.endTime = Date.now();
      metric.duration = metric.endTime - metric.startTime;
      metric.success = success;
      
      if (results) {
        Object.assign(metric, results);
      }
      
      this.emit('analysis:end', metric);
      
      // Trim old metrics if too many in memory
      if (this.analysisMetrics.length > this.config.maxMetricsInMemory) {
        this.analysisMetrics = this.analysisMetrics.slice(-this.config.maxMetricsInMemory);
      }
    }
  }
  
  // Cost tracking
  public trackCost(
    service: 'deepwiki' | 'openrouter' | 'redis' | 'supabase',
    operation: string,
    details?: {
      tokens?: number;
      cost?: number;
      model?: string;
      metadata?: Record<string, any>;
    }
  ): void {
    if (!this.config.enabled || !this.config.enableCost) return;
    
    const metric: CostMetric = {
      timestamp: Date.now(),
      service,
      operation,
      ...details
    };
    
    this.costMetrics.push(metric);
    this.emit('cost:tracked', metric);
    
    // Calculate estimated cost if tokens provided but not cost
    if (metric.tokens && !metric.cost && metric.model) {
      metric.cost = this.estimateCost(metric.model, metric.tokens);
    }
  }
  
  // Memory tracking
  private captureMemorySnapshot(operation?: string): void {
    const memory = process.memoryUsage();
    
    const metric: MemoryMetric = {
      timestamp: Date.now(),
      heapUsed: memory.heapUsed,
      heapTotal: memory.heapTotal,
      external: memory.external,
      rss: memory.rss,
      operation
    };
    
    this.memoryMetrics.push(metric);
    
    // Check for memory warnings
    const heapPercent = (memory.heapUsed / memory.heapTotal) * 100;
    if (heapPercent > 90) {
      this.emit('memory:warning', {
        heapPercent,
        ...metric
      });
    }
    
    // Trim old metrics
    if (this.memoryMetrics.length > this.config.maxMetricsInMemory) {
      this.memoryMetrics = this.memoryMetrics.slice(-this.config.maxMetricsInMemory);
    }
  }
  
  // Get aggregated metrics
  public getAggregatedMetrics(): {
    performance: {
      totalOperations: number;
      averageDuration: number;
      successRate: number;
    };
    analysis: {
      totalAnalyses: number;
      averageDuration: number;
      averageIssuesFound: number;
      averageLocationResolutionRate: number;
      successRate: number;
    };
    cost: {
      totalCost: number;
      byService: Record<string, number>;
      totalTokens: number;
    };
    memory: {
      currentHeapUsed: number;
      averageHeapUsed: number;
      peakHeapUsed: number;
    };
  } {
    // Performance metrics
    const perfMetrics = Array.from(this.performanceMetrics.values());
    const completedPerf = perfMetrics.filter(m => m.duration);
    
    const performance = {
      totalOperations: perfMetrics.length,
      averageDuration: completedPerf.length > 0
        ? completedPerf.reduce((sum, m) => sum + (m.duration || 0), 0) / completedPerf.length
        : 0,
      successRate: completedPerf.length > 0
        ? completedPerf.filter(m => m.success).length / completedPerf.length
        : 0
    };
    
    // Analysis metrics
    const completedAnalyses = this.analysisMetrics.filter(m => m.endTime);
    
    const analysis = {
      totalAnalyses: completedAnalyses.length,
      averageDuration: completedAnalyses.length > 0
        ? completedAnalyses.reduce((sum, m) => sum + (m.duration || 0), 0) / completedAnalyses.length
        : 0,
      averageIssuesFound: completedAnalyses.length > 0
        ? completedAnalyses.reduce((sum, m) => sum + (m.issuesFound || 0), 0) / completedAnalyses.length
        : 0,
      averageLocationResolutionRate: completedAnalyses.length > 0
        ? completedAnalyses.reduce((sum, m) => {
            const total = (m.locationsResolved || 0) + (m.locationsUnresolved || 0);
            return sum + (total > 0 ? (m.locationsResolved || 0) / total : 0);
          }, 0) / completedAnalyses.length
        : 0,
      successRate: completedAnalyses.length > 0
        ? completedAnalyses.filter(m => m.success).length / completedAnalyses.length
        : 0
    };
    
    // Cost metrics
    const costByService: Record<string, number> = {};
    let totalCost = 0;
    let totalTokens = 0;
    
    this.costMetrics.forEach(m => {
      if (m.cost) {
        totalCost += m.cost;
        costByService[m.service] = (costByService[m.service] || 0) + m.cost;
      }
      if (m.tokens) {
        totalTokens += m.tokens;
      }
    });
    
    const cost = {
      totalCost,
      byService: costByService,
      totalTokens
    };
    
    // Memory metrics
    const currentMemory = this.memoryMetrics[this.memoryMetrics.length - 1];
    
    const memory = {
      currentHeapUsed: currentMemory?.heapUsed || 0,
      averageHeapUsed: this.memoryMetrics.length > 0
        ? this.memoryMetrics.reduce((sum, m) => sum + m.heapUsed, 0) / this.memoryMetrics.length
        : 0,
      peakHeapUsed: Math.max(...this.memoryMetrics.map(m => m.heapUsed), 0)
    };
    
    return { performance, analysis, cost, memory };
  }
  
  // Flush metrics to disk
  private async flushMetrics(): Promise<void> {
    if (!this.config.enabled) return;
    
    const timestamp = new Date().toISOString();
    
    // Save analysis metrics
    if (this.analysisMetrics.length > 0) {
      const analysisFile = path.join(this.config.metricsDir, 'analysis-metrics.jsonl');
      const lines = this.analysisMetrics
        .filter(m => m.endTime) // Only save completed analyses
        .map(m => JSON.stringify({ ...m, flushedAt: timestamp }));
      
      if (lines.length > 0) {
        await fs.appendFile(analysisFile, lines.join('\n') + '\n');
        
        // Remove flushed metrics from memory
        this.analysisMetrics = this.analysisMetrics.filter(m => !m.endTime);
      }
    }
    
    // Save cost metrics
    if (this.costMetrics.length > 0) {
      const costFile = path.join(this.config.metricsDir, 'cost-metrics.jsonl');
      const lines = this.costMetrics.map(m => JSON.stringify({ ...m, flushedAt: timestamp }));
      
      await fs.appendFile(costFile, lines.join('\n') + '\n');
      this.costMetrics = [];
    }
    
    // Save aggregated metrics snapshot
    const aggregated = this.getAggregatedMetrics();
    const snapshotFile = path.join(this.config.metricsDir, 'aggregated-snapshots.jsonl');
    await fs.appendFile(
      snapshotFile,
      JSON.stringify({ timestamp, ...aggregated }) + '\n'
    );
    
    this.emit('metrics:flushed', { timestamp, aggregated });
  }
  
  // Estimate cost based on model and tokens
  private estimateCost(model: string, tokens: number): number {
    // Rough estimates per 1M tokens
    const costPer1M: Record<string, number> = {
      'gpt-4': 30,
      'gpt-4-turbo': 10,
      'gpt-4o': 5,
      'gpt-4o-mini': 0.15,
      'gpt-3.5-turbo': 0.5,
      'claude-3-opus': 15,
      'claude-3-sonnet': 3,
      'claude-3-haiku': 0.25
    };
    
    const modelKey = Object.keys(costPer1M).find(key => model.toLowerCase().includes(key));
    const rate = modelKey ? costPer1M[modelKey] : 1; // Default $1 per 1M tokens
    
    return (tokens / 1_000_000) * rate;
  }
  
  // Generate HTML dashboard
  public async generateDashboard(): Promise<string> {
    const aggregated = this.getAggregatedMetrics();
    const timestamp = new Date().toISOString();
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>CodeQual Monitoring Dashboard</title>
  <style>
    body { font-family: -apple-system, system-ui, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; }
    .card { background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1 { color: #333; }
    h2 { color: #666; margin-top: 0; }
    .metric { display: inline-block; margin: 10px 20px; }
    .metric-label { color: #999; font-size: 12px; text-transform: uppercase; }
    .metric-value { font-size: 24px; font-weight: bold; color: #333; }
    .success { color: #10b981; }
    .warning { color: #f59e0b; }
    .error { color: #ef4444; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎯 CodeQual Monitoring Dashboard</h1>
    <p>Generated: ${timestamp}</p>
    
    <div class="card">
      <h2>📊 Analysis Metrics</h2>
      <div class="grid">
        <div class="metric">
          <div class="metric-label">Total Analyses</div>
          <div class="metric-value">${aggregated.analysis.totalAnalyses}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Success Rate</div>
          <div class="metric-value ${aggregated.analysis.successRate > 0.9 ? 'success' : aggregated.analysis.successRate > 0.7 ? 'warning' : 'error'}">
            ${(aggregated.analysis.successRate * 100).toFixed(1)}%
          </div>
        </div>
        <div class="metric">
          <div class="metric-label">Avg Duration</div>
          <div class="metric-value">${(aggregated.analysis.averageDuration / 1000).toFixed(1)}s</div>
        </div>
        <div class="metric">
          <div class="metric-label">Avg Issues Found</div>
          <div class="metric-value">${aggregated.analysis.averageIssuesFound.toFixed(1)}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Location Resolution</div>
          <div class="metric-value ${aggregated.analysis.averageLocationResolutionRate > 0.8 ? 'success' : aggregated.analysis.averageLocationResolutionRate > 0.6 ? 'warning' : 'error'}">
            ${(aggregated.analysis.averageLocationResolutionRate * 100).toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
    
    <div class="card">
      <h2>⚡ Performance Metrics</h2>
      <div class="grid">
        <div class="metric">
          <div class="metric-label">Active Operations</div>
          <div class="metric-value">${aggregated.performance.totalOperations}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Avg Duration</div>
          <div class="metric-value">${aggregated.performance.averageDuration.toFixed(0)}ms</div>
        </div>
        <div class="metric">
          <div class="metric-label">Success Rate</div>
          <div class="metric-value ${aggregated.performance.successRate > 0.95 ? 'success' : 'warning'}">
            ${(aggregated.performance.successRate * 100).toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
    
    <div class="card">
      <h2>💰 Cost Tracking</h2>
      <div class="grid">
        <div class="metric">
          <div class="metric-label">Total Cost</div>
          <div class="metric-value">$${aggregated.cost.totalCost.toFixed(2)}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Total Tokens</div>
          <div class="metric-value">${aggregated.cost.totalTokens.toLocaleString()}</div>
        </div>
        ${Object.entries(aggregated.cost.byService).map(([service, cost]) => `
        <div class="metric">
          <div class="metric-label">${service}</div>
          <div class="metric-value">$${cost.toFixed(2)}</div>
        </div>
        `).join('')}
      </div>
    </div>
    
    <div class="card">
      <h2>💾 Memory Usage</h2>
      <div class="grid">
        <div class="metric">
          <div class="metric-label">Current Heap</div>
          <div class="metric-value">${(aggregated.memory.currentHeapUsed / 1024 / 1024).toFixed(1)} MB</div>
        </div>
        <div class="metric">
          <div class="metric-label">Average Heap</div>
          <div class="metric-value">${(aggregated.memory.averageHeapUsed / 1024 / 1024).toFixed(1)} MB</div>
        </div>
        <div class="metric">
          <div class="metric-label">Peak Heap</div>
          <div class="metric-value ${aggregated.memory.peakHeapUsed > 1024 * 1024 * 1024 ? 'warning' : ''}">
            ${(aggregated.memory.peakHeapUsed / 1024 / 1024).toFixed(1)} MB
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
    
    const dashboardPath = path.join(this.config.metricsDir, 'dashboard.html');
    await fs.writeFile(dashboardPath, html);
    
    return dashboardPath;
  }
  
  // Shutdown monitoring
  public async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    if (this.memoryTimer) {
      clearInterval(this.memoryTimer);
    }
    
    await this.flushMetrics();
    this.emit('shutdown');
  }
  
  // Log helper
  private log(level: string, message: string, data?: any): void {
    const levels = ['debug', 'info', 'warn', 'error'];
    const configLevel = levels.indexOf(this.config.logLevel);
    const messageLevel = levels.indexOf(level);
    
    if (messageLevel >= configLevel) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [UnifiedMonitoring] [${level.toUpperCase()}] ${message}`, data || '');
    }
  }
}

// Export singleton instance
export const monitoring = UnifiedMonitoringService.getInstance();