/**
 * Monitoring Grafana Bridge Service
 * 
 * Bridges the existing DeepWiki monitoring dashboard with Grafana
 * for comprehensive alerting on performance, security, financial, and critical issues
 */

import { createLogger } from '@codequal/core/utils';
import { deepWikiTempManager } from './deepwiki-temp-manager';
import { PerformanceMonitor } from './monitoring-enhancements';
import { getGlobalMonitoringService } from '../routes/monitoring';

const logger = createLogger('monitoring-grafana-bridge');

export interface MonitoringMetric {
  name: string;
  value: number;
  labels: Record<string, string>;
  timestamp: number;
}

export interface AlertCondition {
  metric: string;
  threshold: number;
  operator: 'gt' | 'lt' | 'eq';
  severity: 'critical' | 'warning' | 'info';
  message: string;
}

export class MonitoringGrafanaBridge {
  private metrics: Map<string, MonitoringMetric> = new Map();
  private alerts: AlertCondition[] = [];
  private performanceMonitor: PerformanceMonitor;
  
  constructor() {
    this.performanceMonitor = new PerformanceMonitor();
    this.initializeAlerts();
  }
  
  /**
   * Initialize default alert conditions
   */
  private initializeAlerts() {
    // Performance alerts
    this.alerts.push({
      metric: 'api_response_time_ms',
      threshold: 5000,
      operator: 'gt',
      severity: 'warning',
      message: 'API response time exceeds 5 seconds'
    });
    
    this.alerts.push({
      metric: 'database_query_time_ms',
      threshold: 1000,
      operator: 'gt',
      severity: 'critical',
      message: 'Database queries taking too long'
    });
    
    // Security alerts
    this.alerts.push({
      metric: 'unauthorized_access_attempts',
      threshold: 10,
      operator: 'gt',
      severity: 'critical',
      message: 'Multiple unauthorized access attempts detected'
    });
    
    this.alerts.push({
      metric: 'rate_limit_violations',
      threshold: 50,
      operator: 'gt',
      severity: 'warning',
      message: 'High rate of rate limit violations'
    });
    
    // Financial alerts
    this.alerts.push({
      metric: 'daily_api_cost_usd',
      threshold: 100,
      operator: 'gt',
      severity: 'warning',
      message: 'Daily API costs exceed $100'
    });
    
    this.alerts.push({
      metric: 'per_analysis_cost_usd',
      threshold: 5,
      operator: 'gt',
      severity: 'warning',
      message: 'Single analysis cost exceeds $5'
    });
    
    // Critical system alerts
    this.alerts.push({
      metric: 'analysis_failure_rate_percent',
      threshold: 10,
      operator: 'gt',
      severity: 'critical',
      message: 'High analysis failure rate detected'
    });
    
    this.alerts.push({
      metric: 'deepwiki_storage_percent_used',
      threshold: 85,
      operator: 'gt',
      severity: 'critical',
      message: 'DeepWiki storage critically low'
    });
  }
  
  /**
   * Collect all metrics from various sources
   */
  async collectMetrics(): Promise<void> {
    try {
      // Collect DeepWiki storage metrics
      const storageMetrics = await deepWikiTempManager.getMetrics();
      this.recordMetric('deepwiki_storage_used_gb', storageMetrics.usedGB, {
        source: 'deepwiki'
      });
      this.recordMetric('deepwiki_storage_total_gb', storageMetrics.totalGB, {
        source: 'deepwiki'
      });
      this.recordMetric('deepwiki_storage_percent_used', storageMetrics.percentUsed, {
        source: 'deepwiki'
      });
      this.recordMetric('deepwiki_active_analyses_count', storageMetrics.activeAnalyses, {
        source: 'deepwiki'
      });
      
      // Collect performance metrics from monitoring service
      const monitoringService = getGlobalMonitoringService();
      const perfMetrics = monitoringService.getMetrics();
      
      // Record performance metrics
      if (perfMetrics.latency && typeof perfMetrics.latency === 'object' && 'average' in perfMetrics.latency) {
        this.recordMetric('api_response_time_ms', (perfMetrics.latency as any).average || 0, {
          source: 'api'
        });
      }
      
      // Check alerts
      await this.checkAlerts();
      
    } catch (error) {
      logger.error('Failed to collect metrics:', error as Error);
    }
  }
  
  /**
   * Record a metric value
   */
  recordMetric(name: string, value: number, labels: Record<string, string> = {}): void {
    this.metrics.set(name, {
      name,
      value,
      labels,
      timestamp: Date.now()
    });
  }
  
  /**
   * Check all alert conditions
   */
  private async checkAlerts(): Promise<void> {
    for (const alert of this.alerts) {
      const metric = this.metrics.get(alert.metric);
      if (!metric) continue;
      
      let triggered = false;
      switch (alert.operator) {
        case 'gt':
          triggered = metric.value > alert.threshold;
          break;
        case 'lt':
          triggered = metric.value < alert.threshold;
          break;
        case 'eq':
          triggered = metric.value === alert.threshold;
          break;
      }
      
      if (triggered) {
        logger.warn(`Alert triggered: ${alert.message}`, {
          metric: alert.metric,
          value: metric.value,
          threshold: alert.threshold,
          severity: alert.severity
        });
        
        // Record alert in monitoring service
        const monitoringService = getGlobalMonitoringService();
        monitoringService.recordError(
          'alert_triggered',
          'monitoring',
          alert.severity
        );
      }
    }
  }
  
  /**
   * Export metrics in Prometheus format for Grafana
   */
  exportPrometheusMetrics(): string {
    let output = '';
    
    for (const [name, metric] of this.metrics) {
      // Convert metric name to Prometheus format
      const promName = `codequal_${name}`;
      
      // Build labels string
      const labelPairs = Object.entries(metric.labels)
        .map(([k, v]) => `${k}="${v}"`)
        .join(',');
      const labels = labelPairs ? `{${labelPairs}}` : '';
      
      // Add metric line
      output += `# HELP ${promName} ${name} metric\n`;
      output += `# TYPE ${promName} gauge\n`;
      output += `${promName}${labels} ${metric.value} ${metric.timestamp}\n\n`;
    }
    
    return output;
  }
  
  /**
   * Get current alert status
   */
  getAlertStatus(): Record<string, any> {
    const status = {
      healthy: 0,
      warning: 0,
      critical: 0,
      alerts: [] as any[]
    };
    
    for (const alert of this.alerts) {
      const metric = this.metrics.get(alert.metric);
      if (!metric) continue;
      
      let triggered = false;
      switch (alert.operator) {
        case 'gt':
          triggered = metric.value > alert.threshold;
          break;
        case 'lt':
          triggered = metric.value < alert.threshold;
          break;
        case 'eq':
          triggered = metric.value === alert.threshold;
          break;
      }
      
      if (triggered) {
        (status as any)[alert.severity]++;
        status.alerts.push({
          metric: alert.metric,
          value: metric.value,
          threshold: alert.threshold,
          severity: alert.severity,
          message: alert.message
        });
      } else {
        status.healthy++;
      }
    }
    
    return status;
  }
  
  /**
   * Start periodic metric collection
   */
  startCollection(intervalMs = 10000): void {
    setInterval(() => {
      this.collectMetrics().catch(error => {
        logger.error('Metric collection failed:', error);
      });
    }, intervalMs);
    
    // Initial collection
    this.collectMetrics();
  }
}

// Export singleton instance
export const monitoringGrafanaBridge = new MonitoringGrafanaBridge();