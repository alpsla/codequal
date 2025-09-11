/**
 * Smart Agent Tracker Service
 * Automatically detects primary vs fallback model usage
 * by comparing with Supabase configurations
 */
import { AgentRole } from './dynamic-agent-cost-tracker.service';
export interface SmartTrackingParams {
    agentRole: AgentRole;
    operation: string;
    repositoryUrl: string;
    prNumber?: string;
    language?: string;
    repositorySize?: 'small' | 'medium' | 'large' | 'enterprise';
    modelUsed: string;
    modelVersion: string;
    inputTokens: number;
    outputTokens: number;
    durationMs: number;
    success: boolean;
    error?: string;
    retryCount?: number;
    metadata?: Record<string, any>;
}
export declare class SmartAgentTrackerService {
    private static instance;
    private supabase;
    private configCache;
    private constructor();
    static getInstance(): SmartAgentTrackerService;
    /**
     * Smart tracking that automatically detects primary vs fallback
     */
    trackAgentActivity(params: SmartTrackingParams): Promise<{
        detectedTier: 'primary' | 'fallback' | 'unknown';
        configUsed: any;
        cost: number;
    }>;
    /**
     * Intelligently detect which tier the model belongs to
     */
    private detectModelTier;
    /**
     * Normalize model names for comparison
     * Handles variations like "gpt-4o" vs "gpt-4o-2024-08-06"
     */
    private normalizeModelName;
    /**
     * Check if two model names match (considering versions)
     */
    private modelsMatch;
    /**
     * Heuristic to determine if a model is likely a fallback
     */
    private isLikelyFallback;
    /**
     * Calculate cost based on configuration and detected tier
     */
    private calculateCostFromConfig;
    /**
     * Estimate cost for unknown models
     */
    private estimateCost;
    /**
     * Get relevant configuration from Supabase
     */
    private getRelevantConfig;
    /**
     * Record activity in Supabase
     */
    private recordActivity;
    /**
     * Record model failure for researcher analysis
     */
    private recordModelFailure;
    /**
     * Request new configuration from researcher
     */
    private requestNewConfig;
    /**
     * Get usage statistics showing primary vs fallback usage
     */
    getModelTierStatistics(role?: AgentRole, timeRange?: {
        start: Date;
        end: Date;
    }): Promise<{
        primaryUsage: number;
        fallbackUsage: number;
        unknownUsage: number;
        primarySuccessRate: number;
        fallbackSuccessRate: number;
        costSavingsFromFallback: number;
    }>;
}
export declare const smartTracker: SmartAgentTrackerService;
