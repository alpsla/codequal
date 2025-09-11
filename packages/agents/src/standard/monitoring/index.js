"use strict";
/**
 * Monitoring Module
 * Centralized monitoring for performance, cost, and analysis metrics
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUnifiedLocationService = exports.UnifiedLocationService = exports.smartTracker = exports.dynamicCostTracker = exports.costTracker = exports.monitoring = void 0;
exports.trackPerformance = trackPerformance;
exports.trackAnalysis = trackAnalysis;
exports.trackDeepWikiCall = trackDeepWikiCall;
exports.trackOpenRouterCall = trackOpenRouterCall;
exports.generateMonitoringReport = generateMonitoringReport;
exports.generateCostReport = generateCostReport;
exports.getAnalysisCost = getAnalysisCost;
exports.getCostSummary = getCostSummary;
exports.trackRedisUsage = trackRedisUsage;
exports.trackSupabaseUsage = trackSupabaseUsage;
exports.trackKubernetesUsage = trackKubernetesUsage;
exports.trackDynamicAgentCall = trackDynamicAgentCall;
exports.getDynamicModelConfig = getDynamicModelConfig;
exports.getRepositoryCostAnalysis = getRepositoryCostAnalysis;
exports.getMonthlyTrends = getMonthlyTrends;
exports.getModelUpdateHistory = getModelUpdateHistory;
exports.triggerQuarterlyModelResearch = triggerQuarterlyModelResearch;
__exportStar(require("./services/unified-monitoring.service"), exports);
__exportStar(require("./services/cost-tracker.service"), exports);
__exportStar(require("./services/dynamic-agent-cost-tracker.service"), exports);
// Re-export singletons for easy access
const unified_monitoring_service_1 = require("./services/unified-monitoring.service");
Object.defineProperty(exports, "monitoring", { enumerable: true, get: function () { return unified_monitoring_service_1.monitoring; } });
const cost_tracker_service_1 = require("./services/cost-tracker.service");
Object.defineProperty(exports, "costTracker", { enumerable: true, get: function () { return cost_tracker_service_1.costTracker; } });
const dynamic_agent_cost_tracker_service_1 = require("./services/dynamic-agent-cost-tracker.service");
Object.defineProperty(exports, "dynamicCostTracker", { enumerable: true, get: function () { return dynamic_agent_cost_tracker_service_1.dynamicCostTracker; } });
// Helper functions for common monitoring tasks
function trackPerformance(operationName, operation) {
    unified_monitoring_service_1.monitoring.startOperation(operationName);
    return operation()
        .then(result => {
        unified_monitoring_service_1.monitoring.endOperation(operationName, true);
        return result;
    })
        .catch(error => {
        unified_monitoring_service_1.monitoring.endOperation(operationName, false, error.message);
        throw error;
    });
}
function trackAnalysis(repositoryUrl, prNumber, operation) {
    const analysisId = unified_monitoring_service_1.monitoring.startAnalysis(repositoryUrl, prNumber);
    return operation()
        .then(result => {
        unified_monitoring_service_1.monitoring.endAnalysis(repositoryUrl, true);
        return result;
    })
        .catch(error => {
        unified_monitoring_service_1.monitoring.endAnalysis(repositoryUrl, false, { error: error.message });
        throw error;
    });
}
function trackDeepWikiCall(repositoryUrl, branch, tokens, cached = false) {
    // Track in unified monitoring
    unified_monitoring_service_1.monitoring.trackCost('deepwiki', 'analyze', {
        tokens,
        metadata: { repositoryUrl, branch, cached }
    });
    // Track in cost tracker with more detail
    cost_tracker_service_1.costTracker.trackDeepWikiAnalysis(repositoryUrl, tokens || 5000, // Default estimate
    60000, // Default 60s duration
    cached);
}
function trackOpenRouterCall(model, inputTokens, outputTokens, operation) {
    // Track in unified monitoring
    unified_monitoring_service_1.monitoring.trackCost('openrouter', operation, {
        model,
        tokens: inputTokens + outputTokens,
        metadata: { model, operation }
    });
    // Track in cost tracker with detailed breakdown
    cost_tracker_service_1.costTracker.trackModelUsage(model, inputTokens, outputTokens, operation, { service: 'openrouter' });
}
async function generateMonitoringReport() {
    return unified_monitoring_service_1.monitoring.generateDashboard();
}
function generateCostReport() {
    return cost_tracker_service_1.costTracker.generateCostReport();
}
function getAnalysisCost(repositoryUrl) {
    return cost_tracker_service_1.costTracker.getAnalysisCostBreakdown(repositoryUrl);
}
function getCostSummary() {
    return cost_tracker_service_1.costTracker.getCostSummary();
}
// Track infrastructure usage
function trackRedisUsage(operations) {
    cost_tracker_service_1.costTracker.trackInfrastructureUsage('redis', 'cache', { requests: operations });
}
function trackSupabaseUsage(requests, storageGb) {
    cost_tracker_service_1.costTracker.trackInfrastructureUsage('supabase', 'database', {
        requests,
        storage: storageGb
    });
}
function trackKubernetesUsage(durationMs, networkGb) {
    cost_tracker_service_1.costTracker.trackInfrastructureUsage('kubernetes', 'compute', {
        duration: durationMs,
        network: networkGb
    });
}
async function trackDynamicAgentCall(params) {
    // Track in dynamic cost tracker (Supabase)
    await dynamic_agent_cost_tracker_service_1.dynamicCostTracker.trackActivity({
        agentRole: params.agent,
        operation: params.operation,
        repositoryUrl: params.repository,
        prNumber: params.prNumber,
        language: params.language,
        repositorySize: params.repositorySize,
        modelConfigId: params.modelConfigId,
        modelUsed: params.model,
        modelVersion: params.modelVersion,
        isFallback: params.isFallback,
        inputTokens: params.inputTokens,
        outputTokens: params.outputTokens,
        durationMs: params.duration,
        success: params.success ?? true,
        error: params.error,
        retryCount: params.retryCount
    });
    // Also track in local monitoring for real-time metrics
    unified_monitoring_service_1.monitoring.trackCost(params.agent === 'deepwiki' ? 'deepwiki' : 'openrouter', params.operation, {
        model: params.model,
        tokens: params.inputTokens + params.outputTokens,
        metadata: {
            agent: params.agent,
            language: params.language,
            isFallback: params.isFallback
        }
    });
}
async function getDynamicModelConfig(role, language, repoSize, complexity) {
    return dynamic_agent_cost_tracker_service_1.dynamicCostTracker.getModelConfig(role, language, repoSize, complexity);
}
async function getRepositoryCostAnalysis(repository, prNumber) {
    return dynamic_agent_cost_tracker_service_1.dynamicCostTracker.getRepositoryCostAnalysis(repository, prNumber);
}
async function getMonthlyTrends() {
    return dynamic_agent_cost_tracker_service_1.dynamicCostTracker.getMonthlyTrends();
}
async function getModelUpdateHistory(limit = 10) {
    return dynamic_agent_cost_tracker_service_1.dynamicCostTracker.getModelUpdateHistory(limit);
}
async function triggerQuarterlyModelResearch() {
    return dynamic_agent_cost_tracker_service_1.dynamicCostTracker.triggerModelResearch();
}
// Export smart tracker
var smart_agent_tracker_service_1 = require("./services/smart-agent-tracker.service");
Object.defineProperty(exports, "smartTracker", { enumerable: true, get: function () { return smart_agent_tracker_service_1.smartTracker; } });
// Export unified location service (replaces all old location finders)
var unified_location_service_1 = require("../services/unified-location-service");
Object.defineProperty(exports, "UnifiedLocationService", { enumerable: true, get: function () { return unified_location_service_1.UnifiedLocationService; } });
Object.defineProperty(exports, "createUnifiedLocationService", { enumerable: true, get: function () { return unified_location_service_1.createUnifiedLocationService; } });
// DEPRECATED - Use UnifiedLocationService instead
// export { optimizedLocationFinder } from '../services/optimized-location-finder';
// export type { LocationResult, IssueToLocate, PerformanceMetrics } from '../services/optimized-location-finder';
