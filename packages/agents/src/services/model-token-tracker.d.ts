/**
 * Model Token Tracker
 *
 * This service tracks token usage and costs for all model executions,
 * including primary and fallback models. It integrates with Vector DB
 * to get real-time pricing information.
 */
import { ModelVersionSync } from '@codequal/core/services/model-selection/ModelVersionSync';
import { VectorStorageService } from '@codequal/database';
import { TokenUsage } from './token-usage-extractor';
/**
 * Detailed token tracking record
 */
export interface TokenTrackingRecord {
    id: string;
    timestamp: Date;
    analysisId: string;
    agentRole: string;
    model: string;
    provider: string;
    tokenUsage: TokenUsage;
    cost: {
        input: number;
        output: number;
        total: number;
    };
    metadata: {
        isPrimary: boolean;
        isFallback: boolean;
        fallbackReason?: string;
        executionTime?: number;
        success: boolean;
        error?: string;
    };
}
/**
 * Aggregated token usage summary
 */
export interface TokenUsageSummary {
    analysisId: string;
    totalTokens: number;
    totalCost: number;
    modelBreakdown: Record<string, {
        model: string;
        provider: string;
        executions: number;
        tokens: TokenUsage;
        cost: {
            input: number;
            output: number;
            total: number;
        };
        primaryExecutions: number;
        fallbackExecutions: number;
    }>;
    agentBreakdown: Record<string, {
        tokens: TokenUsage;
        cost: number;
        executions: number;
    }>;
    fallbackStats: {
        totalFallbacks: number;
        fallbackCost: number;
        fallbackTokens: number;
        fallbackReasons: Record<string, number>;
    };
}
/**
 * Service for tracking model token usage and costs
 */
export declare class ModelTokenTracker {
    private modelVersionSync;
    private vectorStorage?;
    private readonly logger;
    private records;
    private modelPricingCache;
    constructor(modelVersionSync: ModelVersionSync, vectorStorage?: VectorStorageService | undefined);
    /**
     * Track token usage for a model execution
     */
    trackUsage(params: {
        analysisId: string;
        agentRole: string;
        model: string;
        provider: string;
        tokenUsage: TokenUsage;
        isPrimary: boolean;
        isFallback: boolean;
        fallbackReason?: string;
        executionTime?: number;
        success: boolean;
        error?: string;
    }): Promise<TokenTrackingRecord>;
    /**
     * Get model pricing from Vector DB or cache
     */
    private getModelPricing;
    /**
     * Store tracking record in Vector DB
     */
    private storeInVectorDB;
    /**
     * Get token usage summary for an analysis
     */
    getSummary(analysisId: string): Promise<TokenUsageSummary>;
    /**
     * Get detailed records for an analysis
     */
    getRecords(analysisId: string): TokenTrackingRecord[];
    /**
     * Clear records for an analysis (for memory management)
     */
    clearRecords(analysisId: string): void;
    /**
     * Get aggregated statistics across all analyses
     */
    getAggregatedStats(): Promise<{
        totalTokens: number;
        totalCost: number;
        primaryTokens: number;
        primaryCost: number;
        analysisCount: number;
        modelBreakdown: Record<string, any>;
        fallbackStats: {
            totalFallbacks: number;
            fallbackCost: number;
            fallbackTokens: number;
        };
    }>;
    /**
     * Export token usage data for reporting
     */
    exportUsageReport(analysisId: string): Promise<string>;
}
/**
 * Get or create the model token tracker instance
 */
export declare function getModelTokenTracker(modelVersionSync?: ModelVersionSync, vectorStorage?: VectorStorageService): ModelTokenTracker;
