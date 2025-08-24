/**
 * Supabase Alert Storage Extension
 *
 * Extends the EnhancedMonitoringService to store alerts in Supabase
 * for persistence and Grafana integration
 */
export interface StoredAlert {
    id: string;
    service: string;
    environment: string;
    alertId: string;
    alertName: string;
    severity: 'critical' | 'warning' | 'info';
    status: 'firing' | 'resolved';
    value: number;
    threshold: number;
    message: string;
    metadata?: Record<string, any>;
    triggeredAt: Date;
    resolvedAt?: Date;
    channelsNotified: string[];
}
export declare class SupabaseAlertStorage {
    private supabaseUrl;
    private supabaseKey;
    private logger;
    private supabase;
    constructor(supabaseUrl: string, supabaseKey: string);
    /**
     * Store alert in Supabase
     */
    storeAlert(alert: Omit<StoredAlert, 'id'>): Promise<string>;
    /**
     * Update alert status
     */
    updateAlertStatus(alertId: string, status: 'resolved', resolvedAt: Date): Promise<void>;
    /**
     * Get recent alerts for Grafana
     */
    getRecentAlerts(service?: string, limit?: number): Promise<StoredAlert[]>;
    /**
     * Get alert metrics for Grafana dashboards
     */
    getAlertMetrics(service: string, startTime: Date, endTime: Date): Promise<{
        total: number;
        bySeverity: Record<string, number>;
        byStatus: Record<string, number>;
        mttr: number;
    }>;
    /**
     * Create Supabase table if it doesn't exist
     * Run this migration in your Supabase dashboard
     */
    static getTableSchema(): string;
}
