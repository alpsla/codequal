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
      
      // Instead of using defaults, trigger a proper research request
      this.log('warn', `Triggering emergency research for ${role}/${language}/${size}`);
      
      // Notify the orchestrator that we need urgent model research
      await this.triggerUrgentModelResearch(role, language, size);
      
      // For now, return a temporary config that indicates research is pending
      // The orchestrator should retry after research completes
      throw new Error(`Model configuration not available for ${role}/${language}/${size}. Research has been triggered. Please retry in a moment.`);
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
   * Trigger urgent model research for a specific context
   */
  private async triggerUrgentModelResearch(role: string, language: string, size: string): Promise<void> {
    this.log('info', `Triggering urgent research for ${role}/${language}/${size}`);
    
    try {
      // Create a research task in Supabase
      const { error } = await this.supabase
        .from('model_research_tasks')
        .insert({
          role,
          language,
          size_category: size,
          status: 'pending',
          priority: 'urgent',
          requested_at: new Date().toISOString(),
          requested_by: 'model-config-resolver'
        });
      
      if (error) {
        this.log('error', 'Failed to create research task', error);
      }
      
      // Also try to trigger immediate research via ModelResearcherService
      if (this.researcher) {
        this.log('info', 'Attempting immediate research via ModelResearcherService');
        
        // The researcher should conduct the 2-step search:
        // 1. Web search for latest models (< 6 months old)
        // 2. OpenRouter validation for exact syntax
        await this.researcher.requestSpecificContextResearch({
          language,
          repo_size: size,
          task_type: role
        });
      }
    } catch (error) {
      this.log('error', 'Failed to trigger urgent research', error);
    }
  }

  /**
   * Get default configuration as ultimate fallback
   * Uses actual API call to get available models dynamically
   */
  private async getDefaultConfiguration(role: string, language: string, size: string): Promise<ModelConfiguration> {
    this.log('warn', `Using fallback configuration for ${role}/${language}/${size}`);
    
    // Try to fetch actual available models from OpenRouter
    let primaryModel = 'openai/gpt-4o';  // Safe fallback that's always available
    let fallbackModel = 'openai/gpt-4o-mini';
    
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const axios = require('axios');
      const apiKey = process.env.OPENROUTER_API_KEY;
      
      if (apiKey) {
        const response = await axios.get('https://openrouter.ai/api/v1/models', {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        });
        
        const models = response.data.data || [];
        
        // Filter for suitable models based on role
        const suitableModels = models.filter((m: any) => {
          const isCodeCapable = m.context_length >= 50000;
          const isQualityModel = m.id.includes('claude') || m.id.includes('gpt') || m.id.includes('gemini');
          const notDeprecated = !m.id.includes('instruct');
          return isCodeCapable && isQualityModel && notDeprecated;
        });
        
        if (suitableModels.length > 0) {
          // Sort by context length and select the best
          suitableModels.sort((a: any, b: any) => b.context_length - a.context_length);
          primaryModel = suitableModels[0].id;
          fallbackModel = suitableModels[1]?.id || 'openai/gpt-4o-mini';
          this.log('info', `Dynamically selected models: primary=${primaryModel}, fallback=${fallbackModel}`);
        }
      }
    } catch (error) {
      this.log('warn', 'Could not fetch available models, using safe defaults');
    }
    
    return {
      role,
      language,
      size_category: size,
      primary_provider: this.extractProvider(primaryModel),
      primary_model: primaryModel,
      fallback_provider: this.extractProvider(fallbackModel),
      fallback_model: fallbackModel,
      weights: this.calculateWeightsForRole(role, size),
      min_requirements: this.getMinRequirements(role, size),
      reasoning: [
        'Configuration dynamically selected from available models',
        `Selected ${primaryModel} based on availability and capabilities`
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