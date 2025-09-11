/**
 * Monitoring Module
 * Centralized monitoring for performance, cost, and analysis metrics
 */
export * from './services/unified-monitoring.service';
export * from './services/cost-tracker.service';
export * from './services/dynamic-agent-cost-tracker.service';
import { monitoring } from './services/unified-monitoring.service';
import { costTracker } from './services/cost-tracker.service';
import { dynamicCostTracker } from './services/dynamic-agent-cost-tracker.service';
export { monitoring, costTracker, dynamicCostTracker };
export declare function trackPerformance<T>(operationName: string, operation: () => Promise<T>): Promise<T>;
export declare function trackAnalysis<T>(repositoryUrl: string, prNumber: string | undefined, operation: () => Promise<T>): Promise<T>;
export declare function trackDeepWikiCall(repositoryUrl: string, branch: string, tokens?: number, cached?: boolean): void;
export declare function trackOpenRouterCall(model: string, inputTokens: number, outputTokens: number, operation: string): void;
export declare function generateMonitoringReport(): Promise<string>;
export declare function generateCostReport(): string;
export declare function getAnalysisCost(repositoryUrl: string): {
    total: number;
    deepwiki: number;
    locationFinding: number;
    reporting: number;
    infrastructure: number;
};
export declare function getCostSummary(): import("./services/cost-tracker.service").CostSummary;
export declare function trackRedisUsage(operations: number): void;
export declare function trackSupabaseUsage(requests: number, storageGb?: number): void;
export declare function trackKubernetesUsage(durationMs: number, networkGb?: number): void;
import { AgentRole } from './services/dynamic-agent-cost-tracker.service';
export declare function trackDynamicAgentCall(params: {
    agent: AgentRole;
    operation: string;
    repository: string;
    prNumber?: string;
    language?: string;
    repositorySize?: 'small' | 'medium' | 'large' | 'enterprise';
    modelConfigId: string;
    model: string;
    modelVersion: string;
    isFallback: boolean;
    inputTokens: number;
    outputTokens: number;
    duration: number;
    success?: boolean;
    error?: string;
    retryCount?: number;
}): Promise<void>;
export declare function getDynamicModelConfig(role: AgentRole, language?: string, repoSize?: 'small' | 'medium' | 'large' | 'enterprise', complexity?: 'low' | 'medium' | 'high'): Promise<import("./services/dynamic-agent-cost-tracker.service").ModelConfig | null>;
export declare function getRepositoryCostAnalysis(repository: string, prNumber?: string): Promise<import("./services/dynamic-agent-cost-tracker.service").CostAnalysis>;
export declare function getMonthlyTrends(): Promise<{
    current_month: number;
    last_month: number;
    projection: number;
    by_agent: Record<AgentRole, {
        current: number;
        last: number;
    }>;
}>;
export declare function getModelUpdateHistory(limit?: number): Promise<{
    updated_at: string;
    role: AgentRole;
    old_model: string;
    new_model: string;
    reason: string;
    performance_improvement: number;
}[]>;
export declare function triggerQuarterlyModelResearch(): Promise<void>;
export { smartTracker, SmartTrackingParams } from './services/smart-agent-tracker.service';
export { UnifiedLocationService, createUnifiedLocationService } from '../services/unified-location-service';
export type { LocationResult, IssueToLocate, LocationServiceConfig } from '../services/unified-location-service';
