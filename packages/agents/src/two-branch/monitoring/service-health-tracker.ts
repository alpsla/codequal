/**
 * Service Health Tracker
 * 
 * Tracks service health metrics including:
 * - 404 errors when validating URLs (LSP/SARIF/GitLab)
 * - Upload failures to Supabase Storage
 * - Other service failures
 * 
 * Data stored in Supabase for Grafana dashboards and alerts
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface ServiceHealthEvent {
  event_type: 'url_validation_failure' | 'upload_failure' | 'service_error' | 'url_validation_success' | 'upload_success';
  service_name: 'lsp' | 'sarif' | 'gitlab' | 'manifest' | 'general';
  status_code?: number;
  url?: string;
  error_message?: string;
  error_details?: Record<string, any>;
  repository_url?: string;
  pr_number?: number;
  analysis_id?: string;
  metadata?: Record<string, any>;
}

export class ServiceHealthTracker {
  private supabase: SupabaseClient | null = null;
  private enabled: boolean = true;

  constructor(supabase: SupabaseClient | null) {
    this.supabase = supabase;
    this.enabled = !!supabase;
    
    if (!this.enabled) {
      console.warn('[ServiceHealthTracker] ⚠️  Disabled - no Supabase connection');
    }
  }

  /**
   * Track URL validation failure (404, timeout, etc.)
   */
  async trackUrlValidationFailure(params: {
    service: 'lsp' | 'sarif' | 'gitlab' | 'manifest';
    url: string;
    statusCode?: number;
    errorMessage?: string;
    repositoryUrl?: string;
    prNumber?: number;
    analysisId?: string;
  }): Promise<void> {
    await this.trackEvent({
      event_type: 'url_validation_failure',
      service_name: params.service,
      status_code: params.statusCode,
      url: params.url,
      error_message: params.errorMessage,
      repository_url: params.repositoryUrl,
      pr_number: params.prNumber,
      analysis_id: params.analysisId,
      metadata: {
        timestamp: new Date().toISOString(),
        service: params.service
      }
    });
  }

  /**
   * Track URL validation success
   */
  async trackUrlValidationSuccess(params: {
    service: 'lsp' | 'sarif' | 'gitlab' | 'manifest';
    url: string;
    statusCode: number;
    repositoryUrl?: string;
    prNumber?: number;
    analysisId?: string;
  }): Promise<void> {
    await this.trackEvent({
      event_type: 'url_validation_success',
      service_name: params.service,
      status_code: params.statusCode,
      url: params.url,
      repository_url: params.repositoryUrl,
      pr_number: params.prNumber,
      analysis_id: params.analysisId,
      metadata: {
        timestamp: new Date().toISOString(),
        service: params.service
      }
    });
  }

  /**
   * Track upload failure to Supabase Storage
   */
  async trackUploadFailure(params: {
    service: 'lsp' | 'sarif' | 'gitlab' | 'manifest';
    filename: string;
    error: Error | string;
    repositoryUrl?: string;
    prNumber?: number;
    analysisId?: string;
    errorDetails?: Record<string, any>;
  }): Promise<void> {
    const errorMessage = typeof params.error === 'string' 
      ? params.error 
      : params.error.message;
    
    const errorDetails = typeof params.error === 'string'
      ? { message: params.error }
      : { 
          message: params.error.message,
          stack: params.error.stack,
          ...params.errorDetails
        };

    await this.trackEvent({
      event_type: 'upload_failure',
      service_name: params.service,
      error_message: errorMessage,
      error_details: errorDetails,
      url: params.filename,
      repository_url: params.repositoryUrl,
      pr_number: params.prNumber,
      analysis_id: params.analysisId,
      metadata: {
        timestamp: new Date().toISOString(),
        service: params.service,
        filename: params.filename
      }
    });
  }

  /**
   * Track successful upload
   */
  async trackUploadSuccess(params: {
    service: 'lsp' | 'sarif' | 'gitlab' | 'manifest';
    filename: string;
    url?: string;
    fileSize?: number;
    repositoryUrl?: string;
    prNumber?: number;
    analysisId?: string;
  }): Promise<void> {
    await this.trackEvent({
      event_type: 'upload_success',
      service_name: params.service,
      url: params.url || params.filename,
      repository_url: params.repositoryUrl,
      pr_number: params.prNumber,
      analysis_id: params.analysisId,
      metadata: {
        timestamp: new Date().toISOString(),
        service: params.service,
        filename: params.filename,
        file_size: params.fileSize
      }
    });
  }

  /**
   * Track general service error
   */
  async trackServiceError(params: {
    service: 'lsp' | 'sarif' | 'gitlab' | 'manifest' | 'general';
    error: Error | string;
    repositoryUrl?: string;
    prNumber?: number;
    analysisId?: string;
    errorDetails?: Record<string, any>;
  }): Promise<void> {
    const errorMessage = typeof params.error === 'string' 
      ? params.error 
      : params.error.message;
    
    const errorDetails = typeof params.error === 'string'
      ? { message: params.error }
      : { 
          message: params.error.message,
          stack: params.error.stack,
          ...params.errorDetails
        };

    await this.trackEvent({
      event_type: 'service_error',
      service_name: params.service,
      error_message: errorMessage,
      error_details: errorDetails,
      repository_url: params.repositoryUrl,
      pr_number: params.prNumber,
      analysis_id: params.analysisId,
      metadata: {
        timestamp: new Date().toISOString(),
        service: params.service
      }
    });
  }

  /**
   * Core method to track events in Supabase
   */
  private async trackEvent(event: ServiceHealthEvent): Promise<void> {
    if (!this.enabled || !this.supabase) {
      // Log to console if Supabase not available
      console.warn(`[ServiceHealthTracker] ${event.event_type}:`, {
        service: event.service_name,
        status_code: event.status_code,
        error: event.error_message,
        url: event.url
      });
      return;
    }

    try {
      const { error } = await this.supabase
        .from('service_health_events')
        .insert({
          event_type: event.event_type,
          service_name: event.service_name,
          status_code: event.status_code,
          url: event.url,
          error_message: event.error_message,
          error_details: event.error_details || {},
          repository_url: event.repository_url,
          pr_number: event.pr_number,
          analysis_id: event.analysis_id,
          metadata: event.metadata || {},
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('[ServiceHealthTracker] ❌ Failed to track event:', error);
        // Fallback to error_logs table if service_health_events doesn't exist
        await this.fallbackToErrorLogs(event, error);
      } else {
        // Only log success for failures (to reduce noise)
        if (event.event_type.includes('failure') || event.event_type.includes('error')) {
          console.log(`[ServiceHealthTracker] ✅ Tracked ${event.event_type} for ${event.service_name}`);
        }
      }
    } catch (error) {
      console.error('[ServiceHealthTracker] ❌ Exception tracking event:', error);
      // Fallback to error_logs
      await this.fallbackToErrorLogs(event, error as Error);
    }
  }

  /**
   * Fallback to error_logs table if service_health_events doesn't exist
   */
  private async fallbackToErrorLogs(event: ServiceHealthEvent, originalError?: any): Promise<void> {
    if (!this.supabase) return;

    try {
      const errorCode = `SVC-${event.service_name.toUpperCase()}-${Date.now()}`;
      const message = `${event.event_type}: ${event.service_name}${event.error_message ? ` - ${event.error_message}` : ''}`;
      
      await this.supabase
        .from('error_logs')
        .insert({
          error_code: errorCode,
          message,
          details: {
            event_type: event.event_type,
            service_name: event.service_name,
            status_code: event.status_code,
            url: event.url,
            error_message: event.error_message,
            error_details: event.error_details,
            repository_url: event.repository_url,
            pr_number: event.pr_number,
            analysis_id: event.analysis_id,
            metadata: event.metadata,
            original_error: originalError?.message
          },
          status_code: event.status_code,
          created_at: new Date().toISOString()
        });
    } catch (fallbackError) {
      console.error('[ServiceHealthTracker] ❌ Fallback to error_logs also failed:', fallbackError);
    }
  }

  /**
   * Get health metrics for a service (for dashboards)
   */
  async getHealthMetrics(params: {
    service?: 'lsp' | 'sarif' | 'gitlab' | 'manifest' | 'general';
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    totalEvents: number;
    failures: number;
    successes: number;
    failureRate: number;
    byEventType: Record<string, number>;
    byStatusCode: Record<number, number>;
  }> {
    if (!this.enabled || !this.supabase) {
      return {
        totalEvents: 0,
        failures: 0,
        successes: 0,
        failureRate: 0,
        byEventType: {},
        byStatusCode: {}
      };
    }

    try {
      let query = this.supabase
        .from('service_health_events')
        .select('*');

      if (params.service) {
        query = query.eq('service_name', params.service);
      }

      if (params.startDate) {
        query = query.gte('created_at', params.startDate.toISOString());
      }

      if (params.endDate) {
        query = query.lte('created_at', params.endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error('[ServiceHealthTracker] ❌ Failed to get metrics:', error);
        return {
          totalEvents: 0,
          failures: 0,
          successes: 0,
          failureRate: 0,
          byEventType: {},
          byStatusCode: {}
        };
      }

      const events = data || [];
      const failures = events.filter(e => 
        e.event_type.includes('failure') || e.event_type.includes('error')
      ).length;
      const successes = events.filter(e => 
        e.event_type.includes('success')
      ).length;

      const byEventType: Record<string, number> = {};
      const byStatusCode: Record<number, number> = {};

      events.forEach((event: any) => {
        byEventType[event.event_type] = (byEventType[event.event_type] || 0) + 1;
        if (event.status_code) {
          byStatusCode[event.status_code] = (byStatusCode[event.status_code] || 0) + 1;
        }
      });

      return {
        totalEvents: events.length,
        failures,
        successes,
        failureRate: events.length > 0 ? (failures / events.length) * 100 : 0,
        byEventType,
        byStatusCode
      };
    } catch (error) {
      console.error('[ServiceHealthTracker] ❌ Exception getting metrics:', error);
      return {
        totalEvents: 0,
        failures: 0,
        successes: 0,
        failureRate: 0,
        byEventType: {},
        byStatusCode: {}
      };
    }
  }
}


