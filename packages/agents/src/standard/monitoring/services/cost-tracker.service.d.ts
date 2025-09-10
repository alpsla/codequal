/**
 * Cost Tracker Service
 * Comprehensive cost tracking for all AI services and infrastructure
 */
export interface ModelPricing {
    inputPer1M: number;
    outputPer1M: number;
    provider: string;
    tier?: string;
}
export interface ServiceCost {
    service: 'deepwiki' | 'openrouter' | 'anthropic' | 'openai' | 'redis' | 'supabase' | 'kubernetes';
    operation: string;
    timestamp: number;
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    model?: string;
    cost: number;
    estimatedMonthly?: number;
    metadata?: Record<string, any>;
}
export interface CostSummary {
    daily: number;
    weekly: number;
    monthly: number;
    byService: Record<string, number>;
    byModel: Record<string, number>;
    projectedMonthly: number;
    tokensUsed: {
        input: number;
        output: number;
        total: number;
    };
}
export declare class CostTrackerService {
    private static instance;
    private readonly modelPricing;
    private readonly infrastructureCosts;
    private costs;
    private startTime;
    private constructor();
    static getInstance(): CostTrackerService;
    /**
     * Track AI model usage
     */
    trackModelUsage(model: string, inputTokens: number, outputTokens: number, operation: string, metadata?: Record<string, any>): ServiceCost;
    /**
     * Track DeepWiki analysis cost
     */
    trackDeepWikiAnalysis(repository: string, estimatedTokens: number, duration: number, cached?: boolean): ServiceCost;
    /**
     * Track infrastructure usage
     */
    trackInfrastructureUsage(service: 'redis' | 'supabase' | 'kubernetes', operation: string, usage: {
        requests?: number;
        storage?: number;
        network?: number;
        duration?: number;
    }): ServiceCost;
    /**
     * Calculate model cost
     */
    private calculateModelCost;
    /**
     * Get service from model name
     */
    private getServiceFromModel;
    /**
     * Estimate monthly cost from current usage
     */
    private estimateMonthlyFromUsage;
    /**
     * Get cost summary
     */
    getCostSummary(): CostSummary;
    /**
     * Get cost breakdown for specific analysis
     */
    getAnalysisCostBreakdown(repositoryUrl: string): {
        total: number;
        deepwiki: number;
        locationFinding: number;
        reporting: number;
        infrastructure: number;
    };
    /**
     * Generate cost report
     */
    generateCostReport(): string;
    /**
     * Generate optimization tips based on usage
     */
    private generateOptimizationTips;
    /**
     * Export costs to CSV
     */
    exportToCSV(): string;
    /**
     * Clear old cost data
     */
    clearOldData(daysToKeep?: number): number;
}
export declare const costTracker: CostTrackerService;
