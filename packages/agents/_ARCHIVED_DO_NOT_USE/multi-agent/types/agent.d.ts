import { AgentProvider, AgentRole } from '@codequal/core/config/agent-registry';
import { AnalysisResult } from '@codequal/core';
import { AgentConfig, AgentPosition, RepositoryData } from './types';
/**
 * Interface for multi-agent agent implementation
 */
export interface MultiAgent {
    id: string;
    config: AgentConfig;
    initialize(): Promise<void>;
    analyze(data: RepositoryData): Promise<AnalysisResult>;
    terminate(): Promise<void>;
}
/**
 * Options for creating a multi-agent
 */
export interface MultiAgentOptions {
    provider: AgentProvider;
    role: AgentRole;
    position: AgentPosition;
    modelVersion?: string;
    maxTokens?: number;
    temperature?: number;
    customPrompt?: string;
    parameters?: Record<string, any>;
}
/**
 * Factory function type for creating multi-agents
 */
export type MultiAgentFactory = (options: MultiAgentOptions) => Promise<MultiAgent>;
/**
 * Error thrown when an agent fails to process a request
 */
export declare class MultiAgentError extends Error {
    readonly agentId: string;
    readonly provider: AgentProvider;
    readonly errorType: string;
    readonly executionDuration: number;
    readonly context?: Record<string, any> | undefined;
    constructor(message: string, agentId: string, provider: AgentProvider, errorType: string, executionDuration: number, context?: Record<string, any> | undefined);
}
/**
 * Special agent types supported by the system
 */
export declare enum SpecialAgentType {
    REPOSITORY = "repository",
    DOCUMENTATION = "documentation",
    TEST = "test",
    CICD = "cicd",
    ORCHESTRATOR = "orchestrator",
    REPORTER = "reporter"
}
/**
 * Agent execution result with detailed metrics for analysis
 */
export interface AgentExecutionResult {
    agentId: string;
    provider: AgentProvider;
    modelVersion?: string;
    result?: AnalysisResult;
    error?: Error;
    duration: number;
    successful: boolean;
    tokenUsage: {
        input: number;
        output: number;
        total: number;
    };
    cost: number;
    timestamp: Date;
    specialType?: SpecialAgentType;
}
