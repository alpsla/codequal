import { exec } from 'child_process';
import { promisify } from 'util';
import { createLogger } from '@codequal/core/utils';
import axios from 'axios';

const execAsync = promisify(exec);
const logger = createLogger('deepwiki-storage-monitor');

export interface StorageMetrics {
  usedGB: number;
  totalGB: number;
  percentageUsed: number;
  availableGB: number;
  repositoryCount: number;
  averageRepoSizeMB: number;
  growthRateGBPerDay: number;
}

export interface StorageAlert {
  level: 'info' | 'warning' | 'critical';
  message: string;
  metrics: StorageMetrics;
  recommendation: string;
}

export class DeepWikiStorageMonitor {
  private readonly NAMESPACE = process.env.DEEPWIKI_NAMESPACE || 'codequal-dev';
  private readonly EXPANSION_THRESHOLD = 80; // Expand at 80% usage
  private readonly CRITICAL_THRESHOLD = 90; // Critical at 90% usage
  private readonly WARNING_THRESHOLD = 70; // Warning at 70% usage
  private readonly EXPANSION_INCREMENT_GB = 20; // Add 20GB each time
  private readonly MAX_SIZE_GB = 500; // Maximum PVC size
  
  private historicalMetrics: StorageMetrics[] = [];
  private readonly METRICS_RETENTION_DAYS = 7;

  /**
   * Get current storage metrics from DeepWiki pod
   */
  async getStorageMetrics(): Promise<StorageMetrics> {
    try {
      // Get pod name
      const { stdout: podName } = await execAsync(
        `kubectl get pods -n ${this.NAMESPACE} -l app=deepwiki -o jsonpath='{.items[0].metadata.name}'`
      );

      if (!podName.trim()) {
        throw new Error('No DeepWiki pod found');
      }

      // Get disk usage
      const { stdout: dfOutput } = await execAsync(
        `kubectl exec -n ${this.NAMESPACE} ${podName.trim()} -- df -BG /root/.adalflow/repos | awk 'NR==2'`
      );

      const dfParts = dfOutput.trim().split(/\s+/);
      const totalGB = parseInt(dfParts[1]);
      const usedGB = parseInt(dfParts[2]);
      const availableGB = parseInt(dfParts[3]);
      const percentageUsed = parseInt(dfParts[4]);

      // Count repositories
      const { stdout: repoCount } = await execAsync(
        `kubectl exec -n ${this.NAMESPACE} ${podName.trim()} -- find /root/.adalflow/repos -mindepth 1 -maxdepth 1 -type d | wc -l`
      );

      const repositoryCount = parseInt(repoCount.trim()) || 0;

      // Calculate average repo size
      const averageRepoSizeMB = repositoryCount > 0 
        ? (usedGB * 1024) / repositoryCount 
        : 0;

      // Calculate growth rate
      const growthRateGBPerDay = this.calculateGrowthRate(usedGB);

      const metrics: StorageMetrics = {
        usedGB,
        totalGB,
        percentageUsed,
        availableGB,
        repositoryCount,
        averageRepoSizeMB,
        growthRateGBPerDay
      };

      // Store metrics for historical analysis
      this.addHistoricalMetric(metrics);

      return metrics;

    } catch (error) {
      logger.error('Failed to get storage metrics:', error as Error);
      throw error;
    }
  }

  /**
   * Calculate storage growth rate based on historical data
   */
  private calculateGrowthRate(currentUsedGB: number): number {
    if (this.historicalMetrics.length < 2) {
      return 0;
    }

    // Get metrics from 24 hours ago
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const historicalMetric = this.historicalMetrics.find(m => 
      Math.abs((m as any).timestamp - oneDayAgo) < 60 * 60 * 1000 // Within 1 hour
    );

    if (historicalMetric) {
      return currentUsedGB - historicalMetric.usedGB;
    }

    // Fallback: calculate from oldest metric
    const oldestMetric = this.historicalMetrics[0];
    const daysDiff = (Date.now() - (oldestMetric as any).timestamp) / (24 * 60 * 60 * 1000);
    
    return daysDiff > 0 ? (currentUsedGB - oldestMetric.usedGB) / daysDiff : 0;
  }

  /**
   * Add metrics to historical data
   */
  private addHistoricalMetric(metrics: StorageMetrics): void {
    const timestampedMetrics = { ...metrics, timestamp: Date.now() };
    this.historicalMetrics.push(timestampedMetrics as any);

    // Remove old metrics
    const retentionCutoff = Date.now() - (this.METRICS_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    this.historicalMetrics = this.historicalMetrics.filter(m => 
      (m as any).timestamp > retentionCutoff
    );
  }

  /**
   * Check storage and generate alerts if needed
   */
  async checkStorageAndAlert(): Promise<StorageAlert | null> {
    const metrics = await this.getStorageMetrics();

    if (metrics.percentageUsed >= this.CRITICAL_THRESHOLD) {
      return {
        level: 'critical',
        message: `DeepWiki storage critical: ${metrics.percentageUsed}% used`,
        metrics,
        recommendation: this.getRecommendation(metrics, 'critical')
      };
    } else if (metrics.percentageUsed >= this.EXPANSION_THRESHOLD) {
      return {
        level: 'warning',
        message: `DeepWiki storage high: ${metrics.percentageUsed}% used`,
        metrics,
        recommendation: this.getRecommendation(metrics, 'expand')
      };
    } else if (metrics.percentageUsed >= this.WARNING_THRESHOLD) {
      return {
        level: 'warning',
        message: `DeepWiki storage warning: ${metrics.percentageUsed}% used`,
        metrics,
        recommendation: this.getRecommendation(metrics, 'warning')
      };
    }

    return null;
  }

  /**
   * Get recommendation based on metrics and situation
   */
  private getRecommendation(metrics: StorageMetrics, situation: 'critical' | 'expand' | 'warning'): string {
    const daysUntilFull = metrics.growthRateGBPerDay > 0 
      ? metrics.availableGB / metrics.growthRateGBPerDay 
      : Infinity;

    switch (situation) {
      case 'critical':
        return `Immediate action required! Storage will be full in ${Math.round(daysUntilFull)} days. ` +
               `Run emergency cleanup or expand PVC immediately.`;
      
      case 'expand':
        const currentSize = await this.getCurrentPVCSize();
        const canExpand = currentSize < this.MAX_SIZE_GB;
        return canExpand 
          ? `Expand PVC from ${currentSize}GB to ${currentSize + this.EXPANSION_INCREMENT_GB}GB. ` +
            `Storage will be full in ${Math.round(daysUntilFull)} days at current growth rate.`
          : `Cannot expand beyond ${this.MAX_SIZE_GB}GB limit. Implement aggressive cleanup or archiving.`;
      
      case 'warning':
        return `Monitor closely. ${Math.round(daysUntilFull)} days until full at current growth rate. ` +
               `Consider scheduling cleanup or preparing for expansion.`;
      
      default:
        return 'Monitor storage usage.';
    }
  }

  /**
   * Get current PVC size
   */
  async getCurrentPVCSize(): Promise<number> {
    try {
      const { stdout } = await execAsync(
        `kubectl get pvc deepwiki-data-expandable -n ${this.NAMESPACE} -o jsonpath='{.status.capacity.storage}'`
      );
      
      // Parse size (e.g., "20Gi" -> 20)
      const match = stdout.match(/(\d+)Gi/);
      return match ? parseInt(match[1]) : 0;
    } catch (error) {
      logger.error('Failed to get PVC size:', error as Error);
      return 0;
    }
  }

  /**
   * Attempt to expand PVC
   */
  async expandPVC(newSizeGB: number): Promise<boolean> {
    try {
      if (newSizeGB > this.MAX_SIZE_GB) {
        logger.warn(`Cannot expand beyond maximum size of ${this.MAX_SIZE_GB}GB`);
        return false;
      }

      logger.info(`Expanding PVC to ${newSizeGB}GB`);

      await execAsync(
        `kubectl patch pvc deepwiki-data-expandable -n ${this.NAMESPACE} ` +
        `-p '{"spec":{"resources":{"requests":{"storage":"${newSizeGB}Gi"}}}}'`
      );

      // Wait for expansion to complete (with timeout)
      const startTime = Date.now();
      const timeout = 5 * 60 * 1000; // 5 minutes

      while (Date.now() - startTime < timeout) {
        const currentSize = await this.getCurrentPVCSize();
        if (currentSize >= newSizeGB) {
          logger.info(`PVC successfully expanded to ${newSizeGB}GB`);
          return true;
        }
        
        // Wait 10 seconds before checking again
        await new Promise(resolve => setTimeout(resolve, 10000));
      }

      logger.error('PVC expansion timed out');
      return false;

    } catch (error) {
      logger.error('Failed to expand PVC:', error as Error);
      return false;
    }
  }

  /**
   * Monitor storage and auto-expand if needed
   */
  async monitorAndAutoExpand(): Promise<void> {
    try {
      const alert = await this.checkStorageAndAlert();
      
      if (!alert) {
        logger.info('Storage usage is healthy');
        return;
      }

      // Log the alert
      logger[alert.level](alert.message, {
        metrics: alert.metrics,
        recommendation: alert.recommendation
      });

      // Send notification (implement your preferred notification method)
      await this.sendNotification(alert);

      // Auto-expand if usage is high but not critical
      if (alert.level === 'warning' && alert.metrics.percentageUsed >= this.EXPANSION_THRESHOLD) {
        const currentSize = await this.getCurrentPVCSize();
        const newSize = currentSize + this.EXPANSION_INCREMENT_GB;

        if (newSize <= this.MAX_SIZE_GB) {
          logger.info(`Auto-expanding PVC from ${currentSize}GB to ${newSize}GB`);
          const success = await this.expandPVC(newSize);
          
          if (success) {
            await this.sendNotification({
              level: 'info',
              message: `PVC successfully expanded from ${currentSize}GB to ${newSize}GB`,
              metrics: alert.metrics,
              recommendation: 'Expansion successful. Continue monitoring.'
            });
          }
        }
      }

    } catch (error) {
      logger.error('Storage monitoring failed:', error as Error);
    }
  }

  /**
   * Send notification (implement your preferred method)
   */
  private async sendNotification(alert: StorageAlert): Promise<void> {
    // Slack webhook example
    const slackWebhook = process.env.SLACK_WEBHOOK_URL;
    if (slackWebhook) {
      const emoji = alert.level === 'critical' ? '🚨' : alert.level === 'warning' ? '⚠️' : 'ℹ️';
      
      await axios.post(slackWebhook, {
        text: `${emoji} ${alert.message}`,
        attachments: [{
          color: alert.level === 'critical' ? 'danger' : alert.level === 'warning' ? 'warning' : 'good',
          fields: [
            { title: 'Used', value: `${alert.metrics.usedGB}GB / ${alert.metrics.totalGB}GB`, short: true },
            { title: 'Percentage', value: `${alert.metrics.percentageUsed}%`, short: true },
            { title: 'Repositories', value: `${alert.metrics.repositoryCount}`, short: true },
            { title: 'Growth Rate', value: `${alert.metrics.growthRateGBPerDay.toFixed(1)}GB/day`, short: true },
            { title: 'Recommendation', value: alert.recommendation, short: false }
          ]
        }]
      });
    }

    // Add other notification methods (email, PagerDuty, etc.) as needed
  }

  /**
   * Get storage prediction
   */
  async getStoragePrediction(): Promise<{
    daysUntilFull: number;
    projectedFullDate: Date;
    recommendedAction: string;
  }> {
    const metrics = await this.getStorageMetrics();
    
    if (metrics.growthRateGBPerDay <= 0) {
      return {
        daysUntilFull: Infinity,
        projectedFullDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        recommendedAction: 'Growth rate is stable or negative. Continue monitoring.'
      };
    }

    const daysUntilFull = metrics.availableGB / metrics.growthRateGBPerDay;
    const projectedFullDate = new Date(Date.now() + daysUntilFull * 24 * 60 * 60 * 1000);

    let recommendedAction: string;
    if (daysUntilFull < 3) {
      recommendedAction = 'Critical: Expand storage immediately or implement emergency cleanup.';
    } else if (daysUntilFull < 7) {
      recommendedAction = 'High priority: Plan storage expansion this week.';
    } else if (daysUntilFull < 30) {
      recommendedAction = 'Medium priority: Schedule storage expansion within the month.';
    } else {
      recommendedAction = 'Low priority: Monitor growth rate and plan accordingly.';
    }

    return {
      daysUntilFull,
      projectedFullDate,
      recommendedAction
    };
  }
}

// Export singleton instance
export const deepwikiStorageMonitor = new DeepWikiStorageMonitor();