import { deepWikiTempManager } from './deepwiki-temp-manager';
import { createLogger } from '@codequal/core/utils';
import { TempSpaceMetrics } from '../types/deepwiki';
import { JsonMetrics, PrometheusMetric } from '../types/metrics';
import { tokenMetricsProvider } from './token-metrics-provider';

const logger = createLogger('metrics-exporter');

export class MetricsExporter {
  private metricsCache: Map<string, TempSpaceMetrics> = new Map();
  private lastUpdate = 0;
  private UPDATE_INTERVAL = 15000; // 15 seconds

  /**
   * Get all metrics in Prometheus format
   */
  async getPrometheusMetrics(): Promise<string> {
    await this.updateMetrics();
    
    const metrics: string[] = [];
    
    // Add DeepWiki metrics
    const deepwikiMetrics = await this.getDeepWikiMetrics();
    metrics.push(...this.formatPrometheusMetrics(deepwikiMetrics));
    
    // Add token usage metrics
    const tokenMetrics = await tokenMetricsProvider.getMetrics();
    metrics.push(...this.formatPrometheusMetrics(tokenMetrics, 'codequal'));
    
    return metrics.join('\n');
  }

  /**
   * Get metrics in JSON format for DigitalOcean
   */
  async getJsonMetrics(): Promise<JsonMetrics> {
    await this.updateMetrics();
    
    const deepwikiMetrics = await this.getDeepWikiMetrics();
    const tokenMetrics = await tokenMetricsProvider.getMetrics();
    
    return {
      timestamp: new Date().toISOString(),
      deepwiki: deepwikiMetrics,
      token_usage: tokenMetrics
    };
  }

  /**
   * Push metrics to DigitalOcean
   */
  async pushToDigitalOcean(): Promise<void> {
    if (!process.env.DO_METRICS_TOKEN) {
      return;
    }

    try {
      const metrics = await this.getDeepWikiMetrics();
      const payload = {
        metrics: Object.entries(metrics).map(([name, value]) => ({
          name: `deepwiki_${name}`,
          value,
          timestamp: Date.now(),
          tags: {
            environment: process.env.NODE_ENV || 'development',
            component: 'deepwiki'
          }
        }))
      };

      const response = await fetch('https://api.digitalocean.com/v2/monitoring/metrics', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.DO_METRICS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Failed to push metrics: ${response.statusText}`);
      }
    } catch (error) {
      logger.error('Failed to push metrics to DigitalOcean:', error as Error);
    }
  }

  private async updateMetrics(): Promise<void> {
    const now = Date.now();
    if (now - this.lastUpdate < this.UPDATE_INTERVAL) {
      return;
    }

    this.lastUpdate = now;
    
    // Update DeepWiki metrics
    const deepwikiMetrics = await deepWikiTempManager.getMetrics();
    this.metricsCache.set('deepwiki', deepwikiMetrics);
  }

  private async getDeepWikiMetrics(): Promise<Record<string, number>> {
    const metrics = this.metricsCache.get('deepwiki') as TempSpaceMetrics || await deepWikiTempManager.getMetrics();
    
    return {
      temp_used_gb: metrics.usedGB || 0,
      temp_total_gb: metrics.totalGB || 10,
      temp_available_gb: metrics.availableGB || 10,
      storage_usage_percent: metrics.percentUsed || 0,
      active_analyses_count: metrics.activeAnalyses || 0,
      max_concurrent_capacity: metrics.maxConcurrentCapacity || 5,
      
      // Additional metrics from temp manager (these would be tracked in a real implementation)
      cleanup_success_total: 0,
      cleanup_failed_total: 0,
      autoscale_success_total: 0,
      autoscale_failure_total: 0,
    };
  }

  private formatPrometheusMetrics(metrics: Record<string, number>, prefix = 'deepwiki'): string[] {
    const lines: string[] = [];
    
    for (const [key, value] of Object.entries(metrics)) {
      // Add metric help text
      lines.push(`# HELP ${prefix}_${key} ${prefix} ${key.replace(/_/g, ' ')}`);
      lines.push(`# TYPE ${prefix}_${key} gauge`);
      lines.push(`${prefix}_${key} ${value}`);
      lines.push('');
    }
    
    return lines;
  }

  /**
   * Start automatic metric pushing
   */
  startAutoPush(intervalMs = 60000): void {
    setInterval(() => {
      this.pushToDigitalOcean().catch(err => 
        logger.error('Auto-push failed:', err)
      );
    }, intervalMs);
    
    logger.info(`Started auto-push metrics every ${intervalMs}ms`);
  }
}

// Export singleton
export const metricsExporter = new MetricsExporter();