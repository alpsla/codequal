/**
 * Enhanced Monitoring Service
 * Integrates with Grafana, supports Loavable embedding, and AI-tool integration
 */
import { EventEmitter } from 'events';
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
    refresh: string;
    timeRange: {
        from: string;
        to: string;
    };
    embeddable: boolean;
    aiPrompts?: string[];
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
    aiDescription?: string;
}
export interface WidgetConfig {
    id: string;
    name: string;
    type: 'metric' | 'chart' | 'status' | 'alert';
    dataSource: string;
    query: string;
    refreshInterval: number;
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
    aiContext?: string;
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
        dataQuality: number;
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
export declare class EnhancedMonitoringService extends EventEmitter {
    private logger;
    private metrics;
    private config;
    private dashboardData;
    private alertStates;
    private metricHistory;
    private refreshIntervals;
    private alertStorage?;
    private coreMetrics;
    constructor(config: MonitoringConfig);
    private initializeMetrics;
    createGrafanaDashboard(dashboardConfig: DashboardConfig): Promise<string>;
    private convertPanelToGrafana;
    private generateTemplateVariables;
    getEmbeddableWidgets(): WidgetConfig[];
    getWidgetData(widgetId: string): Promise<unknown>;
    generateLoavableComponent(widgetId: string): string;
    private getComponentImport;
    getMonitoringSchema(): object;
    getMetricsForAI(timeRange?: string): Promise<Record<string, unknown>>;
    private generateAIRecommendations;
    private startDashboardRefresh;
    private startAlertMonitoring;
    private startMetricHistoryCapture;
    recordAnalysisStarted(labels: {
        mode: string;
        repository_size: string;
        user_tier: string;
    }): void;
    recordAnalysisCompleted(labels: {
        mode: string;
        repository_size: string;
        user_tier: string;
        duration_bucket: string;
    }, duration: number): void;
    recordAnalysisFailed(labels: {
        mode: string;
        error_type: string;
        component: string;
    }): void;
    recordComponentLatency(component: string, operation: string, duration: number): void;
    recordError(error_type: string, component: string, severity: string): void;
    recordBusinessEvent(event_type: string, user_tier: string, repository_language: string): void;
    recordCost(operation: string, provider: string, cost: number): void;
    getPrometheusMetrics(): Promise<string>;
    getDashboardData(dashboardId: string): Promise<DashboardData | null>;
    getAlertStatus(alertId?: string): AlertStatus[];
    private executeQuery;
    private refreshDashboardData;
    private evaluateAlert;
    private triggerAlert;
    private sendAlertToChannel;
    private sendSlackAlert;
    private sendEmailAlert;
    private sendPagerDutyAlert;
    private getSeverityEmoji;
    private parseRefreshInterval;
    private parsePrometheusMetrics;
    private calculateSuccessRate;
    private calculateAverageTime;
    private captureCurrentMetrics;
    private extractValueFromQueryResult;
    private determineAlertStatus;
    private generateAlertMessage;
    private postToGrafanaAPI;
    private getOverallHealth;
    resolveAlert(alertId: string): Promise<void>;
    getGrafanaAlerts(): Promise<Array<{
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
    }>>;
    destroy(): void;
}
export declare const defaultMonitoringConfig: MonitoringConfig;
