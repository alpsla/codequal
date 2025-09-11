import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { IConfigProvider, AnalysisConfig } from '../../orchestrator/interfaces/config-provider.interface';

/**
 * Supabase-based configuration provider for production use
 */
export class SupabaseConfigProvider implements IConfigProvider {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async getConfig(userId: string, repoType: string): Promise<AnalysisConfig | null> {
    try {
      // First try to get user-specific config
      const { data: userConfig, error: userError } = await this.supabase
        .from('analysis_configs')
        .select('*')
        .eq('user_id', userId)
        .eq('repo_type', repoType)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (userConfig && !userError) {
        return this.transformConfig(userConfig);
      }

      // Fall back to team config if no user config
      const { data: teamConfig, error: teamError } = await this.supabase
        .from('analysis_configs')
        .select('*')
        .eq('repo_type', repoType)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (teamConfig && !teamError) {
        return this.transformConfig(teamConfig);
      }

      // Fall back to any config for this language
      const { data: defaultConfig, error: defaultError } = await this.supabase
        .from('analysis_configs')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (defaultConfig && !defaultError) {
        return this.transformConfig(defaultConfig);
      }

      console.log('No configuration found in Supabase, will use defaults');
      return null;
    } catch (error) {
      console.error('Error fetching config from Supabase:', error);
      return null;
    }
  }

  async findSimilarConfigs(params: { 
    repoType: string; 
    language: string; 
    complexity?: string 
  }): Promise<AnalysisConfig[]> {
    try {
      const query = this.supabase
        .from('analysis_configs')
        .select('*')
        .eq('language', params.language)
        .order('updated_at', { ascending: false })
        .limit(5);

      // Add optional filters
      if (params.complexity) {
        query.eq('complexity', params.complexity);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error finding similar configs:', error);
        return [];
      }

      return (data || []).map(this.transformConfig);
    } catch (error) {
      console.error('Error in findSimilarConfigs:', error);
      return [];
    }
  }

  async saveConfig(config: AnalysisConfig): Promise<string> {
    try {
      const dbConfig = this.transformToDb(config);
      
      const { data, error } = await this.supabase
        .from('analysis_configs')
        .upsert(dbConfig)
        .select('id')
        .single();

      if (error) {
        throw error;
      }

      return data.id;
    } catch (error) {
      console.error('Error saving config:', error);
      throw error;
    }
  }

  async updateConfig(configId: string, updates: Partial<AnalysisConfig>): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('analysis_configs')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', configId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error updating config:', error);
      throw error;
    }
  }

  async deleteConfig(configId: string): Promise<void> {
    try {
      // Hard delete since there's no is_active column
      const { error } = await this.supabase
        .from('analysis_configs')
        .delete()
        .eq('id', configId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error deleting config:', error);
      throw error;
    }
  }

  async getDefaultConfig(): Promise<AnalysisConfig> {
    // Return a sensible default configuration
    return {
      id: 'default-config',
      userId: 'default',
      teamId: 'default',
      repoType: 'general',
      language: 'typescript',
      version: '1.0',
      modelPreferences: {
        primary: {
          modelId: 'openai/gpt-4o',
          provider: 'openai',
          temperature: 0.3,
          maxTokens: 4000
        },
        fallback: {
          modelId: 'openai/gpt-4o-mini',
          provider: 'openai',
          temperature: 0.3,
          maxTokens: 4000
        }
      },
      weights: {
        security: 0.25,
        performance: 0.25,
        codeQuality: 0.25,
        architecture: 0.15,
        dependencies: 0.10
      },
      thresholds: {
        critical: 0.9,
        high: 0.75,
        medium: 0.5,
        low: 0.25
      },
      features: {
        enableEducation: true,
        enableSkillTracking: true,
        enableDependencyAnalysis: true,
        enableArchitectureReview: true,
        enablePerformanceProfiling: true
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Transform database config to application format
   */
  private transformConfig(dbConfig: any): AnalysisConfig {
    // model_preferences is stored as JSON in the database
    const modelPrefs = dbConfig.model_preferences || {};
    
    return {
      id: dbConfig.id,
      userId: dbConfig.user_id,
      teamId: dbConfig.team_id,
      repoType: dbConfig.repo_type,
      language: dbConfig.language,
      version: dbConfig.version || '1.0',
      modelPreferences: {
        primary: {
          modelId: modelPrefs.primary?.modelId || 'openai/gpt-4o',
          provider: modelPrefs.primary?.provider || 'openai',
          temperature: modelPrefs.primary?.temperature || 0.3,
          maxTokens: modelPrefs.primary?.maxTokens || 4000
        },
        fallback: modelPrefs.fallback ? {
          modelId: modelPrefs.fallback.modelId,
          provider: modelPrefs.fallback.provider || 'openai',
          temperature: modelPrefs.fallback.temperature || 0.3,
          maxTokens: modelPrefs.fallback.maxTokens || 4000
        } : undefined
      },
      weights: dbConfig.weights || {
        security: 0.25,
        performance: 0.25,
        codeQuality: 0.25,
        architecture: 0.15,
        dependencies: 0.10
      },
      thresholds: dbConfig.thresholds || {
        critical: 0.9,
        high: 0.75,
        medium: 0.5,
        low: 0.25
      },
      features: dbConfig.features || {
        enableEducation: true,
        enableSkillTracking: true,
        enableDependencyAnalysis: true,
        enableArchitectureReview: true,
        enablePerformanceProfiling: true
      },
      createdAt: new Date(dbConfig.created_at),
      updatedAt: new Date(dbConfig.updated_at)
    };
  }

  /**
   * Transform application config to database format
   */
  private transformToDb(config: AnalysisConfig): any {
    return {
      id: config.id,
      user_id: config.userId,
      team_id: config.teamId,
      repo_type: config.repoType,
      language: config.language,
      version: config.version,
      model_preferences: {
        primary: {
          modelId: config.modelPreferences.primary.modelId,
          provider: config.modelPreferences.primary.provider,
          temperature: config.modelPreferences.primary.temperature,
          maxTokens: config.modelPreferences.primary.maxTokens
        },
        fallback: config.modelPreferences.fallback ? {
          modelId: config.modelPreferences.fallback.modelId,
          provider: config.modelPreferences.fallback.provider,
          temperature: config.modelPreferences.fallback.temperature,
          maxTokens: config.modelPreferences.fallback.maxTokens
        } : undefined
      },
      weights: config.weights,
      thresholds: config.thresholds,
      features: config.features,
      created_at: config.createdAt,
      updated_at: config.updatedAt || new Date()
    };
  }
}