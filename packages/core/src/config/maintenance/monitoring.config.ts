/**
 * Monitoring Configuration
 * Settings for monitoring, alerting, and metrics collection
 */

export interface MonitoringConfig {
  // Metrics collection
  metrics: MetricsConfig;
  
  // Alerting configuration
  alerting: AlertingConfig;
  
  // Logging configuration
  logging: LoggingConfig;
  
  // Dashboard configuration
  dashboard: DashboardConfig;
}

/**
 * Metrics collection configuration
 */
export interface MetricsConfig {
  enabled: boolean;
  collectionInterval: number;      // ms - how often to collect metrics
  retentionPeriod: number;        // ms - how long to keep metrics
  
  // What to collect
  collectExecutionMetrics: boolean;
  collectHealthMetrics: boolean;
  collectPerformanceMetrics: boolean;
  collectErrorMetrics: boolean;
  
  // Aggregation settings
  aggregationIntervals: number[];  // ms - intervals for aggregation
  
  // Export settings
  exportFormat: 'prometheus' | 'json' | 'graphite';
  exportEndpoint?: string;
  exportInterval: number;          // ms - how often to export
}

/**
 * Alerting configuration
 */
export interface AlertingConfig {
  enabled: boolean;
  
  // Alert channels
  channels: AlertChannel[];
  
  // Alert rules
  rules: AlertRule[];
  
  // Global settings
  cooldownPeriod: number;         // ms - prevent alert spam
  maxAlertsPerHour: number;
  
  // Severity levels
  severityLevels: {
    critical: AlertSeverityConfig;
    high: AlertSeverityConfig;
    medium: AlertSeverityConfig;
    low: AlertSeverityConfig;
  };
}

/**
 * Alert channel configuration
 */
export interface AlertChannel {
  id: string;
  type: 'email' | 'slack' | 'webhook' | 'pagerduty' | 'console';
  enabled: boolean;
  config: Record<string, any>;
  severities: ('critical' | 'high' | 'medium' | 'low')[];
}

/**
 * Alert rule configuration
 */
export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  
  // Condition
  condition: {
    metric: string;
    operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
    threshold: number;
    duration?: number;           // ms - how long condition must be true
  };
  
  // Action
  severity: 'critical' | 'high' | 'medium' | 'low';
  channels: string[];            // Channel IDs to notify
  
  // Additional settings
  cooldown?: number;             // ms - override global cooldown
  metadata?: Record<string, any>;
}

/**
 * Alert severity configuration
 */
export interface AlertSeverityConfig {
  notificationDelay: number;     // ms - delay before sending
  autoResolve: boolean;         // Auto-resolve when condition clears
  escalation?: {
    enabled: boolean;
    afterMinutes: number;
    escalateTo: 'critical' | 'high' | 'medium';
  };
}

/**
 * Logging configuration
 */
export interface LoggingConfig {
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  
  // What to log
  logExecutions: boolean;
  logFailures: boolean;
  logRecoveries: boolean;
  logCircuitChanges: boolean;
  logPerformance: boolean;
  
  // Where to log
  destinations: LogDestination[];
  
  // Log formatting
  format: 'json' | 'text' | 'structured';
  includeMetadata: boolean;
  
  // Log rotation
  rotation: {
    enabled: boolean;
    maxSize: number;             // bytes
    maxFiles: number;
    compress: boolean;
  };
}

/**
 * Log destination configuration
 */
export interface LogDestination {
  type: 'console' | 'file' | 'syslog' | 'elasticsearch' | 'cloudwatch';
  enabled: boolean;
  config: Record<string, any>;
  minLevel: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
}

/**
 * Dashboard configuration
 */
export interface DashboardConfig {
  enabled: boolean;
  refreshInterval: number;       // ms - dashboard refresh rate
  
  // Widgets to display
  widgets: DashboardWidget[];
  
  // Export settings
  exportEnabled: boolean;
  exportFormats: ('pdf' | 'png' | 'csv')[];
}

/**
 * Dashboard widget configuration
 */
export interface DashboardWidget {
  id: string;
  type: 'health-overview' | 'circuit-status' | 'performance-metrics' | 
        'error-trends' | 'recovery-timeline' | 'tool-comparison';
  position: { x: number; y: number; width: number; height: number };
  config: Record<string, any>;
}

/**
 * Default monitoring configurations
 */
export const MONITORING_PROFILES: Record<string, MonitoringConfig> = {
  production: {
    metrics: {
      enabled: true,
      collectionInterval: 10000,    // 10 seconds
      retentionPeriod: 2592000000,  // 30 days
      collectExecutionMetrics: true,
      collectHealthMetrics: true,
      collectPerformanceMetrics: true,
      collectErrorMetrics: true,
      aggregationIntervals: [60000, 300000, 3600000], // 1m, 5m, 1h
      exportFormat: 'prometheus',
      exportInterval: 60000          // 1 minute
    },
    alerting: {
      enabled: true,
      channels: [
        {
          id: 'slack-critical',
          type: 'slack',
          enabled: true,
          config: { webhookUrl: process.env.SLACK_WEBHOOK_URL },
          severities: ['critical', 'high']
        },
        {
          id: 'email-all',
          type: 'email',
          enabled: true,
          config: { to: process.env.ALERT_EMAIL },
          severities: ['critical', 'high', 'medium']
        }
      ],
      rules: [
        {
          id: 'tool-health-critical',
          name: 'Tool Health Critical',
          description: 'Alert when tool health drops below critical threshold',
          enabled: true,
          condition: {
            metric: 'tool.health.score',
            operator: '<',
            threshold: 50,
            duration: 300000 // 5 minutes
          },
          severity: 'critical',
          channels: ['slack-critical', 'email-all']
        },
        {
          id: 'high-failure-rate',
          name: 'High Failure Rate',
          description: 'Alert on high tool failure rate',
          enabled: true,
          condition: {
            metric: 'tool.failure.rate',
            operator: '>',
            threshold: 0.5,
            duration: 60000 // 1 minute
          },
          severity: 'high',
          channels: ['slack-critical', 'email-all']
        }
      ],
      cooldownPeriod: 3600000,       // 1 hour
      maxAlertsPerHour: 10,
      severityLevels: {
        critical: {
          notificationDelay: 0,
          autoResolve: false,
          escalation: {
            enabled: true,
            afterMinutes: 15,
            escalateTo: 'critical'
          }
        },
        high: {
          notificationDelay: 60000,   // 1 minute
          autoResolve: true,
          escalation: {
            enabled: true,
            afterMinutes: 30,
            escalateTo: 'critical'
          }
        },
        medium: {
          notificationDelay: 300000,  // 5 minutes
          autoResolve: true
        },
        low: {
          notificationDelay: 900000,  // 15 minutes
          autoResolve: true
        }
      }
    },
    logging: {
      level: 'info',
      logExecutions: true,
      logFailures: true,
      logRecoveries: true,
      logCircuitChanges: true,
      logPerformance: false,
      destinations: [
        {
          type: 'console',
          enabled: true,
          config: {},
          minLevel: 'warn'
        },
        {
          type: 'file',
          enabled: true,
          config: { path: '/var/log/codequal/mcp-tools.log' },
          minLevel: 'info'
        }
      ],
      format: 'json',
      includeMetadata: true,
      rotation: {
        enabled: true,
        maxSize: 104857600,  // 100MB
        maxFiles: 10,
        compress: true
      }
    },
    dashboard: {
      enabled: true,
      refreshInterval: 30000,        // 30 seconds
      widgets: [
        {
          id: 'health-overview',
          type: 'health-overview',
          position: { x: 0, y: 0, width: 12, height: 4 },
          config: {}
        },
        {
          id: 'circuit-status',
          type: 'circuit-status',
          position: { x: 0, y: 4, width: 6, height: 4 },
          config: {}
        },
        {
          id: 'performance-metrics',
          type: 'performance-metrics',
          position: { x: 6, y: 4, width: 6, height: 4 },
          config: { timeRange: '1h' }
        }
      ],
      exportEnabled: true,
      exportFormats: ['pdf', 'png']
    }
  },
  
  development: {
    metrics: {
      enabled: true,
      collectionInterval: 5000,
      retentionPeriod: 86400000,    // 1 day
      collectExecutionMetrics: true,
      collectHealthMetrics: true,
      collectPerformanceMetrics: true,
      collectErrorMetrics: true,
      aggregationIntervals: [60000],
      exportFormat: 'json',
      exportInterval: 30000
    },
    alerting: {
      enabled: false,
      channels: [
        {
          id: 'console',
          type: 'console',
          enabled: true,
          config: {},
          severities: ['critical', 'high', 'medium', 'low']
        }
      ],
      rules: [],
      cooldownPeriod: 60000,
      maxAlertsPerHour: 1000,
      severityLevels: {
        critical: { notificationDelay: 0, autoResolve: true },
        high: { notificationDelay: 0, autoResolve: true },
        medium: { notificationDelay: 0, autoResolve: true },
        low: { notificationDelay: 0, autoResolve: true }
      }
    },
    logging: {
      level: 'debug',
      logExecutions: true,
      logFailures: true,
      logRecoveries: true,
      logCircuitChanges: true,
      logPerformance: true,
      destinations: [
        {
          type: 'console',
          enabled: true,
          config: { pretty: true },
          minLevel: 'debug'
        }
      ],
      format: 'text',
      includeMetadata: true,
      rotation: {
        enabled: false,
        maxSize: 10485760,
        maxFiles: 3,
        compress: false
      }
    },
    dashboard: {
      enabled: true,
      refreshInterval: 5000,
      widgets: [
        {
          id: 'health-overview',
          type: 'health-overview',
          position: { x: 0, y: 0, width: 12, height: 8 },
          config: { detailed: true }
        }
      ],
      exportEnabled: false,
      exportFormats: []
    }
  }
};
