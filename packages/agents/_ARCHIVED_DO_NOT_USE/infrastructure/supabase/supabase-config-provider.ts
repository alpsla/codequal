import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  IConfigProvider, 
  AnalysisConfig, 
  ConfigSearchParams 
} from '../../standard/orchestrator/interfaces/config-provider.interface';

/**
 * Supabase implementation of the configuration provider
 */
export class SupabaseConfigProvider implements IConfigProvider {
  private supabase: SupabaseClient;
  private tableName = 'analysis_configs';

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async getConfig(userId: string, repoType: string): Promise<AnalysisConfig | null> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId)
        .eq('repo_type', repoType)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found is ok
        throw error;
      }

      return data ? this.mapToConfig(data) : null;
    } catch (error) {
      console.error('Error fetching config:', error);
      return null;
    }
  }

  async saveConfig(config: AnalysisConfig): Promise<string> {
    try {
      const data = this.mapFromConfig(config);
      
      const { data: result, error } = await this.supabase
        .from(this.tableName)
        .insert(data)
        .select()
        .single();

      if (error) throw error;

      return result.id;
    } catch (error) {
      console.error('Error saving config:', error);
      throw error;
    }
  }

  async updateConfig(id: string, updates: Partial<AnalysisConfig>): Promise<void> {
    try {
      const data = this.mapFromConfig(updates as AnalysisConfig);
      
      const { error } = await this.supabase
        .from(this.tableName)
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating config:', error);
      throw error;
    }
  }

  async deleteConfig(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from(this.tableName)
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting config:', error);
      throw error;
    }
  }

  async findSimilarConfigs(params: ConfigSearchParams): Promise<AnalysisConfig[]> {
    try {
      let query = this.supabase
        .from(this.tableName)
        .select('*')
        .eq('repo_type', params.repoType)
        .eq('language', params.language);

      if (params.complexity) {
        query = query.eq('complexity', params.complexity);
      }

      if (params.teamSize) {
        query = query.gte('teamSize', params.teamSize - 5)
                     .lte('teamSize', params.teamSize + 5);
      }

      const { data, error } = await query
        .order('updated_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      return (data || []).map(this.mapToConfig);
    } catch (error) {
      console.error('Error finding similar configs:', error);
      return [];
    }
  }

  async getDefaultConfig(repoType: string): Promise<AnalysisConfig> {
    // Return a sensible default configuration
    return {
      userId: '00000000-0000-0000-0000-000000000000',
      teamId: '00000000-0000-0000-0000-000000000000',
      repoType,
      language: 'typescript',
      modelPreferences: {
        primary: {
          provider: 'openai',
          modelId: 'gpt-4-turbo',
          temperature: 0.3,
          maxTokens: 4000
        }
      },
      weights: {
        security: 0.20,
        performance: 0.20,
        codeQuality: 0.25,
        architecture: 0.20,
        dependencies: 0.15
      },
      thresholds: {
        critical: 90,
        high: 70,
        medium: 50,
        low: 30
      },
      features: {
        enableEducation: true,
        enableSkillTracking: true,
        enableDependencyAnalysis: true,
        enableArchitectureReview: true,
        enablePerformanceProfiling: true
      },
      version: '1.0'
    };
  }

  /**
   * Map database record to AnalysisConfig
   */
  private mapToConfig(data: any): AnalysisConfig {
    return {
      id: data.id,
      userId: data.user_id,
      teamId: data.team_id,
      repoType: data.repo_type,
      language: data.language,
      modelPreferences: data.model_preferences,
      weights: data.weights,
      thresholds: data.thresholds,
      features: data.features,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      version: data.version
    };
  }

  /**
   * Map AnalysisConfig to database record
   */
  private mapFromConfig(config: AnalysisConfig): any {
    return {
      user_id: config.userId,
      team_id: config.teamId,
      repo_type: config.repoType,
      language: config.language,
      model_preferences: config.modelPreferences,
      weights: config.weights,
      thresholds: config.thresholds,
      features: config.features,
      version: config.version,
      created_at: config.createdAt?.toISOString() || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }
}