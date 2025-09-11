import { AgentConfig, AnalysisStrategy } from './types';
/**
 * Execution event types
 */
export declare enum ExecutionEventType {
    EXECUTION_STARTED = "execution_started",
    AGENT_STARTED = "agent_started",
    AGENT_COMPLETED = "agent_completed",
    AGENT_FAILED = "agent_failed",
    AGENT_RETRIED = "agent_retried",
    FALLBACK_TRIGGERED = "fallback_triggered",
    EXECUTION_COMPLETED = "execution_completed",
    EXECUTION_FAILED = "execution_failed",
    RESOURCE_THRESHOLD_REACHED = "resource_threshold_reached",
    PERFORMANCE_WARNING = "performance_warning"
}
/**
 * Execution event data
 */
export interface ExecutionEvent {
    /** Event type */
    type: ExecutionEventType;
    /** Timestamp */
    timestamp: number;
    /** Execution ID */
    executionId: string;
    /** Agent ID (if applicable) */
    agentId?: string;
    /** Event data */
    data: Record<string, any>;
    /** Event metadata */
    metadata: {
        duration?: number;
        tokenUsage?: number;
        memoryUsage?: number;
        errorMessage?: string;
        retryCount?: number;
        priority?: number;
    };
}
/**
 * Real-time execution metrics
 */
export interface ExecutionMetrics {
    /** Overall execution metrics */
    execution: {
        id: string;
        startTime: number;
        duration: number;
        status: 'running' | 'completed' | 'failed';
        strategy: AnalysisStrategy;
        totalAgents: number;
        completedAgents: number;
        failedAgents: number;
        retryCount: number;
    };
    /** Resource usage metrics */
    resources: {
        tokenUsage: {
            total: number;
            input: number;
            output: number;
            cost: number;
        };
        memoryUsage: {
            current: number;
            peak: number;
            average: number;
        };
        concurrency: {
            current: number;
            peak: number;
            average: number;
        };
    };
    /** Performance metrics */
    performance: {
        averageAgentDuration: number;
        slowestAgent: {
            agentId: string;
            duration: number;
        } | null;
        fastestAgent: {
            agentId: string;
            duration: number;
        } | null;
        throughput: {
            agentsPerSecond: number;
            tokensPerSecond: number;
        };
        reliability: {
            successRate: number;
            fallbackRate: number;
            retryRate: number;
        };
    };
    /** Real-time status */
    realtime: {
        runningAgents: Array<{
            agentId: string;
            startTime: number;
            duration: number;
            estimatedCompletion?: number;
        }>;
        queuedAgents: Array<{
            agentId: string;
            priority: number;
            estimatedStartTime?: number;
        }>;
        completedAgents: Array<{
            agentId: string;
            duration: number;
            tokenUsage: number;
            success: boolean;
        }>;
    };
}
/**
 * Execution monitoring configuration
 */
export interface MonitorConfig {
    /** Enable real-time metrics collection */
    enableMetrics: boolean;
    /** Enable event streaming */
    enableEvents: boolean;
    /** Event buffer size */
    eventBufferSize: number;
    /** Metrics update interval (ms) */
    metricsInterval: number;
    /** Enable performance warnings */
    enableWarnings: boolean;
    /** Warning thresholds */
    thresholds: {
        agentDurationWarning: number;
        tokenUsageWarning: number;
        memoryUsageWarning: number;
        failureRateWarning: number;
    };
    /** Event callbacks */
    callbacks?: {
        onEvent?: (event: ExecutionEvent) => void;
        onMetricsUpdate?: (metrics: ExecutionMetrics) => void;
        onWarning?: (warning: {
            type: string;
            message: string;
            data: any;
        }) => void;
    };
}
/**
 * Comprehensive execution monitor for multi-agent operations
 */
export declare class ExecutionMonitor {
    private readonly logger;
    private readonly config;
    private readonly executions;
    private readonly events;
    private readonly metricsHistory;
    private executionId;
    private executionStartTime;
    private strategy;
    private metricsUpdateTimer?;
    constructor(config?: Partial<MonitorConfig>);
    /**
     * Start monitoring an execution
     */
    startExecution(executionId: string, strategy: AnalysisStrategy, totalAgents: number): void;
    /**
     * Track agent start
     */
    startAgent(agentId: string, config: AgentConfig, priority?: number): void;
    /**
     * Track agent completion
     */
    completeAgent(agentId: string, result: any, tokenUsage?: {
        input: number;
        output: number;
    }, memoryUsage?: number): void;
    /**
     * Track agent failure
     */
    failAgent(agentId: string, error: Error): void;
    /**
     * Track agent retry
     */
    retryAgent(agentId: string, retryCount: number, reason: string): void;
    /**
     * Track fallback trigger
     */
    triggerFallback(originalAgentId: string, fallbackAgentId: string, reason: string): void;
    /**
     * Complete the entire execution
     */
    completeExecution(success: boolean, finalResult?: any): void;
    /**
     * Get current execution metrics
     */
    getMetrics(): ExecutionMetrics;
    /**
     * Get execution events
     */
    getEvents(since?: number): ExecutionEvent[];
    /**
     * Get execution summary
     */
    getSummary(): {
        execution: {
            id: string;
            startTime: number;
            duration: number;
            status: "running" | "completed" | "failed";
            strategy: AnalysisStrategy;
            totalAgents: number;
            completedAgents: number;
            failedAgents: number;
            retryCount: number;
        };
        performance: {
            averageAgentDuration: number;
            slowestAgent: {
                agentId: string;
                duration: number;
            } | null;
            fastestAgent: {
                agentId: string;
                duration: number;
            } | null;
            throughput: {
                agentsPerSecond: number;
                tokensPerSecond: number;
            };
            reliability: {
                successRate: number;
                fallbackRate: number;
                retryRate: number;
            };
        };
        eventCount: number;
        lastUpdate: number;
    };
    /**
     * Add event to buffer
     */
    private addEvent;
    /**
     * Start periodic metrics updates
     */
    private startMetricsUpdates;
    /**
     * Check for performance warnings
     */
    private checkPerformanceWarnings;
    /**
     * Emit warning
     */
    private emitWarning;
    private getExecutionStatus;
    private getCurrentMemoryUsage;
    private getPeakMemoryUsage;
    private getAverageMemoryUsage;
    private getPeakConcurrency;
    private getAverageConcurrency;
    private estimateCompletion;
    private estimateStartTime;
}
