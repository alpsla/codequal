/**
 * Security Logging Service
 *
 * Provides comprehensive security event logging with multiple storage backends,
 * alerting, and integration with monitoring systems like Grafana.
 */
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
        rate: number;
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
export declare class SecurityLoggingService {
    private readonly logger;
    private readonly config;
    private readonly supabaseClient;
    private readonly eventBuffer;
    private readonly metricsBuffer;
    private flushTimer?;
    private metricsTimer?;
    private destroyed;
    constructor(config: SecurityLoggingConfig, supabaseClient?: any);
    /**
     * Log a security event with enrichment and routing
     */
    logSecurityEvent(event: SecurityEvent): Promise<void>;
    /**
     * Get security metrics for monitoring dashboards
     */
    getMetrics(): SecurityMetrics;
    /**
     * Export metrics in Prometheus format for Grafana
     */
    exportPrometheusMetrics(): string;
    /**
     * Search security events for investigation
     */
    searchEvents(criteria: {
        userId?: string;
        type?: string;
        severity?: string;
        startTime?: Date;
        endTime?: Date;
        limit?: number;
    }): Promise<EnrichedSecurityEvent[]>;
    /**
     * Enrich security event with additional metadata
     */
    private enrichEvent;
    /**
     * Calculate risk score for an event
     */
    private calculateRiskScore;
    /**
     * Get geolocation for IP address (mock implementation)
     */
    private getGeoLocation;
    /**
     * Parse user agent for device fingerprinting
     */
    private parseUserAgent;
    /**
     * Update metrics counters
     */
    private updateMetrics;
    /**
     * Increment a metric counter
     */
    private incrementMetric;
    /**
     * Calculate rate per time window
     */
    private calculateRate;
    /**
     * Check for alert conditions
     */
    private checkAlerts;
    /**
     * Determine if event should trigger an alert
     */
    private shouldTriggerAlert;
    /**
     * Send alert through configured channels
     */
    private sendAlert;
    /**
     * Format alert message for human consumption
     */
    private formatAlertMessage;
    /**
     * Send Slack alert
     */
    private sendSlackAlert;
    /**
     * Send email alert
     */
    private sendEmailAlert;
    /**
     * Send webhook alert
     */
    private sendWebhookAlert;
    /**
     * Log to console for development
     */
    private logToConsole;
    /**
     * Start background processing for batched operations
     */
    private startBackgroundProcessing;
    /**
     * Stop background processing and cleanup resources
     */
    destroy(): Promise<void>;
    /**
     * Flush buffered events to storage backends
     */
    private flushEventBuffer;
    /**
     * Store events in Supabase
     */
    private storeEventsInSupabase;
    /**
     * Send events to external logging service
     */
    private sendToExternalLogger;
    /**
     * Write events to file
     */
    private writeToFile;
    /**
     * Reset rate-based metrics
     */
    private resetRateMetrics;
}
/**
 * Factory function to create security logging service
 */
export declare function createSecurityLoggingService(config: SecurityLoggingConfig, supabaseClient?: any): SecurityLoggingService;
/**
 * Default configuration for development
 */
export declare const defaultSecurityLoggingConfig: SecurityLoggingConfig;
/**
 * Production configuration template
 */
export declare const productionSecurityLoggingConfig: SecurityLoggingConfig;
export {};
