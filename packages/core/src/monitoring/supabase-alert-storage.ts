/**
 * Supabase Alert Storage Extension
 * 
 * Extends the EnhancedMonitoringService to store alerts in Supabase
 * for persistence and Grafana integration
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '../utils/logger';

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

export class SupabaseAlertStorage {
  private logger = createLogger('SupabaseAlertStorage');
  private supabase: SupabaseClient;
  
  constructor(
    private supabaseUrl: string,
    private supabaseKey: string
  ) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }
  
  /**
   * Store alert in Supabase
   */
  async storeAlert(alert: Omit<StoredAlert, 'id'>): Promise<string> {
    try {
      const { data, error } = await this.supabase
        .from('monitoring_alerts')
        .insert({
          ...alert,
          triggered_at: alert.triggeredAt.toISOString(),
          resolved_at: alert.resolvedAt?.toISOString(),
          channels_notified: alert.channelsNotified
        })
        .select()
        .single();
        
      if (error) throw error;
      
      this.logger.info('Alert stored in Supabase', {
        alertId: data.id,
        alertName: alert.alertName,
        severity: alert.severity
      });
      
      return data.id;
    } catch (error) {
      this.logger.error('Failed to store alert', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
  
  /**
   * Update alert status
   */
  async updateAlertStatus(
    alertId: string, 
    status: 'resolved', 
    resolvedAt: Date
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('monitoring_alerts')
        .update({
          status,
          resolved_at: resolvedAt.toISOString()
        })
        .eq('id', alertId);
        
      if (error) throw error;
      
      this.logger.info('Alert status updated', { alertId, status });
    } catch (error) {
      this.logger.error('Failed to update alert status', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
  
  /**
   * Get recent alerts for Grafana
   */
  async getRecentAlerts(
    service?: string,
    limit = 100
  ): Promise<StoredAlert[]> {
    try {
      let query = this.supabase
        .from('monitoring_alerts')
        .select('*')
        .order('triggered_at', { ascending: false })
        .limit(limit);
        
      if (service) {
        query = query.eq('service', service);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return data.map(row => ({
        ...row,
        triggeredAt: new Date(row.triggered_at),
        resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined,
        channelsNotified: row.channels_notified
      }));
    } catch (error) {
      this.logger.error('Failed to get recent alerts', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
  
  /**
   * Get alert metrics for Grafana dashboards
   */
  async getAlertMetrics(
    service: string,
    startTime: Date,
    endTime: Date
  ): Promise<{
    total: number;
    bySeverity: Record<string, number>;
    byStatus: Record<string, number>;
    mttr: number; // Mean Time To Resolution in minutes
  }> {
    try {
      const { data, error } = await this.supabase
        .from('monitoring_alerts')
        .select('*')
        .eq('service', service)
        .gte('triggered_at', startTime.toISOString())
        .lte('triggered_at', endTime.toISOString());
        
      if (error) throw error;
      
      const metrics = {
        total: data.length,
        bySeverity: {} as Record<string, number>,
        byStatus: {} as Record<string, number>,
        mttr: 0
      };
      
      let totalResolutionTime = 0;
      let resolvedCount = 0;
      
      data.forEach(alert => {
        // Count by severity
        metrics.bySeverity[alert.severity] = (metrics.bySeverity[alert.severity] || 0) + 1;
        
        // Count by status
        metrics.byStatus[alert.status] = (metrics.byStatus[alert.status] || 0) + 1;
        
        // Calculate resolution time
        if (alert.resolved_at) {
          const resolutionTime = new Date(alert.resolved_at).getTime() - 
                               new Date(alert.triggered_at).getTime();
          totalResolutionTime += resolutionTime;
          resolvedCount++;
        }
      });
      
      // Calculate MTTR in minutes
      if (resolvedCount > 0) {
        metrics.mttr = Math.round(totalResolutionTime / resolvedCount / 60000);
      }
      
      return metrics;
    } catch (error) {
      this.logger.error('Failed to get alert metrics', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
  
  /**
   * Create Supabase table if it doesn't exist
   * Run this migration in your Supabase dashboard
   */
  static getTableSchema(): string {
    return `
      CREATE TABLE IF NOT EXISTS monitoring_alerts (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        service VARCHAR(255) NOT NULL,
        environment VARCHAR(50) NOT NULL,
        alert_id VARCHAR(255) NOT NULL,
        alert_name VARCHAR(255) NOT NULL,
        severity VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,
        value NUMERIC NOT NULL,
        threshold NUMERIC NOT NULL,
        message TEXT,
        metadata JSONB,
        triggered_at TIMESTAMP WITH TIME ZONE NOT NULL,
        resolved_at TIMESTAMP WITH TIME ZONE,
        channels_notified TEXT[],
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        
        INDEX idx_monitoring_alerts_service (service),
        INDEX idx_monitoring_alerts_triggered_at (triggered_at),
        INDEX idx_monitoring_alerts_severity (severity),
        INDEX idx_monitoring_alerts_status (status)
      );
      
      -- Create a view for Grafana to easily query
      CREATE OR REPLACE VIEW monitoring_alerts_metrics AS
      SELECT 
        service,
        environment,
        severity,
        COUNT(*) as alert_count,
        AVG(CASE 
          WHEN resolved_at IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (resolved_at - triggered_at)) / 60 
          ELSE NULL 
        END) as avg_resolution_minutes,
        COUNT(CASE WHEN status = 'firing' THEN 1 END) as active_alerts,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_alerts
      FROM monitoring_alerts
      WHERE triggered_at >= NOW() - INTERVAL '24 hours'
      GROUP BY service, environment, severity;
    `;
  }
}