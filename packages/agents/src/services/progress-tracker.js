"use strict";
/**
 * Progress Tracking Service
 * Provides real-time status updates for PR analysis
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProgressTracker = void 0;
exports.getProgressTracker = getProgressTracker;
const events_1 = require("events");
const core_1 = require("@codequal/core");
const uuid_1 = require("uuid");
class ProgressTracker extends events_1.EventEmitter {
    constructor() {
        super();
        this.logger = (0, core_1.createLogger)('ProgressTracker');
        this.analyses = new Map();
        this.startUpdateInterval();
    }
    /**
     * Start tracking a new analysis
     */
    startAnalysis(analysisId, repositoryUrl, prNumber, totalAgents, totalTools) {
        const progress = {
            analysisId,
            repositoryUrl,
            prNumber,
            startTime: new Date(),
            overallStatus: 'initializing',
            overallPercentage: 0,
            currentPhase: 'initialization',
            phases: {
                initialization: { status: 'in_progress', percentage: 0 },
                toolExecution: { status: 'pending', percentage: 0 },
                agentAnalysis: { status: 'pending', percentage: 0 },
                resultProcessing: { status: 'pending', percentage: 0 },
                reportGeneration: { status: 'pending', percentage: 0 }
            },
            agents: {},
            tools: {},
            updates: [],
            metrics: {
                totalAgents,
                completedAgents: 0,
                failedAgents: 0,
                totalTools,
                completedTools: 0,
                failedTools: 0
            }
        };
        this.analyses.set(analysisId, progress);
        this.addUpdate(analysisId, {
            type: 'analysis',
            phase: 'initialization',
            status: 'in_progress',
            percentage: 0,
            message: 'Starting PR analysis...'
        });
        return progress;
    }
    /**
     * Update phase progress
     */
    updatePhase(analysisId, phase, status, percentage, message) {
        const progress = this.analyses.get(analysisId);
        if (!progress)
            return;
        const phaseProgress = progress.phases[phase];
        phaseProgress.status = status;
        phaseProgress.percentage = percentage;
        if (message)
            phaseProgress.message = message;
        if (status === 'in_progress' && !phaseProgress.startTime) {
            phaseProgress.startTime = new Date();
        }
        else if ((status === 'completed' || status === 'failed') && !phaseProgress.endTime) {
            phaseProgress.endTime = new Date();
        }
        // Update current phase
        progress.currentPhase = phase;
        // Update overall status
        if (status === 'failed') {
            progress.overallStatus = 'failed';
        }
        else if (phase === 'reportGeneration' && status === 'completed') {
            progress.overallStatus = 'completed';
        }
        else if (status === 'in_progress') {
            progress.overallStatus = 'analyzing';
        }
        // Calculate overall percentage
        this.calculateOverallPercentage(progress);
        this.addUpdate(analysisId, {
            type: 'system',
            phase,
            status,
            percentage,
            message: message || `${phase} ${status}`
        });
        this.emit('phaseUpdate', analysisId, phase, phaseProgress);
    }
    /**
     * Update agent progress
     */
    updateAgent(analysisId, agentName, status, percentage, details) {
        const progress = this.analyses.get(analysisId);
        if (!progress)
            return;
        if (!progress.agents[agentName]) {
            progress.agents[agentName] = {
                name: agentName,
                status: 'pending',
                percentage: 0
            };
        }
        const agent = progress.agents[agentName];
        agent.status = status;
        agent.percentage = percentage;
        if (details) {
            Object.assign(agent, details);
        }
        if (status === 'running' && !agent.startTime) {
            agent.startTime = new Date();
        }
        else if ((status === 'completed' || status === 'failed') && !agent.endTime) {
            agent.endTime = new Date();
        }
        // Update metrics
        if (status === 'completed') {
            progress.metrics.completedAgents++;
        }
        else if (status === 'failed') {
            progress.metrics.failedAgents++;
        }
        this.addUpdate(analysisId, {
            type: 'agent',
            phase: 'agentAnalysis',
            status: status === 'running' ? 'in_progress' : status,
            percentage,
            message: `Agent ${agentName}: ${status}`,
            details: { agentName, ...details }
        });
        this.emit('agentUpdate', analysisId, agentName, agent);
        this.calculateOverallPercentage(progress);
    }
    /**
     * Update tool progress
     */
    updateTool(analysisId, toolName, agentRole, status, percentage, details) {
        const progress = this.analyses.get(analysisId);
        if (!progress)
            return;
        const toolId = `${toolName}-${agentRole}`;
        if (!progress.tools[toolId]) {
            progress.tools[toolId] = {
                name: toolName,
                agentRole,
                status: 'pending',
                percentage: 0
            };
        }
        const tool = progress.tools[toolId];
        tool.status = status;
        tool.percentage = percentage;
        if (details) {
            Object.assign(tool, details);
        }
        if (status === 'running' && !tool.startTime) {
            tool.startTime = new Date();
        }
        else if ((status === 'completed' || status === 'failed') && !tool.endTime) {
            tool.endTime = new Date();
        }
        // Update metrics
        if (status === 'completed') {
            progress.metrics.completedTools++;
        }
        else if (status === 'failed') {
            progress.metrics.failedTools++;
        }
        this.addUpdate(analysisId, {
            type: 'tool',
            phase: 'toolExecution',
            status: status === 'running' ? 'in_progress' : status,
            percentage,
            message: `Tool ${toolName} for ${agentRole}: ${status}`,
            details: { toolName, agentName: agentRole, ...details }
        });
        this.emit('toolUpdate', analysisId, toolId, tool);
        this.calculateOverallPercentage(progress);
    }
    /**
     * Complete analysis
     */
    completeAnalysis(analysisId, success = true) {
        const progress = this.analyses.get(analysisId);
        if (!progress)
            return;
        progress.endTime = new Date();
        progress.overallStatus = success ? 'completed' : 'failed';
        progress.overallPercentage = success ? 100 : progress.overallPercentage;
        const duration = progress.endTime.getTime() - progress.startTime.getTime();
        this.addUpdate(analysisId, {
            type: 'analysis',
            phase: 'reportGeneration',
            status: success ? 'completed' : 'failed',
            percentage: progress.overallPercentage,
            message: success ? 'Analysis completed successfully' : 'Analysis failed',
            details: { duration }
        });
        this.emit('analysisComplete', analysisId, progress);
    }
    /**
     * Get analysis progress
     */
    getProgress(analysisId) {
        return this.analyses.get(analysisId);
    }
    /**
     * Get all active analyses
     */
    getActiveAnalyses() {
        return Array.from(this.analyses.values()).filter(p => p.overallStatus !== 'completed' && p.overallStatus !== 'failed');
    }
    /**
     * Add progress update
     */
    addUpdate(analysisId, update) {
        const progress = this.analyses.get(analysisId);
        if (!progress)
            return;
        const fullUpdate = {
            id: (0, uuid_1.v4)(),
            timestamp: new Date(),
            ...update
        };
        progress.updates.push(fullUpdate);
        // Keep only last 100 updates
        if (progress.updates.length > 100) {
            progress.updates = progress.updates.slice(-100);
        }
        this.emit('progressUpdate', analysisId, fullUpdate);
    }
    /**
     * Calculate overall percentage
     */
    calculateOverallPercentage(progress) {
        const weights = {
            initialization: 5,
            toolExecution: 25,
            agentAnalysis: 50,
            resultProcessing: 10,
            reportGeneration: 10
        };
        let totalWeight = 0;
        let weightedSum = 0;
        for (const [phase, weight] of Object.entries(weights)) {
            const phaseProgress = progress.phases[phase];
            totalWeight += weight;
            weightedSum += weight * phaseProgress.percentage;
        }
        progress.overallPercentage = Math.round(weightedSum / totalWeight);
        // Estimate time remaining
        if (progress.overallPercentage > 0 && progress.overallPercentage < 100) {
            const elapsed = Date.now() - progress.startTime.getTime();
            const estimatedTotal = elapsed / (progress.overallPercentage / 100);
            progress.metrics.estimatedTimeRemaining = Math.round(estimatedTotal - elapsed);
        }
    }
    /**
     * Start update interval for time estimates
     */
    startUpdateInterval() {
        this.updateInterval = setInterval(() => {
            for (const progress of this.analyses.values()) {
                if (progress.overallStatus === 'analyzing') {
                    this.calculateOverallPercentage(progress);
                    this.emit('timeUpdate', progress.analysisId, progress.metrics.estimatedTimeRemaining);
                }
            }
        }, 5000); // Update every 5 seconds
    }
    /**
     * Clean up old analyses
     */
    cleanupOldAnalyses(maxAge = 24 * 60 * 60 * 1000) {
        const now = Date.now();
        const toDelete = [];
        for (const [id, progress] of this.analyses.entries()) {
            if (progress.endTime) {
                const age = now - progress.endTime.getTime();
                if (age > maxAge) {
                    toDelete.push(id);
                }
            }
        }
        for (const id of toDelete) {
            this.analyses.delete(id);
        }
        this.logger.info(`Cleaned up ${toDelete.length} old analyses`);
    }
    /**
     * Destroy tracker
     */
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        this.removeAllListeners();
        this.analyses.clear();
    }
}
exports.ProgressTracker = ProgressTracker;
// Singleton instance
let progressTracker = null;
/**
 * Get or create progress tracker instance
 */
function getProgressTracker() {
    if (!progressTracker) {
        progressTracker = new ProgressTracker();
    }
    return progressTracker;
}
