import { createLogger } from '@codequal/core/utils';
import { deepWikiMetricsProxy } from './deepwiki-metrics-proxy';
import { getSupabase } from '@codequal/database/supabase/client';

const logger = createLogger('deepwiki-alerts');

interface AlertConfig {
  criticalThreshold: number;
  warningThreshold: number;
  checkIntervalMinutes: number;
  notificationEmail?: string;
}

interface Alert {
  id: string;
  type: 'warning' | 'critical';
  message: string;
  percentUsed: number;
  availableGB: number;
  timestamp: Date;
  resolved: boolean;
}

export class DeepWikiAlertService {
  private config: AlertConfig;
  private activeAlerts: Map<string, Alert> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(config?: Partial<AlertConfig>) {
    this.config = {
      criticalThreshold: 85,
      warningThreshold: 70,
      checkIntervalMinutes: 5,
      ...config
    };
  }

  /**
   * Start monitoring disk usage
   */
  start() {
    if (this.checkInterval) {
      logger.warn('Alert service already running');
      return;
    }

    logger.info('Starting DeepWiki alert service', {
      criticalThreshold: this.config.criticalThreshold,
      warningThreshold: this.config.warningThreshold,
      checkInterval: `${this.config.checkIntervalMinutes} minutes`
    });

    // Initial check
    this.checkDiskUsage();

    // Schedule periodic checks
    this.checkInterval = setInterval(
      () => this.checkDiskUsage(),
      this.config.checkIntervalMinutes * 60 * 1000
    );
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      logger.info('DeepWiki alert service stopped');
    }
  }

  /**
   * Check disk usage and trigger alerts if needed
   */
  private async checkDiskUsage() {
    try {
      const metrics = await deepWikiMetricsProxy.getMetrics();
      
      // Check for critical condition
      if (metrics.percentUsed >= this.config.criticalThreshold) {
        await this.triggerAlert('critical', metrics);
      }
      // Check for warning condition
      else if (metrics.percentUsed >= this.config.warningThreshold) {
        await this.triggerAlert('warning', metrics);
      }
      // Clear resolved alerts
      else {
        this.clearResolvedAlerts(metrics.percentUsed);
      }

      // Log metrics
      logger.info('Disk usage check completed', {
        percentUsed: `${metrics.percentUsed}%`,
        availableGB: metrics.availableGB,
        activeAnalyses: metrics.activeAnalyses,
        alertsActive: this.activeAlerts.size
      });

    } catch (error) {
      logger.error('Failed to check disk usage:', error as Error);
    }
  }

  /**
   * Trigger an alert
   */
  private async triggerAlert(type: 'warning' | 'critical', metrics: any) {
    const alertId = `disk-${type}`;
    
    // Check if alert already exists
    if (this.activeAlerts.has(alertId)) {
      const existingAlert = this.activeAlerts.get(alertId)!;
      // Update metrics but don't re-notify
      existingAlert.percentUsed = metrics.percentUsed;
      existingAlert.availableGB = metrics.availableGB;
      return;
    }

    const alert: Alert = {
      id: alertId,
      type,
      message: this.generateAlertMessage(type, metrics),
      percentUsed: metrics.percentUsed,
      availableGB: metrics.availableGB,
      timestamp: new Date(),
      resolved: false
    };

    this.activeAlerts.set(alertId, alert);

    // Log alert
    logger[type === 'critical' ? 'error' : 'warn'](alert.message, {
      percentUsed: metrics.percentUsed,
      availableGB: metrics.availableGB,
      activeAnalyses: metrics.activeAnalyses
    });

    // Store alert in database
    await this.storeAlert(alert);

    // Send notification
    await this.sendNotification(alert);
  }

  /**
   * Generate alert message
   */
  private generateAlertMessage(type: 'warning' | 'critical', metrics: any): string {
    if (type === 'critical') {
      return `🚨 CRITICAL: DeepWiki disk usage at ${metrics.percentUsed}% - Only ${metrics.availableGB}GB available. Immediate action required!`;
    } else {
      return `⚠️ WARNING: DeepWiki disk usage at ${metrics.percentUsed}% - ${metrics.availableGB}GB available. Consider cleanup.`;
    }
  }

  /**
   * Clear resolved alerts
   */
  private clearResolvedAlerts(currentUsage: number) {
    for (const [alertId, alert] of this.activeAlerts) {
      if (alert.type === 'critical' && currentUsage < this.config.criticalThreshold) {
        alert.resolved = true;
        logger.info(`Critical alert resolved. Disk usage now at ${currentUsage}%`);
        this.activeAlerts.delete(alertId);
      } else if (alert.type === 'warning' && currentUsage < this.config.warningThreshold) {
        alert.resolved = true;
        logger.info(`Warning alert resolved. Disk usage now at ${currentUsage}%`);
        this.activeAlerts.delete(alertId);
      }
    }
  }

  /**
   * Store alert in database
   */
  private async storeAlert(alert: Alert) {
    try {
      await getSupabase()
        .from('monitoring_alerts')
        .insert({
          service: 'deepwiki',
          type: alert.type,
          message: alert.message,
          metadata: {
            percentUsed: alert.percentUsed,
            availableGB: alert.availableGB
          },
          created_at: alert.timestamp
        });
    } catch (error) {
      logger.error('Failed to store alert in database:', error as Error);
    }
  }

  /**
   * Send notification (email, Slack, etc.)
   */
  private async sendNotification(alert: Alert) {
    // TODO: Implement actual notification logic
    // For now, just log
    logger.info('Notification would be sent:', {
      type: alert.type,
      message: alert.message
    });

    // In production, this would:
    // 1. Send email to configured addresses
    // 2. Post to Slack webhook
    // 3. Trigger PagerDuty alert for critical issues
  }

  /**
   * Get current alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }
}

// Create singleton instance
export const deepWikiAlertService = new DeepWikiAlertService();