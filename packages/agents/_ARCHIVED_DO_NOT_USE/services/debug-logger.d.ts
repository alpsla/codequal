/**
 * Comprehensive Debug Logger for Agent and Tool Execution
 * Provides detailed logging for troubleshooting and monitoring
 */
export interface DebugContext {
    executionId: string;
    agentId?: string;
    toolId?: string;
    phase: string;
    metadata?: Record<string, any>;
}
export interface ExecutionTrace {
    id: string;
    timestamp: Date;
    type: 'agent' | 'tool' | 'system';
    phase: string;
    status: 'started' | 'in_progress' | 'completed' | 'failed';
    duration?: number;
    input?: any;
    output?: any;
    error?: any;
    metadata?: Record<string, any>;
}
export declare class DebugLogger {
    private logger;
    private traces;
    private activeExecutions;
    private debugMode;
    constructor(debugMode?: boolean);
    /**
     * Start tracking an execution
     */
    startExecution(type: 'agent' | 'tool' | 'system', id: string, phase: string, input?: any, metadata?: Record<string, any>): string;
    /**
     * Update execution progress
     */
    updateExecution(executionId: string, update: Partial<ExecutionTrace>): void;
    /**
     * Complete an execution
     */
    completeExecution(executionId: string, output?: any, metadata?: Record<string, any>): void;
    /**
     * Fail an execution
     */
    failExecution(executionId: string, error: any, metadata?: Record<string, any>): void;
    /**
     * Log agent execution details
     */
    logAgentExecution(agentId: string, phase: string, details: {
        config?: any;
        context?: any;
        toolResults?: any;
        result?: any;
        error?: any;
        duration?: number;
    }): void;
    /**
     * Log tool execution details
     */
    logToolExecution(toolId: string, agentRole: string, details: {
        input?: any;
        output?: any;
        findings?: any[];
        error?: any;
        duration?: number;
        metadata?: any;
    }): void;
    /**
     * Get execution traces for debugging
     */
    getTraces(id?: string): ExecutionTrace[];
    /**
     * Get execution summary
     */
    getSummary(): {
        totalExecutions: number;
        activeExecutions: number;
        completedExecutions: number;
        failedExecutions: number;
        averageDuration: number;
        byType: Record<string, number>;
        byPhase: Record<string, number>;
    };
    /**
     * Export traces for analysis
     */
    exportTraces(): string;
    /**
     * Clear all traces
     */
    clearTraces(): void;
    /**
     * Sanitize input data to prevent logging sensitive information
     */
    private sanitizeInput;
    /**
     * Sanitize output data
     */
    private sanitizeOutput;
    /**
     * Sanitize error objects
     */
    private sanitizeError;
    /**
     * Sanitize execution details
     */
    private sanitizeDetails;
    /**
     * Remove sensitive fields from object
     */
    private removeSensitiveFields;
    /**
     * Extract summary from large objects
     */
    private extractSummary;
    /**
     * Enable or disable debug mode
     */
    setDebugMode(enabled: boolean): void;
}
/**
 * Get or create debug logger instance
 */
export declare function getDebugLogger(debugMode?: boolean): DebugLogger;
