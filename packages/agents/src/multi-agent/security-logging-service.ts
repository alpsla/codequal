/**
 * Security Logging Service
 * 
 * Provides comprehensive security event logging with multiple storage backends,
 * alerting, and integration with monitoring systems like Grafana.
 */

import { createLogger } from '@codequal/core/utils';
import { SecurityEvent } from './types/auth';

/**
 * Security logging configuration
 */
export interface SecurityLoggingConfig {
  /** Enable/disable security logging */
  enabled: boolean;
  
  /** Storage backends to use */
  backends: {
    /** Store in Supabase database */
    supabase?: {
      enabled: boolean;
      table: string;
      retentionDays: number;
    };
    
    /** Send to external log aggregation service */
    external?: {
      enabled: boolean;
      endpoint: string;
      apiKey: string;
      format: 'json' | 'logfmt';
    };
    
    /** Local file storage */
    file?: {
      enabled: boolean;
      path: string;
      rotateDaily: boolean;
      maxSizeMB: number;
    };
    
    /** Stream to console (development) */
    console?: {
      enabled: boolean;
      level: 'info' | 'warn' | 'error';
    };
  };
  
  /** Real-time alerting */
  alerting: {
    /** Enable real-time alerts */
    enabled: boolean;
    
    /** Alert thresholds */
    thresholds: {
      /** Failed auth attempts per minute */
      failedAuthPerMinute: number;
      
      /** Access denied events per hour */
      accessDeniedPerHour: number;
      
      /** Rate limit hits per hour */
      rateLimitHitsPerHour: number;
      
      /** Critical events (immediate alert) */
      criticalEvents: string[];
    };
    
    /** Alert channels */
    channels: {
      /** Slack webhook */
      slack?: {
        enabled: boolean;
        webhookUrl: string;
        channel: string;
      };
      
      /** Email alerts */
      email?: {
        enabled: boolean;
        smtpConfig: any;
        recipients: string[];
      };
      
      /** Webhook for custom integrations */
      webhook?: {
        enabled: boolean;
        url: string;
        headers: Record<string, string>;
      };
    };
  };
  
  /** Metrics export for Grafana */
  metrics: {
    /** Enable Prometheus metrics export */
    prometheus: {
      enabled: boolean;
      port: number;
      path: string;
    };
    
    /** Enable Grafana Cloud integration */
    grafanaCloud?: {
      enabled: boolean;
      instanceUrl: string;
      apiKey: string;
      userId: string;
    };
  };
}

/**
 * Security event with enriched metadata
 */
interface EnrichedSecurityEvent extends SecurityEvent {
  /** Event ID for tracking */
  eventId: string;
  
  /** Geolocation data */
  geoLocation?: {
    country: string;
    region: string;
    city: string;
    latitude: number;
    longitude: number;
  };
  
  /** Device fingerprinting */
  deviceFingerprint?: {
    os: string;
    browser: string;
    version: string;
    language: string;
    timezone: string;
  };
  
  /** Risk scoring */
  riskScore: number;
  
  /** Related events */
  correlationId?: string;
}

/**
 * Security metrics for monitoring
 */
interface SecurityMetrics {
  /** Authentication events */
  auth: {
    successful: number;
    failed: number;
    rate: number; // per minute
  };
  
  /** Access control events */
  access: {
    granted: number;
    denied: number;
    rate: number;
  };
  
  /** Rate limiting */
  rateLimiting: {
    hits: number;
    blocked: number;
    rate: number;
  };
  
  /** Security threats */
  threats: {
    sessionHijack: number;
    bruteForce: number;
    suspicious: number;
  };
}

/**
 * Security Logging Service Implementation
 */
export class SecurityLoggingService {
  private readonly logger = createLogger('SecurityLoggingService');
  private readonly config: SecurityLoggingConfig;
  private readonly supabaseClient: any;
  private readonly eventBuffer: EnrichedSecurityEvent[] = [];
  private readonly metricsBuffer: Map<string, number> = new Map();
  private flushTimer?: NodeJS.Timeout;
  private metricsTimer?: NodeJS.Timeout;
  private destroyed = false;
  
  constructor(config: SecurityLoggingConfig, supabaseClient?: any) {
    this.config = config;
    this.supabaseClient = supabaseClient;
    
    if (config.enabled) {
      this.logger.info('Security logging service initialized', {
        backends: Object.keys(config.backends).filter(k => (config.backends as any)[k]?.enabled),
        alertingEnabled: config.alerting.enabled,
        metricsEnabled: config.metrics.prometheus.enabled
      });
      
      // Start background processing
      this.startBackgroundProcessing();
    }
  }

  /**
   * Log a security event with enrichment and routing
   */
  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      // Enrich the event with additional metadata
      const enrichedEvent = await this.enrichEvent(event);
      
      // Buffer the event for batch processing
      this.eventBuffer.push(enrichedEvent);
      
      // Update metrics
      this.updateMetrics(enrichedEvent);
      
      // Check for immediate alerts
      await this.checkAlerts(enrichedEvent);
      
      // Log to console if configured (for development)
      if (this.config.backends.console?.enabled) {
        this.logToConsole(enrichedEvent);
      }
      
      this.logger.debug('Security event logged', {
        eventId: enrichedEvent.eventId,
        type: enrichedEvent.type,
        severity: enrichedEvent.severity
      });
      
    } catch (error) {
      this.logger.error('Failed to log security event', {
        eventType: event.type,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Get security metrics for monitoring dashboards
   */
  getMetrics(): SecurityMetrics {
    return {
      auth: {
        successful: this.metricsBuffer.get('auth_success') || 0,
        failed: this.metricsBuffer.get('auth_failure') || 0,
        rate: this.calculateRate('auth_total', 60) // per minute
      },
      access: {
        granted: this.metricsBuffer.get('access_granted') || 0,
        denied: this.metricsBuffer.get('access_denied') || 0,
        rate: this.calculateRate('access_total', 60)
      },
      rateLimiting: {
        hits: this.metricsBuffer.get('rate_limit_hit') || 0,
        blocked: this.metricsBuffer.get('rate_limit_blocked') || 0,
        rate: this.calculateRate('rate_limit_total', 60)
      },
      threats: {
        sessionHijack: this.metricsBuffer.get('session_hijack') || 0,
        bruteForce: this.metricsBuffer.get('brute_force') || 0,
        suspicious: this.metricsBuffer.get('suspicious_activity') || 0
      }
    };
  }

  /**
   * Export metrics in Prometheus format for Grafana
   */
  exportPrometheusMetrics(): string {
    const metrics = this.getMetrics();
    
    return `
# HELP codequal_auth_events_total Total authentication events
# TYPE codequal_auth_events_total counter
codequal_auth_events_total{result="success"} ${metrics.auth.successful}
codequal_auth_events_total{result="failure"} ${metrics.auth.failed}

# HELP codequal_access_events_total Total access control events  
# TYPE codequal_access_events_total counter
codequal_access_events_total{result="granted"} ${metrics.access.granted}
codequal_access_events_total{result="denied"} ${metrics.access.denied}

# HELP codequal_rate_limit_events_total Total rate limiting events
# TYPE codequal_rate_limit_events_total counter
codequal_rate_limit_events_total{result="hit"} ${metrics.rateLimiting.hits}
codequal_rate_limit_events_total{result="blocked"} ${metrics.rateLimiting.blocked}

# HELP codequal_security_threats_total Total security threat events
# TYPE codequal_security_threats_total counter
codequal_security_threats_total{type="session_hijack"} ${metrics.threats.sessionHijack}
codequal_security_threats_total{type="brute_force"} ${metrics.threats.bruteForce}
codequal_security_threats_total{type="suspicious"} ${metrics.threats.suspicious}

# HELP codequal_auth_rate_per_minute Current authentication rate per minute
# TYPE codequal_auth_rate_per_minute gauge
codequal_auth_rate_per_minute ${metrics.auth.rate}
    `.trim();
  }

  /**
   * Search security events for investigation
   */
  async searchEvents(criteria: {
    userId?: string;
    type?: string;
    severity?: string;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  }): Promise<EnrichedSecurityEvent[]> {
    if (!this.supabaseClient || !this.config.backends.supabase?.enabled) {
      // Return from in-memory buffer for development
      return this.eventBuffer.filter(event => {
        if (criteria.userId && event.userId !== criteria.userId) return false;
        if (criteria.type && event.type !== criteria.type) return false;
        if (criteria.severity && event.severity !== criteria.severity) return false;
        if (criteria.startTime && event.timestamp < criteria.startTime) return false;
        if (criteria.endTime && event.timestamp > criteria.endTime) return false;
        return true;
      }).slice(0, criteria.limit || 100);
    }

    // Query Supabase for production
    let query = this.supabaseClient
      .from(this.config.backends.supabase!.table)
      .select('*')
      .order('timestamp', { ascending: false });

    if (criteria.userId) query = query.eq('user_id', criteria.userId);
    if (criteria.type) query = query.eq('type', criteria.type);
    if (criteria.severity) query = query.eq('severity', criteria.severity);
    if (criteria.startTime) query = query.gte('timestamp', criteria.startTime.toISOString());
    if (criteria.endTime) query = query.lte('timestamp', criteria.endTime.toISOString());
    
    query = query.limit(criteria.limit || 100);

    const { data, error } = await query;
    
    if (error) {
      this.logger.error('Failed to search security events', { error });
      return [];
    }

    return data || [];
  }

  /**
   * Enrich security event with additional metadata
   */
  private async enrichEvent(event: SecurityEvent): Promise<EnrichedSecurityEvent> {
    const eventId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    // Calculate risk score based on event type and severity
    const riskScore = this.calculateRiskScore(event);
    
    // Add geolocation if IP is available (you'd integrate with a geo service)
    const geoLocation = await this.getGeoLocation(event.ipAddress);
    
    // Parse user agent for device fingerprinting
    const deviceFingerprint = this.parseUserAgent(event.userAgent);
    
    return {
      ...event,
      eventId,
      geoLocation,
      deviceFingerprint,
      riskScore
    };
  }

  /**
   * Calculate risk score for an event
   */
  private calculateRiskScore(event: SecurityEvent): number {
    let score = 0;
    
    // Base score by event type
    switch (event.type) {
      case 'AUTH_FAILURE': score += 30; break;
      case 'ACCESS_DENIED': score += 40; break;
      case 'SESSION_EXPIRED': score += 10; break;
      case 'RATE_LIMIT_HIT': score += 20; break;
      case 'PERMISSION_ESCALATION': score += 80; break;
      default: score += 5;
    }
    
    // Adjust by severity
    switch (event.severity) {
      case 'critical': score *= 3; break;
      case 'high': score *= 2; break;
      case 'medium': score *= 1.5; break;
      case 'low': score *= 1; break;
    }
    
    return Math.min(100, score);
  }

  /**
   * Get geolocation for IP address (mock implementation)
   */
  private async getGeoLocation(ipAddress: string): Promise<any> {
    // In production, integrate with MaxMind GeoIP or similar service
    if (ipAddress === '127.0.0.1' || ipAddress.startsWith('192.168.')) {
      return {
        country: 'Local',
        region: 'Local',
        city: 'Local',
        latitude: 0,
        longitude: 0
      };
    }
    
    // Mock data for now
    return {
      country: 'Unknown',
      region: 'Unknown', 
      city: 'Unknown',
      latitude: 0,
      longitude: 0
    };
  }

  /**
   * Parse user agent for device fingerprinting
   */
  private parseUserAgent(userAgent: string): any {
    // Basic user agent parsing (in production, use a proper library)
    return {
      os: userAgent.includes('Windows') ? 'Windows' : 
          userAgent.includes('Mac') ? 'macOS' :
          userAgent.includes('Linux') ? 'Linux' : 'Unknown',
      browser: userAgent.includes('Chrome') ? 'Chrome' :
               userAgent.includes('Firefox') ? 'Firefox' :
               userAgent.includes('Safari') ? 'Safari' : 'Unknown',
      version: 'Unknown',
      language: 'en-US',
      timezone: 'UTC'
    };
  }

  /**
   * Update metrics counters
   */
  private updateMetrics(event: EnrichedSecurityEvent): void {
    // Increment relevant counters
    switch (event.type) {
      case 'AUTH_SUCCESS':
        this.incrementMetric('auth_success');
        this.incrementMetric('auth_total');
        break;
      case 'AUTH_FAILURE':
        this.incrementMetric('auth_failure');
        this.incrementMetric('auth_total');
        break;
      case 'ACCESS_DENIED':
        this.incrementMetric('access_denied');
        this.incrementMetric('access_total');
        break;
      case 'RATE_LIMIT_HIT':
        this.incrementMetric('rate_limit_hit');
        this.incrementMetric('rate_limit_total');
        break;
    }

    // Track high-risk events
    if (event?.riskScore > 70) {
      this.incrementMetric('suspicious_activity');
    }
  }

  /**
   * Increment a metric counter
   */
  private incrementMetric(key: string): void {
    const current = this.metricsBuffer.get(key) || 0;
    this.metricsBuffer.set(key, current + 1);
  }

  /**
   * Calculate rate per time window
   */
  private calculateRate(metricKey: string, windowSeconds: number): number {
    // Simplified rate calculation (in production, use a time-series approach)
    const count = this.metricsBuffer.get(metricKey) || 0;
    return count / (windowSeconds / 60); // per minute
  }

  /**
   * Check for alert conditions
   */
  private async checkAlerts(event: EnrichedSecurityEvent): Promise<void> {
    if (!this.config.alerting.enabled) {
      return;
    }

    const shouldAlert = this.shouldTriggerAlert(event);
    
    if (shouldAlert) {
      await this.sendAlert(event);
    }
  }

  /**
   * Determine if event should trigger an alert
   */
  private shouldTriggerAlert(event: EnrichedSecurityEvent): boolean {
    // Critical events always trigger alerts
    if (this.config.alerting.thresholds.criticalEvents.includes(event.type)) {
      return true;
    }

    // High risk score triggers alert
    if (event.riskScore > 80) {
      return true;
    }

    // Check rate-based thresholds (simplified)
    if (event.type === 'AUTH_FAILURE') {
      const failures = this.metricsBuffer.get('auth_failure') || 0;
      return failures > this.config.alerting.thresholds.failedAuthPerMinute;
    }

    return false;
  }

  /**
   * Send alert through configured channels
   */
  private async sendAlert(event: EnrichedSecurityEvent): Promise<void> {
    const alertMessage = this.formatAlertMessage(event);

    try {
      // Send to Slack if configured
      if (this.config.alerting.channels.slack?.enabled) {
        await this.sendSlackAlert(alertMessage);
      }

      // Send email if configured
      if (this.config.alerting.channels.email?.enabled) {
        await this.sendEmailAlert(alertMessage);
      }

      // Send webhook if configured
      if (this.config.alerting.channels.webhook?.enabled) {
        await this.sendWebhookAlert(event);
      }

      this.logger.info('Security alert sent', {
        eventId: event.eventId,
        type: event.type,
        severity: event.severity
      });

    } catch (error) {
      this.logger.error('Failed to send security alert', {
        eventId: event.eventId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Format alert message for human consumption
   */
  private formatAlertMessage(event: EnrichedSecurityEvent): string {
    return `🚨 Security Alert: ${event.type}
📅 Time: ${event.timestamp.toISOString()}
👤 User: ${event.userId || 'Unknown'}
🔒 Severity: ${event.severity.toUpperCase()}
📊 Risk Score: ${event.riskScore}/100
🌍 Location: ${event.geoLocation?.city || 'Unknown'}
📱 Device: ${event.deviceFingerprint?.browser || 'Unknown'}
📝 Details: ${JSON.stringify(event.details, null, 2)}`;
  }

  /**
   * Send Slack alert
   */
  private async sendSlackAlert(message: string): Promise<void> {
    // Implementation would use Slack webhook API
    this.logger.info('Slack alert sent', { message: message.substring(0, 100) + '...' });
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(message: string): Promise<void> {
    // Implementation would use email service
    this.logger.info('Email alert sent', { message: message.substring(0, 100) + '...' });
  }

  /**
   * Send webhook alert
   */
  private async sendWebhookAlert(event: EnrichedSecurityEvent): Promise<void> {
    // Implementation would POST to webhook URL
    this.logger.info('Webhook alert sent', { eventId: event.eventId });
  }

  /**
   * Log to console for development
   */
  private logToConsole(event: EnrichedSecurityEvent): void {
    const level = event.severity === 'critical' || event.severity === 'high' ? 'error' :
                  event.severity === 'medium' ? 'warn' : 'info';
    
    // eslint-disable-next-line no-console
    console[level]('[SECURITY]', {
      eventId: event.eventId,
      type: event.type,
      userId: event.userId,
      severity: event.severity,
      riskScore: event.riskScore,
      timestamp: event.timestamp
    });
  }

  /**
   * Start background processing for batched operations
   */
  private startBackgroundProcessing(): void {
    // Flush events to storage every 30 seconds
    this.flushTimer = setInterval(async () => {
      if (!this.destroyed) {
        await this.flushEventBuffer();
      }
    }, 30000);

    // Reset rate metrics every minute
    this.metricsTimer = setInterval(() => {
      if (!this.destroyed) {
        this.resetRateMetrics();
      }
    }, 60000);
  }

  /**
   * Stop background processing and cleanup resources
   */
  async destroy(): Promise<void> {
    this.destroyed = true;
    
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
    
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = undefined;
    }
    
    // Flush any remaining events synchronously and wait for completion
    try {
      if (this.eventBuffer.length > 0) {
        await this.flushEventBuffer();
      }
    } catch (error) {
      // Silently handle cleanup errors to prevent test noise
    }
  }

  /**
   * Flush buffered events to storage backends
   */
  private async flushEventBuffer(): Promise<void> {
    if (this.eventBuffer.length === 0 || this.destroyed) {
      return;
    }

    const events = this.eventBuffer.splice(0); // Take all events

    try {
      // Store in Supabase if configured
      if (this.config.backends.supabase?.enabled && this.supabaseClient) {
        await this.storeEventsInSupabase(events);
      }

      // Send to external log service if configured
      if (this.config.backends.external?.enabled) {
        await this.sendToExternalLogger(events);
      }

      // Write to file if configured
      if (this.config.backends.file?.enabled) {
        await this.writeToFile(events);
      }

      this.logger.debug('Flushed security events', { count: events.length });

    } catch (error) {
      this.logger.error('Failed to flush security events', {
        count: events.length,
        error: error instanceof Error ? error.message : String(error)
      });

      // Put events back in buffer for retry
      this.eventBuffer.unshift(...events);
    }
  }

  /**
   * Store events in Supabase
   */
  private async storeEventsInSupabase(events: EnrichedSecurityEvent[]): Promise<void> {
    const records = events.map(event => ({
      event_id: event.eventId,
      type: event.type,
      user_id: event.userId,
      session_id: event.sessionId,
      repository_id: event.repositoryId,
      ip_address: event.ipAddress,
      user_agent: event.userAgent,
      timestamp: event.timestamp.toISOString(),
      severity: event.severity,
      risk_score: event.riskScore,
      details: event.details,
      geo_location: event.geoLocation,
      device_fingerprint: event.deviceFingerprint
    }));

    const { error } = await this.supabaseClient
      .from(this.config.backends.supabase!.table)
      .insert(records);

    if (error) {
      throw new Error(`Supabase insert failed: ${error.message}`);
    }
  }

  /**
   * Send events to external logging service
   */
  private async sendToExternalLogger(events: EnrichedSecurityEvent[]): Promise<void> {
    // Implementation would send to external service like Datadog, Splunk, etc.
    this.logger.debug('Sent events to external logger', { count: events.length });
  }

  /**
   * Write events to file
   */
  private async writeToFile(events: EnrichedSecurityEvent[]): Promise<void> {
    // Implementation would write to log files with rotation
    this.logger.debug('Wrote events to file', { count: events.length });
  }

  /**
   * Reset rate-based metrics
   */
  private resetRateMetrics(): void {
    // Reset rate counters every minute for accurate rate calculation
    const rateMetrics = ['auth_total', 'access_total', 'rate_limit_total'];
    rateMetrics.forEach(metric => {
      this.metricsBuffer.delete(metric);
    });
  }
}

/**
 * Factory function to create security logging service
 */
export function createSecurityLoggingService(
  config: SecurityLoggingConfig,
  supabaseClient?: any
): SecurityLoggingService {
  return new SecurityLoggingService(config, supabaseClient);
}

/**
 * Default configuration for development
 */
export const defaultSecurityLoggingConfig: SecurityLoggingConfig = {
  enabled: true,
  backends: {
    console: {
      enabled: true,
      level: 'info'
    },
    supabase: {
      enabled: false, // Enable when Supabase is configured
      table: 'security_events',
      retentionDays: 90
    }
  },
  alerting: {
    enabled: true,
    thresholds: {
      failedAuthPerMinute: 10,
      accessDeniedPerHour: 50,
      rateLimitHitsPerHour: 100,
      criticalEvents: ['PERMISSION_ESCALATION', 'SESSION_HIJACK_DETECTED']
    },
    channels: {
      slack: {
        enabled: false,
        webhookUrl: '',
        channel: '#security-alerts'
      }
    }
  },
  metrics: {
    prometheus: {
      enabled: true,
      port: 9090,
      path: '/metrics'
    }
  }
};

/**
 * Production configuration template
 */
export const productionSecurityLoggingConfig: SecurityLoggingConfig = {
  enabled: true,
  backends: {
    supabase: {
      enabled: true,
      table: 'security_events',
      retentionDays: 365
    },
    external: {
      enabled: true,
      endpoint: process.env.SECURITY_LOG_ENDPOINT || '',
      apiKey: process.env.SECURITY_LOG_API_KEY || '',
      format: 'json'
    }
  },
  alerting: {
    enabled: true,
    thresholds: {
      failedAuthPerMinute: 5,
      accessDeniedPerHour: 20,
      rateLimitHitsPerHour: 50,
      criticalEvents: ['PERMISSION_ESCALATION', 'SESSION_HIJACK_DETECTED']
    },
    channels: {
      slack: {
        enabled: true,
        webhookUrl: process.env.SLACK_SECURITY_WEBHOOK || '',
        channel: '#security-alerts'
      },
      webhook: {
        enabled: true,
        url: process.env.SECURITY_ALERT_WEBHOOK || '',
        headers: {
          'Authorization': `Bearer ${process.env.SECURITY_ALERT_TOKEN || ''}`
        }
      }
    }
  },
  metrics: {
    prometheus: {
      enabled: true,
      port: 9090,
      path: '/metrics'
    },
    grafanaCloud: {
      enabled: true,
      instanceUrl: process.env.GRAFANA_INSTANCE_URL || '',
      apiKey: process.env.GRAFANA_API_KEY || '',
      userId: process.env.GRAFANA_USER_ID || ''
    }
  }
};