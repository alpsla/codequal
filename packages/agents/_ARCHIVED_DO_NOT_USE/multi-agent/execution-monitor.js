"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutionMonitor = exports.ExecutionEventType = void 0;
const utils_1 = require("@codequal/core/utils");
const types_1 = require("./types");
/**
 * Execution event types
 */
var ExecutionEventType;
(function (ExecutionEventType) {
    ExecutionEventType["EXECUTION_STARTED"] = "execution_started";
    ExecutionEventType["AGENT_STARTED"] = "agent_started";
    ExecutionEventType["AGENT_COMPLETED"] = "agent_completed";
    ExecutionEventType["AGENT_FAILED"] = "agent_failed";
    ExecutionEventType["AGENT_RETRIED"] = "agent_retried";
    ExecutionEventType["FALLBACK_TRIGGERED"] = "fallback_triggered";
    ExecutionEventType["EXECUTION_COMPLETED"] = "execution_completed";
    ExecutionEventType["EXECUTION_FAILED"] = "execution_failed";
    ExecutionEventType["RESOURCE_THRESHOLD_REACHED"] = "resource_threshold_reached";
    ExecutionEventType["PERFORMANCE_WARNING"] = "performance_warning";
})(ExecutionEventType || (exports.ExecutionEventType = ExecutionEventType = {}));
/**
 * Comprehensive execution monitor for multi-agent operations
 */
class ExecutionMonitor {
    constructor(config = {}) {
        this.logger = (0, utils_1.createLogger)('ExecutionMonitor');
        this.executions = new Map();
        this.events = [];
        this.metricsHistory = [];
        this.executionId = '';
        this.executionStartTime = 0;
        this.strategy = types_1.AnalysisStrategy.PARALLEL;
        this.config = {
            enableMetrics: config.enableMetrics ?? true,
            enableEvents: config.enableEvents ?? true,
            eventBufferSize: config.eventBufferSize ?? 1000,
            metricsInterval: config.metricsInterval ?? 5000,
            enableWarnings: config.enableWarnings ?? true,
            thresholds: {
                agentDurationWarning: config.thresholds?.agentDurationWarning ?? 180000, // 3 minutes
                tokenUsageWarning: config.thresholds?.tokenUsageWarning ?? 50000,
                memoryUsageWarning: config.thresholds?.memoryUsageWarning ?? 500 * 1024 * 1024, // 500MB
                failureRateWarning: config.thresholds?.failureRateWarning ?? 0.3, // 30%
                ...config.thresholds
            },
            callbacks: config.callbacks
        };
        this.logger.debug('ExecutionMonitor initialized', { config: this.config });
    }
    /**
     * Start monitoring an execution
     */
    startExecution(executionId, strategy, totalAgents) {
        this.executionId = executionId;
        this.executionStartTime = Date.now();
        this.strategy = strategy;
        this.addEvent({
            type: ExecutionEventType.EXECUTION_STARTED,
            timestamp: Date.now(),
            executionId,
            data: {
                strategy,
                totalAgents
            },
            metadata: {}
        });
        // Start metrics updates if enabled
        if (this.config.enableMetrics) {
            this.startMetricsUpdates();
        }
        this.logger.info('Started monitoring execution', {
            executionId,
            strategy,
            totalAgents
        });
    }
    /**
     * Track agent start
     */
    startAgent(agentId, config, priority) {
        const execution = {
            agentId,
            config,
            startTime: Date.now(),
            status: 'running',
            retryCount: 0,
            fallbackUsed: false,
            priority
        };
        this.executions.set(agentId, execution);
        this.addEvent({
            type: ExecutionEventType.AGENT_STARTED,
            timestamp: Date.now(),
            executionId: this.executionId,
            agentId,
            data: {
                provider: config.provider,
                role: config.role,
                priority
            },
            metadata: {
                priority
            }
        });
        this.logger.debug('Agent started', { agentId, provider: config.provider, role: config.role });
    }
    /**
     * Track agent completion
     */
    completeAgent(agentId, result, tokenUsage, memoryUsage) {
        const execution = this.executions.get(agentId);
        if (!execution) {
            this.logger.warn('Attempted to complete unknown agent', { agentId });
            return;
        }
        const endTime = Date.now();
        const duration = endTime - execution.startTime;
        execution.endTime = endTime;
        execution.duration = duration;
        execution.status = 'completed';
        execution.tokenUsage = tokenUsage ? {
            ...tokenUsage,
            total: tokenUsage.input + tokenUsage.output
        } : undefined;
        execution.memoryUsage = memoryUsage;
        this.addEvent({
            type: ExecutionEventType.AGENT_COMPLETED,
            timestamp: endTime,
            executionId: this.executionId,
            agentId,
            data: {
                result,
                fallbackUsed: execution.fallbackUsed
            },
            metadata: {
                duration,
                tokenUsage: execution.tokenUsage?.total,
                memoryUsage
            }
        });
        // Check for performance warnings
        this.checkPerformanceWarnings(execution);
        this.logger.debug('Agent completed', {
            agentId,
            duration,
            tokenUsage: execution.tokenUsage?.total,
            fallbackUsed: execution.fallbackUsed
        });
    }
    /**
     * Track agent failure
     */
    failAgent(agentId, error) {
        const execution = this.executions.get(agentId);
        if (!execution) {
            this.logger.warn('Attempted to fail unknown agent', { agentId });
            return;
        }
        const endTime = Date.now();
        const duration = endTime - execution.startTime;
        execution.endTime = endTime;
        execution.duration = duration;
        execution.status = 'failed';
        execution.error = error;
        this.addEvent({
            type: ExecutionEventType.AGENT_FAILED,
            timestamp: endTime,
            executionId: this.executionId,
            agentId,
            data: {
                error: error.message,
                fallbackUsed: execution.fallbackUsed
            },
            metadata: {
                duration,
                errorMessage: error.message
            }
        });
        this.logger.warn('Agent failed', {
            agentId,
            duration,
            error: error.message
        });
    }
    /**
     * Track agent retry
     */
    retryAgent(agentId, retryCount, reason) {
        const execution = this.executions.get(agentId);
        if (execution) {
            execution.retryCount = retryCount;
            execution.status = 'running'; // Reset to running
            execution.startTime = Date.now(); // Reset start time for retry
        }
        this.addEvent({
            type: ExecutionEventType.AGENT_RETRIED,
            timestamp: Date.now(),
            executionId: this.executionId,
            agentId,
            data: {
                reason,
                retryCount
            },
            metadata: {
                retryCount
            }
        });
        this.logger.info('Agent retry', { agentId, retryCount, reason });
    }
    /**
     * Track fallback trigger
     */
    triggerFallback(originalAgentId, fallbackAgentId, reason) {
        const execution = this.executions.get(originalAgentId);
        if (execution) {
            execution.fallbackUsed = true;
        }
        this.addEvent({
            type: ExecutionEventType.FALLBACK_TRIGGERED,
            timestamp: Date.now(),
            executionId: this.executionId,
            agentId: originalAgentId,
            data: {
                fallbackAgentId,
                reason
            },
            metadata: {}
        });
        this.logger.info('Fallback triggered', {
            originalAgentId,
            fallbackAgentId,
            reason
        });
    }
    /**
     * Complete the entire execution
     */
    completeExecution(success, finalResult) {
        const duration = Date.now() - this.executionStartTime;
        this.addEvent({
            type: success ? ExecutionEventType.EXECUTION_COMPLETED : ExecutionEventType.EXECUTION_FAILED,
            timestamp: Date.now(),
            executionId: this.executionId,
            data: {
                success,
                finalResult
            },
            metadata: {
                duration
            }
        });
        // Stop metrics updates
        if (this.metricsUpdateTimer) {
            clearInterval(this.metricsUpdateTimer);
            this.metricsUpdateTimer = undefined;
        }
        // Final metrics update
        if (this.config.enableMetrics) {
            const finalMetrics = this.getMetrics();
            this.metricsHistory.push({
                timestamp: Date.now(),
                metrics: finalMetrics
            });
            if (this.config.callbacks?.onMetricsUpdate) {
                this.config.callbacks.onMetricsUpdate(finalMetrics);
            }
        }
        this.logger.info('Execution completed', {
            executionId: this.executionId,
            success,
            duration,
            totalAgents: this.executions.size
        });
    }
    /**
     * Get current execution metrics
     */
    getMetrics() {
        const now = Date.now();
        const executions = Array.from(this.executions.values());
        const completedExecutions = executions.filter(e => e.status === 'completed');
        const failedExecutions = executions.filter(e => e.status === 'failed');
        const runningExecutions = executions.filter(e => e.status === 'running');
        const queuedExecutions = executions.filter(e => e.status === 'queued');
        // Calculate resource usage
        const totalTokenUsage = completedExecutions.reduce((sum, e) => sum + (e.tokenUsage?.total || 0), 0);
        const totalInputTokens = completedExecutions.reduce((sum, e) => sum + (e.tokenUsage?.input || 0), 0);
        const totalOutputTokens = completedExecutions.reduce((sum, e) => sum + (e.tokenUsage?.output || 0), 0);
        // Calculate performance metrics
        const durations = completedExecutions
            .map(e => e.duration || 0)
            .filter(d => d > 0);
        const averageDuration = durations.length > 0
            ? durations.reduce((sum, d) => sum + d, 0) / durations.length
            : 0;
        const slowestAgent = durations.length > 0
            ? completedExecutions.reduce((slowest, current) => (current.duration || 0) > (slowest?.duration || 0) ? current : slowest)
            : null;
        const fastestAgent = durations.length > 0
            ? completedExecutions.reduce((fastest, current) => (current.duration || 0) < (fastest?.duration || 0) ? current : fastest)
            : null;
        const executionDuration = now - this.executionStartTime;
        const successRate = executions.length > 0
            ? completedExecutions.length / executions.length
            : 0;
        const fallbackRate = executions.length > 0
            ? executions.filter(e => e.fallbackUsed).length / executions.length
            : 0;
        const retryRate = executions.length > 0
            ? executions.filter(e => e.retryCount > 0).length / executions.length
            : 0;
        return {
            execution: {
                id: this.executionId,
                startTime: this.executionStartTime,
                duration: executionDuration,
                status: this.getExecutionStatus(),
                strategy: this.strategy,
                totalAgents: executions.length,
                completedAgents: completedExecutions.length,
                failedAgents: failedExecutions.length,
                retryCount: executions.reduce((sum, e) => sum + e.retryCount, 0)
            },
            resources: {
                tokenUsage: {
                    total: totalTokenUsage,
                    input: totalInputTokens,
                    output: totalOutputTokens,
                    cost: totalTokenUsage * 0.002 // Example cost calculation
                },
                memoryUsage: {
                    current: this.getCurrentMemoryUsage(),
                    peak: this.getPeakMemoryUsage(),
                    average: this.getAverageMemoryUsage()
                },
                concurrency: {
                    current: runningExecutions.length,
                    peak: this.getPeakConcurrency(),
                    average: this.getAverageConcurrency()
                }
            },
            performance: {
                averageAgentDuration: averageDuration,
                slowestAgent: slowestAgent ? {
                    agentId: slowestAgent.agentId,
                    duration: slowestAgent.duration || 0
                } : null,
                fastestAgent: fastestAgent ? {
                    agentId: fastestAgent.agentId,
                    duration: fastestAgent.duration || 0
                } : null,
                throughput: {
                    agentsPerSecond: executionDuration > 0
                        ? (completedExecutions.length / executionDuration) * 1000
                        : 0,
                    tokensPerSecond: executionDuration > 0
                        ? (totalTokenUsage / executionDuration) * 1000
                        : 0
                },
                reliability: {
                    successRate,
                    fallbackRate,
                    retryRate
                }
            },
            realtime: {
                runningAgents: runningExecutions.map(e => ({
                    agentId: e.agentId,
                    startTime: e.startTime,
                    duration: now - e.startTime,
                    estimatedCompletion: this.estimateCompletion(e)
                })),
                queuedAgents: queuedExecutions.map(e => ({
                    agentId: e.agentId,
                    priority: e.priority || 0,
                    estimatedStartTime: this.estimateStartTime(e)
                })),
                completedAgents: completedExecutions.map(e => ({
                    agentId: e.agentId,
                    duration: e.duration || 0,
                    tokenUsage: e.tokenUsage?.total || 0,
                    success: e.status === 'completed'
                }))
            }
        };
    }
    /**
     * Get execution events
     */
    getEvents(since) {
        if (since) {
            return this.events.filter(event => event.timestamp >= since);
        }
        return [...this.events];
    }
    /**
     * Get execution summary
     */
    getSummary() {
        const metrics = this.getMetrics();
        const events = this.getEvents();
        return {
            execution: metrics.execution,
            performance: metrics.performance,
            eventCount: events.length,
            lastUpdate: Date.now()
        };
    }
    /**
     * Add event to buffer
     */
    addEvent(event) {
        if (!this.config.enableEvents)
            return;
        this.events.push(event);
        // Trim buffer if too large
        if (this.events.length > this.config.eventBufferSize) {
            this.events.splice(0, this.events.length - this.config.eventBufferSize);
        }
        // Call event callback if provided
        if (this.config.callbacks?.onEvent) {
            this.config.callbacks.onEvent(event);
        }
    }
    /**
     * Start periodic metrics updates
     */
    startMetricsUpdates() {
        if (this.metricsUpdateTimer)
            return;
        this.metricsUpdateTimer = setInterval(() => {
            const metrics = this.getMetrics();
            this.metricsHistory.push({
                timestamp: Date.now(),
                metrics
            });
            // Trim history if too large
            if (this.metricsHistory.length > 100) {
                this.metricsHistory.splice(0, this.metricsHistory.length - 100);
            }
            if (this.config.callbacks?.onMetricsUpdate) {
                this.config.callbacks.onMetricsUpdate(metrics);
            }
        }, this.config.metricsInterval);
    }
    /**
     * Check for performance warnings
     */
    checkPerformanceWarnings(execution) {
        if (!this.config.enableWarnings)
            return;
        const { thresholds } = this.config;
        // Check agent duration
        if (execution.duration && execution.duration > thresholds.agentDurationWarning) {
            this.emitWarning('slow_agent', `Agent ${execution.agentId} took ${execution.duration}ms`, {
                agentId: execution.agentId,
                duration: execution.duration,
                threshold: thresholds.agentDurationWarning
            });
        }
        // Check token usage
        if (execution.tokenUsage && execution.tokenUsage.total > thresholds.tokenUsageWarning) {
            this.emitWarning('high_token_usage', `Agent ${execution.agentId} used ${execution.tokenUsage.total} tokens`, {
                agentId: execution.agentId,
                tokenUsage: execution.tokenUsage.total,
                threshold: thresholds.tokenUsageWarning
            });
        }
        // Check memory usage
        if (execution.memoryUsage && execution.memoryUsage > thresholds.memoryUsageWarning) {
            this.emitWarning('high_memory_usage', `Agent ${execution.agentId} used ${execution.memoryUsage} bytes`, {
                agentId: execution.agentId,
                memoryUsage: execution.memoryUsage,
                threshold: thresholds.memoryUsageWarning
            });
        }
    }
    /**
     * Emit warning
     */
    emitWarning(type, message, data) {
        this.logger.warn(message, data);
        if (this.config.callbacks?.onWarning) {
            this.config.callbacks.onWarning({ type, message, data });
        }
    }
    // Helper methods for metrics calculation
    getExecutionStatus() {
        const executions = Array.from(this.executions.values());
        if (executions.some(e => e.status === 'running' || e.status === 'queued')) {
            return 'running';
        }
        if (executions.some(e => e.status === 'failed')) {
            return 'failed';
        }
        return 'completed';
    }
    getCurrentMemoryUsage() {
        // Placeholder - would use actual memory monitoring
        return process.memoryUsage().heapUsed;
    }
    getPeakMemoryUsage() {
        // Placeholder - would track peak memory usage
        return process.memoryUsage().heapUsed;
    }
    getAverageMemoryUsage() {
        // Placeholder - would calculate average from history
        return process.memoryUsage().heapUsed;
    }
    getPeakConcurrency() {
        // Placeholder - would track peak concurrent agents
        return Array.from(this.executions.values())
            .filter(e => e.status === 'running').length;
    }
    getAverageConcurrency() {
        // Placeholder - would calculate average from history
        return 1;
    }
    estimateCompletion(execution) {
        // Placeholder - would use historical data to estimate completion
        const averageDuration = 60000; // 1 minute average
        return execution.startTime + averageDuration;
    }
    estimateStartTime(_execution) {
        // Placeholder - would estimate based on queue position and running agents
        return Date.now() + 30000; // 30 seconds estimate
    }
}
exports.ExecutionMonitor = ExecutionMonitor;
