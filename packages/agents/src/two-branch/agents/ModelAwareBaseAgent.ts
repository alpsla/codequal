/**
 * Model-Aware Base Agent
 * 
 * Base agent that automatically selects and uses models from Supabase
 * based on the agent role, language, and task complexity
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';

export interface ModelConfiguration {
  primary_provider: string;
  primary_model: string;
  fallback_provider: string;
  fallback_model: string;
  reasoning?: string[];
}

export interface AgentContext {
  role: string;
  language: string;
  sizeCategory: 'small' | 'medium' | 'large';
  taskComplexity?: 'simple' | 'moderate' | 'complex';
}

export class ModelAwareBaseAgent {
  protected supabase: SupabaseClient;
  protected currentModel?: ModelConfiguration;
  protected agentName: string;
  
  constructor(agentName: string) {
    this.agentName = agentName;
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  
  /**
   * Get the appropriate model configuration from Supabase
   */
  protected async getModelConfiguration(context: AgentContext): Promise<ModelConfiguration> {
    try {
      // Try to get from Supabase
      const { data, error } = await this.supabase
        .from('model_configurations')
        .select('*')
        .eq('role', context.role)
        .eq('language', context.language)
        .eq('size_category', context.sizeCategory)
        .order('last_updated', { ascending: false })
        .limit(1)
        .single();
      
      if (error || !data) {
        logger.warn(`No model config found for ${context.role}/${context.language}, using defaults`);
        return this.getDefaultModel(context);
      }
      
      logger.info(`🤖 ${this.agentName} using model: ${data.primary_provider}/${data.primary_model}`);
      
      return {
        primary_provider: data.primary_provider,
        primary_model: data.primary_model,
        fallback_provider: data.fallback_provider,
        fallback_model: data.fallback_model,
        reasoning: data.reasoning
      };
    } catch (error) {
      logger.error('Failed to fetch model configuration', error);
      return this.getDefaultModel(context);
    }
  }
  
  /**
   * Get default model based on task complexity
   */
  protected getDefaultModel(context: AgentContext): ModelConfiguration {
    // Use DeepSeek models as defaults (they're in Supabase)
    if (context.taskComplexity === 'complex' || context.sizeCategory === 'large') {
      return {
        primary_provider: 'deepseek',
        primary_model: 'deepseek-r1-distill-llama-70b',
        fallback_provider: 'deepseek',
        fallback_model: 'deepseek-r1-distill-llama-8b'
      };
    }
    
    return {
      primary_provider: 'deepseek',
      primary_model: 'deepseek-r1-distill-llama-8b',
      fallback_provider: 'deepseek',
      fallback_model: 'deepseek-r1-distill-llama-70b:free'
    };
  }
  
  /**
   * Determine task complexity based on agent role
   */
  protected determineTaskComplexity(agentRole: string): 'simple' | 'moderate' | 'complex' {
    const complexAgents = ['Architecture', 'Performance', 'Security'];
    const moderateAgents = ['Dependencies', 'CodeQuality'];
    
    if (complexAgents.some(role => agentRole.includes(role))) {
      return 'complex';
    }
    if (moderateAgents.some(role => agentRole.includes(role))) {
      return 'moderate';
    }
    return 'simple';
  }
  
  /**
   * Get the context for model selection
   */
  protected async getAgentContext(language: string): Promise<AgentContext> {
    const taskComplexity = this.determineTaskComplexity(this.agentName);
    
    // Map task complexity to size category
    const sizeCategory = taskComplexity === 'complex' ? 'large' : 
                        taskComplexity === 'moderate' ? 'medium' : 'small';
    
    return {
      role: this.getAgentRole(),
      language: language.toLowerCase(),
      sizeCategory,
      taskComplexity
    };
  }
  
  /**
   * Get the agent's role for model selection
   */
  protected getAgentRole(): string {
    // Extract role from agent name
    if (this.agentName.includes('Security')) return 'security';
    if (this.agentName.includes('Quality')) return 'quality';
    if (this.agentName.includes('Dependency')) return 'dependencies';
    if (this.agentName.includes('Architecture')) return 'architecture';
    if (this.agentName.includes('Performance')) return 'performance';
    return 'testing'; // Default role in Supabase
  }
  
  /**
   * Track model usage for cost analysis
   */
  protected async trackModelUsage(
    model: string,
    tokensUsed: number,
    executionTime: number
  ): Promise<void> {
    try {
      await this.supabase
        .from('model_usage')
        .insert({
          agent: this.agentName,
          model,
          tokens_used: tokensUsed,
          execution_time: executionTime,
          timestamp: new Date().toISOString()
        });
    } catch (error) {
      logger.error('Failed to track model usage', error);
    }
  }
  
  /**
   * Execute with model selection
   */
  protected async executeWithModel<T>(
    language: string,
    task: () => Promise<T>
  ): Promise<T> {
    const context = await this.getAgentContext(language);
    this.currentModel = await this.getModelConfiguration(context);
    
    const startTime = Date.now();
    
    try {
      // Execute the task
      const result = await task();
      
      // Track usage (estimate tokens based on execution time)
      const executionTime = Date.now() - startTime;
      const estimatedTokens = Math.round(executionTime / 10); // Rough estimate
      
      await this.trackModelUsage(
        `${this.currentModel.primary_provider}/${this.currentModel.primary_model}`,
        estimatedTokens,
        executionTime
      );
      
      return result;
    } catch (error) {
      logger.error(`${this.agentName} execution failed`, error);
      throw error;
    }
  }
  
  /**
   * Get current model information
   */
  public getCurrentModel(): ModelConfiguration | undefined {
    return this.currentModel;
  }
  
  /**
   * Calculate cost estimate for current model
   */
  public estimateCost(tokens: number): number {
    if (!this.currentModel) return 0;
    
    // Cost per million tokens (rough estimates)
    const costPerMillion: Record<string, number> = {
      'deepseek-r1-distill-llama-8b': 0.14,
      'deepseek-r1-distill-llama-70b': 0.40,
      'deepseek-r1-distill-llama-70b:free': 0.00,
      'claude-3-haiku': 0.25,
      'claude-3-sonnet': 3.00,
      'claude-3-opus': 15.00,
      'gpt-4': 30.00,
      'gpt-3.5-turbo': 0.50
    };
    
    const modelKey = this.currentModel.primary_model.split('/').pop() || '';
    const rate = costPerMillion[modelKey] || 1.00;
    
    return (tokens / 1000000) * rate;
  }
}