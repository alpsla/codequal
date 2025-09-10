"use strict";
/**
 * Comprehensive Debug Logger for Agent and Tool Execution
 * Provides detailed logging for troubleshooting and monitoring
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DebugLogger = void 0;
exports.getDebugLogger = getDebugLogger;
const core_1 = require("@codequal/core");
const uuid_1 = require("uuid");
class DebugLogger {
    constructor(debugMode = false) {
        this.logger = (0, core_1.createLogger)('DebugLogger');
        this.traces = new Map();
        this.activeExecutions = new Map();
        this.debugMode = debugMode;
    }
    /**
     * Start tracking an execution
     */
    startExecution(type, id, phase, input, metadata) {
        const executionId = (0, uuid_1.v4)();
        const trace = {
            id: executionId,
            timestamp: new Date(),
            type,
            phase,
            status: 'started',
            input: this.sanitizeInput(input),
            metadata
        };
        this.activeExecutions.set(executionId, trace);
        if (!this.traces.has(id)) {
            this.traces.set(id, []);
        }
        this.traces.get(id).push(trace);
        if (this.debugMode) {
            this.logger.debug(`[${type.toUpperCase()}] Started: ${id} - ${phase}`, {
                executionId,
                input: trace.input,
                metadata
            });
        }
        return executionId;
    }
    /**
     * Update execution progress
     */
    updateExecution(executionId, update) {
        const trace = this.activeExecutions.get(executionId);
        if (!trace) {
            this.logger.warn('Attempted to update non-existent execution', { executionId });
            return;
        }
        Object.assign(trace, update);
        trace.status = 'in_progress';
        if (this.debugMode) {
            this.logger.debug(`[${trace.type.toUpperCase()}] Progress: ${trace.phase}`, {
                executionId,
                update
            });
        }
    }
    /**
     * Complete an execution
     */
    completeExecution(executionId, output, metadata) {
        const trace = this.activeExecutions.get(executionId);
        if (!trace) {
            this.logger.warn('Attempted to complete non-existent execution', { executionId });
            return;
        }
        trace.status = 'completed';
        trace.duration = Date.now() - trace.timestamp.getTime();
        trace.output = this.sanitizeOutput(output);
        if (metadata) {
            trace.metadata = { ...trace.metadata, ...metadata };
        }
        this.activeExecutions.delete(executionId);
        if (this.debugMode) {
            this.logger.debug(`[${trace.type.toUpperCase()}] Completed: ${trace.phase}`, {
                executionId,
                duration: trace.duration,
                output: trace.output,
                metadata: trace.metadata
            });
        }
    }
    /**
     * Fail an execution
     */
    failExecution(executionId, error, metadata) {
        const trace = this.activeExecutions.get(executionId);
        if (!trace) {
            this.logger.warn('Attempted to fail non-existent execution', { executionId });
            return;
        }
        trace.status = 'failed';
        trace.duration = Date.now() - trace.timestamp.getTime();
        trace.error = this.sanitizeError(error);
        if (metadata) {
            trace.metadata = { ...trace.metadata, ...metadata };
        }
        this.activeExecutions.delete(executionId);
        this.logger.error(`[${trace.type.toUpperCase()}] Failed: ${trace.phase}`, {
            executionId,
            duration: trace.duration,
            error: trace.error,
            metadata: trace.metadata
        });
    }
    /**
     * Log agent execution details
     */
    logAgentExecution(agentId, phase, details) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            agentId,
            phase,
            ...this.sanitizeDetails(details)
        };
        if (this.debugMode || details.error) {
            this.logger.info(`[AGENT] ${agentId} - ${phase}`, logEntry);
        }
    }
    /**
     * Log tool execution details
     */
    logToolExecution(toolId, agentRole, details) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            toolId,
            agentRole,
            ...this.sanitizeDetails(details)
        };
        if (this.debugMode || details.error) {
            this.logger.info(`[TOOL] ${toolId} for ${agentRole}`, logEntry);
        }
    }
    /**
     * Get execution traces for debugging
     */
    getTraces(id) {
        if (id) {
            return this.traces.get(id) || [];
        }
        const allTraces = [];
        this.traces.forEach(traces => allTraces.push(...traces));
        return allTraces.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    }
    /**
     * Get execution summary
     */
    getSummary() {
        const allTraces = this.getTraces();
        const summary = {
            totalExecutions: allTraces.length,
            activeExecutions: this.activeExecutions.size,
            completedExecutions: 0,
            failedExecutions: 0,
            totalDuration: 0,
            byType: {},
            byPhase: {}
        };
        allTraces.forEach(trace => {
            if (trace.status === 'completed') {
                summary.completedExecutions++;
                if (trace.duration) {
                    summary.totalDuration += trace.duration;
                }
            }
            else if (trace.status === 'failed') {
                summary.failedExecutions++;
            }
            summary.byType[trace.type] = (summary.byType[trace.type] || 0) + 1;
            summary.byPhase[trace.phase] = (summary.byPhase[trace.phase] || 0) + 1;
        });
        return {
            ...summary,
            averageDuration: summary.completedExecutions > 0
                ? summary.totalDuration / summary.completedExecutions
                : 0
        };
    }
    /**
     * Export traces for analysis
     */
    exportTraces() {
        const traces = this.getTraces();
        const summary = this.getSummary();
        return JSON.stringify({
            exportTime: new Date().toISOString(),
            summary,
            traces,
            activeExecutions: Array.from(this.activeExecutions.values())
        }, null, 2);
    }
    /**
     * Clear all traces
     */
    clearTraces() {
        this.traces.clear();
        this.activeExecutions.clear();
    }
    /**
     * Sanitize input data to prevent logging sensitive information
     */
    sanitizeInput(input) {
        if (!input)
            return input;
        const sanitized = JSON.parse(JSON.stringify(input));
        // Remove sensitive fields
        const sensitiveFields = ['token', 'apiKey', 'password', 'secret', 'credential'];
        this.removeSensitiveFields(sanitized, sensitiveFields);
        return sanitized;
    }
    /**
     * Sanitize output data
     */
    sanitizeOutput(output) {
        if (!output)
            return output;
        // Limit size of output
        const stringified = JSON.stringify(output);
        if (stringified.length > 10000) {
            return {
                _truncated: true,
                _originalSize: stringified.length,
                summary: this.extractSummary(output)
            };
        }
        return this.sanitizeInput(output);
    }
    /**
     * Sanitize error objects
     */
    sanitizeError(error) {
        if (!error)
            return error;
        if (error instanceof Error) {
            return {
                name: error.name,
                message: error.message,
                stack: this.debugMode ? error.stack : undefined
            };
        }
        return String(error);
    }
    /**
     * Sanitize execution details
     */
    sanitizeDetails(details) {
        const sanitized = {};
        for (const [key, value] of Object.entries(details)) {
            if (key === 'error') {
                sanitized[key] = this.sanitizeError(value);
            }
            else if (key === 'context' || key === 'config') {
                sanitized[key] = this.sanitizeInput(value);
            }
            else if (key === 'result' || key === 'output') {
                sanitized[key] = this.sanitizeOutput(value);
            }
            else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }
    /**
     * Remove sensitive fields from object
     */
    removeSensitiveFields(obj, fields) {
        if (!obj || typeof obj !== 'object')
            return;
        for (const key of Object.keys(obj)) {
            if (fields.some(field => key.toLowerCase().includes(field))) {
                obj[key] = '[REDACTED]';
            }
            else if (typeof obj[key] === 'object') {
                this.removeSensitiveFields(obj[key], fields);
            }
        }
    }
    /**
     * Extract summary from large objects
     */
    extractSummary(obj) {
        if (Array.isArray(obj)) {
            return {
                type: 'array',
                length: obj.length,
                sample: obj.slice(0, 3)
            };
        }
        if (obj && typeof obj === 'object') {
            const keys = Object.keys(obj);
            return {
                type: 'object',
                keys: keys.slice(0, 10),
                totalKeys: keys.length
            };
        }
        return obj;
    }
    /**
     * Enable or disable debug mode
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
        this.logger.info(`Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    }
}
exports.DebugLogger = DebugLogger;
// Singleton instance
let debugLogger = null;
/**
 * Get or create debug logger instance
 */
function getDebugLogger(debugMode) {
    if (!debugLogger) {
        debugLogger = new DebugLogger(debugMode);
    }
    else if (debugMode !== undefined) {
        debugLogger.setDebugMode(debugMode);
    }
    return debugLogger;
}
