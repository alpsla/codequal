/**
 * Dynamic Agent Cost Tracker Service
 * Tracks costs for agents with Supabase-based dynamic model selection
 * Models are NOT hardcoded - they're fetched from Supabase at runtime
 */
export type AgentRole = 'orchestrator' | 'researcher' | 'deepwiki' | 'comparator' | 'location-validator' | 'educator' | 'report-generator';
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
    model_config_id: string;
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
export declare class DynamicAgentCostTrackerService {
    private static instance;
    private supabase;
    private configCache;
    private cacheExpiry;
    private lastCacheUpdate;
    private constructor();
    static getInstance(): DynamicAgentCostTrackerService;
    /**
     * Get model configuration from Supabase
     */
    getModelConfig(role: AgentRole, language?: string, repositorySize?: 'small' | 'medium' | 'large' | 'enterprise', complexity?: 'low' | 'medium' | 'high', forceRefresh?: boolean): Promise<ModelConfig | null>;
    /**
     * Request new configuration from researcher via orchestrator
     */
    private requestNewConfig;
    /**
     * Track agent activity with cost calculation
     */
    trackActivity(params: {
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
    }): Promise<void>;
    /**
     * Update model performance based on usage
     */
    private updateModelPerformance;
    /**
     * Get cost analysis for a repository
     */
    getRepositoryCostAnalysis(repositoryUrl: string, prNumber?: string): Promise<CostAnalysis>;
    /**
     * Generate cost optimization recommendations
     */
    private generateRecommendations;
    /**
     * Get monthly cost trends
     */
    getMonthlyTrends(): Promise<{
        current_month: number;
        last_month: number;
        projection: number;
        by_agent: Record<AgentRole, {
            current: number;
            last: number;
        }>;
    }>;
    /**
     * Get researcher's model update history
     */
    getModelUpdateHistory(limit?: number): Promise<Array<{
        updated_at: string;
        role: AgentRole;
        old_model: string;
        new_model: string;
        reason: string;
        performance_improvement: number;
    }>>;
    /**
     * Trigger researcher to evaluate and update models
     */
    triggerModelResearch(): Promise<void>;
}
export declare const dynamicCostTracker: DynamicAgentCostTrackerService;
