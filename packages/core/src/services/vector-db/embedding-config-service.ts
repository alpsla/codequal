/**
 * Embedding Configuration Service
 * 
 * Manages embedding model configurations stored in the database,
 * allowing dynamic model selection and configuration updates.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../supabase/supabase-client.factory';
import { createLogger } from '../../utils/logger';

export interface EmbeddingConfiguration {
  id: number;
  config_name: string;
  provider: string;
  model_name: string;
  dimensions: number;
  max_tokens: number;
  api_key_env_var?: string;
  base_url?: string;
  description?: string;
  cost_per_1k_tokens?: number;
  last_updated: string;
  avg_latency_ms?: number;
  quality_score?: number;
  is_active: boolean;
  is_default: boolean;
  content_type_preference?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface EmbeddingModelMetrics {
  config_id: number;
  timestamp: string;
  requests_count: number;
  avg_latency_ms?: number;
  p95_latency_ms?: number;
  p99_latency_ms?: number;
  error_count: number;
  user_satisfaction_score?: number;
  relevance_score?: number;
  total_tokens_used: number;
  total_cost_usd: number;
  metric_window: 'hourly' | 'daily' | 'weekly';
  window_start: string;
  window_end: string;
}

export class EmbeddingConfigService {
  private supabase: SupabaseClient;
  private logger = createLogger('EmbeddingConfigService');
  private configCache: Map<string, EmbeddingConfiguration> = new Map();
  private cacheExpiry: number = 5 * 60 * 1000; // 5 minutes
  private lastCacheUpdate = 0;

  constructor() {
    this.supabase = getSupabaseClient();
  }

  /**
   * Get the default embedding configuration
   */
  async getDefaultConfig(): Promise<EmbeddingConfiguration | null> {
    try {
      // First check if table exists in public schema
      const { data: tableCheck, error: tableError } = await this.supabase
        .from('embedding_configurations')
        .select('count')
        .limit(0);

      if (tableError && tableError.code === '42P01') {
        this.logger.warn('Embedding configurations table does not exist');
        return null;
      }

      const { data, error } = await this.supabase
        .from('embedding_configurations')
        .select('*')
        .eq('is_default', true)
        .eq('is_active', true)
        .single();

      if (error) {
        this.logger.error('Failed to fetch default embedding config', { error });
        return null;
      }

      return data;
    } catch (error) {
      this.logger.error('Error getting default config', { error });
      return null;
    }
  }

  /**
   * Get configuration for a specific content type
   */
  async getConfigForContentType(contentType: string): Promise<EmbeddingConfiguration | null> {
    try {
      // Check cache first
      const cacheKey = `content:${contentType}`;
      if (this.isCacheValid()) {
        const cachedConfig = this.configCache.get(cacheKey);
        if (cachedConfig) {
          return cachedConfig;
        }
      }

      // First try to find a config specifically for this content type
      const { data, error } = await this.supabase
        .from('embedding_configurations')
        .select('*')
        .eq('content_type_preference', contentType)
        .eq('is_active', true)
        .order('quality_score', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        // Fall back to default config
        const defaultConfig = await this.getDefaultConfig();
        if (defaultConfig) {
          this.configCache.set(cacheKey, defaultConfig);
        }
        return defaultConfig;
      }

      this.configCache.set(cacheKey, data);
      return data;
    } catch (error) {
      this.logger.error('Error getting config for content type', { error, contentType });
      return null;
    }
  }

  /**
   * Get configuration by name
   */
  async getConfigByName(configName: string): Promise<EmbeddingConfiguration | null> {
    try {
      // Check cache first
      if (this.isCacheValid()) {
        const cachedConfig = this.configCache.get(configName);
        if (cachedConfig) {
          return cachedConfig;
        }
      }

      const { data, error } = await this.supabase
        .from('embedding_configurations')
        .select('*')
        .eq('config_name', configName)
        .eq('is_active', true)
        .single();

      if (error) {
        this.logger.error('Failed to fetch embedding config by name', { error, configName });
        return null;
      }

      if (data) {
        this.configCache.set(configName, data);
      }

      return data;
    } catch (error) {
      this.logger.error('Error getting config by name', { error, configName });
      return null;
    }
  }

  /**
   * Get all active configurations
   */
  async getActiveConfigs(): Promise<EmbeddingConfiguration[]> {
    try {
      const { data, error } = await this.supabase
        .from('embedding_configurations')
        .select('*')
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('quality_score', { ascending: false });

      if (error) {
        this.logger.error('Failed to fetch active embedding configs', { error });
        return [];
      }

      return data || [];
    } catch (error) {
      this.logger.error('Error getting active configs', { error });
      return [];
    }
  }

  /**
   * Update a configuration
   */
  async updateConfig(
    configName: string, 
    updates: Partial<EmbeddingConfiguration>
  ): Promise<EmbeddingConfiguration | null> {
    try {
      const { data, error } = await this.supabase
        .from('embedding_configurations')
        .update(updates)
        .eq('config_name', configName)
        .select()
        .single();

      if (error) {
        this.logger.error('Failed to update embedding config', { error, configName });
        return null;
      }

      // Clear cache on update
      this.clearCache();

      return data;
    } catch (error) {
      this.logger.error('Error updating config', { error, configName });
      return null;
    }
  }

  /**
   * Create a new configuration
   */
  async createConfig(config: Omit<EmbeddingConfiguration, 'id' | 'created_at' | 'updated_at'>): Promise<EmbeddingConfiguration | null> {
    try {
      const { data, error } = await this.supabase
        .from('embedding_configurations')
        .insert(config)
        .select()
        .single();

      if (error) {
        this.logger.error('Failed to create embedding config', { error });
        return null;
      }

      // Clear cache on create
      this.clearCache();

      return data;
    } catch (error) {
      this.logger.error('Error creating config', { error });
      return null;
    }
  }

  /**
   * Record usage metrics for a configuration
   */
  async recordMetrics(
    configId: number,
    metrics: {
      latencyMs: number;
      tokensUsed: number;
      success: boolean;
      errorMessage?: string;
    }
  ): Promise<void> {
    try {
      // Get or create current hourly window
      const now = new Date();
      const windowStart = new Date(now);
      windowStart.setMinutes(0, 0, 0);
      const windowEnd = new Date(windowStart);
      windowEnd.setHours(windowEnd.getHours() + 1);

      // First, try to update existing record
      const { data: existing } = await this.supabase
        .from('embedding_model_metrics')
        .select('*')
        .eq('config_id', configId)
        .eq('metric_window', 'hourly')
        .eq('window_start', windowStart.toISOString())
        .single();

      if (existing) {
        // Update existing metrics
        const updates = {
          requests_count: existing.requests_count + 1,
          error_count: existing.error_count + (metrics.success ? 0 : 1),
          total_tokens_used: existing.total_tokens_used + metrics.tokensUsed,
          avg_latency_ms: Math.round(
            (existing.avg_latency_ms * existing.requests_count + metrics.latencyMs) / 
            (existing.requests_count + 1)
          )
        };

        await this.supabase
          .from('embedding_model_metrics')
          .update(updates)
          .eq('id', existing.id);
      } else {
        // Create new metrics record
        await this.supabase
          .from('embedding_model_metrics')
          .insert({
            config_id: configId,
            requests_count: 1,
            avg_latency_ms: metrics.latencyMs,
            error_count: metrics.success ? 0 : 1,
            total_tokens_used: metrics.tokensUsed,
            metric_window: 'hourly',
            window_start: windowStart.toISOString(),
            window_end: windowEnd.toISOString()
          });
      }
    } catch (error) {
      // Don't fail the main operation if metrics recording fails
      this.logger.warn('Failed to record embedding metrics', { error, configId });
    }
  }

  /**
   * Get performance metrics for a configuration
   */
  async getConfigMetrics(
    configId: number, 
    window: 'last_hour' | 'last_24h' | 'last_7d' = 'last_24h'
  ): Promise<any> {
    try {
      let interval: string;
      switch (window) {
        case 'last_hour':
          interval = '1 hour';
          break;
        case 'last_7d':
          interval = '7 days';
          break;
        default:
          interval = '24 hours';
      }

      const { data, error } = await this.supabase
        .from('embedding_model_metrics')
        .select('*')
        .eq('config_id', configId)
        .gte('timestamp', `now() - interval '${interval}'`)
        .order('timestamp', { ascending: false });

      if (error) {
        this.logger.error('Failed to fetch embedding metrics', { error, configId });
        return null;
      }

      // Aggregate metrics
      if (data && data.length > 0) {
        const totalRequests = data.reduce((sum, m) => sum + m.requests_count, 0);
        const totalErrors = data.reduce((sum, m) => sum + m.error_count, 0);
        const avgLatency = data.reduce((sum, m) => sum + (m.avg_latency_ms || 0) * m.requests_count, 0) / totalRequests;

        return {
          totalRequests,
          totalErrors,
          errorRate: totalRequests > 0 ? totalErrors / totalRequests : 0,
          avgLatencyMs: Math.round(avgLatency),
          totalTokensUsed: data.reduce((sum, m) => sum + m.total_tokens_used, 0),
          totalCostUsd: data.reduce((sum, m) => sum + parseFloat(m.total_cost_usd || '0'), 0)
        };
      }

      return {
        totalRequests: 0,
        totalErrors: 0,
        errorRate: 0,
        avgLatencyMs: 0,
        totalTokensUsed: 0,
        totalCostUsd: 0
      };
    } catch (error) {
      this.logger.error('Error getting config metrics', { error, configId });
      return null;
    }
  }

  /**
   * Check if cache is valid
   */
  private isCacheValid(): boolean {
    return Date.now() - this.lastCacheUpdate < this.cacheExpiry;
  }

  /**
   * Clear the configuration cache
   */
  private clearCache(): void {
    this.configCache.clear();
    this.lastCacheUpdate = 0;
  }

  /**
   * Convert database config to format used by embedding service
   */
  convertToServiceConfig(dbConfig: EmbeddingConfiguration): any {
    return {
      provider: dbConfig.provider,
      model: dbConfig.model_name,
      dimensions: dbConfig.dimensions,
      maxTokens: dbConfig.max_tokens,
      apiKeyEnvVar: dbConfig.api_key_env_var,
      baseUrl: dbConfig.base_url,
      costPer1kTokens: dbConfig.cost_per_1k_tokens
    };
  }
}

// Export singleton instance
export const embeddingConfigService = new EmbeddingConfigService();