/**
 * Deprecated Service Stubs
 *
 * This file provides stub implementations for services that were deprecated
 * but are still referenced in result-orchestrator.ts
 *
 * TODO: Clean up result-orchestrator.ts to remove these deprecated references
 *
 * Deprecated services:
 * - ToolResultRetrievalService (replaced by V9 tool orchestration)
 * - GitDiffAnalyzerService (replaced by PRContextService)
 * - deepWikiApiManager (deprecated - DeepWiki integration removed)
 * - metricsCollector (replaced by token-usage-aggregator)
 * - AgentToolResults (replaced by V9 tool results format)
 */

import { createLogger } from '@codequal/core/utils';

const logger = createLogger('DeprecatedStubs');

/**
 * Stub for AgentToolResults - deprecated data format
 */
export interface AgentToolResults {
  [key: string]: unknown;
}

/**
 * Stub for ToolResultRetrievalService
 * @deprecated Use V9 tool orchestration instead
 */
export class ToolResultRetrievalService {
  constructor(_vectorStorage: unknown, _logger: unknown) {
    logger.warn('ToolResultRetrievalService is deprecated - use V9 tool orchestration');
  }

  async retrieveResults(_repositoryUrl: string): Promise<Record<string, AgentToolResults>> {
    logger.warn('ToolResultRetrievalService.retrieveResults is deprecated');
    return {};
  }
}

/**
 * Stub for GitDiffAnalyzerService
 * @deprecated Use PRContextService instead
 */
export class GitDiffAnalyzerService {
  constructor(_logger: unknown) {
    logger.warn('GitDiffAnalyzerService is deprecated - use PRContextService');
  }

  async analyzeDiff(_diff: unknown): Promise<unknown> {
    logger.warn('GitDiffAnalyzerService.analyzeDiff is deprecated');
    return {};
  }
}

/**
 * Stub for deepWikiApiManager
 * @deprecated DeepWiki integration has been removed
 */
export const deepWikiApiManager = {
  async getCachedRepositoryFiles(_repositoryUrl: string): Promise<string[]> {
    logger.warn('deepWikiApiManager is deprecated - DeepWiki integration removed');
    return [];
  },

  async checkRepositoryExists(_repositoryUrl: string): Promise<boolean> {
    logger.warn('deepWikiApiManager is deprecated - DeepWiki integration removed');
    return false;
  },

  async triggerRepositoryAnalysis(_repositoryUrl: string, _options?: unknown): Promise<string> {
    logger.warn('deepWikiApiManager is deprecated - DeepWiki integration removed');
    return 'deprecated-job-id';
  },

  async waitForAnalysisCompletion(_repositoryUrl: string): Promise<unknown> {
    logger.warn('deepWikiApiManager is deprecated - DeepWiki integration removed');
    return null;
  },

  async cleanupRepository(_repositoryUrl: string): Promise<void> {
    logger.warn('deepWikiApiManager is deprecated - DeepWiki integration removed');
  }
};

/**
 * Stub for metricsCollector
 * @deprecated Use TokenUsageAggregator instead
 */
export const metricsCollector = {
  async recordAnalysisStart(_repositoryUrl: string): Promise<string> {
    logger.warn('metricsCollector is deprecated - use TokenUsageAggregator');
    return `metrics-${Date.now()}`;
  },

  async recordAnalysisComplete(
    _metricsId: string,
    _results: unknown,
    _duration: number
  ): Promise<void> {
    logger.warn('metricsCollector is deprecated - use TokenUsageAggregator');
  },

  async recordCleanup(_repositoryUrl: string, _reason: string): Promise<void> {
    logger.warn('metricsCollector is deprecated - use TokenUsageAggregator');
  }
};
