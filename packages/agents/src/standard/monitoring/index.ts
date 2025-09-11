/**
 * Monitoring Module
 * Centralized monitoring for performance, cost, and analysis metrics
 */

export * from './services/unified-monitoring.service';
export * from './services/cost-tracker.service';
export * from './services/dynamic-agent-cost-tracker.service';

// Re-export singletons for easy access
import { monitoring } from './services/unified-monitoring.service';
import { costTracker } from './services/cost-tracker.service';
import { dynamicCostTracker } from './services/dynamic-agent-cost-tracker.service';
export { monitoring, costTracker, dynamicCostTracker };

// Helper functions for common monitoring tasks
export function trackPerformance<T>(
  operationName: string,
  operation: () => Promise<T>
): Promise<T> {
  monitoring.startOperation(operationName);
  
  return operation()
    .then(result => {
      monitoring.endOperation(operationName, true);
      return result;
    })
    .catch(error => {
      monitoring.endOperation(operationName, false, error.message);
      throw error;
    });
}

export function trackAnalysis<T>(
  repositoryUrl: string,
  prNumber: string | undefined,
  operation: () => Promise<T>
): Promise<T> {
  const analysisId = monitoring.startAnalysis(repositoryUrl, prNumber);
  
  return operation()
    .then(result => {
      monitoring.endAnalysis(repositoryUrl, true);
      return result;
    })
    .catch(error => {
      monitoring.endAnalysis(repositoryUrl, false, { error: error.message });
      throw error;
    });
}

export function trackDeepWikiCall(
  repositoryUrl: string,
  branch: string,
  tokens?: number,
  cached = false
): void {
  // Track in unified monitoring
  monitoring.trackCost('deepwiki', 'analyze', {
    tokens,
    metadata: { repositoryUrl, branch, cached }
  });
  
  // Track in cost tracker with more detail
  costTracker.trackDeepWikiAnalysis(
    repositoryUrl,
    tokens || 5000, // Default estimate
    60000, // Default 60s duration
    cached
  );
}

export function trackOpenRouterCall(
  model: string,
  inputTokens: number,
  outputTokens: number,
  operation: string
): void {
  // Track in unified monitoring
  monitoring.trackCost('openrouter', operation, {
    model,
    tokens: inputTokens + outputTokens,
    metadata: { model, operation }
  });
  
  // Track in cost tracker with detailed breakdown
  costTracker.trackModelUsage(
    model,
    inputTokens,
    outputTokens,
    operation,
    { service: 'openrouter' }
  );
}

export async function generateMonitoringReport(): Promise<string> {
  return monitoring.generateDashboard();
}

export function generateCostReport(): string {
  return costTracker.generateCostReport();
}

export function getAnalysisCost(repositoryUrl: string): {
  total: number;
  deepwiki: number;
  locationFinding: number;
  reporting: number;
  infrastructure: number;
} {
  return costTracker.getAnalysisCostBreakdown(repositoryUrl);
}

export function getCostSummary() {
  return costTracker.getCostSummary();
}

// Track infrastructure usage
export function trackRedisUsage(operations: number): void {
  costTracker.trackInfrastructureUsage('redis', 'cache', { requests: operations });
}

export function trackSupabaseUsage(requests: number, storageGb?: number): void {
  costTracker.trackInfrastructureUsage('supabase', 'database', { 
    requests, 
    storage: storageGb 
  });
}

export function trackKubernetesUsage(durationMs: number, networkGb?: number): void {
  costTracker.trackInfrastructureUsage('kubernetes', 'compute', { 
    duration: durationMs,
    network: networkGb
  });
}

// Dynamic agent tracking functions
import { AgentRole } from './services/dynamic-agent-cost-tracker.service';

export async function trackDynamicAgentCall(params: {
  agent: AgentRole;
  operation: string;
  repository: string;
  prNumber?: string;
  language?: string;
  repositorySize?: 'small' | 'medium' | 'large' | 'enterprise';
  modelConfigId: string;  // From Supabase config
  model: string;
  modelVersion: string;
  isFallback: boolean;
  inputTokens: number;
  outputTokens: number;
  duration: number;
  success?: boolean;
  error?: string;
  retryCount?: number;
}): Promise<void> {
  // Track in dynamic cost tracker (Supabase)
  await dynamicCostTracker.trackActivity({
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
  monitoring.trackCost(
    params.agent === 'deepwiki' ? 'deepwiki' : 'openrouter',
    params.operation,
    {
      model: params.model,
      tokens: params.inputTokens + params.outputTokens,
      metadata: { 
        agent: params.agent, 
        language: params.language,
        isFallback: params.isFallback
      }
    }
  );
}

export async function getDynamicModelConfig(
  role: AgentRole,
  language?: string,
  repoSize?: 'small' | 'medium' | 'large' | 'enterprise',
  complexity?: 'low' | 'medium' | 'high'
) {
  return dynamicCostTracker.getModelConfig(role, language, repoSize, complexity);
}

export async function getRepositoryCostAnalysis(repository: string, prNumber?: string) {
  return dynamicCostTracker.getRepositoryCostAnalysis(repository, prNumber);
}

export async function getMonthlyTrends() {
  return dynamicCostTracker.getMonthlyTrends();
}

export async function getModelUpdateHistory(limit = 10) {
  return dynamicCostTracker.getModelUpdateHistory(limit);
}

export async function triggerQuarterlyModelResearch() {
  return dynamicCostTracker.triggerModelResearch();
}

// Export smart tracker
export { smartTracker, SmartTrackingParams } from './services/smart-agent-tracker.service';

// Export unified location service (replaces all old location finders)
export { 
  UnifiedLocationService,
  createUnifiedLocationService 
} from '../services/unified-location-service';
export type { 
  LocationResult, 
  IssueToLocate, 
  LocationServiceConfig 
} from '../services/unified-location-service';

// DEPRECATED - Use UnifiedLocationService instead
// export { optimizedLocationFinder } from '../services/optimized-location-finder';
// export type { LocationResult, IssueToLocate, PerformanceMetrics } from '../services/optimized-location-finder';