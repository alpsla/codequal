/**
 * Cloud API Tools Module
 *
 * This module provides integration with cloud-based security analysis APIs:
 * - Corgea: AI-powered code fix generation
 * - Future: Aikido, DeepSource, etc.
 *
 * These tools complement CLI tools by providing:
 * - AI-generated fixes (Corgea)
 * - Cross-validation of findings
 * - Enhanced context-aware analysis
 *
 * Usage is gated by subscription tier:
 * - BASIC tier: CLI tools only
 * - PRO tier: CLI tools + Cloud API tools
 *
 * Multi-user support features (Session 63):
 * - Usage tracking per user/organization
 * - Smart batching to reduce API calls
 * - Fix caching for identical patterns
 * - Rate-limited request queue
 * - Analytics and plan recommendations
 *
 * @module cloud-api
 * @since Session 60
 */

// Core API infrastructure
export { CloudAPIToolBase, CloudAPIConfig, APIToolResult, RateLimitInfo } from './base-api-tool';
export { CorgeaFixer, CorgeaFixRequest, CorgeaFix, CorgeaConfig } from './corgea-fixer';
export { CloudAPIOrchestrator, CloudAPIOptions } from './api-tool-orchestrator';
export { convertToSARIF, SARIFReport } from './sarif-converter';

// Multi-user support (Session 63)
export {
  CorgeaUsageTracker,
  getCorgeaUsageTracker,
  CorgeaUsageRecord,
  UsageSummary,
  PlanRecommendation,
  RateLimitStatus
} from './corgea-usage-tracker';

export {
  CorgeaSmartBatcher,
  createSmartBatcher,
  BatchedRequest,
  BatchingResult,
  BatchPriorityQueue,
  createBatchQueue
} from './corgea-smart-batcher';

export {
  CorgeaFixCache,
  getCorgeaFixCache,
  CachedFix,
  CacheStats
} from './corgea-fix-cache';

export {
  CorgeaRequestQueue,
  getCorgeaRequestQueue,
  QueuedRequest,
  QueueResult
} from './corgea-request-queue';

export {
  CorgeaAnalyticsService,
  getCorgeaAnalytics,
  AnalyticsDashboard,
  Alert
} from './corgea-analytics';

// Cost management and intelligent routing (Session 63)
export {
  FixCostManager,
  getFixCostManager,
  FixSource,
  FixCostRecord,
  CostCeiling,
  RoutingDecision,
  CostComparison,
  ProfitabilityAnalysis,
  // Routing mode management
  RoutingMode,
  RoutingConfig,
  SupabaseCostComparison
} from './fix-cost-manager';

export {
  IntelligentFixRouter,
  getIntelligentFixRouter,
  FixRequest,
  FixResult,
  BatchFixResult
} from './intelligent-fix-router';
