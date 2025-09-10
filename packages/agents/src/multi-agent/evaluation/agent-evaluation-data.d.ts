import { AgentProvider, AgentRole } from '@codequal/core/config/agent-registry';
/**
 * Interface defining language support levels for an agent
 */
export interface LanguageSupport {
    fullSupport: string[];
    goodSupport: string[];
    basicSupport: string[];
    limitedSupport: string[];
}
/**
 * Interface for agent-role evaluation parameters
 * This provides detailed performance metrics for each agent by role
 */
export interface AgentRoleEvaluationParameters {
    agent: {
        provider: AgentProvider;
        modelVersion: string;
        maxTokens: number;
        costPerToken: number;
        averageLatency: number;
    };
    rolePerformance: {
        [role in AgentRole]: {
            overallScore: number;
            specialties: string[];
            weaknesses: string[];
            bestPerformingLanguages: Record<string, number>;
            bestFileTypes: Record<string, number>;
            bestScenarios: Record<string, number>;
        };
    };
    repoCharacteristics: {
        sizePerformance: Record<string, number>;
        complexityPerformance: Record<string, number>;
        architecturePerformance: Record<string, number>;
    };
    prCharacteristics: {
        sizePerformance: Record<string, number>;
        changeTypePerformance: Record<string, number>;
    };
    frameworkPerformance: Record<string, number>;
    languageSupport: LanguageSupport;
    historicalPerformance: {
        totalRuns: number;
        successRate: number;
        averageUserSatisfaction: number;
        tokenUtilization: number;
        averageFindingQuality: number;
    };
    mcpPerformance?: {
        withMCP: {
            qualityScore: number;
            speedScore: number;
            costEfficiency: number;
        };
        withoutMCP: {
            qualityScore: number;
            speedScore: number;
            costEfficiency: number;
        };
        recommendMCP: boolean;
    };
}
/**
 * Interface for repository context
 * Used to determine the optimal agent configuration
 */
export interface RepositoryContext {
    primaryLanguages: string[];
    size: {
        totalFiles: number;
        totalLoc: number;
    };
    complexity: number;
    frameworks: string[];
    architecture: string;
}
/**
 * Interface for PR context
 * Used to determine the optimal agent configuration
 */
export interface PRContext {
    changedFiles: number;
    changedLoc: number;
    fileTypes: {
        code: number;
        config: number;
        docs: number;
        tests: number;
    };
    complexity: number;
    impactedAreas: string[];
    changeType: 'feature' | 'bugfix' | 'refactoring' | 'documentation' | 'infrastructure';
    changeImpact: number;
}
/**
 * Interface for user preferences
 * Used to customize agent selection
 */
export interface UserPreferences {
    preferredProviders?: AgentProvider[];
    priorityConcerns?: AgentRole[];
    feedbackHistory?: Record<string, {
        useCount: number;
        positiveRating: number;
        negativeRating: number;
    }>;
    customRules?: any[];
    teamConventions?: any;
    maxCost?: number;
    qualityPreference?: number;
}
/**
 * Decision criteria for using secondary agents
 */
export interface SecondaryAgentDecisionCriteria {
    repositoryComplexity: number;
    changeImpact: number;
    confidenceThreshold: number;
    languageFactors: Record<string, number>;
    businessCriticalityScore: number;
    costBudget: number;
}
/**
 * Default temperatures by role
 * Used to optimize agent configuration
 */
export declare const defaultTemperatures: Record<AgentRole, number>;
/**
 * Determines if a secondary agent should be used based on context
 * @param context Repository context
 * @param prContext PR context
 * @param primaryAgentResult Result from primary agent
 * @param criteria Decision criteria
 * @returns Whether to use a secondary agent
 */
export declare function shouldUseSecondaryAgent(context: RepositoryContext, prContext: PRContext, primaryAgentResult: any, // Using any for now, will be refined with actual type
criteria: SecondaryAgentDecisionCriteria): boolean;
export declare const mockAgentEvaluationData: Record<AgentProvider, Partial<AgentRoleEvaluationParameters>>;
