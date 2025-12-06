/**
 * Parallel AI Fixer Module
 *
 * High-performance parallel AI fix execution system that:
 * 1. Indexes all issues from initial scan for O(1) lookup
 * 2. Caches file contents in memory
 * 3. Applies template fixes first (fast, deterministic)
 * 4. Splits remaining AI fixes into chunks (1 per CPU core)
 * 5. Runs fixes in parallel with retries
 * 6. Batch verifies results per-file
 *
 * Two-tier fix system:
 * - Template fixes: Fast, deterministic pattern-based fixes
 * - AI fixes: Fallback for issues without patterns
 *
 * Performance: ~6x speedup over sequential execution
 * - Sequential: 14+ minutes for 280 issues
 * - Parallel: ~2.3 minutes with 4 CPUs
 *
 * @module fix-agent/parallel-ai-fixer
 */

export { IssueIndex, type IndexedIssue, type IssueIndexStats } from './issue-index';
export { FileCache, type CachedFile, type FileCacheStats } from './file-cache';
export {
  TemplateFixEngine,
  quickTemplateFix,
  type TemplateFixResult,
  type TemplateFixEngineConfig,
  type TemplateFixStats,
  type PartitionedIssues,
} from './template-fix-engine';
export { ParallelAIFixerExecutor, type ParallelFixConfig, type ParallelFixResult, type ParallelFixProgress } from './parallel-executor';
export { executeParallelAIFixes, quickParallelFix, dryRunParallelFixes } from './execute';
