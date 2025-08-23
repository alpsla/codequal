/**
 * Analysis Monitor Service
 * Tracks performance metrics and memory usage for DeepWiki analysis
 * Implements memory optimization and iteration monitoring
 */

import { ILogger } from '../../services/interfaces/logger.interface';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface AnalysisMetrics {
  repositoryUrl: string;
  prNumber?: string;
  iterations: number;
  duration: number;
  memoryUsed: number;
  cacheHit: boolean;
  issuesFound: number;
  timestamp: Date;
  success: boolean;
  error?: string;
}

export interface AggregatedMetrics {
  totalAnalyses: number;
  averageIterations: number;
  minIterations: number;
  maxIterations: number;
  averageDuration: number;
  averageMemoryUsed: number;
  cacheHitRate: number;
  successRate: number;
  averageIssuesFound: number;
  lastUpdated: Date;
}

export class AnalysisMonitor {
  private static instance: AnalysisMonitor;
  private metrics: AnalysisMetrics[] = [];
  private metricsFilePath: string;
  private maxMetricsInMemory = 100; // Keep only last 100 in memory
  private flushInterval: NodeJS.Timeout | null = null;
  
  constructor(
    private logger?: ILogger,
    metricsDir = '/tmp/codequal-metrics'
  ) {
    this.metricsFilePath = path.join(metricsDir, 'analysis-metrics.jsonl');
    this.initializeMonitor();
  }
  
  static getInstance(logger?: ILogger): AnalysisMonitor {
    if (!AnalysisMonitor.instance) {
      AnalysisMonitor.instance = new AnalysisMonitor(logger);
    }
    return AnalysisMonitor.instance;
  }
  
  private async initializeMonitor(): Promise<void> {
    try {
      // Ensure metrics directory exists
      const dir = path.dirname(this.metricsFilePath);
      await fs.mkdir(dir, { recursive: true });
      
      // Set up periodic flush to disk
      this.flushInterval = setInterval(() => {
        this.flushMetricsToDisk().catch(err => {
          this.log('error', 'Failed to flush metrics to disk', err);
        });
      }, 60000); // Flush every minute
      
      // Load recent metrics from disk if available
      await this.loadRecentMetrics();
      
      this.log('info', 'Analysis monitor initialized', {
        metricsFile: this.metricsFilePath
      });
    } catch (error) {
      this.log('error', 'Failed to initialize monitor', error as Error);
    }
  }
  
  /**
   * Record analysis metrics
   */
  async recordAnalysis(metrics: AnalysisMetrics): Promise<void> {
    try {
      // Add to in-memory metrics
      this.metrics.push(metrics);
      
      // Log important metrics
      this.log('info', `Analysis completed for ${metrics.repositoryUrl}`, {
        iterations: metrics.iterations,
        duration: `${(metrics.duration / 1000).toFixed(2)}s`,
        memoryUsed: `${(metrics.memoryUsed / 1024 / 1024).toFixed(2)}MB`,
        issuesFound: metrics.issuesFound,
        cacheHit: metrics.cacheHit,
        success: metrics.success
      });
      
      // Implement memory optimization - keep only recent metrics
      if (this.metrics.length > this.maxMetricsInMemory) {
        // Flush old metrics to disk before removing
        await this.flushMetricsToDisk();
        this.metrics = this.metrics.slice(-this.maxMetricsInMemory);
      }
      
      // Calculate and log aggregated metrics periodically
      if (this.metrics.length % 10 === 0) {
        const aggregated = this.getAggregatedMetrics();
        this.log('info', 'Aggregated metrics update', {
          averageIterations: aggregated.averageIterations.toFixed(2),
          totalAnalyses: aggregated.totalAnalyses,
          successRate: `${(aggregated.successRate * 100).toFixed(1)}%`,
          cacheHitRate: `${(aggregated.cacheHitRate * 100).toFixed(1)}%`
        });
      }
      
    } catch (error) {
      this.log('error', 'Failed to record analysis metrics', error as Error);
    }
  }
  
  /**
   * Get aggregated metrics
   */
  getAggregatedMetrics(): AggregatedMetrics {
    if (this.metrics.length === 0) {
      return {
        totalAnalyses: 0,
        averageIterations: 0,
        minIterations: 0,
        maxIterations: 0,
        averageDuration: 0,
        averageMemoryUsed: 0,
        cacheHitRate: 0,
        successRate: 0,
        averageIssuesFound: 0,
        lastUpdated: new Date()
      };
    }
    
    const successfulAnalyses = this.metrics.filter(m => m.success);
    const iterations = successfulAnalyses.map(m => m.iterations);
    
    return {
      totalAnalyses: this.metrics.length,
      averageIterations: iterations.length > 0 
        ? iterations.reduce((sum, i) => sum + i, 0) / iterations.length 
        : 0,
      minIterations: iterations.length > 0 ? Math.min(...iterations) : 0,
      maxIterations: iterations.length > 0 ? Math.max(...iterations) : 0,
      averageDuration: successfulAnalyses.length > 0
        ? successfulAnalyses.reduce((sum, m) => sum + m.duration, 0) / successfulAnalyses.length
        : 0,
      averageMemoryUsed: successfulAnalyses.length > 0
        ? successfulAnalyses.reduce((sum, m) => sum + m.memoryUsed, 0) / successfulAnalyses.length
        : 0,
      cacheHitRate: this.metrics.filter(m => m.cacheHit).length / this.metrics.length,
      successRate: successfulAnalyses.length / this.metrics.length,
      averageIssuesFound: successfulAnalyses.length > 0
        ? successfulAnalyses.reduce((sum, m) => sum + m.issuesFound, 0) / successfulAnalyses.length
        : 0,
      lastUpdated: new Date()
    };
  }
  
  /**
   * Get metrics for a specific repository
   */
  getRepositoryMetrics(repositoryUrl: string): AnalysisMetrics[] {
    return this.metrics.filter(m => m.repositoryUrl === repositoryUrl);
  }
  
  /**
   * Monitor memory usage during analysis
   */
  getMemoryUsage(): number {
    const usage = process.memoryUsage();
    return usage.heapUsed + usage.external;
  }
  
  /**
   * Clear old data to free memory
   */
  async clearOldData(beforeDate: Date): Promise<void> {
    const cutoffTime = beforeDate.getTime();
    
    // Flush current metrics to disk first
    await this.flushMetricsToDisk();
    
    // Keep only recent metrics in memory
    this.metrics = this.metrics.filter(m => m.timestamp.getTime() > cutoffTime);
    
    this.log('info', `Cleared old metrics before ${beforeDate.toISOString()}`, {
      remainingMetrics: this.metrics.length
    });
  }
  
  /**
   * Flush metrics to disk (append to JSONL file)
   */
  private async flushMetricsToDisk(): Promise<void> {
    if (this.metrics.length === 0) return;
    
    try {
      const lines = this.metrics.map(m => JSON.stringify(m)).join('\n') + '\n';
      await fs.appendFile(this.metricsFilePath, lines);
      
      this.log('debug', `Flushed ${this.metrics.length} metrics to disk`);
    } catch (error) {
      this.log('error', 'Failed to flush metrics to disk', error as Error);
    }
  }
  
  /**
   * Load recent metrics from disk
   */
  private async loadRecentMetrics(): Promise<void> {
    try {
      const exists = await fs.access(this.metricsFilePath).then(() => true).catch(() => false);
      if (!exists) return;
      
      const content = await fs.readFile(this.metricsFilePath, 'utf-8');
      const lines = content.trim().split('\n').filter(line => line);
      
      // Load only last 100 metrics
      const recentLines = lines.slice(-this.maxMetricsInMemory);
      
      this.metrics = recentLines.map(line => {
        const metric = JSON.parse(line);
        // Convert date strings back to Date objects
        metric.timestamp = new Date(metric.timestamp);
        return metric;
      });
      
      this.log('info', `Loaded ${this.metrics.length} recent metrics from disk`);
    } catch (error) {
      this.log('error', 'Failed to load metrics from disk', error as Error);
    }
  }
  
  /**
   * Generate report
   */
  async generateReport(): Promise<string> {
    const aggregated = this.getAggregatedMetrics();
    
    const report = `
# DeepWiki Analysis Metrics Report
Generated: ${new Date().toISOString()}

## Summary
- Total Analyses: ${aggregated.totalAnalyses}
- Success Rate: ${(aggregated.successRate * 100).toFixed(1)}%
- Cache Hit Rate: ${(aggregated.cacheHitRate * 100).toFixed(1)}%

## Iteration Statistics
- Average Iterations: ${aggregated.averageIterations.toFixed(2)}
- Min Iterations: ${aggregated.minIterations}
- Max Iterations: ${aggregated.maxIterations}

## Performance
- Average Duration: ${(aggregated.averageDuration / 1000).toFixed(2)}s
- Average Memory Used: ${(aggregated.averageMemoryUsed / 1024 / 1024).toFixed(2)}MB
- Average Issues Found: ${aggregated.averageIssuesFound.toFixed(1)}

## Recent Analyses (Last 10)
${this.metrics.slice(-10).map(m => 
  `- ${m.repositoryUrl}${m.prNumber ? ` PR#${m.prNumber}` : ''}: ${m.iterations} iterations, ${(m.duration / 1000).toFixed(2)}s, ${m.issuesFound} issues${m.cacheHit ? ' (cached)' : ''}`
).join('\n')}
`;
    
    return report;
  }
  
  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    
    // Final flush
    this.flushMetricsToDisk().catch(err => {
      console.error('Failed to flush metrics during cleanup:', err);
    });
  }
  
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
    if (this.logger) {
      this.logger[level](message, data);
    } else if (level !== 'debug' || process.env.DEBUG) {
      console[level](`[AnalysisMonitor] ${message}`, data || '');
    }
  }
}

/**
 * Memory optimization utilities
 */
export class MemoryOptimizer {
  private static readonly MEMORY_THRESHOLD = 1024 * 1024 * 1024; // 1GB
  
  /**
   * Check if memory usage is approaching threshold
   */
  static isMemoryHigh(): boolean {
    const usage = process.memoryUsage();
    const totalUsed = usage.heapUsed + usage.external;
    return totalUsed > MemoryOptimizer.MEMORY_THRESHOLD * 0.8; // 80% of threshold
  }
  
  /**
   * Force garbage collection if available
   */
  static forceGC(): void {
    if (global.gc) {
      global.gc();
    }
  }
  
  /**
   * Clear large objects from memory
   */
  static clearLargeObjects(obj: any): void {
    if (!obj || typeof obj !== 'object') return;
    
    // Clear large arrays
    if (Array.isArray(obj) && obj.length > 1000) {
      obj.length = 0;
    }
    
    // Recursively clear nested objects
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        if (typeof value === 'object' && value !== null) {
          MemoryOptimizer.clearLargeObjects(value);
        }
        // Clear large strings
        if (typeof value === 'string' && value.length > 10000) {
          delete obj[key];
        }
      }
    }
  }
}