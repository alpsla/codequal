/**
 * Dynamic Agent Cost Tracker Service
 * Tracks costs for agents with Supabase-based dynamic model selection
 * Models are NOT hardcoded - they're fetched from Supabase at runtime
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export type AgentRole = 
  | 'orchestrator'
  | 'researcher' 
  | 'deepwiki'
  | 'comparator'
  | 'location-validator'
  | 'educator'
  | 'report-generator';

export interface ModelConfig {
  id: string;
  role: AgentRole;
  language?: string;
  repository_size?: 'small' | 'medium' | 'large' | 'enterprise';
  complexity?: 'low' | 'medium' | 'high';
  primary_model: string;
  primary_version: string;
  primary_cost_per_1m_input: number;
  primary_cost_per_1m_output: number;
  fallback_model?: string;
  fallback_version?: string;
  fallback_cost_per_1m_input?: number;
  fallback_cost_per_1m_output?: number;
  performance_score: number;
  last_updated: string;
  updated_by: 'researcher' | 'manual' | 'orchestrator';
  metadata?: Record<string, any>;
}

export interface AgentActivity {
  id: string;
  timestamp: number;
  agent_role: AgentRole;
  operation: string;
  repository_url: string;
  pr_number?: string;
  language?: string;
  repository_size?: string;
  model_config_id: string; // Reference to Supabase config
  model_used: string;
  model_version: string;
  is_fallback: boolean;
  input_tokens: number;
  output_tokens: number;
  cost: number;
  duration_ms: number;
  success: boolean;
  error?: string;
  retry_count: number;
  metadata?: Record<string, any>;
}

export interface CostAnalysis {
  total_cost: number;
  by_agent: Record<AgentRole, number>;
  by_model: Record<string, number>;
  by_language: Record<string, number>;
  by_config: Array<{
    config_id: string;
    role: AgentRole;
    model: string;
    usage_count: number;
    total_cost: number;
  }>;
  recommendations: string[];
}

export class DynamicAgentCostTrackerService {
  private static instance: DynamicAgentCostTrackerService;
  private supabase: SupabaseClient;
  private configCache: Map<string, ModelConfig> = new Map();
  private cacheExpiry = 300000; // 5 minutes
  private lastCacheUpdate = 0;
  
  private constructor() {
    // Initialize Supabase client
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  
  public static getInstance(): DynamicAgentCostTrackerService {
    if (!DynamicAgentCostTrackerService.instance) {
      DynamicAgentCostTrackerService.instance = new DynamicAgentCostTrackerService();
    }
    return DynamicAgentCostTrackerService.instance;
  }
  
  /**
   * Get model configuration from Supabase
   */
  public async getModelConfig(
    role: AgentRole,
    language?: string,
    repositorySize?: 'small' | 'medium' | 'large' | 'enterprise',
    complexity?: 'low' | 'medium' | 'high',
    forceRefresh = false
  ): Promise<ModelConfig | null> {
    // Check cache first
    if (!forceRefresh && Date.now() - this.lastCacheUpdate < this.cacheExpiry) {
      const cacheKey = `${role}-${language}-${repositorySize}-${complexity}`;
      const cached = this.configCache.get(cacheKey);
      if (cached) return cached;
    }
    
    try {
      // Query Supabase for best matching config
      let query = this.supabase
        .from('model_configs')
        .select('*')
        .eq('role', role)
        .eq('is_active', true);
      
      // Add optional filters
      if (language) {
        query = query.or(`language.eq.${language},language.is.null`);
      }
      if (repositorySize) {
        query = query.or(`repository_size.eq.${repositorySize},repository_size.is.null`);
      }
      if (complexity) {
        query = query.or(`complexity.eq.${complexity},complexity.is.null`);
      }
      
      // Order by specificity and performance
      query = query.order('performance_score', { ascending: false })
                   .order('last_updated', { ascending: false })
                   .limit(1);
      
      const { data, error } = await query.single();
      
      if (error) {
        console.error('Failed to fetch model config:', error);
        
        // Trigger orchestrator to request new config from researcher
        await this.requestNewConfig(role, language, repositorySize, complexity);
        
        return null;
      }
      
      // Cache the config
      const cacheKey = `${role}-${language}-${repositorySize}-${complexity}`;
      this.configCache.set(cacheKey, data);
      this.lastCacheUpdate = Date.now();
      
      return data;
    } catch (error) {
      console.error('Error fetching model config:', error);
      return null;
    }
  }
  
  /**
   * Request new configuration from researcher via orchestrator
   */
  private async requestNewConfig(
    role: AgentRole,
    language?: string,
    repositorySize?: string,
    complexity?: string
  ): Promise<void> {
    try {
      // Insert request into research_requests table
      await this.supabase.from('research_requests').insert({
        request_type: 'model_config',
        role,
        language,
        repository_size: repositorySize,
        complexity,
        status: 'pending',
        requested_by: 'cost_tracker',
        requested_at: new Date().toISOString(),
        metadata: {
          reason: 'Missing configuration for specific case',
          context: { role, language, repositorySize, complexity }
        }
      });
      
      console.log(`Requested new model config for ${role} (${language}, ${repositorySize}, ${complexity})`);
    } catch (error) {
      console.error('Failed to request new config:', error);
    }
  }
  
  /**
   * Track agent activity with cost calculation
   */
  public async trackActivity(params: {
    agentRole: AgentRole;
    operation: string;
    repositoryUrl: string;
    prNumber?: string;
    language?: string;
    repositorySize?: 'small' | 'medium' | 'large' | 'enterprise';
    modelConfigId: string;
    modelUsed: string;
    modelVersion: string;
    isFallback: boolean;
    inputTokens: number;
    outputTokens: number;
    durationMs: number;
    success: boolean;
    error?: string;
    retryCount?: number;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      // Get the model config to calculate cost
      const { data: config } = await this.supabase
        .from('model_configs')
        .select('*')
        .eq('id', params.modelConfigId)
        .single();
      
      if (!config) {
        console.error('Model config not found:', params.modelConfigId);
        return;
      }
      
      // Calculate cost based on whether primary or fallback was used
      let costPer1MInput: number;
      let costPer1MOutput: number;
      
      if (params.isFallback) {
        costPer1MInput = config.fallback_cost_per_1m_input || 1.0;
        costPer1MOutput = config.fallback_cost_per_1m_output || 1.0;
      } else {
        costPer1MInput = config.primary_cost_per_1m_input;
        costPer1MOutput = config.primary_cost_per_1m_output;
      }
      
      const cost = (params.inputTokens / 1_000_000) * costPer1MInput +
                   (params.outputTokens / 1_000_000) * costPer1MOutput;
      
      // Store activity in Supabase
      const activity: Omit<AgentActivity, 'id'> = {
        timestamp: Date.now(),
        agent_role: params.agentRole,
        operation: params.operation,
        repository_url: params.repositoryUrl,
        pr_number: params.prNumber,
        language: params.language,
        repository_size: params.repositorySize,
        model_config_id: params.modelConfigId,
        model_used: params.modelUsed,
        model_version: params.modelVersion,
        is_fallback: params.isFallback,
        input_tokens: params.inputTokens,
        output_tokens: params.outputTokens,
        cost,
        duration_ms: params.durationMs,
        success: params.success,
        error: params.error,
        retry_count: params.retryCount || 0,
        metadata: params.metadata
      };
      
      await this.supabase.from('agent_activity').insert(activity);
      
      // Update model performance metrics if needed
      if (!params.success && params.retryCount && params.retryCount > 2) {
        await this.updateModelPerformance(params.modelConfigId, false);
      }
      
    } catch (error) {
      console.error('Failed to track activity:', error);
    }
  }
  
  /**
   * Update model performance based on usage
   */
  private async updateModelPerformance(
    configId: string,
    success: boolean
  ): Promise<void> {
    try {
      // Get current performance score
      const { data: config } = await this.supabase
        .from('model_configs')
        .select('performance_score, usage_count, success_count')
        .eq('id', configId)
        .single();
      
      if (!config) return;
      
      // Update performance metrics
      const newUsageCount = (config.usage_count || 0) + 1;
      const newSuccessCount = (config.success_count || 0) + (success ? 1 : 0);
      const newPerformanceScore = (newSuccessCount / newUsageCount) * 100;
      
      await this.supabase
        .from('model_configs')
        .update({
          performance_score: newPerformanceScore,
          usage_count: newUsageCount,
          success_count: newSuccessCount,
          last_used: new Date().toISOString()
        })
        .eq('id', configId);
        
    } catch (error) {
      console.error('Failed to update model performance:', error);
    }
  }
  
  /**
   * Get cost analysis for a repository
   */
  public async getRepositoryCostAnalysis(
    repositoryUrl: string,
    prNumber?: string
  ): Promise<CostAnalysis> {
    try {
      // Fetch activities from Supabase
      let query = this.supabase
        .from('agent_activities')
        .select('*')
        .eq('repository_url', repositoryUrl);
      
      if (prNumber) {
        query = query.eq('pr_number', prNumber);
      }
      
      const { data: activities, error } = await query;
      
      if (error || !activities) {
        throw error;
      }
      
      // Calculate totals
      const totalCost = activities.reduce((sum, a) => sum + a.cost, 0);
      
      // Group by agent
      const byAgent: Record<string, number> = {};
      activities.forEach(a => {
        byAgent[a.agent_role] = (byAgent[a.agent_role] || 0) + a.cost;
      });
      
      // Group by model
      const byModel: Record<string, number> = {};
      activities.forEach(a => {
        byModel[a.model_used] = (byModel[a.model_used] || 0) + a.cost;
      });
      
      // Group by language
      const byLanguage: Record<string, number> = {};
      activities.forEach(a => {
        if (a.language) {
          byLanguage[a.language] = (byLanguage[a.language] || 0) + a.cost;
        }
      });
      
      // Group by config
      const configMap = new Map<string, any>();
      activities.forEach(a => {
        const existing = configMap.get(a.model_config_id) || {
          config_id: a.model_config_id,
          role: a.agent_role,
          model: a.model_used,
          usage_count: 0,
          total_cost: 0
        };
        existing.usage_count++;
        existing.total_cost += a.cost;
        configMap.set(a.model_config_id, existing);
      });
      
      const byConfig = Array.from(configMap.values());
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(activities, totalCost);
      
      return {
        total_cost: totalCost,
        by_agent: byAgent as Record<AgentRole, number>,
        by_model: byModel,
        by_language: byLanguage,
        by_config: byConfig,
        recommendations
      };
      
    } catch (error) {
      console.error('Failed to get cost analysis:', error);
      return {
        total_cost: 0,
        by_agent: {} as Record<AgentRole, number>,
        by_model: {},
        by_language: {},
        by_config: [],
        recommendations: ['Unable to fetch cost data']
      };
    }
  }
  
  /**
   * Generate cost optimization recommendations
   */
  private generateRecommendations(activities: AgentActivity[], totalCost: number): string[] {
    const recommendations: string[] = [];
    
    // Check for high failure rates
    const failureRate = activities.filter(a => !a.success).length / activities.length;
    if (failureRate > 0.2) {
      recommendations.push(`High failure rate (${(failureRate * 100).toFixed(1)}%) - investigate model performance`);
    }
    
    // Check for excessive fallback usage
    const fallbackRate = activities.filter(a => a.is_fallback).length / activities.length;
    if (fallbackRate > 0.3) {
      recommendations.push(`High fallback usage (${(fallbackRate * 100).toFixed(1)}%) - primary models may need updating`);
    }
    
    // Check for expensive operations
    const avgCost = totalCost / activities.length;
    if (avgCost > 0.10) {
      recommendations.push(`High average cost per operation ($${avgCost.toFixed(3)}) - consider model optimization`);
    }
    
    // Check for retry patterns
    const highRetries = activities.filter(a => a.retry_count > 2);
    if (highRetries.length > 0) {
      recommendations.push(`${highRetries.length} operations required multiple retries - check model reliability`);
    }
    
    // Language-specific recommendations
    const languageCosts = new Map<string, number>();
    activities.forEach(a => {
      if (a.language) {
        languageCosts.set(a.language, (languageCosts.get(a.language) || 0) + a.cost);
      }
    });
    
    languageCosts.forEach((cost, lang) => {
      const langAvg = cost / activities.filter(a => a.language === lang).length;
      if (langAvg > 0.15) {
        recommendations.push(`${lang} analyses are expensive ($${langAvg.toFixed(3)}/op) - optimize models for this language`);
      }
    });
    
    if (recommendations.length === 0) {
      recommendations.push('Cost performance is within optimal ranges');
    }
    
    return recommendations;
  }
  
  /**
   * Get monthly cost trends
   */
  public async getMonthlyTrends(): Promise<{
    current_month: number;
    last_month: number;
    projection: number;
    by_agent: Record<AgentRole, { current: number; last: number }>;
  }> {
    try {
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      
      // Fetch current month
      const { data: currentMonth } = await this.supabase
        .from('agent_activities')
        .select('agent_role, cost')
        .gte('timestamp', currentMonthStart.getTime());
      
      // Fetch last month
      const { data: lastMonth } = await this.supabase
        .from('agent_activities')
        .select('agent_role, cost')
        .gte('timestamp', lastMonthStart.getTime())
        .lt('timestamp', currentMonthStart.getTime());
      
      // Calculate totals
      const currentTotal = currentMonth?.reduce((sum, a) => sum + a.cost, 0) || 0;
      const lastTotal = lastMonth?.reduce((sum, a) => sum + a.cost, 0) || 0;
      
      // Calculate projection based on current run rate
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const daysPassed = now.getDate();
      const projection = (currentTotal / daysPassed) * daysInMonth;
      
      // Group by agent
      const byAgent: Record<string, { current: number; last: number }> = {};
      
      currentMonth?.forEach(a => {
        if (!byAgent[a.agent_role]) {
          byAgent[a.agent_role] = { current: 0, last: 0 };
        }
        byAgent[a.agent_role].current += a.cost;
      });
      
      lastMonth?.forEach(a => {
        if (!byAgent[a.agent_role]) {
          byAgent[a.agent_role] = { current: 0, last: 0 };
        }
        byAgent[a.agent_role].last += a.cost;
      });
      
      return {
        current_month: currentTotal,
        last_month: lastTotal,
        projection,
        by_agent: byAgent as Record<AgentRole, { current: number; last: number }>
      };
      
    } catch (error) {
      console.error('Failed to get monthly trends:', error);
      return {
        current_month: 0,
        last_month: 0,
        projection: 0,
        by_agent: {} as Record<AgentRole, { current: number; last: number }>
      };
    }
  }
  
  /**
   * Get researcher's model update history
   */
  public async getModelUpdateHistory(limit = 10): Promise<Array<{
    updated_at: string;
    role: AgentRole;
    old_model: string;
    new_model: string;
    reason: string;
    performance_improvement: number;
  }>> {
    try {
      const { data } = await this.supabase
        .from('model_update_history')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(limit);
      
      return data || [];
    } catch (error) {
      console.error('Failed to get model update history:', error);
      return [];
    }
  }
  
  /**
   * Trigger researcher to evaluate and update models
   */
  public async triggerModelResearch(): Promise<void> {
    try {
      await this.supabase.from('research_requests').insert({
        request_type: 'quarterly_model_update',
        status: 'pending',
        requested_by: 'scheduler',
        requested_at: new Date().toISOString(),
        metadata: {
          reason: 'Quarterly model evaluation',
          scope: 'all_roles'
        }
      });
      
      console.log('Triggered quarterly model research');
    } catch (error) {
      console.error('Failed to trigger model research:', error);
    }
  }
}

// Export singleton
export const dynamicCostTracker = DynamicAgentCostTrackerService.getInstance();