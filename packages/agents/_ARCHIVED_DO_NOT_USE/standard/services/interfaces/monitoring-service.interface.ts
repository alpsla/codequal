export interface AlertData {
  severity: 'critical' | 'high' | 'medium' | 'low';
  component: string;
  message: string;
  metadata?: Record<string, any>;
  timestamp?: Date;
}

export interface MetricData {
  name: string;
  value: number;
  unit?: string;
  tags?: Record<string, string>;
  timestamp?: Date;
}

export interface IMonitoringService {
  /**
   * Send an alert to monitoring system
   */
  alert(data: AlertData): Promise<void>;
  
  /**
   * Record a metric
   */
  metric(data: MetricData): Promise<void>;
  
  /**
   * Log an event
   */
  log(level: 'info' | 'warn' | 'error', message: string, metadata?: any): Promise<void>;
  
  /**
   * Check service health
   */
  healthCheck(): Promise<boolean>;
}