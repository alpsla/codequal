/**
 * Researcher Agent Types and Interfaces
 *
 * Defines the core types for the researcher agent functionality
 */
import { AuthenticatedUser } from '@codequal/core/types';
/**
 * Configuration for research operations
 */
export interface ResearchConfig {
    /**
     * Research depth: 'shallow' for quick checks, 'deep' for comprehensive analysis
     */
    researchDepth?: 'shallow' | 'deep' | 'comprehensive';
    /**
     * Whether to prioritize cost over performance
     */
    prioritizeCost?: boolean;
    /**
     * Maximum cost per million tokens (optional budget limit)
     */
    maxCostPerMillion?: number;
    /**
     * Minimum performance threshold (0-10 scale)
     */
    minPerformanceThreshold?: number;
    /**
     * Specific providers to include/exclude
     */
    providers?: string[];
    /**
     * Force refresh even if recent research exists
     */
    forceRefresh?: boolean;
    /**
     * Custom research prompt for specialized agents
     */
    customPrompt?: string;
}
/**
 * Research result from the agent
 */
export interface ResearchResult {
    /**
     * Selected model provider
     */
    provider: string;
    /**
     * Selected model name
     */
    model: string;
    /**
     * Reasoning for the selection
     */
    reasoning: string;
    /**
     * Performance score (0-10)
     */
    performanceScore: number;
    /**
     * Cost per million tokens
     */
    costPerMillion: number;
    /**
     * Timestamp of research
     */
    timestamp: Date;
}
/**
 * Researcher Agent Class
 *
 * This is a placeholder for the actual ResearcherAgent implementation
 * which would handle dynamic model discovery and selection
 */
export declare class ResearcherAgent {
    private user;
    private config?;
    constructor(user: AuthenticatedUser, config?: ResearchConfig);
    /**
     * Perform research to find the best model
     */
    research(): Promise<ResearchResult>;
    /**
     * Update configuration
     */
    updateConfig(config: ResearchConfig): void;
    /**
     * Conduct research and update configurations
     */
    conductResearchAndUpdate(): Promise<{
        summary: {
            configurationsUpdated: number;
            totalCostSavings: number;
            performanceImprovements: Record<string, number>;
        };
    }>;
}
