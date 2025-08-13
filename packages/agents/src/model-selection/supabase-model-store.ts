/**
 * Supabase Model Store
 * 
 * Stores and retrieves model configurations from Supabase
 * Replaces Vector DB storage for faster and cheaper access
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Logger } from 'winston';
import { ModelVersionInfo } from '@codequal/core';

/**
 * Model configuration stored in Supabase
 */
export interface SupabaseModelConfig {
  id?: string;
  role: string;
  language: string;
  size_category: 'small' | 'medium' | 'large';
  primary_provider: string;
  primary_model: string;
  fallback_provider: string;
  fallback_model: string;
  weights: {
    quality: number;
    speed: number;
    cost: number;
    freshness: number;
    contextWindow: number;
  };
  min_requirements?: {
    minQuality?: number;
    maxCost?: number;
    minSpeed?: number;
    minContextWindow?: number;
  };
  reasoning: string[];
  last_updated?: Date;
  updated_by?: string;
}

export class SupabaseModelStore {
  private supabase: SupabaseClient;
  
  constructor(
    private logger: Logger,
    supabaseUrl?: string,
    supabaseKey?: string
  ) {
    this.supabase = createClient(
      supabaseUrl || process.env.SUPABASE_URL!,
      supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  
  /**
   * Store a model configuration
   */
  async storeConfiguration(config: SupabaseModelConfig): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('model_configurations')
        .upsert({
          ...config,
          last_updated: new Date(),
          updated_by: 'researcher'
        }, {
          onConflict: 'role,language,size_category'
        });
      
      if (error) {
        this.logger.error('Failed to store model configuration', { error, config });
        throw error;
      }
      
      this.logger.info('Stored model configuration', {
        role: config.role,
        language: config.language,
        size: config.size_category,
        primary: `${config.primary_provider}/${config.primary_model}`,
        fallback: `${config.fallback_provider}/${config.fallback_model}`
      });
    } catch (error) {
      this.logger.error('Error storing configuration', { error });
      throw error;
    }
  }
  
  /**
   * Batch store multiple configurations
   */
  async storeConfigurations(configs: SupabaseModelConfig[]): Promise<void> {
    try {
      // Batch insert/update in chunks of 50
      const chunkSize = 50;
      for (let i = 0; i < configs.length; i += chunkSize) {
        const chunk = configs.slice(i, i + chunkSize);
        
        const { error } = await this.supabase
          .from('model_configurations')
          .upsert(
            chunk.map(c => ({
              ...c,
              last_updated: new Date(),
              updated_by: 'researcher'
            })),
            {
              onConflict: 'role,language,size_category'
            }
          );
        
        if (error) {
          this.logger.error(`Failed to store batch ${i / chunkSize + 1}`, { error });
          throw error;
        }
        
        this.logger.info(`Stored batch ${i / chunkSize + 1} (${chunk.length} configs)`);
      }
      
      this.logger.info(`Successfully stored ${configs.length} configurations`);
    } catch (error) {
      this.logger.error('Error in batch store', { error });
      throw error;
    }
  }
  
  /**
   * Get a model configuration
   */
  async getConfiguration(
    role: string,
    language: string,
    size: 'small' | 'medium' | 'large'
  ): Promise<SupabaseModelConfig | null> {
    try {
      // For universal roles, always use 'universal' language and 'medium' size
      const universalRoles = ['orchestrator', 'researcher', 'educator'];
      if (universalRoles.includes(role)) {
        language = 'universal';
        size = 'medium';
      }
      
      const { data, error } = await this.supabase
        .from('model_configurations')
        .select('*')
        .eq('role', role)
        .eq('language', language)
        .eq('size_category', size)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found
          this.logger.warn('No configuration found', { role, language, size });
          return null;
        }
        throw error;
      }
      
      return data as SupabaseModelConfig;
    } catch (error) {
      this.logger.error('Error getting configuration', { error, role, language, size });
      throw error;
    }
  }
  
  /**
   * Get all configurations
   */
  async getAllConfigurations(): Promise<SupabaseModelConfig[]> {
    try {
      const { data, error } = await this.supabase
        .from('model_configurations')
        .select('*')
        .order('role')
        .order('language')
        .order('size_category');
      
      if (error) {
        throw error;
      }
      
      return data as SupabaseModelConfig[];
    } catch (error) {
      this.logger.error('Error getting all configurations', { error });
      throw error;
    }
  }
  
  /**
   * Check if a configuration exists
   */
  async configurationExists(
    role: string,
    language: string,
    size: 'small' | 'medium' | 'large'
  ): Promise<boolean> {
    const config = await this.getConfiguration(role, language, size);
    return config !== null;
  }
  
  /**
   * Get configurations that need updating (older than N days)
   */
  async getOutdatedConfigurations(daysOld = 90): Promise<SupabaseModelConfig[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      const { data, error } = await this.supabase
        .from('model_configurations')
        .select('*')
        .lt('last_updated', cutoffDate.toISOString())
        .order('last_updated');
      
      if (error) {
        throw error;
      }
      
      return data as SupabaseModelConfig[];
    } catch (error) {
      this.logger.error('Error getting outdated configurations', { error });
      throw error;
    }
  }
  
  /**
   * Clear all configurations (for testing/reset)
   */
  async clearAllConfigurations(): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('model_configurations')
        .delete()
        .neq('role', 'system'); // Keep any system configs
      
      if (error) {
        throw error;
      }
      
      this.logger.info('Cleared all model configurations');
    } catch (error) {
      this.logger.error('Error clearing configurations', { error });
      throw error;
    }
  }
  
  /**
   * Get statistics about stored configurations
   */
  async getStatistics(): Promise<{
    total: number;
    byRole: Record<string, number>;
    byLanguage: Record<string, number>;
    bySize: Record<string, number>;
    lastUpdated?: Date;
  }> {
    try {
      const { data, error } = await this.supabase
        .from('model_configurations')
        .select('role, language, size_category, last_updated');
      
      if (error) {
        throw error;
      }
      
      const configs = data as SupabaseModelConfig[];
      
      const stats = {
        total: configs.length,
        byRole: {} as Record<string, number>,
        byLanguage: {} as Record<string, number>,
        bySize: {} as Record<string, number>,
        lastUpdated: undefined as Date | undefined
      };
      
      configs.forEach(config => {
        // Count by role
        stats.byRole[config.role] = (stats.byRole[config.role] || 0) + 1;
        
        // Count by language
        stats.byLanguage[config.language] = (stats.byLanguage[config.language] || 0) + 1;
        
        // Count by size
        stats.bySize[config.size_category] = (stats.bySize[config.size_category] || 0) + 1;
        
        // Track most recent update
        if (config.last_updated) {
          const updated = new Date(config.last_updated);
          if (!stats.lastUpdated || updated > stats.lastUpdated) {
            stats.lastUpdated = updated;
          }
        }
      });
      
      return stats;
    } catch (error) {
      this.logger.error('Error getting statistics', { error });
      throw error;
    }
  }
  
  /**
   * Convert to ModelVersionInfo format for compatibility
   */
  static toModelVersionInfo(
    provider: string,
    model: string
  ): ModelVersionInfo {
    return {
      provider,
      model,
      versionId: 'latest',
      pricing: {
        input: 0, // Would need to be fetched from OpenRouter
        output: 0
      },
      capabilities: {
        contextWindow: 128000,
        codeQuality: 7.5,
        speed: 7.0,
        reasoning: 7.0
      }
    };
  }
}