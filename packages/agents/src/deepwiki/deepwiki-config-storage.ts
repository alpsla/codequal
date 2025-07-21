/**
 * DeepWiki Configuration Storage Service
 * 
 * Simple storage service for DeepWiki model configurations
 * using a dedicated table to avoid RLS policy issues
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '@codequal/core/utils';
import { DeepWikiModelConfig } from './deepwiki-model-initializer';
import { UnifiedModelSelection as DeepWikiModelSelection } from '../model-selection/unified-model-selector';

const logger = createLogger('DeepWikiConfigStorage');

export interface StoredConfiguration {
  id: string;
  config_type: 'global' | 'repository';
  repository_url?: string;
  primary_model: string;
  fallback_model: string;
  config_data: any;
  created_at: string;
  updated_at: string;
  expires_at?: string;
}

export class DeepWikiConfigStorage {
  private supabase: SupabaseClient;
  
  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }
  
  /**
   * Store global DeepWiki model configuration
   */
  async storeGlobalConfig(config: DeepWikiModelConfig): Promise<void> {
    try {
      const record: Partial<StoredConfiguration> = {
        id: `global-${Date.now()}`,
        config_type: 'global',
        primary_model: `${config.primary.provider}/${config.primary.model}`,
        fallback_model: `${config.fallback.provider}/${config.fallback.model}`,
        config_data: config,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      };
      
      const { error } = await this.supabase
        .from('deepwiki_configurations')
        .insert(record);
        
      if (error) {
        // Table might not exist, log warning but don't fail
        logger.warn('Failed to store global config (table may not exist):', { error: error instanceof Error ? error.message : String(error) });
      } else {
        logger.info('Stored global DeepWiki configuration');
      }
    } catch (error) {
      logger.error('Failed to store global configuration:', { error: error instanceof Error ? error.message : String(error) });
    }
  }
  
  /**
   * Retrieve global DeepWiki model configuration
   */
  async getGlobalConfig(): Promise<DeepWikiModelConfig | null> {
    try {
      const { data, error } = await this.supabase
        .from('deepwiki_configurations')
        .select('*')
        .eq('config_type', 'global')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (error) {
        logger.warn('Failed to retrieve global config (table may not exist):', { error: error instanceof Error ? error.message : String(error) });
        return null;
      }
      
      if (data && data.length > 0) {
        return data[0].config_data as DeepWikiModelConfig;
      }
      
      return null;
    } catch (error) {
      logger.error('Failed to retrieve global configuration:', { error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }
  
  /**
   * Store repository-specific model selection
   */
  async storeRepositoryConfig(
    repositoryUrl: string, 
    selection: DeepWikiModelSelection
  ): Promise<void> {
    try {
      const record: Partial<StoredConfiguration> = {
        id: `repo-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        config_type: 'repository',
        repository_url: repositoryUrl,
        primary_model: `${selection.primary.provider}/${selection.primary.model}`,
        fallback_model: `${selection.fallback.provider}/${selection.fallback.model}`,
        config_data: {
          context: (selection as any).context || {},
          scores: selection.scores,
          reasoning: selection.reasoning,
          estimatedTokens: selection.estimatedTokens,
          estimatedCost: selection.estimatedCost
        },
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      };
      
      const { error } = await this.supabase
        .from('deepwiki_configurations')
        .insert(record);
        
      if (error) {
        logger.warn('Failed to store repository config (table may not exist):', { error: error instanceof Error ? error.message : String(error) });
      } else {
        logger.info('Stored repository DeepWiki configuration', { repository: repositoryUrl });
      }
    } catch (error) {
      logger.error('Failed to store repository configuration:', { error: error instanceof Error ? error.message : String(error) });
    }
  }
  
  /**
   * Retrieve repository-specific model selection
   */
  async getRepositoryConfig(repositoryUrl: string): Promise<any | null> {
    try {
      const { data, error } = await this.supabase
        .from('deepwiki_configurations')
        .select('*')
        .eq('config_type', 'repository')
        .eq('repository_url', repositoryUrl)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (error) {
        logger.warn('Failed to retrieve repository config (table may not exist):', { error: error instanceof Error ? error.message : String(error) });
        return null;
      }
      
      if (data && data.length > 0) {
        const stored = data[0];
        return {
          primary_model: stored.primary_model,
          fallback_model: stored.fallback_model,
          ...stored.config_data
        };
      }
      
      return null;
    } catch (error) {
      logger.error('Failed to retrieve repository configuration:', { error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }
  
  /**
   * Clean up expired configurations
   */
  async cleanupExpired(): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('deepwiki_configurations')
        .delete()
        .lt('expires_at', new Date().toISOString());
        
      if (!error) {
        logger.info('Cleaned up expired DeepWiki configurations');
      }
    } catch (error) {
      logger.error('Failed to cleanup expired configurations:', { error: error instanceof Error ? error.message : String(error) });
    }
  }
}