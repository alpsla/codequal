/**
 * Enhanced Monitoring Service
 * Integrates with Grafana, supports Loavable embedding, and AI-tool integration
 */

import { EventEmitter } from 'events';
import promClient from 'prom-client';
import { createLogger } from '../utils/logger';
import { SupabaseAlertStorage, StoredAlert } from './supabase-alert-storage';

// ============================================================================
// TYPES & INTERFACES FOR AI TOOL INTEGRATION
// ============================================================================

export interface MonitoringConfig {
  service: string;
  environment: 'development' | 'staging' | 'production';
  grafana: {
    url: string;
    apiKey?: string;
    orgId?: number;
  };
  supabase?: {
    url: string;
    key: string;
  };
  dashboards: DashboardConfig[];
  alerts: AlertConfig[];
  widgets: WidgetConfig[];
}

export interface DashboardConfig {
  id: string;
  title: string;
  description: string;
  tags: string[];
  panels: PanelConfig[];
  refresh: string; // e.g., "5s", "1m", "5m"
  timeRange: {
    from: string;
    to: string;
  };
  embeddable: boolean;
  aiPrompts?: string[]; // Natural language descriptions for AI tools
}

export interface PanelConfig {
  id: string;
  title: string;
  type: 'graph' | 'stat' | 'table' | 'heatmap' | 'gauge';
  query: string;
  visualization: {
    width: number;
    height: number;
    colors?: string[];
    thresholds?: Array<{
      value: number;
      color: string;
      condition: 'gt' | 'lt';
    }>;
  };
  aiDescription?: string; // For AI to understand what this panel shows
}

export interface WidgetConfig {
  id: string;
  name: string;
  type: 'metric' | 'chart' | 'status' | 'alert';
  dataSource: string;
  query: string;
  refreshInterval: number; // milliseconds
  embeddable: boolean;
  props?: Record<string, unknown>;
}

export interface AlertConfig {
  id: string;
  name: string;
  condition: string;
  severity: 'info' | 'warning' | 'critical';
  channels: string[];
  description: string;
  aiContext?: string; // Help AI understand when to trigger this alert
  threshold?: number;
  query?: string;
}

export interface MetricSnapshot {
  timestamp: Date;
  metrics: Record<string, number>;
  labels: Record<string, string>;
  service: string;
}

export interface DashboardData {
  panels: Array<{
    id: string;
    data: unknown[];
    lastUpdated: Date;
  }>;
  alerts: AlertStatus[];
  metadata: {
    refreshedAt: Date;
    nextRefresh: Date;
    dataQuality: number; // 0-1
  };
}

export interface AlertStatus {
  id: string;
  name: string;
  status: 'ok' | 'warning' | 'critical';
  message: string;
  triggeredAt?: Date;
  value?: number;
  threshold?: number;
  storedAlertId?: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// ENHANCED MONITORING SERVICE
// ============================================================================

export class EnhancedMonitoringService extends EventEmitter {
  private logger = createLogger('EnhancedMonitoringService');
  private metrics: promClient.Registry;
  private config: MonitoringConfig;
  private dashboardData: Map<string, DashboardData> = new Map();
  private alertStates: Map<string, AlertStatus> = new Map();
  private metricHistory: MetricSnapshot[] = [];
  private refreshIntervals: Map<string, NodeJS.Timeout> = new Map();
  private alertStorage?: SupabaseAlertStorage;

  // Prometheus metrics
  private coreMetrics!: {
    analysisStarted: promClient.Counter;
    analysisCompleted: promClient.Counter;
    analysisFailed: promClient.Counter;
    analysisTime: promClient.Histogram;
    activeAnalyses: promClient.Gauge;
    componentLatency: promClient.Histogram;
    errorRate: promClient.Counter;
    businessMetrics: promClient.Counter;
    costMetrics: promClient.Histogram;
  };

  constructor(config: MonitoringConfig) {
    super();
    this.config = config;
    this.metrics = new promClient.Registry();
    
    // Initialize Supabase storage if configured
    if (config.supabase) {
      this.alertStorage = new SupabaseAlertStorage(
        config.supabase.url,
        config.supabase.key
      );
    }
    
    // Initialize Prometheus metrics
    this.initializeMetrics();
    
    // Start background processes
    this.startDashboardRefresh();
    this.startAlertMonitoring();
    this.startMetricHistoryCapture();
    
    this.logger.info('Enhanced monitoring service initialized', {
      service: config.service,
      environment: config.environment,
      dashboards: config.dashboards.length,
      widgets: config.widgets.length
    });
  }

  // ============================================================================
  // METRICS COLLECTION (Prometheus-compatible)
  // ============================================================================

  private initializeMetrics() {
    // Collect default metrics
    promClient.collectDefaultMetrics({ register: this.metrics });

    this.coreMetrics = {
      analysisStarted: new promClient.Counter({
        name: 'codequal_analysis_started_total',
        help: 'Total analyses started',
        labelNames: ['mode', 'repository_size', 'user_tier'],
        registers: [this.metrics]
      }),

      analysisCompleted: new promClient.Counter({
        name: 'codequal_analysis_completed_total',
        help: 'Total analyses completed successfully',
        labelNames: ['mode', 'repository_size', 'user_tier', 'duration_bucket'],
        registers: [this.metrics]
      }),

      analysisFailed: new promClient.Counter({
        name: 'codequal_analysis_failed_total',
        help: 'Total failed analyses',
        labelNames: ['mode', 'error_type', 'component'],
        registers: [this.metrics]
      }),

      analysisTime: new promClient.Histogram({
        name: 'codequal_analysis_duration_seconds',
        help: 'Analysis execution time',
        labelNames: ['mode', 'repository_size', 'user_tier'],
        buckets: [10, 30, 60, 120, 300, 600, 1200], // seconds
        registers: [this.metrics]
      }),

      activeAnalyses: new promClient.Gauge({
        name: 'codequal_active_analyses',
        help: 'Currently running analyses',
        labelNames: ['mode'],
        registers: [this.metrics]
      }),

      componentLatency: new promClient.Histogram({
        name: 'codequal_component_latency_seconds',
        help: 'Component response time',
        labelNames: ['component', 'operation'],
        buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
        registers: [this.metrics]
      }),

      errorRate: new promClient.Counter({
        name: 'codequal_errors_total',
        help: 'Total errors by type and component',
        labelNames: ['error_type', 'component', 'severity'],
        registers: [this.metrics]
      }),

      businessMetrics: new promClient.Counter({
        name: 'codequal_business_events_total',
        help: 'Business-level events',
        labelNames: ['event_type', 'user_tier', 'repository_language'],
        registers: [this.metrics]
      }),

      costMetrics: new promClient.Histogram({
        name: 'codequal_cost_dollars',
        help: 'Cost per operation in dollars',
        labelNames: ['operation', 'provider'],
        buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
        registers: [this.metrics]
      })
    };
  }

  // ============================================================================
  // GRAFANA INTEGRATION
  // ============================================================================

  async createGrafanaDashboard(dashboardConfig: DashboardConfig): Promise<string> {
    const grafanaConfig = {
      dashboard: {
        id: null,
        title: dashboardConfig.title,
        description: dashboardConfig.description,
        tags: dashboardConfig.tags,
        timezone: 'browser',
        refresh: dashboardConfig.refresh,
        time: {
          from: dashboardConfig.timeRange.from,
          to: dashboardConfig.timeRange.to
        },
        panels: dashboardConfig.panels.map(this.convertPanelToGrafana.bind(this)),
        annotations: {
          list: []
        },
        templating: {
          list: this.generateTemplateVariables()
        }
      },
      overwrite: true
    };

    try {
      // In production, this would make actual API calls to Grafana
      const response = await this.postToGrafanaAPI('/api/dashboards/db', grafanaConfig);
      
      const grafanaResponse = response as { id: string; url: string };
      
      this.logger.info('Created Grafana dashboard', {
        dashboardId: dashboardConfig.id,
        grafanaId: grafanaResponse.id,
        url: grafanaResponse.url
      });

      return grafanaResponse.url;
    } catch (error) {
      this.logger.error('Failed to create Grafana dashboard', {
        dashboardId: dashboardConfig.id,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  private convertPanelToGrafana(panel: PanelConfig): Record<string, unknown> {
    return {
      id: parseInt(panel.id),
      title: panel.title,
      type: panel.type,
      gridPos: {
        h: panel.visualization.height / 20, // Grafana uses 20px grid units
        w: panel.visualization.width / 20,
        x: 0,
        y: 0
      },
      targets: [{
        expr: panel.query,
        refId: 'A',
        format: 'time_series'
      }],
      fieldConfig: {
        defaults: {
          thresholds: {
            steps: panel.visualization.thresholds?.map(t => ({
              color: t.color,
              value: t.value
            })) || []
          }
        }
      },
      options: {
        aiDescription: panel.aiDescription
      }
    };
  }

  private generateTemplateVariables(): Array<Record<string, unknown>> {
    return [
      {
        name: 'service',
        type: 'query',
        query: 'label_values(codequal_analysis_started_total, service)',
        refresh: 1
      },
      {
        name: 'environment',
        type: 'query', 
        query: 'label_values(codequal_analysis_started_total, environment)',
        refresh: 1
      }
    ];
  }

  // ============================================================================
  // LOAVABLE EMBEDDING SUPPORT
  // ============================================================================

  getEmbeddableWidgets(): WidgetConfig[] {
    return this.config.widgets.filter(w => w.embeddable);
  }

  async getWidgetData(widgetId: string): Promise<unknown> {
    const widget = this.config.widgets.find(w => w.id === widgetId);
    if (!widget) {
      throw new Error(`Widget ${widgetId} not found`);
    }

    const data = await this.executeQuery(widget.query);
    
    return {
      widgetId,
      type: widget.type,
      data,
      lastUpdated: new Date(),
      props: widget.props || {}
    };
  }

  generateLoavableComponent(widgetId: string): string {
    const widget = this.config.widgets.find(w => w.id === widgetId);
    if (!widget) {
      throw new Error(`Widget ${widgetId} not found`);
    }

    // Generate React component code for Loavable
    return `
import React, { useState, useEffect } from 'react';
import { ${this.getComponentImport(widget.type)} } from '@codequal/monitoring-widgets';

export const ${widget.name.replace(/\s+/g, '')}Widget = (props) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/monitoring/widgets/${widgetId}/data');
        const result = await response.json();
        setData(result.data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, ${widget.refreshInterval});
    
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div>Loading ${widget.name}...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <${this.getComponentImport(widget.type)}
      data={data}
      title="${widget.name}"
      {...props}
      ${Object.entries(widget.props || {}).map(([k, v]) => `${k}={${JSON.stringify(v)}}`).join('\n      ')}
    />
  );
};
`;
  }

  private getComponentImport(widgetType: string): string {
    const componentMap = {
      'metric': 'MetricCard',
      'chart': 'TimeSeriesChart', 
      'status': 'StatusIndicator',
      'alert': 'AlertPanel'
    };
    return componentMap[widgetType as keyof typeof componentMap] || 'GenericWidget';
  }

  // ============================================================================
  // AI TOOL INTEGRATION
  // ============================================================================

  getMonitoringSchema(): object {
    return {
      service: this.config.service,
      version: '1.0.0',
      capabilities: {
        metrics: Object.keys(this.coreMetrics),
        dashboards: this.config.dashboards.map(d => ({
          id: d.id,
          title: d.title,
          description: d.description,
          aiPrompts: d.aiPrompts || [],
          embeddable: d.embeddable
        })),
        widgets: this.config.widgets.map(w => ({
          id: w.id,
          name: w.name,
          type: w.type,
          embeddable: w.embeddable
        })),
        alerts: this.config.alerts.map(a => ({
          id: a.id,
          name: a.name,
          severity: a.severity,
          aiContext: a.aiContext
        }))
      },
      endpoints: {
        metrics: '/metrics',
        health: '/health',
        dashboards: '/api/monitoring/dashboards',
        widgets: '/api/monitoring/widgets',
        alerts: '/api/monitoring/alerts'
      },
      queryLanguage: 'PromQL',
      aiInstructions: {
        howToQuery: 'Use PromQL syntax for metrics queries. Available metrics: ' + Object.keys(this.coreMetrics).join(', '),
        commonQueries: {
          'analysis_success_rate': 'rate(codequal_analysis_completed_total[5m]) / rate(codequal_analysis_started_total[5m])',
          'average_analysis_time': 'rate(codequal_analysis_duration_seconds_sum[5m]) / rate(codequal_analysis_duration_seconds_count[5m])',
          'error_rate': 'rate(codequal_errors_total[5m])',
          'active_analyses': 'codequal_active_analyses'
        },
        alerting: 'Create alerts using the condition field with PromQL expressions'
      }
    };
  }

  async getMetricsForAI(timeRange?: string): Promise<Record<string, unknown>> {
    const metrics = await this.metrics.metrics();
    const parsed = this.parsePrometheusMetrics(metrics);
    
    return {
      timestamp: new Date(),
      timeRange: timeRange || 'current',
      service: this.config.service,
      metrics: parsed,
      summary: {
        totalAnalyses: parsed.codequal_analysis_started_total || 0,
        successRate: this.calculateSuccessRate(parsed),
        averageTime: this.calculateAverageTime(parsed),
        activeCount: parsed.codequal_active_analyses || 0,
        errorCount: parsed.codequal_errors_total || 0
      },
      healthStatus: await this.getOverallHealth(),
      recommendations: this.generateAIRecommendations(parsed)
    };
  }

  private generateAIRecommendations(metrics: Record<string, unknown>): string[] {
    const recommendations: string[] = [];
    
    const successRate = this.calculateSuccessRate(metrics);
    if (successRate < 0.95) {
      recommendations.push(`Success rate is ${(successRate * 100).toFixed(1)}% - investigate error patterns`);
    }
    
    const avgTime = this.calculateAverageTime(metrics);
    if (avgTime > 120) { // 2 minutes
      recommendations.push(`Average analysis time is ${avgTime}s - consider optimization`);
    }
    
    const activeCount = metrics.codequal_active_analyses as number || 0;
    if (activeCount > 10) {
      recommendations.push(`${activeCount} active analyses - monitor resource usage`);
    }
    
    return recommendations;
  }

  // ============================================================================
  // REAL-TIME DATA & DASHBOARD MANAGEMENT
  // ============================================================================

  private startDashboardRefresh() {
    this.config.dashboards.forEach(dashboard => {
      const refreshMs = this.parseRefreshInterval(dashboard.refresh);
      const interval = setInterval(async () => {
        try {
          const data = await this.refreshDashboardData(dashboard.id);
          this.dashboardData.set(dashboard.id, data);
          this.emit('dashboardRefresh', { dashboardId: dashboard.id, data });
        } catch (error) {
          this.logger.error('Dashboard refresh failed', {
            dashboardId: dashboard.id,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }, refreshMs);
      
      this.refreshIntervals.set(dashboard.id, interval);
    });
  }

  private startAlertMonitoring() {
    this.config.alerts.forEach(alert => {
      setInterval(async () => {
        try {
          const status = await this.evaluateAlert(alert);
          const previous = this.alertStates.get(alert.id);
          
          if (!previous || previous.status !== status.status) {
            this.alertStates.set(alert.id, status);
            this.emit('alertStatusChange', { alert, previous, current: status });
            
            if (status.status !== 'ok') {
              this.triggerAlert(alert, status);
            }
          }
        } catch (error) {
          this.logger.error('Alert evaluation failed', {
            alertId: alert.id,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }, 10000); // Check every 10 seconds
    });
  }

  private startMetricHistoryCapture() {
    setInterval(() => {
      const snapshot: MetricSnapshot = {
        timestamp: new Date(),
        service: this.config.service,
        metrics: this.captureCurrentMetrics(),
        labels: {
          environment: this.config.environment,
          version: process.env.APP_VERSION || 'unknown'
        }
      };
      
      this.metricHistory.push(snapshot);
      
      // Keep only last 1000 snapshots
      if (this.metricHistory.length > 1000) {
        this.metricHistory = this.metricHistory.slice(-1000);
      }
      
      this.emit('metricsSnapshot', snapshot);
    }, 30000); // Every 30 seconds
  }

  // ============================================================================
  // API METHODS FOR EXTERNAL INTEGRATION
  // ============================================================================

  // Record analysis events
  recordAnalysisStarted(labels: { mode: string; repository_size: string; user_tier: string }) {
    this.coreMetrics.analysisStarted.inc(labels);
    this.coreMetrics.activeAnalyses.inc({ mode: labels.mode });
  }

  recordAnalysisCompleted(labels: { mode: string; repository_size: string; user_tier: string; duration_bucket: string }, duration: number) {
    this.coreMetrics.analysisCompleted.inc(labels);
    this.coreMetrics.analysisTime.observe(labels, duration);
    this.coreMetrics.activeAnalyses.dec({ mode: labels.mode });
  }

  recordAnalysisFailed(labels: { mode: string; error_type: string; component: string }) {
    this.coreMetrics.analysisFailed.inc(labels);
    this.coreMetrics.activeAnalyses.dec({ mode: labels.mode });
  }

  recordComponentLatency(component: string, operation: string, duration: number) {
    this.coreMetrics.componentLatency.observe({ component, operation }, duration);
  }

  recordError(error_type: string, component: string, severity: string) {
    this.coreMetrics.errorRate.inc({ error_type, component, severity });
  }

  recordBusinessEvent(event_type: string, user_tier: string, repository_language: string) {
    this.coreMetrics.businessMetrics.inc({ event_type, user_tier, repository_language });
  }

  recordCost(operation: string, provider: string, cost: number) {
    this.coreMetrics.costMetrics.observe({ operation, provider }, cost);
  }

  // Get metrics in Prometheus format
  async getPrometheusMetrics(): Promise<string> {
    return this.metrics.metrics();
  }

  // Get dashboard data for web apps
  async getDashboardData(dashboardId: string): Promise<DashboardData | null> {
    return this.dashboardData.get(dashboardId) || null;
  }

  // Get alert status
  getAlertStatus(alertId?: string): AlertStatus[] {
    if (alertId) {
      const status = this.alertStates.get(alertId);
      return status ? [status] : [];
    }
    return Array.from(this.alertStates.values());
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private async executeQuery(query: string): Promise<unknown> {
    // In production, this would execute against Prometheus
    // For now, return mock data based on the query
    return {
      query,
      result: [],
      resultType: 'vector',
      timestamp: new Date()
    };
  }

  private async refreshDashboardData(dashboardId: string): Promise<DashboardData> {
    const dashboard = this.config.dashboards.find(d => d.id === dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard ${dashboardId} not found`);
    }

    const panels = await Promise.all(
      dashboard.panels.map(async panel => ({
        id: panel.id,
        data: await this.executeQuery(panel.query) as unknown[],
        lastUpdated: new Date()
      }))
    );

    return {
      panels,
      alerts: this.getAlertStatus(),
      metadata: {
        refreshedAt: new Date(),
        nextRefresh: new Date(Date.now() + this.parseRefreshInterval(dashboard.refresh)),
        dataQuality: 1.0 // Calculate based on successful queries
      }
    };
  }

  private async evaluateAlert(alert: AlertConfig): Promise<AlertStatus> {
    try {
      const result = await this.executeQuery(alert.condition);
      const value = this.extractValueFromQueryResult(result);
      
      return {
        id: alert.id,
        name: alert.name,
        status: this.determineAlertStatus(value, alert),
        message: this.generateAlertMessage(alert, value),
        value: value ?? undefined,
        triggeredAt: value !== null ? new Date() : undefined
      };
    } catch (error) {
      return {
        id: alert.id,
        name: alert.name,
        status: 'critical',
        message: `Alert evaluation failed: ${(error as Error).message}`
      };
    }
  }

  private async triggerAlert(alert: AlertConfig, status: AlertStatus) {
    this.logger.warn('Alert triggered', {
      alertId: alert.id,
      alertName: alert.name,
      severity: alert.severity,
      status: status.status,
      value: status.value
    });

    // Store alert in Supabase if configured
    if (this.alertStorage) {
      try {
        const storedAlertId = await this.alertStorage.storeAlert({
          service: this.config.service,
          environment: this.config.environment,
          alertId: alert.id,
          alertName: alert.name,
          severity: alert.severity,
          status: 'firing',
          value: status.value || 0,
          threshold: alert.threshold || 0,
          message: status.message || `Alert ${alert.name} triggered`,
          metadata: {
            condition: alert.condition,
            query: alert.query,
            ...status.metadata
          },
          triggeredAt: new Date(),
          channelsNotified: alert.channels
        });
        
        // Store the Supabase ID for potential resolution updates
        status.storedAlertId = storedAlertId;
      } catch (error) {
        this.logger.error('Failed to store alert in Supabase', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Emit event for external handlers
    this.emit('alertTriggered', { alert, status });

    // Send to configured channels
    const channelPromises = alert.channels.map(channel => 
      this.sendAlertToChannel(channel, alert, status)
    );
    
    await Promise.all(channelPromises);
  }

  private async sendAlertToChannel(channel: string, alert: AlertConfig, status: AlertStatus): Promise<void> {
    try {
      switch (channel) {
        case 'slack':
          await this.sendSlackAlert(alert, status);
          break;
        case 'email':
          await this.sendEmailAlert(alert, status);
          break;
        case 'pagerduty':
          await this.sendPagerDutyAlert(alert, status);
          break;
        default:
          this.logger.warn(`Unknown alert channel: ${channel}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send alert to ${channel}`, {
        alertId: alert.id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async sendSlackAlert(alert: AlertConfig, status: AlertStatus): Promise<void> {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
      this.logger.warn('Slack webhook URL not configured');
      return;
    }

    const color = alert.severity === 'critical' ? '#FF0000' :
                  alert.severity === 'warning' ? '#FFA500' : '#36A64F';

    const payload = {
      attachments: [{
        color,
        title: `${this.getSeverityEmoji(alert.severity)} ${alert.name}`,
        text: status.message,
        fields: [
          {
            title: 'Service',
            value: this.config.service,
            short: true
          },
          {
            title: 'Environment',
            value: this.config.environment,
            short: true
          },
          {
            title: 'Severity',
            value: alert.severity.toUpperCase(),
            short: true
          },
          {
            title: 'Value',
            value: status.value?.toString() || 'N/A',
            short: true
          }
        ],
        footer: 'CodeQual Monitoring',
        ts: Math.floor(Date.now() / 1000)
      }]
    };

    // In production, this would make actual HTTP request to Slack
    this.logger.info('Slack alert sent', { alertId: alert.id });
  }

  private async sendEmailAlert(alert: AlertConfig, status: AlertStatus): Promise<void> {
    // In production, this would integrate with email service (SendGrid, SES, etc.)
    const emailConfig = {
      to: process.env.ALERT_EMAIL_TO?.split(',') || [],
      from: process.env.ALERT_EMAIL_FROM || 'alerts@codequal.com',
      subject: `[${alert.severity.toUpperCase()}] ${alert.name} - ${this.config.service}`,
      html: `
        <h2>${alert.name}</h2>
        <p><strong>Status:</strong> ${status.status}</p>
        <p><strong>Message:</strong> ${status.message}</p>
        <p><strong>Service:</strong> ${this.config.service}</p>
        <p><strong>Environment:</strong> ${this.config.environment}</p>
        <p><strong>Value:</strong> ${status.value || 'N/A'}</p>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        <hr>
        <p><em>This is an automated alert from CodeQual Monitoring</em></p>
      `
    };

    this.logger.info('Email alert sent', { 
      alertId: alert.id,
      recipients: emailConfig.to.length 
    });
  }

  private async sendPagerDutyAlert(alert: AlertConfig, status: AlertStatus): Promise<void> {
    const integrationKey = process.env.PAGERDUTY_INTEGRATION_KEY;
    if (!integrationKey) {
      this.logger.warn('PagerDuty integration key not configured');
      return;
    }

    const payload = {
      routing_key: integrationKey,
      event_action: 'trigger',
      dedup_key: `${this.config.service}-${alert.id}`,
      payload: {
        summary: `${alert.name}: ${status.message}`,
        severity: alert.severity === 'critical' ? 'critical' : 
                  alert.severity === 'warning' ? 'warning' : 'info',
        source: this.config.service,
        custom_details: {
          environment: this.config.environment,
          value: status.value,
          threshold: status.threshold,
          alert_id: alert.id
        }
      }
    };

    // In production, this would make actual API call to PagerDuty
    this.logger.info('PagerDuty alert sent', { alertId: alert.id });
  }

  private getSeverityEmoji(severity: string): string {
    switch (severity) {
      case 'critical': return '🔴';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📊';
    }
  }

  private parseRefreshInterval(refresh: string): number {
    const match = refresh.match(/^(\d+)([smh])$/);
    if (!match) return 60000; // Default 1 minute
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      default: return 60000;
    }
  }

  private parsePrometheusMetrics(metricsString: string): Record<string, number> {
    // Simple parser for Prometheus format
    const lines = metricsString.split('\n');
    const metrics: Record<string, number> = {};
    
    lines.forEach(line => {
      if (line.startsWith('#') || !line.trim()) return;
      
      const match = line.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*)\s+(.+)$/);
      if (match) {
        metrics[match[1]] = parseFloat(match[2]);
      }
    });
    
    return metrics;
  }

  private calculateSuccessRate(metrics: { totalRequests?: number; successfulRequests?: number }): number {
    const started = (metrics as any).codequal_analysis_started_total || metrics.totalRequests || 0;
    const completed = (metrics as any).codequal_analysis_completed_total || metrics.successfulRequests || 0;
    return started > 0 ? completed / started : 1;
  }

  private calculateAverageTime(metrics: { totalTime?: number; totalRequests?: number }): number {
    const sum = (metrics as any).codequal_analysis_duration_seconds_sum || metrics.totalTime || 0;
    const count = (metrics as any).codequal_analysis_duration_seconds_count || metrics.totalRequests || 0;
    return count > 0 ? sum / count : 0;
  }

  private captureCurrentMetrics(): Record<string, number> {
    // Extract current metric values
    return {
      timestamp: Date.now(),
      // Add current metric values here
    };
  }

  private extractValueFromQueryResult(result: unknown): number | null {
    // Extract numeric value from Prometheus query result
    return null; // Implement based on query result format
  }

  private determineAlertStatus(value: number | null, alert: AlertConfig): 'ok' | 'warning' | 'critical' {
    // Implement alert condition evaluation
    return 'ok';
  }

  private generateAlertMessage(alert: AlertConfig, value: number | null): string {
    return `${alert.name}: ${alert.description} (value: ${value})`;
  }

  private async postToGrafanaAPI(endpoint: string, data: unknown): Promise<unknown> {
    // Implement Grafana API calls
    return { id: '1', url: 'http://grafana.example.com/d/dashboard' };
  }

  private async getOverallHealth(): Promise<string> {
    // Calculate overall system health
    const alerts = Array.from(this.alertStates.values());
    const criticalAlerts = alerts.filter(a => a.status === 'critical');
    const warningAlerts = alerts.filter(a => a.status === 'warning');
    
    if (criticalAlerts.length > 0) return 'critical';
    if (warningAlerts.length > 0) return 'warning';
    return 'healthy';
  }

  // Resolve an alert when conditions return to normal
  async resolveAlert(alertId: string): Promise<void> {
    const status = this.alertStates.get(alertId);
    if (!status || status.status === 'ok') {
      return; // Already resolved or doesn't exist
    }

    // Update local state
    status.status = 'ok';
    status.message = `Alert ${status.name} resolved`;
    this.alertStates.set(alertId, status);

    // Update Supabase if we have a stored alert ID
    if (this.alertStorage && status.storedAlertId) {
      try {
        await this.alertStorage.updateAlertStatus(
          status.storedAlertId,
          'resolved',
          new Date()
        );
      } catch (error) {
        this.logger.error('Failed to update alert resolution in Supabase', {
          alertId,
          storedAlertId: status.storedAlertId,
          error
        });
      }
    }

    // Emit resolution event
    this.emit('alertResolved', { alertId, status });

    // Send resolution notifications
    const alert = this.config.alerts.find(a => a.id === alertId);
    if (alert) {
      const resolutionMessage = `✅ Alert resolved: ${alert.name}`;
      this.logger.info(resolutionMessage, {
        alertId,
        resolvedAt: new Date()
      });

      // Could send resolution notifications to channels here if needed
    }
  }

  // Get Grafana-compatible alert data
  async getGrafanaAlerts(): Promise<Array<{
    id: string;
    dashboardId: string;
    panelId: number;
    name: string;
    state: string;
    newStateDate: string;
    evalDate: string;
    evalData: {
      evalMatches: Array<{
        metric: string;
        tags: Record<string, string>;
        value: number;
      }>;
    };
    executionError: string;
    url: string;
  }>> {
    const alerts = Array.from(this.alertStates.values());
    
    return alerts.map(alert => ({
      id: alert.id,
      dashboardId: 'codequal-monitoring',
      panelId: 1,
      name: alert.name,
      state: alert.status === 'ok' ? 'ok' : 'alerting',
      newStateDate: alert.triggeredAt?.toISOString() || new Date().toISOString(),
      evalDate: new Date().toISOString(),
      evalData: {
        evalMatches: [{
          metric: alert.name,
          tags: {
            service: this.config.service,
            environment: this.config.environment
          },
          value: alert.value || 0
        }]
      },
      executionError: '',
      url: `${this.config.grafana.url}/d/codequal-monitoring`
    }));
  }

  // Cleanup resources
  destroy() {
    this.refreshIntervals.forEach(interval => clearInterval(interval));
    this.refreshIntervals.clear();
    this.removeAllListeners();
  }
}

// ============================================================================
// CONFIGURATION EXAMPLES
// ============================================================================

export const defaultMonitoringConfig: MonitoringConfig = {
  service: 'codequal-api',
  environment: 'production',
  grafana: {
    url: process.env.GRAFANA_URL || 'http://localhost:3000',
    apiKey: process.env.GRAFANA_API_KEY,
    orgId: 1
  },
  dashboards: [
    {
      id: 'codequal-overview',
      title: 'CodeQual Overview',
      description: 'Main dashboard showing system health and performance',
      tags: ['codequal', 'overview'],
      refresh: '30s',
      timeRange: { from: 'now-1h', to: 'now' },
      embeddable: true,
      aiPrompts: [
        'Show me the overall system health',
        'What is the current analysis performance?',
        'Are there any issues with the system?'
      ],
      panels: [
        {
          id: '1',
          title: 'Analysis Success Rate',
          type: 'stat',
          query: 'rate(codequal_analysis_completed_total[5m]) / rate(codequal_analysis_started_total[5m])',
          visualization: { width: 400, height: 200 },
          aiDescription: 'Shows the percentage of analyses that complete successfully'
        },
        {
          id: '2', 
          title: 'Average Analysis Time',
          type: 'graph',
          query: 'rate(codequal_analysis_duration_seconds_sum[5m]) / rate(codequal_analysis_duration_seconds_count[5m])',
          visualization: { width: 800, height: 400 },
          aiDescription: 'Shows how long analyses take on average over time'
        }
      ]
    }
  ],
  widgets: [
    {
      id: 'success-rate-widget',
      name: 'Success Rate',
      type: 'metric',
      dataSource: 'prometheus',
      query: 'rate(codequal_analysis_completed_total[5m]) / rate(codequal_analysis_started_total[5m])',
      refreshInterval: 30000,
      embeddable: true,
      props: {
        format: 'percentage',
        precision: 1,
        thresholds: [
          { value: 0.95, color: 'green' },
          { value: 0.90, color: 'yellow' },
          { value: 0, color: 'red' }
        ]
      }
    }
  ],
  alerts: [
    {
      id: 'high-failure-rate',
      name: 'High Analysis Failure Rate',
      condition: 'rate(codequal_analysis_failed_total[5m]) / rate(codequal_analysis_started_total[5m]) > 0.1',
      severity: 'critical',
      channels: ['slack', 'email'],
      description: 'Analysis failure rate exceeds 10%',
      aiContext: 'Trigger when more than 10% of analyses are failing'
    }
  ]
};