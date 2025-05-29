/**
 * Dynamic Model Configuration Matrix Service
 * 
 * This service manages the comprehensive matrix of ALL possible model configurations
 * for every combination of analysis parameters. It eliminates manual model selection
 * logic by providing O(1) lookup of optimal configurations.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Logger } from '../../utils/logger';

/**
 * Analysis parameters for model selection
 */
export interface AnalysisParameters {
  speed: 'fast' | 'medium' | 'slow';
  complexity: 'simple' | 'moderate' | 'complex';
  language: string; // 46+ supported languages
  repoSize: 'small' | 'medium' | 'large' | 'enterprise';
  costSensitivity: 'low' | 'medium' | 'high';
  qualityRequirement: 'basic' | 'good' | 'excellent' | 'perfect';
  analysisType: 'pr_review' | 'architecture' | 'security' | 'performance' | 'documentation';
  features?: {
    needsReasoning?: boolean;
    needsCodeExecution?: boolean;
    needsWebSearch?: boolean;
    needsMultiFile?: boolean;
  };
}

/**
 * Model configuration details
 */
export interface ModelConfig {
  provider: string;
  model: string;
  modelPath: string;
  temperature: number;
  topP: number;
  topK?: number;
  maxTokens: number;
  streamResponse: boolean;
  includeThinking: boolean;
  useCache: boolean;
}

/**
 * Generated configuration with metadata
 */
export interface GeneratedConfiguration {
  configId: string;
  parameters: AnalysisParameters;
  modelConfig: ModelConfig;
  expectedMetrics: {
    avgResponseTimeMs: number;
    costPer1kTokens: number;
    qualityScore: number;
    successRate: number;
  };
  fallbackConfigs: string[];
  generatedAt: Date;
  lastValidated: Date;
  usageCount: number;
}

/**
 * Language characteristics for optimization
 */
export interface LanguageCharacteristics {
  language: string;
  groupName: string;
  isWebLanguage: boolean;
  isSystemLanguage: boolean;
  isDataLanguage: boolean;
  isFunctional: boolean;
  isCompiled: boolean;
  typicalUseCases: string[];
  contextWindowPreference: 'small' | 'medium' | 'large' | 'extra_large';
  reasoningBenefit: boolean;
}

/**
 * Configuration matrix database record
 */
interface MatrixRecord {
  id: string;
  config_id: string;
  speed: string;
  complexity: string;
  language: string;
  repo_size: string;
  cost_sensitivity: string;
  quality_requirement: string;
  analysis_type: string;
  features: any;
  provider: string;
  model: string;
  model_path: string;
  temperature: number;
  top_p: number;
  top_k?: number;
  max_tokens: number;
  stream_response: boolean;
  include_thinking: boolean;
  use_cache: boolean;
  expected_response_time_ms: number;
  expected_cost_per_1k: number;
  expected_quality_score: number;
  fallback_models: string[];
  language_specific_hints: Record<string, unknown>;
  generated_at: string;
  last_validated: string;
  usage_count: number;
  actual_avg_response_time_ms?: number;
  actual_success_rate?: number;
}

/**
 * Dynamic Model Configuration Matrix Service
 */
export class ModelConfigurationMatrixService {
  private supabase: SupabaseClient;
  private totalCombinations: number;

  constructor(
    private logger: Logger,
    private supabaseUrl: string,
    private supabaseKey: string
  ) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    
    // Calculate total combinations: 3×3×46×4×3×4×5 = 16,560
    this.totalCombinations = 3 * 3 * 46 * 4 * 3 * 4 * 5;
    
    this.logger.info('ModelConfigurationMatrixService initialized', {
      totalCombinations: this.totalCombinations
    });
  }

  /**
   * Initialize the service
   */
  async init(): Promise<void> {
    try {
      // Verify connection to the model_configuration_matrix table
      const { error } = await this.supabase
        .from('model_configuration_matrix')
        .select('id')
        .limit(1);

      if (error) {
        this.logger.error('Error initializing ModelConfigurationMatrixService', { error });
        throw new Error(`Failed to initialize: ${error.message}`);
      }

      this.logger.info('ModelConfigurationMatrixService initialized successfully');
    } catch (error) {
      this.logger.error('Unexpected error initializing ModelConfigurationMatrixService', { error });
      throw error;
    }
  }

  /**
   * Get optimal configuration for given parameters
   */
  async getConfiguration(params: AnalysisParameters): Promise<GeneratedConfiguration | null> {
    try {
      // Generate config ID from parameters
      const configId = this.generateConfigId(params);

      // Look up in database
      const { data, error } = await this.supabase
        .from('model_configuration_matrix')
        .select('*')
        .eq('config_id', configId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          this.logger.info('Configuration not found, generating on-demand', { configId });
          return this.generateSingleConfiguration(params);
        }
        this.logger.error('Error getting configuration', { configId, error });
        return null;
      }

      return this.formatConfiguration(data as MatrixRecord);
    } catch (error) {
      this.logger.error('Unexpected error getting configuration', { params, error });
      return null;
    }
  }

  /**
   * Update usage statistics for a configuration
   */
  async updateUsageStats(
    configId: string,
    success: boolean,
    responseTimeMs: number
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .rpc('update_config_usage', {
          p_config_id: configId,
          p_success: success,
          p_response_time_ms: responseTimeMs
        });

      if (error) {
        this.logger.error('Error updating usage stats', { configId, error });
      } else {
        this.logger.debug('Updated usage stats', { configId, success, responseTimeMs });
      }
    } catch (error) {
      this.logger.error('Unexpected error updating usage stats', { configId, error });
    }
  }

  /**
   * Get language characteristics
   */
  async getLanguageCharacteristics(language: string): Promise<LanguageCharacteristics | null> {
    try {
      const { data, error } = await this.supabase
        .from('language_groups')
        .select('*')
        .eq('language', language.toLowerCase())
        .single();

      if (error) {
        this.logger.debug('Language characteristics not found', { language });
        return null;
      }

      return {
        language: data.language,
        groupName: data.group_name,
        isWebLanguage: data.is_web_language,
        isSystemLanguage: data.is_system_language,
        isDataLanguage: data.is_data_language,
        isFunctional: data.is_functional,
        isCompiled: data.is_compiled,
        typicalUseCases: data.typical_use_cases,
        contextWindowPreference: data.context_window_preference,
        reasoningBenefit: data.reasoning_benefit
      };
    } catch (error) {
      this.logger.error('Error getting language characteristics', { language, error });
      return null;
    }
  }

  /**
   * Generate configuration ID from parameters
   */
  private generateConfigId(params: AnalysisParameters): string {
    return [
      params.speed,
      params.complexity,
      params.language.toLowerCase(),
      params.repoSize,
      params.costSensitivity,
      params.qualityRequirement,
      params.analysisType
    ].join('-');
  }

  /**
   * Format database record to GeneratedConfiguration
   */
  private formatConfiguration(record: MatrixRecord): GeneratedConfiguration {
    return {
      configId: record.config_id,
      parameters: {
        speed: record.speed as any,
        complexity: record.complexity as any,
        language: record.language,
        repoSize: record.repo_size as any,
        costSensitivity: record.cost_sensitivity as any,
        qualityRequirement: record.quality_requirement as any,
        analysisType: record.analysis_type as any,
        features: record.features
      },
      modelConfig: {
        provider: record.provider,
        model: record.model,
        modelPath: record.model_path,
        temperature: record.temperature,
        topP: record.top_p,
        topK: record.top_k,
        maxTokens: record.max_tokens,
        streamResponse: record.stream_response,
        includeThinking: record.include_thinking,
        useCache: record.use_cache
      },
      expectedMetrics: {
        avgResponseTimeMs: record.expected_response_time_ms,
        costPer1kTokens: record.expected_cost_per_1k,
        qualityScore: record.expected_quality_score,
        successRate: 95.0 // Default until we have actual data
      },
      fallbackConfigs: record.fallback_models,
      generatedAt: new Date(record.generated_at),
      lastValidated: new Date(record.last_validated),
      usageCount: record.usage_count
    };
  }

  /**
   * Generate a single configuration on-demand using Research Agent
   */
  private async generateSingleConfiguration(params: AnalysisParameters): Promise<GeneratedConfiguration | null> {
    try {
      this.logger.info('Configuration not found, generating on-demand', {
        configId: this.generateConfigId(params),
        language: params.language,
        analysisType: params.analysisType
      });

      // IMPORTANT: This is where Research Agent should be injected
      // For now, use updated heuristics with 2025 models
      const langChar = await this.getLanguageCharacteristics(params.language);
      const config = this.generateHeuristicConfiguration(params, langChar);
      
      // Store for future use (cache it)
      await this.storeConfiguration(config);
      
      this.logger.info('On-demand configuration generated and cached', {
        configId: config.configId,
        model: config.modelConfig.model,
        cost: config.expectedMetrics.costPer1kTokens
      });
      
      return config;
    } catch (error) {
      this.logger.error('Error generating single configuration', { params, error });
      return null;
    }
  }

  /**
   * Generate configuration using updated heuristics (temporary until Research Agent is fully integrated)
   * Uses current 2025 models: Gemini 2.5, Claude 3.5, etc.
   */
  private generateHeuristicConfiguration(
    params: AnalysisParameters,
    langChar: LanguageCharacteristics | null
  ): GeneratedConfiguration {
    const configId = this.generateConfigId(params);
    
    // Updated model selection logic with 2025 models
    const provider = 'openrouter';
    let model = 'google/gemini-2.5-flash';
    let modelPath = 'openrouter/google/gemini-2.5-flash';
    
    // Intelligent model selection based on 2025 market reality
    if (params.qualityRequirement === 'perfect') {
      // Premium quality: Claude 3.5 Sonnet or Opus
      model = 'anthropic/claude-3.5-sonnet';
      modelPath = 'openrouter/anthropic/claude-3.5-sonnet';
    } else if (params.speed === 'fast' && params.costSensitivity === 'high') {
      // Fast + cheap: Gemini 2.5 Flash or free variant
      model = params.costSensitivity === 'high' ? 'google/gemini-2.5-flash:free' : 'google/gemini-2.5-flash';
      modelPath = `openrouter/${model}`;
    } else if (params.complexity === 'complex' || langChar?.reasoningBenefit) {
      // Complex analysis: Claude 3.5 Sonnet or Gemini 2.5 Pro
      if (params.costSensitivity === 'low') {
        model = 'anthropic/claude-3.5-sonnet';
        modelPath = 'openrouter/anthropic/claude-3.5-sonnet';
      } else {
        model = 'google/gemini-2.5-pro';
        modelPath = 'openrouter/google/gemini-2.5-pro';
      }
    } else if (params.analysisType === 'security') {
      // Security analysis: Claude 3.5 Sonnet for precision
      model = 'anthropic/claude-3.5-sonnet';
      modelPath = 'openrouter/anthropic/claude-3.5-sonnet';
    } else if (langChar?.isDataLanguage && (params.language === 'python' || params.language === 'r')) {
      // Data science languages: DeepSeek Coder or Gemini 2.5 Pro
      if (params.costSensitivity === 'high') {
        model = 'deepseek/deepseek-coder';
        modelPath = 'openrouter/deepseek/deepseek-coder';
      } else {
        model = 'google/gemini-2.5-pro';
        modelPath = 'openrouter/google/gemini-2.5-pro';
      }
    }

    // Adjust parameters based on requirements
    const temperature = params.analysisType === 'security' ? 0.1 : 
                       params.analysisType === 'architecture' ? 0.2 : 0.3;
    const maxTokens = langChar?.contextWindowPreference === 'large' ? 4000 : 
                     params.repoSize === 'enterprise' ? 6000 : 3000;
    const includeThinking = params.complexity === 'complex' || 
                           langChar?.reasoningBenefit === true ||
                           params.analysisType === 'architecture';

    return {
      configId,
      parameters: params,
      modelConfig: {
        provider,
        model,
        modelPath,
        temperature,
        topP: 0.9,
        maxTokens,
        streamResponse: true,
        includeThinking,
        useCache: true
      },
      expectedMetrics: {
        avgResponseTimeMs: params.speed === 'fast' ? 600 : params.speed === 'medium' ? 1200 : 2500,
        costPer1kTokens: this.estimateModelCost(model),
        qualityScore: this.estimateModelQuality(model, params.qualityRequirement),
        successRate: this.estimateModelSuccessRate(model)
      },
      fallbackConfigs: this.generateFallbackModels(params),
      generatedAt: new Date(),
      lastValidated: new Date(),
      usageCount: 0
    };
  }

  /**
   * Store configuration in database
   */
  private async storeConfiguration(config: GeneratedConfiguration): Promise<void> {
    try {
      const record = {
        config_id: config.configId,
        speed: config.parameters.speed,
        complexity: config.parameters.complexity,
        language: config.parameters.language.toLowerCase(),
        repo_size: config.parameters.repoSize,
        cost_sensitivity: config.parameters.costSensitivity,
        quality_requirement: config.parameters.qualityRequirement,
        analysis_type: config.parameters.analysisType,
        features: config.parameters.features || {},
        provider: config.modelConfig.provider,
        model: config.modelConfig.model,
        model_path: config.modelConfig.modelPath,
        temperature: config.modelConfig.temperature,
        top_p: config.modelConfig.topP,
        top_k: config.modelConfig.topK,
        max_tokens: config.modelConfig.maxTokens,
        stream_response: config.modelConfig.streamResponse,
        include_thinking: config.modelConfig.includeThinking,
        use_cache: config.modelConfig.useCache,
        expected_response_time_ms: config.expectedMetrics.avgResponseTimeMs,
        expected_cost_per_1k: config.expectedMetrics.costPer1kTokens,
        expected_quality_score: config.expectedMetrics.qualityScore,
        fallback_models: config.fallbackConfigs,
        language_specific_hints: {},
        generated_at: config.generatedAt.toISOString(),
        last_validated: config.lastValidated.toISOString(),
        usage_count: config.usageCount
      };

      const { error } = await this.supabase
        .from('model_configuration_matrix')
        .insert(record);

      if (error) {
        this.logger.error('Error storing configuration', { configId: config.configId, error });
      } else {
        this.logger.info('Stored new configuration', { configId: config.configId });
      }
    } catch (error) {
      this.logger.error('Unexpected error storing configuration', { configId: config.configId, error });
    }
  }

  /**
   * Estimate model cost per 1k tokens (2025 pricing)
   */
  private estimateModelCost(model: string): number {
    if (model.includes(':free')) return 0.0;
    
    // 2025 pricing estimates
    if (model.includes('claude-3.5-sonnet')) return 0.003;
    if (model.includes('claude-3.5-haiku')) return 0.0005;
    if (model.includes('claude-3-opus')) return 0.015;
    if (model.includes('gemini-2.5-flash')) return 0.00015;
    if (model.includes('gemini-2.5-pro')) return 0.001;
    if (model.includes('gpt-4o')) return 0.005;
    if (model.includes('gpt-4o-mini')) return 0.0015;
    if (model.includes('deepseek')) return 0.00014;
    
    // Default for unknown models
    return 0.002;
  }

  /**
   * Estimate model quality score
   */
  private estimateModelQuality(model: string, qualityRequirement: string): number {
    let baseScore = 7.0; // Default score
    
    // Model-specific quality scores
    if (model.includes('claude-3.5-sonnet')) baseScore = 9.5;
    else if (model.includes('claude-3-opus')) baseScore = 9.8;
    else if (model.includes('gemini-2.5-pro')) baseScore = 9.0;
    else if (model.includes('gemini-2.5-flash')) baseScore = 8.5;
    else if (model.includes('gpt-4o')) baseScore = 9.2;
    else if (model.includes('deepseek-coder')) baseScore = 8.8;
    else if (model.includes('claude-3.5-haiku')) baseScore = 8.0;
    
    // Adjust based on quality requirement expectations
    const adjustments = {
      'perfect': 0,    // Use full model capability
      'excellent': -0.5,
      'good': -1.0,
      'basic': -1.5
    };
    
    return Math.max(6.0, baseScore + (adjustments[qualityRequirement as keyof typeof adjustments] || 0));
  }

  /**
   * Estimate model success rate
   */
  private estimateModelSuccessRate(model: string): number {
    // Model reliability estimates based on market data
    if (model.includes('claude-3.5-sonnet')) return 97.0;
    if (model.includes('claude-3-opus')) return 98.0;
    if (model.includes('gemini-2.5')) return 95.0;
    if (model.includes('gpt-4o')) return 96.0;
    if (model.includes('deepseek')) return 93.0;
    if (model.includes(':free')) return 90.0; // Free models slightly less reliable
    
    return 94.0; // Default
  }

  /**
   * Generate appropriate fallback models
   */
  private generateFallbackModels(params: AnalysisParameters): string[] {
    const fallbacks: string[] = [];
    
    // Cost-sensitive fallbacks
    if (params.costSensitivity === 'high') {
      fallbacks.push('openrouter/google/gemini-2.5-flash:free');
      fallbacks.push('openrouter/deepseek/deepseek-chat');
    } else {
      // Quality-focused fallbacks
      fallbacks.push('openrouter/anthropic/claude-3.5-haiku');
      fallbacks.push('openrouter/google/gemini-2.5-flash');
    }
    
    // Always include a reliable free option as last resort
    fallbacks.push('openrouter/meta-llama/llama-3.2-3b-instruct:free');
    
    return fallbacks;
  }

  /**
   * Get matrix statistics
   */
  async getMatrixStats(): Promise<{
    totalConfigurations: number;
    configurationsByLanguage: Record<string, number>;
    mostUsedConfigurations: Array<{configId: string; usageCount: number}>;
  }> {
    try {
      // Get total count
      const { count, error: countError } = await this.supabase
        .from('model_configuration_matrix')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        this.logger.error('Error getting total count', { countError });
        throw countError;
      }

      // Get configurations by language
      const { data: langData, error: langError } = await this.supabase
        .from('language_config_stats')
        .select('language, total_configs')
        .order('total_usage', { ascending: false });

      if (langError) {
        this.logger.error('Error getting language stats', { langError });
        throw langError;
      }

      // Get most used configurations
      const { data: usageData, error: usageError } = await this.supabase
        .from('model_configuration_matrix')
        .select('config_id, usage_count')
        .order('usage_count', { ascending: false })
        .limit(10);

      if (usageError) {
        this.logger.error('Error getting usage stats', { usageError });
        throw usageError;
      }

      const configurationsByLanguage: Record<string, number> = {};
      langData?.forEach(row => {
        configurationsByLanguage[row.language] = row.total_configs || 0;
      });

      const mostUsedConfigurations = usageData?.map(row => ({
        configId: row.config_id,
        usageCount: row.usage_count
      })) || [];

      return {
        totalConfigurations: count || 0,
        configurationsByLanguage,
        mostUsedConfigurations
      };
    } catch (error) {
      this.logger.error('Error getting matrix stats', { error });
      throw error;
    }
  }
}