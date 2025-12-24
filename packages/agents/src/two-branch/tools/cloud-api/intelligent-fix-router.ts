/**
 * Intelligent Fix Router
 *
 * Smart routing between fix sources based on:
 * - Real-time cost comparison
 * - Rate limit status
 * - Budget constraints
 * - Issue severity and category
 * - Historical success rates
 *
 * Flow:
 * 1. Check cache first (free)
 * 2. Check native fixes (free)
 * 3. Check pattern registry (free)
 * 4. Route to Corgea or AI-fixer based on cost/availability
 * 5. Fallback on failure
 *
 * @since Session 63
 */

import { Issue } from '../../analyzers/v9-types';
import { CorgeaFix } from './corgea-fixer';
import { getCorgeaFixCache } from './corgea-fix-cache';
import { getCorgeaRequestQueue } from './corgea-request-queue';
import { getFixCostManager, FixSource, RoutingDecision } from './fix-cost-manager';
import { getCorgeaUsageTracker } from './corgea-usage-tracker';

// ============================================================
// TYPES
// ============================================================

export interface FixRequest {
  issues: Issue[];
  userId: string;
  organizationId: string;
  language: string;
  repositoryUrl?: string;
  branch?: string;

  // Preferences
  preferQuality?: boolean;    // Prefer higher confidence over cost
  preferSpeed?: boolean;      // Prefer faster sources
  maxCostCents?: number;      // Max cost for this request
}

export interface FixResult {
  issueId: string;
  source: FixSource;
  fix: CorgeaFix | null;
  costCents: number;
  confidence: number;
  fromCache: boolean;
  processingTimeMs: number;
  error?: string;
}

export interface BatchFixResult {
  results: FixResult[];
  summary: {
    totalIssues: number;
    fixed: number;
    failed: number;
    fromCache: number;
    totalCost: number;
    avgConfidence: number;
    processingTimeMs: number;
  };
  routing: {
    corgea: number;
    aiFixer: number;
    patternRegistry: number;
    native: number;
    cache: number;
  };
}

// ============================================================
// INTELLIGENT FIX ROUTER CLASS
// ============================================================

export class IntelligentFixRouter {
  private cache = getCorgeaFixCache();
  private queue = getCorgeaRequestQueue();
  private costManager = getFixCostManager();
  private usageTracker = getCorgeaUsageTracker();

  /**
   * Route and fix a batch of issues
   */
  async fixIssues(request: FixRequest): Promise<BatchFixResult> {
    const startTime = Date.now();
    const results: FixResult[] = [];

    const routing = {
      corgea: 0,
      aiFixer: 0,
      patternRegistry: 0,
      native: 0,
      cache: 0
    };

    // Step 1: Check cache for all issues
    const { cached, uncached } = await this.cache.getMultiple(request.issues);

    // Process cached results
    for (const [issueId, fix] of cached) {
      results.push({
        issueId,
        source: 'pattern_registry', // Cache treated as pattern
        fix,
        costCents: 0,
        confidence: fix.confidence,
        fromCache: true,
        processingTimeMs: 0
      });
      routing.cache++;
    }

    // Step 2: Process uncached issues
    for (const issue of uncached) {
      const result = await this.processIssue(issue, request);
      results.push(result);

      // Track routing
      if (!result.fromCache) {
        routing[result.source === 'ai_fixer' ? 'aiFixer' : result.source]++;
      }

      // Record cost
      if (result.fix && result.costCents > 0) {
        await this.costManager.recordCost({
          timestamp: new Date(),
          source: result.source,
          issueId: result.issueId,
          ruleId: issue.rule || 'unknown',
          language: request.language,
          severity: issue.severity || 'medium',
          apiCostCents: result.costCents,
          confidence: result.confidence,
          wasApplied: true,
          wasReverted: false,
          userId: request.userId,
          organizationId: request.organizationId
        });
      }
    }

    // Calculate summary
    const fixed = results.filter(r => r.fix !== null).length;
    const failed = results.filter(r => r.fix === null).length;
    const fromCacheCount = results.filter(r => r.fromCache).length;
    const totalCost = results.reduce((sum, r) => sum + r.costCents, 0);
    const totalConfidence = results
      .filter(r => r.fix !== null)
      .reduce((sum, r) => sum + r.confidence, 0);
    const avgConfidence = fixed > 0 ? totalConfidence / fixed : 0;

    return {
      results,
      summary: {
        totalIssues: request.issues.length,
        fixed,
        failed,
        fromCache: fromCacheCount,
        totalCost,
        avgConfidence,
        processingTimeMs: Date.now() - startTime
      },
      routing
    };
  }

  /**
   * Process a single issue
   */
  private async processIssue(
    issue: Issue,
    request: FixRequest
  ): Promise<FixResult> {
    const startTime = Date.now();

    // Get routing decision
    const decision = await this.costManager.decideSource(
      issue.severity || 'medium',
      issue.category || 'code_quality',
      request.language
    );

    // Check cost constraint
    if (request.maxCostCents && decision.estimatedCost > request.maxCostCents) {
      return {
        issueId: issue.id || 'unknown',
        source: decision.source,
        fix: null,
        costCents: 0,
        confidence: 0,
        fromCache: false,
        processingTimeMs: Date.now() - startTime,
        error: `Cost ${decision.estimatedCost}¢ exceeds max ${request.maxCostCents}¢`
      };
    }

    try {
      // Route to appropriate source
      const fix = await this.executeSource(decision.source, issue, request);

      if (fix) {
        // Cache the fix for future use
        await this.cache.set(issue, fix);

        return {
          issueId: issue.id || 'unknown',
          source: decision.source,
          fix,
          costCents: decision.estimatedCost,
          confidence: fix.confidence,
          fromCache: false,
          processingTimeMs: Date.now() - startTime
        };
      }

      // Try fallback if available
      if (decision.fallbackAvailable && decision.fallbackSource) {
        const fallbackFix = await this.executeSource(
          decision.fallbackSource,
          issue,
          request
        );

        if (fallbackFix) {
          await this.cache.set(issue, fallbackFix);

          return {
            issueId: issue.id || 'unknown',
            source: decision.fallbackSource,
            fix: fallbackFix,
            costCents: this.costManager.getDashboard().avgCosts[decision.fallbackSource],
            confidence: fallbackFix.confidence,
            fromCache: false,
            processingTimeMs: Date.now() - startTime
          };
        }
      }

      return {
        issueId: issue.id || 'unknown',
        source: decision.source,
        fix: null,
        costCents: 0,
        confidence: 0,
        fromCache: false,
        processingTimeMs: Date.now() - startTime,
        error: 'No fix generated'
      };

    } catch (error) {
      return {
        issueId: issue.id || 'unknown',
        source: decision.source,
        fix: null,
        costCents: 0,
        confidence: 0,
        fromCache: false,
        processingTimeMs: Date.now() - startTime,
        error: (error as Error).message
      };
    }
  }

  /**
   * Execute fix from a specific source
   */
  private async executeSource(
    source: FixSource,
    issue: Issue,
    request: FixRequest
  ): Promise<CorgeaFix | null> {
    switch (source) {
      case 'native':
        return this.executeNativeFix(issue);

      case 'pattern_registry':
        return this.executePatternFix(issue);

      case 'corgea':
        return this.executeCorgeaFix(issue, request);

      case 'ai_fixer':
        return this.executeAIFix(issue, request);

      default:
        return null;
    }
  }

  /**
   * Execute native fix (eslint --fix, etc.)
   */
  private async executeNativeFix(issue: Issue): Promise<CorgeaFix | null> {
    // TODO: Integrate with native fixer infrastructure
    // For now, return null (not implemented)
    return null;
  }

  /**
   * Execute pattern registry fix
   */
  private async executePatternFix(issue: Issue): Promise<CorgeaFix | null> {
    // TODO: Integrate with pattern registry
    // For now, return null (not implemented)
    return null;
  }

  /**
   * Execute Corgea fix via queue
   */
  private async executeCorgeaFix(
    issue: Issue,
    request: FixRequest
  ): Promise<CorgeaFix | null> {
    // Use the request queue for rate limiting
    const requestId = await this.queue.enqueue({
      userId: request.userId,
      organizationId: request.organizationId,
      priority: this.getPriority(issue),
      issues: [issue],
      language: request.language,
      repositoryUrl: request.repositoryUrl,
      branch: request.branch,
      maxAttempts: 2
    });

    // Wait for result (with timeout)
    const timeout = 60000; // 1 minute
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const queuedRequest = await this.queue.getRequest(requestId);

      if (queuedRequest?.status === 'completed' && queuedRequest.result) {
        return queuedRequest.result.fixes[0] || null;
      }

      if (queuedRequest?.status === 'failed') {
        throw new Error(queuedRequest.error || 'Corgea request failed');
      }

      await this.sleep(1000);
    }

    throw new Error('Corgea request timed out');
  }

  /**
   * Execute AI fixer (OpenRouter)
   */
  private async executeAIFix(
    issue: Issue,
    request: FixRequest
  ): Promise<CorgeaFix | null> {
    // TODO: Integrate with OpenRouter AI fixer
    // For now, simulate a fix

    // This would call the AI fixer service
    // const aiResult = await aiFixerService.generateFix(issue, request.language);

    // Simulated response for now
    return null;
  }

  /**
   * Get priority for an issue
   */
  private getPriority(issue: Issue): 1 | 2 | 3 | 4 | 5 {
    const severity = issue.severity?.toLowerCase() || 'medium';
    const category = issue.category?.toLowerCase() || '';

    if (severity === 'critical') return 1;
    if (severity === 'high' || category === 'security') return 2;
    if (severity === 'medium') return 3;
    if (severity === 'low') return 4;
    return 5;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============================================================
  // ANALYTICS
  // ============================================================

  /**
   * Get routing analytics
   */
  async getAnalytics(): Promise<{
    costComparison: Awaited<ReturnType<typeof this.costManager.getCostComparison>>;
    profitability: Awaited<ReturnType<typeof this.costManager.analyzeProfitability>>;
    ceilingStatus: ReturnType<typeof this.costManager.getCeilingStatus>;
    cacheStats: Awaited<ReturnType<typeof this.cache.getStats>>;
    queueStatus: ReturnType<typeof this.queue.getStatus>;
  }> {
    const [costComparison, profitability, cacheStats] = await Promise.all([
      this.costManager.getCostComparison('weekly'),
      this.costManager.analyzeProfitability(),
      this.cache.getStats()
    ]);

    return {
      costComparison,
      profitability,
      ceilingStatus: this.costManager.getCeilingStatus(),
      cacheStats,
      queueStatus: this.queue.getStatus()
    };
  }

  /**
   * Update cost ceilings
   */
  setCeilings(ceilings: Parameters<typeof this.costManager.setCeilings>[0]): void {
    this.costManager.setCeilings(ceilings);
  }

  /**
   * Update pricing
   */
  setPricing(pricing: Parameters<typeof this.costManager.setPricing>[0]): void {
    this.costManager.setPricing(pricing);
  }
}

// ============================================================
// SINGLETON INSTANCE
// ============================================================

let routerInstance: IntelligentFixRouter | null = null;

export function getIntelligentFixRouter(): IntelligentFixRouter {
  if (!routerInstance) {
    routerInstance = new IntelligentFixRouter();
  }
  return routerInstance;
}
