/**
 * Corgea Smart Batcher
 *
 * Reduces API calls by:
 * - Grouping issues by file (one request per file)
 * - Deduplicating similar issues
 * - Prioritizing high-severity issues
 * - Batching within rate limits
 *
 * @since Session 63
 */

import { Issue } from '../../analyzers/v9-types';
import { createHash } from 'crypto';

// ============================================================
// TYPES
// ============================================================

export interface BatchedRequest {
  batchId: string;
  file: string;
  issues: Issue[];
  priority: number; // 1 = highest
  estimatedCost: number;
  fingerprint: string; // For deduplication
}

export interface BatchingResult {
  batches: BatchedRequest[];
  originalCount: number;
  batchedCount: number;
  deduplicatedCount: number;
  estimatedApiCalls: number;
  estimatedCost: number;
  savings: {
    callsReduced: number;
    percentReduction: number;
  };
}

export interface BatchConfig {
  maxIssuesPerBatch: number;
  maxBatchesPerRequest: number;
  prioritizeSeverity: boolean;
  deduplicateSimilar: boolean;
  similarityThreshold: number; // 0-1, how similar issues must be to dedupe
}

const DEFAULT_CONFIG: BatchConfig = {
  maxIssuesPerBatch: 10,
  maxBatchesPerRequest: 5,
  prioritizeSeverity: true,
  deduplicateSimilar: true,
  similarityThreshold: 0.8
};

// Severity priority (lower = higher priority)
const SEVERITY_PRIORITY: Record<string, number> = {
  critical: 1,
  high: 2,
  medium: 3,
  low: 4
};

// Category priority (security > quality > style)
const CATEGORY_PRIORITY: Record<string, number> = {
  security: 1,
  bugs: 2,
  code_quality: 3,
  performance: 4,
  architecture: 5,
  style: 6
};

// ============================================================
// SMART BATCHER CLASS
// ============================================================

export class CorgeaSmartBatcher {
  private config: BatchConfig;

  constructor(config: Partial<BatchConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Batch issues for efficient API calls
   */
  batch(issues: Issue[]): BatchingResult {
    const originalCount = issues.length;

    // Step 1: Deduplicate similar issues
    let dedupedIssues = issues;
    let deduplicatedCount = 0;
    if (this.config.deduplicateSimilar) {
      dedupedIssues = this.deduplicateIssues(issues);
      deduplicatedCount = originalCount - dedupedIssues.length;
    }

    // Step 2: Group by file
    const byFile = this.groupByFile(dedupedIssues);

    // Step 3: Create batches with priority
    const batches = this.createBatches(byFile);

    // Step 4: Sort by priority
    if (this.config.prioritizeSeverity) {
      batches.sort((a, b) => a.priority - b.priority);
    }

    // Calculate metrics
    const estimatedApiCalls = batches.length;
    const estimatedCost = batches.reduce((sum, b) => sum + b.estimatedCost, 0);
    const callsWithoutBatching = originalCount; // Worst case: 1 call per issue
    const callsReduced = callsWithoutBatching - estimatedApiCalls;
    const percentReduction = originalCount > 0
      ? (callsReduced / callsWithoutBatching) * 100
      : 0;

    return {
      batches,
      originalCount,
      batchedCount: dedupedIssues.length,
      deduplicatedCount,
      estimatedApiCalls,
      estimatedCost,
      savings: {
        callsReduced,
        percentReduction
      }
    };
  }

  /**
   * Deduplicate similar issues
   */
  private deduplicateIssues(issues: Issue[]): Issue[] {
    const seen = new Map<string, Issue>();

    for (const issue of issues) {
      const fingerprint = this.createFingerprint(issue);

      if (!seen.has(fingerprint)) {
        seen.set(fingerprint, issue);
      } else {
        // Keep the higher severity one
        const existing = seen.get(fingerprint)!;
        if (this.compareSeverity(issue, existing) < 0) {
          seen.set(fingerprint, issue);
        }
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Create a fingerprint for deduplication
   */
  private createFingerprint(issue: Issue): string {
    // Include file, rule, and normalized code snippet
    const parts = [
      issue.file || '',
      issue.rule || '',
      this.normalizeSnippet(issue.codeSnippet || issue.description || '')
    ];

    return createHash('md5').update(parts.join('|')).digest('hex');
  }

  /**
   * Normalize code snippet for comparison
   */
  private normalizeSnippet(snippet: string): string {
    return snippet
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/['"`]/g, '')
      .replace(/\d+/g, 'N') // Replace numbers with placeholder
      .trim()
      .substring(0, 100); // Limit length
  }

  /**
   * Compare severity of two issues (negative = first is more severe)
   */
  private compareSeverity(a: Issue, b: Issue): number {
    const aPriority = SEVERITY_PRIORITY[a.severity?.toLowerCase() || 'low'] || 4;
    const bPriority = SEVERITY_PRIORITY[b.severity?.toLowerCase() || 'low'] || 4;
    return aPriority - bPriority;
  }

  /**
   * Group issues by file
   */
  private groupByFile(issues: Issue[]): Map<string, Issue[]> {
    const byFile = new Map<string, Issue[]>();

    for (const issue of issues) {
      const file = issue.file || 'unknown';
      const fileIssues = byFile.get(file) || [];
      fileIssues.push(issue);
      byFile.set(file, fileIssues);
    }

    return byFile;
  }

  /**
   * Create batches from file groups
   */
  private createBatches(byFile: Map<string, Issue[]>): BatchedRequest[] {
    const batches: BatchedRequest[] = [];
    let batchIndex = 0;

    for (const [file, issues] of byFile) {
      // Sort issues by severity within file
      const sortedIssues = [...issues].sort(this.compareSeverity);

      // Split into sub-batches if too many issues
      for (let i = 0; i < sortedIssues.length; i += this.config.maxIssuesPerBatch) {
        const batchIssues = sortedIssues.slice(i, i + this.config.maxIssuesPerBatch);

        // Calculate priority (lowest severity number in batch)
        const priority = Math.min(
          ...batchIssues.map(issue =>
            SEVERITY_PRIORITY[issue.severity?.toLowerCase() || 'low'] || 4
          )
        );

        // Calculate fingerprint for the batch
        const fingerprint = createHash('md5')
          .update(batchIssues.map(i => i.id || i.rule).join('|'))
          .digest('hex');

        // Estimate cost (10 cents per issue)
        const estimatedCost = batchIssues.length * 10;

        batches.push({
          batchId: `batch-${++batchIndex}`,
          file,
          issues: batchIssues,
          priority,
          estimatedCost,
          fingerprint
        });
      }
    }

    return batches;
  }

  /**
   * Get statistics about potential batching
   */
  getStatistics(issues: Issue[]): {
    totalIssues: number;
    uniqueFiles: number;
    bySeverity: Record<string, number>;
    byCategory: Record<string, number>;
    potentialDuplicates: number;
  } {
    const files = new Set<string>();
    const bySeverity: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    const fingerprints = new Set<string>();
    let potentialDuplicates = 0;

    for (const issue of issues) {
      const file = issue.file || 'unknown';
      files.add(file);

      const severity = issue.severity?.toLowerCase() || 'unknown';
      bySeverity[severity] = (bySeverity[severity] || 0) + 1;

      const category = issue.category?.toLowerCase() || 'unknown';
      byCategory[category] = (byCategory[category] || 0) + 1;

      const fingerprint = this.createFingerprint(issue);
      if (fingerprints.has(fingerprint)) {
        potentialDuplicates++;
      }
      fingerprints.add(fingerprint);
    }

    return {
      totalIssues: issues.length,
      uniqueFiles: files.size,
      bySeverity,
      byCategory,
      potentialDuplicates
    };
  }

  /**
   * Estimate API calls before actually batching
   */
  estimateApiCalls(issues: Issue[]): {
    withoutBatching: number;
    withBatching: number;
    savings: number;
  } {
    const withoutBatching = issues.length;
    const result = this.batch(issues);

    return {
      withoutBatching,
      withBatching: result.estimatedApiCalls,
      savings: result.savings.callsReduced
    };
  }
}

// ============================================================
// PRIORITY QUEUE FOR BATCHES
// ============================================================

export class BatchPriorityQueue {
  private batches: BatchedRequest[] = [];

  /**
   * Add batches to the queue
   */
  addBatches(batches: BatchedRequest[]): void {
    this.batches.push(...batches);
    this.batches.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get next batch to process
   */
  next(): BatchedRequest | undefined {
    return this.batches.shift();
  }

  /**
   * Get all critical priority batches
   */
  getCritical(): BatchedRequest[] {
    return this.batches.filter(b => b.priority === 1);
  }

  /**
   * Get remaining count
   */
  get length(): number {
    return this.batches.length;
  }

  /**
   * Check if empty
   */
  get isEmpty(): boolean {
    return this.batches.length === 0;
  }

  /**
   * Peek at next batch without removing
   */
  peek(): BatchedRequest | undefined {
    return this.batches[0];
  }

  /**
   * Clear the queue
   */
  clear(): void {
    this.batches = [];
  }
}

// ============================================================
// FACTORY FUNCTIONS
// ============================================================

export function createSmartBatcher(config?: Partial<BatchConfig>): CorgeaSmartBatcher {
  return new CorgeaSmartBatcher(config);
}

export function createBatchQueue(): BatchPriorityQueue {
  return new BatchPriorityQueue();
}
