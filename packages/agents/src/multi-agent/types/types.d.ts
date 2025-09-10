import { AgentProvider, AgentRole } from '@codequal/core/config/agent-registry';
import { AnalysisResult } from '@codequal/core';
/**
 * Defines the position of an agent within a multi-agent system
 */
export declare enum AgentPosition {
    PRIMARY = "primary",// Main agent responsible for initial analysis
    SECONDARY = "secondary",// Enhances or validates primary agent's analysis
    FALLBACK = "fallback",// Used when primary or secondary agents fail
    SPECIALIST = "specialist"
}
/**
 * Defines the type of analysis to be performed
 */
export declare enum AnalysisStrategy {
    PARALLEL = "parallel",// Run all agents concurrently and combine results
    SEQUENTIAL = "sequential",// Run primary first, then secondary to enhance results
    SPECIALIZED = "specialized"
}
/**
 * Configuration for an individual agent within a multi-agent system
 */
export interface AgentConfig {
    provider: AgentProvider;
    modelVersion?: string;
    role: AgentRole;
    position: AgentPosition;
    priority?: number;
    filePatterns?: string[];
    maxTokens?: number;
    temperature?: number;
    customPrompt?: string;
    agentType?: string;
    parameters?: Record<string, any>;
    focusAreas?: string[];
    configuration?: Record<string, any>;
    fallbackConfiguration?: {
        model?: string;
        temperature?: number;
        maxTokens?: number;
        useOpenRouter?: boolean;
    };
}
/**
 * Repository data structure passed to agents
 */
export interface RepositoryData {
    owner: string;
    repo: string;
    prNumber?: number;
    branch?: string;
    files: RepositoryFile[];
}
/**
 * Repository file structure
 */
export interface RepositoryFile {
    path: string;
    content: string;
    diff?: string;
    previousContent?: string;
}
/**
 * Configuration for a multi-agent system
 */
export interface MultiAgentConfig {
    name: string;
    description?: string;
    strategy: AnalysisStrategy;
    agents: AgentConfig[];
    fallbackEnabled: boolean;
    fallbackTimeout?: number;
    fallbackRetries?: number;
    fallbackAgents?: AgentConfig[];
    fallbackStrategy?: 'ordered' | 'parallel';
    combineResults?: boolean;
    maxConcurrentAgents?: number;
    useMCP?: boolean;
    executionMode?: string;
    primary?: AgentConfig;
    secondaries?: AgentConfig[];
    fallbacks?: AgentConfig[];
    globalParameters?: Record<string, any>;
    analysisType?: string;
    repositoryProvider?: AgentConfig;
    repositoryInteraction?: AgentConfig;
    documentationProvider?: AgentConfig;
    testProvider?: AgentConfig;
    cicdProvider?: AgentConfig;
    orchestrator?: AgentConfig;
    reporter?: AgentConfig;
}
/**
 * Details about an agent failure for analytics
 */
export interface AgentFailureDetails {
    agentId: string;
    provider: AgentProvider;
    modelVersion?: string;
    errorType: string;
    errorMessage: string;
    timestamp: Date;
    executionDuration: number;
    promptTokens?: number;
    recoveryAttempted: boolean;
    recoverySuccessful?: boolean;
    recoveryStrategy?: string;
    partialOutput?: string;
    context?: Record<string, any>;
}
/**
 * Result details for a single agent in the multi-agent system
 */
export interface AgentResultDetails {
    result?: AnalysisResult;
    error?: Error;
    duration: number;
    agentConfig: AgentConfig;
    tokenUsage?: {
        input: number;
        output: number;
        total: number;
    };
    cost?: number;
    usedFallback?: boolean;
    fallbackAgent?: string;
    fallbackAttempts?: number;
    failureDetails?: AgentFailureDetails;
}
/**
 * Result of a multi-agent analysis
 */
export interface MultiAgentResult {
    analysisId: string;
    strategy: AnalysisStrategy;
    config: MultiAgentConfig;
    results: {
        [key: string]: AgentResultDetails;
    };
    combinedResult?: AnalysisResult;
    successful: boolean;
    duration: number;
    totalCost: number;
    usedFallback: boolean;
    fallbackStats?: {
        totalFallbackAttempts: number;
        successfulFallbacks: number;
        failedFallbacks: number;
    };
    failedAgents?: {
        [agentId: string]: AgentFailureDetails;
    };
    id?: string;
    metadata?: {
        timestamp?: string;
        duration?: number;
        config?: MultiAgentConfig;
        repositoryData?: RepositoryData;
        tokenUsage?: {
            input: number;
            output: number;
            totalCost: number;
        };
        errors?: any[];
    };
    errors?: any[];
}
