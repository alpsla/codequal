import { AgentConfig, AnalysisStrategy, RepositoryData } from './types';
/**
 * Execution context passed to strategies
 */
export interface ExecutionContext {
    repositoryData: RepositoryData;
    agents: AgentConfig[];
    options: {
        maxConcurrentAgents: number;
        tokenBudget: number;
        timeoutMs: number;
        debug: boolean;
    };
    additionalContext?: Record<string, any>;
}
/**
 * Result from strategy execution
 */
export interface StrategyExecutionResult {
    results: any[];
    metadata: {
        duration: number;
        tokenUsage: number;
        successfulAgents: number;
        failedAgents: number;
        strategy: AnalysisStrategy;
    };
}
/**
 * Base execution strategy interface
 */
export interface ExecutionStrategy {
    execute(context: ExecutionContext): Promise<StrategyExecutionResult>;
    getName(): string;
    getDescription(): string;
}
/**
 * Parallel execution strategy - all agents run concurrently
 */
export declare class ParallelExecutionStrategy implements ExecutionStrategy {
    private readonly logger;
    getName(): string;
    getDescription(): string;
    execute(context: ExecutionContext): Promise<StrategyExecutionResult>;
    private executeAgent;
    private calculateTokenUsage;
}
/**
 * Sequential execution strategy - agents run one after another with context passing
 */
export declare class SequentialExecutionStrategy implements ExecutionStrategy {
    private readonly logger;
    getName(): string;
    getDescription(): string;
    execute(context: ExecutionContext): Promise<StrategyExecutionResult>;
    private executeAgentWithContext;
    private calculateTokenUsage;
}
/**
 * Specialized execution strategy - agents run based on file patterns and expertise
 */
export declare class SpecializedExecutionStrategy implements ExecutionStrategy {
    private readonly logger;
    getName(): string;
    getDescription(): string;
    execute(context: ExecutionContext): Promise<StrategyExecutionResult>;
    private groupAgentsBySpecialization;
    private getSpecializationName;
    private executeSpecializationGroup;
    private executeSpecializedAgent;
    private calculateTokenUsage;
}
/**
 * Hybrid execution strategy - combines parallel and sequential approaches
 */
export declare class HybridExecutionStrategy implements ExecutionStrategy {
    private readonly logger;
    getName(): string;
    getDescription(): string;
    execute(context: ExecutionContext): Promise<StrategyExecutionResult>;
    private calculateTokenUsage;
}
/**
 * Strategy factory for creating execution strategies
 */
export declare class ExecutionStrategyFactory {
    private static strategies;
    static createStrategy(strategy: AnalysisStrategy): ExecutionStrategy;
    static createHybridStrategy(): ExecutionStrategy;
    static getAvailableStrategies(): Array<{
        strategy: AnalysisStrategy;
        description: string;
    }>;
}
