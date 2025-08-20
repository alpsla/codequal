/**
 * Model Configuration Resolver
 * 
 * Handles model configuration retrieval with automatic fallback to research
 * when configurations are missing from Supabase.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ModelResearcherService } from '../services/model-researcher-service';

export interface ModelConfiguration {
  role: string;
  language: string;
  size_category: string;
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
  min_requirements?: any;
  reasoning: string[];
}

export class ModelConfigResolver {
  private supabase: SupabaseClient;
  private researcher: ModelResearcherService;
  private cache: Map<string, ModelConfiguration> = new Map();
  
  constructor(
    private logger?: any
  ) {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.researcher = new ModelResearcherService();
  }
  
  /**
   * Get model configuration for a specific context
   * Automatically researches and creates missing configurations
   */
  async getModelConfiguration(
    role: string,
    language: string,
    size: string
  ): Promise<ModelConfiguration> {
    // Check cache first
    const cacheKey = `${role}/${language}/${size}`;
    if (this.cache.has(cacheKey)) {
      this.log('debug', `Using cached configuration for ${cacheKey}`);
      return this.cache.get(cacheKey)!;
    }
    
    this.log('info', `Retrieving model configuration for ${cacheKey}`);
    
    // Try to get from Supabase
    const { data, error } = await this.supabase
      .from('model_configurations')
      .select('*')
      .eq('role', role)
      .eq('language', language)
      .eq('size_category', size)
      .single();
    
    if (data && !error) {
      this.log('info', `Found existing configuration for ${cacheKey}`);
      const config = this.transformConfig(data);
      this.cache.set(cacheKey, config);
      return config;
    }
    
    // Handle context-independent roles
    if (['orchestrator', 'researcher', 'educator'].includes(role)) {
      // Try universal configuration
      const { data: universalData, error: universalError } = await this.supabase
        .from('model_configurations')
        .select('*')
        .eq('role', role)
        .eq('language', 'universal')
        .eq('size_category', 'medium')
        .single();
      
      if (universalData && !universalError) {
        this.log('info', `Using universal configuration for ${role}`);
        const config = this.transformConfig(universalData);
        this.cache.set(cacheKey, config);
        return config;
      }
    }
    
    // Configuration not found - research and create
    this.log('warn', `No configuration found for ${cacheKey}, initiating research`);
    
    try {
      // Use researcher to find optimal models
      const research = await this.researchModelForContext(role, language, size);
      
      // Create new configuration
      const newConfig: ModelConfiguration = {
        role,
        language,
        size_category: size,
        primary_provider: research.primary.provider,
        primary_model: research.primary.model,
        fallback_provider: research.fallback.provider,
        fallback_model: research.fallback.model,
        weights: research.weights,
        min_requirements: research.min_requirements || {},
        reasoning: research.reasoning
      };
      
      // Store in Supabase for future use
      await this.storeConfiguration(newConfig);
      
      // Cache and return
      this.cache.set(cacheKey, newConfig);
      return newConfig;
      
    } catch (researchError: any) {
      this.log('error', `Failed to research models for ${cacheKey}`, researchError);
      
      // Ultimate fallback - return sensible defaults
      return this.getDefaultConfiguration(role, language, size);
    }
  }
  
  /**
   * Research optimal models for a specific context
   */
  private async researchModelForContext(
    role: string,
    language: string,
    size: string
  ): Promise<{
    primary: { provider: string; model: string };
    fallback: { provider: string; model: string };
    weights: any;
    min_requirements?: any;
    reasoning: string[];
  }> {
    this.log('info', `Researching models for ${role}/${language}/${size}`);
    
    // Use ModelResearcherService to find best models
    const modelId = await this.researcher.requestSpecificContextResearch({
      language,
      repo_size: size,
      task_type: role
    });
    
    if (!modelId) {
      throw new Error('No model found during research');
    }
    
    // For now, use the researched model as primary
    const primaryModel = modelId;
    
    // Get fallback from existing configurations or research
    const fallbackModel = await this.getFallbackModelFromConfig(role, language, size, primaryModel);
    
    // Calculate weights based on role
    const weights = this.calculateWeightsForRole(role, size);
    
    return {
      primary: {
        provider: this.extractProvider(primaryModel),
        model: primaryModel
      },
      fallback: {
        provider: this.extractProvider(fallbackModel),
        model: fallbackModel
      },
      weights,
      min_requirements: this.getMinRequirements(role, size),
      reasoning: [
        `Researched optimal models for ${language} ${size} repositories`,
        `Role ${role} requires ${this.getPriorityForRole(role)} priority`,
        'Model selected based on context-specific research',
        'Configuration auto-generated via fallback research'
      ]
    };
  }
  
  /**
   * Store configuration in Supabase
   */
  private async storeConfiguration(config: ModelConfiguration): Promise<void> {
    this.log('info', `Storing new configuration for ${config.role}/${config.language}/${config.size_category}`);
    
    const { error } = await this.supabase
      .from('model_configurations')
      .insert({
        ...config,
        updated_by: 'model-config-resolver',
        last_updated: new Date().toISOString()
      });
    
    if (error) {
      this.log('error', 'Failed to store configuration', error);
      // Don't throw - we can still use the configuration even if storage fails
    } else {
      this.log('info', 'Configuration stored successfully');
    }
  }
  
  /**
   * Transform database record to ModelConfiguration
   */
  private transformConfig(data: any): ModelConfiguration {
    return {
      role: data.role,
      language: data.language,
      size_category: data.size_category,
      primary_provider: data.primary_provider,
      primary_model: data.primary_model,
      fallback_provider: data.fallback_provider,
      fallback_model: data.fallback_model,
      weights: data.weights || this.getDefaultWeights(),
      min_requirements: data.min_requirements || {},
      reasoning: data.reasoning || []
    };
  }
  
  /**
   * Get default configuration as ultimate fallback
   */
  private getDefaultConfiguration(role: string, language: string, size: string): ModelConfiguration {
    this.log('warn', `Using default configuration for ${role}/${language}/${size}`);
    
    return {
      role,
      language,
      size_category: size,
      primary_provider: 'anthropic',
      primary_model: 'claude-opus-4-1-20250805',
      fallback_provider: 'openai',
      fallback_model: 'gpt-5-20250615',
      weights: this.calculateWeightsForRole(role, size),
      min_requirements: this.getMinRequirements(role, size),
      reasoning: [
        'Default configuration used due to research failure',
        'Using latest high-quality models as safe defaults'
      ]
    };
  }
  
  /**
   * Extract provider from model ID
   */
  private extractProvider(modelId: string): string {
    const parts = modelId.split('/');
    return parts.length > 1 ? parts[0] : 'openai';
  }
  
  /**
   * Get priority for a role
   */
  private getPriorityForRole(role: string): 'quality' | 'speed' | 'balanced' {
    switch (role) {
      case 'orchestrator':
      case 'comparator':
      case 'educator':
        return 'quality';
      case 'location_finder':
        return 'speed';
      case 'deepwiki':
      case 'researcher':
      default:
        return 'balanced';
    }
  }
  
  /**
   * Calculate weights for a role and size
   */
  private calculateWeightsForRole(role: string, size: string): any {
    const baseWeights = {
      quality: 0.5,
      speed: 0.2,
      cost: 0.2,
      freshness: 0.1,
      contextWindow: 0.0
    };
    
    // Adjust based on role
    switch (role) {
      case 'orchestrator':
      case 'comparator':
        baseWeights.quality = 0.8;
        baseWeights.speed = 0.05;
        baseWeights.cost = 0.05;
        break;
      case 'location_finder':
        baseWeights.quality = 0.3;
        baseWeights.speed = 0.5;
        baseWeights.cost = 0.1;
        break;
      case 'deepwiki':
        if (size === 'large') {
          baseWeights.quality = 0.7;
          baseWeights.contextWindow = 0.1;
        }
        break;
    }
    
    return baseWeights;
  }
  
  /**
   * Get minimum requirements for a role and size
   */
  private getMinRequirements(role: string, size: string): any {
    const requirements: any = {};
    
    if (role === 'deepwiki' && size === 'large') {
      requirements.minContextWindow = 500000;
      requirements.minQuality = 8.0;
    } else if (role === 'comparator') {
      requirements.minQuality = 7.5;
      requirements.minContextWindow = 128000;
    } else if (role === 'location_finder') {
      requirements.maxResponseTime = 3000;
      requirements.minContextWindow = 32000;
    }
    
    return requirements;
  }
  
  /**
   * Get default weights
   */
  private getDefaultWeights(): any {
    return {
      quality: 0.6,
      speed: 0.2,
      cost: 0.1,
      freshness: 0.1,
      contextWindow: 0.0
    };
  }
  
  /**
   * Get fallback model from existing configurations or research
   */
  private async getFallbackModelFromConfig(
    role: string,
    language: string,
    size: string,
    primaryModel: string
  ): Promise<string> {
    // First, try to find a similar configuration that already has a fallback
    const { data: similarConfigs } = await this.supabase
      .from('model_configurations')
      .select('fallback_provider, fallback_model')
      .eq('role', role)
      .limit(5);
    
    if (similarConfigs && similarConfigs.length > 0) {
      // Find a fallback that's different from our primary
      for (const config of similarConfigs) {
        const fallback = `${config.fallback_provider}/${config.fallback_model}`;
        if (fallback !== primaryModel) {
          this.log('debug', `Using fallback from similar config: ${fallback}`);
          return fallback;
        }
      }
    }
    
    // If no suitable fallback found, research one
    const primaryProvider = this.extractProvider(primaryModel);
    
    // Request research for fallback with different provider preference
    const fallbackModel = await this.researcher.requestSpecificContextResearch({
      language,
      repo_size: size,
      task_type: role,
      specific_requirements: [`different_provider_than_${primaryProvider}`]
    });
    
    // If research fails, get from our populated configurations
    if (!fallbackModel) {
      // Query for any high-quality model from a different provider
      const { data: fallbackConfig } = await this.supabase
        .from('model_configurations')
        .select('primary_provider, primary_model')
        .neq('primary_provider', primaryProvider)
        .eq('role', 'orchestrator') // Use orchestrator as it has high-quality models
        .single();
      
      if (fallbackConfig) {
        return `${fallbackConfig.primary_provider}/${fallbackConfig.primary_model}`;
      }
    }
    
    return fallbackModel || primaryModel; // Last resort: use same as primary
  }
  
  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.log('info', 'Configuration cache cleared');
  }
  
  /**
   * Log helper
   */
  private log(level: string, message: string, data?: any): void {
    if (this.logger) {
      this.logger[level]?.(message, data);
    } else {
      const prefix = `[ModelConfigResolver] [${level.toUpperCase()}]`;
      if (data) {
        console.log(`${prefix} ${message}`, data);
      } else {
        console.log(`${prefix} ${message}`);
      }
    }
  }
}