"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CancellationError = exports.TimeoutError = exports.TimeoutManager = void 0;
exports.createTimeoutManager = createTimeoutManager;
exports.withTimeout = withTimeout;
const utils_1 = require("@codequal/core/utils");
/**
 * Timeout manager for controlling agent execution timeouts with advanced features
 */
class TimeoutManager {
    constructor(config = {}) {
        this.logger = (0, utils_1.createLogger)('TimeoutManager');
        this.activeTimeouts = new Map();
        this.abortControllers = new Map();
        this.executionTimes = new Map();
        this.config = {
            defaultTimeout: config.defaultTimeout ?? 120000, // 2 minutes
            maxTimeout: config.maxTimeout ?? 600000, // 10 minutes
            minTimeout: config.minTimeout ?? 10000, // 10 seconds
            fallbackMultiplier: config.fallbackMultiplier ?? 1.5,
            gracePeriod: config.gracePeriod ?? 5000, // 5 seconds
            progressiveTimeout: config.progressiveTimeout ?? true,
            progressiveMultiplier: config.progressiveMultiplier ?? 1.3
        };
        this.logger.debug('TimeoutManager initialized', { config: this.config });
    }
    /**
     * Execute a function with timeout protection
     */
    async executeWithTimeout(operationId, operation, options = {}) {
        const startTime = Date.now();
        const timeout = this.calculateTimeout(options);
        this.logger.debug('Starting operation with timeout', {
            operationId,
            timeout,
            retryAttempt: options.retryAttempt ?? 0,
            isFallback: options.isFallback ?? false
        });
        // Create abort controller for graceful cancellation
        const abortController = new AbortController();
        this.abortControllers.set(operationId, abortController);
        try {
            const result = await Promise.race([
                this.executeOperation(operation, abortController.signal),
                this.createTimeoutPromise(operationId, timeout)
            ]);
            const executionTime = Date.now() - startTime;
            this.executionTimes.set(operationId, executionTime);
            this.logger.debug('Operation completed successfully', {
                operationId,
                executionTime,
                timeout
            });
            return {
                completed: true,
                result,
                executionTime,
                timedOut: false,
                cancelled: false
            };
        }
        catch (error) {
            const executionTime = Date.now() - startTime;
            const isTimeoutError = error instanceof TimeoutError;
            const isCancelledError = error instanceof CancellationError;
            this.logger.warn('Operation failed or timed out', {
                operationId,
                executionTime,
                timeout,
                timedOut: isTimeoutError,
                cancelled: isCancelledError,
                error: error instanceof Error ? error.message : error
            });
            return {
                completed: false,
                error: error instanceof Error ? error : new Error(String(error)),
                executionTime,
                timedOut: isTimeoutError,
                cancelled: isCancelledError
            };
        }
        finally {
            this.cleanup(operationId);
        }
    }
    /**
     * Cancel a running operation
     */
    cancelOperation(operationId, reason = 'User requested cancellation') {
        const abortController = this.abortControllers.get(operationId);
        if (abortController) {
            this.logger.info('Cancelling operation', { operationId, reason });
            abortController.abort();
            this.cleanup(operationId);
            return true;
        }
        return false;
    }
    /**
     * Cancel all running operations
     */
    cancelAllOperations(reason = 'System shutdown') {
        const operationIds = Array.from(this.abortControllers.keys());
        this.logger.info('Cancelling all operations', {
            count: operationIds.length,
            reason
        });
        for (const operationId of operationIds) {
            this.cancelOperation(operationId, reason);
        }
        return operationIds.length;
    }
    /**
     * Get statistics about running operations
     */
    getStatistics() {
        return {
            activeOperations: this.abortControllers.size,
            averageExecutionTime: this.calculateAverageExecutionTime(),
            longestOperation: this.findLongestOperation(),
            config: this.config
        };
    }
    /**
     * Check if an operation is currently running
     */
    isOperationRunning(operationId) {
        return this.abortControllers.has(operationId);
    }
    /**
     * Get list of currently running operations
     */
    getRunningOperations() {
        return Array.from(this.abortControllers.keys());
    }
    /**
     * Calculate appropriate timeout based on options
     */
    calculateTimeout(options) {
        let timeout = options.timeout ?? this.config.defaultTimeout;
        // Apply fallback multiplier
        if (options.isFallback) {
            timeout *= this.config.fallbackMultiplier;
        }
        // Apply progressive timeout for retries
        if (this.config.progressiveTimeout && options.retryAttempt && options.retryAttempt > 0) {
            timeout *= Math.pow(this.config.progressiveMultiplier, options.retryAttempt);
        }
        // Ensure timeout is within bounds
        timeout = Math.max(this.config.minTimeout, timeout);
        timeout = Math.min(this.config.maxTimeout, timeout);
        return timeout;
    }
    /**
     * Execute operation with abort signal support
     */
    async executeOperation(operation, signal) {
        // Check if already cancelled
        if (signal.aborted) {
            throw new CancellationError('Operation was cancelled before execution');
        }
        // Add abort listener to throw cancellation error
        return new Promise((resolve, reject) => {
            // Set up abort listener
            const abortListener = () => {
                reject(new CancellationError('Operation was cancelled'));
            };
            signal.addEventListener('abort', abortListener);
            // Execute the operation
            operation(signal)
                .then(resolve)
                .catch(reject)
                .finally(() => {
                signal.removeEventListener('abort', abortListener);
            });
        });
    }
    /**
     * Create a timeout promise that rejects after specified time
     */
    createTimeoutPromise(operationId, timeout) {
        return new Promise((_, reject) => {
            const timeoutHandle = setTimeout(() => {
                this.logger.warn('Operation timed out', { operationId, timeout });
                reject(new TimeoutError(`Operation ${operationId} timed out after ${timeout}ms`));
            }, timeout);
            this.activeTimeouts.set(operationId, timeoutHandle);
        });
    }
    /**
     * Cleanup resources for completed/cancelled operation
     */
    cleanup(operationId) {
        // Clear timeout
        const timeoutHandle = this.activeTimeouts.get(operationId);
        if (timeoutHandle) {
            clearTimeout(timeoutHandle);
            this.activeTimeouts.delete(operationId);
        }
        // Remove abort controller
        this.abortControllers.delete(operationId);
        this.logger.debug('Cleaned up operation resources', { operationId });
    }
    /**
     * Calculate average execution time
     */
    calculateAverageExecutionTime() {
        const times = Array.from(this.executionTimes.values());
        if (times.length === 0)
            return 0;
        return times.reduce((sum, time) => sum + time, 0) / times.length;
    }
    /**
     * Find the longest running operation
     */
    findLongestOperation() {
        let longest = null;
        const now = Date.now();
        for (const [operationId] of this.abortControllers) {
            const startTime = this.executionTimes.get(operationId);
            if (startTime) {
                const duration = now - startTime;
                if (!longest || duration > longest.duration) {
                    longest = { operationId, duration };
                }
            }
        }
        return longest;
    }
}
exports.TimeoutManager = TimeoutManager;
/**
 * Timeout error class
 */
class TimeoutError extends Error {
    constructor(message) {
        super(message);
        this.name = 'TimeoutError';
    }
}
exports.TimeoutError = TimeoutError;
/**
 * Cancellation error class
 */
class CancellationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'CancellationError';
    }
}
exports.CancellationError = CancellationError;
/**
 * Utility function to create timeout manager with sensible defaults
 */
function createTimeoutManager(options) {
    const { mode } = options;
    const baseConfig = {
        gracePeriod: 5000,
        progressiveTimeout: true,
        progressiveMultiplier: 1.3
    };
    switch (mode) {
        case 'development':
            return new TimeoutManager({
                ...baseConfig,
                defaultTimeout: 180000, // 3 minutes
                maxTimeout: 600000, // 10 minutes
                minTimeout: 15000, // 15 seconds
                fallbackMultiplier: 1.5
            });
        case 'production':
            return new TimeoutManager({
                ...baseConfig,
                defaultTimeout: 120000, // 2 minutes
                maxTimeout: 300000, // 5 minutes
                minTimeout: 10000, // 10 seconds
                fallbackMultiplier: 1.3
            });
        case 'testing':
            return new TimeoutManager({
                ...baseConfig,
                defaultTimeout: 30000, // 30 seconds
                maxTimeout: 60000, // 1 minute
                minTimeout: 5000, // 5 seconds
                fallbackMultiplier: 1.2,
                progressiveTimeout: false
            });
        default:
            return new TimeoutManager(baseConfig);
    }
}
/**
 * Timeout decorator for class methods
 */
function withTimeout(timeout = 120000, operationIdGenerator) {
    return function (target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = async function (...args) {
            const timeoutManager = new TimeoutManager();
            const operationId = operationIdGenerator
                ? operationIdGenerator(target, propertyKey, args)
                : `${target.constructor.name}.${propertyKey}-${Date.now()}`;
            const result = await timeoutManager.executeWithTimeout(operationId, () => originalMethod.apply(this, args), { timeout });
            if (!result.completed) {
                throw result.error || new Error('Operation failed');
            }
            return result.result;
        };
        return descriptor;
    };
}
