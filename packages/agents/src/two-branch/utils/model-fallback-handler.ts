/**
 * Model Fallback Handler
 *
 * Manages primary and fallback model execution with automatic
 * research triggering when models fail or become outdated.
 */

import { ModelConfigResolver, ModelConfiguration } from '../../standard/orchestrator/model-config-resolver';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface ModelExecutionResult {
  success: boolean;
  modelUsed: {
    model: string;
    provider: string;
    isPrimary: boolean;
  };
  result?: any;
  error?: string;
  needsResearch?: boolean;
}

export class ModelFallbackHandler {
  private supabase: SupabaseClient;
  private resolver: ModelConfigResolver;
  private failureTracker: Map<string, number> = new Map();
  private readonly MAX_FAILURES = 3;

  constructor(private logger?: any) {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.resolver = new ModelConfigResolver(logger);
  }

  /**
   * Execute analysis with automatic fallback and research triggering
   */
  async executeWithFallback(
    role: string,
    language: string,
    size: string,
    executeFn: (model: string, provider: string) => Promise<any>
  ): Promise<ModelExecutionResult> {
    // Get model configuration
    const config = await this.resolver.getModelConfiguration(role, language, size);

    // Try primary model
    try {
      this.log('info', `Attempting with primary model: ${config.primary_model}`);
      const result = await executeFn(config.primary_model, config.primary_provider);

      // Reset failure counter on success
      this.resetFailureCount(config.primary_model);

      return {
        success: true,
        modelUsed: {
          model: config.primary_model,
          provider: config.primary_provider,
          isPrimary: true
        },
        result
      };
    } catch (primaryError: any) {
      this.log('warn', `Primary model failed: ${primaryError.message}`);
      this.trackFailure(config.primary_model);

      // Check if model needs replacement
      if (this.shouldTriggerResearch(config.primary_model)) {
        await this.triggerModelResearch(role, language, size, 'primary', primaryError.message);
      }

      // Try fallback model
      try {
        this.log('info', `Attempting with fallback model: ${config.fallback_model}`);
        const result = await executeFn(config.fallback_model, config.fallback_provider);

        // Log that we had to use fallback
        await this.logFallbackUsage(role, language, size, config, primaryError.message);

        return {
          success: true,
          modelUsed: {
            model: config.fallback_model,
            provider: config.fallback_provider,
            isPrimary: false
          },
          result,
          needsResearch: true // Indicate that primary needs replacement
        };
      } catch (fallbackError: any) {
        this.log('error', `Both models failed`, { primaryError, fallbackError });
        this.trackFailure(config.fallback_model);

        // Both models failed - trigger urgent research
        await this.triggerUrgentResearch(role, language, size, primaryError, fallbackError);

        return {
          success: false,
          modelUsed: {
            model: config.fallback_model,
            provider: config.fallback_provider,
            isPrimary: false
          },
          error: `Both primary and fallback models failed: ${fallbackError.message}`,
          needsResearch: true
        };
      }
    }
  }

  /**
   * Track model failures
   */
  private trackFailure(model: string): void {
    const count = (this.failureTracker.get(model) || 0) + 1;
    this.failureTracker.set(model, count);
  }

  /**
   * Reset failure count for a model
   */
  private resetFailureCount(model: string): void {
    this.failureTracker.delete(model);
  }

  /**
   * Check if we should trigger research for a model
   */
  private shouldTriggerResearch(model: string): boolean {
    const failureCount = this.failureTracker.get(model) || 0;
    return failureCount >= this.MAX_FAILURES;
  }

  /**
   * Trigger model research for replacement
   */
  private async triggerModelResearch(
    role: string,
    language: string,
    size: string,
    modelType: 'primary' | 'fallback',
    reason: string
  ): Promise<void> {
    this.log('warn', `Triggering research to replace ${modelType} model`, {
      role, language, size, reason
    });

    try {
      // Create research request in Supabase
      const { error } = await this.supabase
        .from('model_research_requests')
        .insert({
          role,
          language,
          size_category: size,
          model_type: modelType,
          reason,
          priority: 'high',
          status: 'pending',
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      // Notify orchestrator (could be via webhook, queue, etc.)
      // For now, just log
      this.log('info', 'Model research request created');
    } catch (error) {
      this.log('error', 'Failed to create research request', error);
    }
  }

  /**
   * Trigger urgent research when both models fail
   */
  private async triggerUrgentResearch(
    role: string,
    language: string,
    size: string,
    primaryError: any,
    fallbackError: any
  ): Promise<void> {
    this.log('error', 'URGENT: Both models failed, triggering emergency research', {
      role, language, size
    });

    try {
      // Create urgent research request
      const { error } = await this.supabase
        .from('model_research_requests')
        .insert({
          role,
          language,
          size_category: size,
          model_type: 'both',
          reason: `Primary: ${primaryError.message}, Fallback: ${fallbackError.message}`,
          priority: 'urgent',
          status: 'pending',
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      // Also mark current configuration as broken
      await this.markConfigurationAsBroken(role, language, size);
    } catch (error) {
      this.log('error', 'Failed to trigger urgent research', error);
    }
  }

  /**
   * Log fallback usage for monitoring
   */
  private async logFallbackUsage(
    role: string,
    language: string,
    size: string,
    config: ModelConfiguration,
    primaryError: string
  ): Promise<void> {
    try {
      await this.supabase
        .from('model_fallback_logs')
        .insert({
          role,
          language,
          size_category: size,
          primary_model: config.primary_model,
          fallback_model: config.fallback_model,
          primary_error: primaryError,
          timestamp: new Date().toISOString()
        });
    } catch (error) {
      this.log('warn', 'Failed to log fallback usage', error);
    }
  }

  /**
   * Mark a configuration as broken
   */
  private async markConfigurationAsBroken(
    role: string,
    language: string,
    size: string
  ): Promise<void> {
    try {
      await this.supabase
        .from('model_configurations')
        .update({
          status: 'broken',
          last_failure: new Date().toISOString()
        })
        .eq('role', role)
        .eq('language', language)
        .eq('size_category', size);
    } catch (error) {
      this.log('error', 'Failed to mark configuration as broken', error);
    }
  }

  /**
   * Get model configurations with health status
   */
  async getHealthyModels(
    role: string,
    language: string,
    size: string
  ): Promise<{
    primary: { model: string; provider: string; health: string };
    fallback: { model: string; provider: string; health: string };
  }> {
    const config = await this.resolver.getModelConfiguration(role, language, size);

    const primaryFailures = this.failureTracker.get(config.primary_model) || 0;
    const fallbackFailures = this.failureTracker.get(config.fallback_model) || 0;

    return {
      primary: {
        model: config.primary_model,
        provider: config.primary_provider,
        health: primaryFailures === 0 ? 'healthy' : primaryFailures < this.MAX_FAILURES ? 'degraded' : 'unhealthy'
      },
      fallback: {
        model: config.fallback_model,
        provider: config.fallback_provider,
        health: fallbackFailures === 0 ? 'healthy' : fallbackFailures < this.MAX_FAILURES ? 'degraded' : 'unhealthy'
      }
    };
  }

  private log(level: string, message: string, data?: any): void {
    if (this.logger) {
      this.logger[level]?.(message, data);
    } else {
      console[level]?.(message, data);
    }
  }
}

/**
 * Create Supabase tables for model management
 */
export const MODEL_MANAGEMENT_SCHEMA = `
-- Model research requests table
CREATE TABLE IF NOT EXISTS model_research_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role VARCHAR(50) NOT NULL,
  language VARCHAR(50) NOT NULL,
  size_category VARCHAR(20) NOT NULL,
  model_type VARCHAR(20) NOT NULL, -- 'primary', 'fallback', 'both'
  reason TEXT,
  priority VARCHAR(20) DEFAULT 'normal', -- 'urgent', 'high', 'normal'
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'researching', 'completed', 'failed'
  result JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Model fallback usage logs
CREATE TABLE IF NOT EXISTS model_fallback_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role VARCHAR(50) NOT NULL,
  language VARCHAR(50) NOT NULL,
  size_category VARCHAR(20) NOT NULL,
  primary_model VARCHAR(100) NOT NULL,
  fallback_model VARCHAR(100) NOT NULL,
  primary_error TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Add status column to model_configurations
ALTER TABLE model_configurations
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS last_failure TIMESTAMP,
ADD COLUMN IF NOT EXISTS failure_count INTEGER DEFAULT 0;
`;