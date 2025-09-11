/**
 * Timeout configuration options
 */
export interface TimeoutConfig {
    /** Default timeout for agent execution (ms) */
    defaultTimeout: number;
    /** Maximum timeout allowed (ms) */
    maxTimeout: number;
    /** Minimum timeout allowed (ms) */
    minTimeout: number;
    /** Timeout multiplier for fallback agents */
    fallbackMultiplier: number;
    /** Grace period for cleanup operations (ms) */
    gracePeriod: number;
    /** Enable progressive timeout (longer timeouts for subsequent retries) */
    progressiveTimeout: boolean;
    /** Timeout scaling factor for progressive timeout */
    progressiveMultiplier: number;
}
/**
 * Timeout result interface
 */
export interface TimeoutResult<T> {
    /** Whether the operation completed within timeout */
    completed: boolean;
    /** Result if completed successfully */
    result?: T;
    /** Error if operation failed or timed out */
    error?: Error;
    /** Actual execution time */
    executionTime: number;
    /** Whether operation was cancelled due to timeout */
    timedOut: boolean;
    /** Whether operation was cancelled due to external signal */
    cancelled: boolean;
}
/**
 * Timeout manager for controlling agent execution timeouts with advanced features
 */
export declare class TimeoutManager {
    private readonly logger;
    private readonly config;
    private readonly activeTimeouts;
    private readonly abortControllers;
    private readonly executionTimes;
    constructor(config?: Partial<TimeoutConfig>);
    /**
     * Execute a function with timeout protection
     */
    executeWithTimeout<T>(operationId: string, operation: (signal?: AbortSignal) => Promise<T>, options?: {
        timeout?: number;
        retryAttempt?: number;
        isFallback?: boolean;
        metadata?: Record<string, any>;
    }): Promise<TimeoutResult<T>>;
    /**
     * Cancel a running operation
     */
    cancelOperation(operationId: string, reason?: string): boolean;
    /**
     * Cancel all running operations
     */
    cancelAllOperations(reason?: string): number;
    /**
     * Get statistics about running operations
     */
    getStatistics(): {
        activeOperations: number;
        averageExecutionTime: number;
        longestOperation: {
            operationId: string;
            duration: number;
        } | null;
        config: TimeoutConfig;
    };
    /**
     * Check if an operation is currently running
     */
    isOperationRunning(operationId: string): boolean;
    /**
     * Get list of currently running operations
     */
    getRunningOperations(): string[];
    /**
     * Calculate appropriate timeout based on options
     */
    private calculateTimeout;
    /**
     * Execute operation with abort signal support
     */
    private executeOperation;
    /**
     * Create a timeout promise that rejects after specified time
     */
    private createTimeoutPromise;
    /**
     * Cleanup resources for completed/cancelled operation
     */
    private cleanup;
    /**
     * Calculate average execution time
     */
    private calculateAverageExecutionTime;
    /**
     * Find the longest running operation
     */
    private findLongestOperation;
}
/**
 * Timeout error class
 */
export declare class TimeoutError extends Error {
    constructor(message: string);
}
/**
 * Cancellation error class
 */
export declare class CancellationError extends Error {
    constructor(message: string);
}
/**
 * Utility function to create timeout manager with sensible defaults
 */
export declare function createTimeoutManager(options: {
    mode: 'development' | 'production' | 'testing';
    maxConcurrent?: number;
}): TimeoutManager;
/**
 * Timeout decorator for class methods
 */
export declare function withTimeout(timeout?: number, operationIdGenerator?: (target: any, propertyKey: string, args: any[]) => string): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
