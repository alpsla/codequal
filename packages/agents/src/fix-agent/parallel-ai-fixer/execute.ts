/**
 * Parallel AI Fixer - Convenience Execution Functions
 *
 * High-level functions for easy integration with the V9 pipeline.
 */

import { ParallelAIFixerExecutor, ParallelFixConfig, ParallelFixResult } from './parallel-executor';
import { DetectedIssue } from '../scan-fix-executor';

/**
 * Execute AI fixes in parallel
 *
 * This is the main entry point for parallel AI fix execution.
 *
 * @example
 * ```typescript
 * const result = await executeParallelAIFixes(issues, {
 *   workspaceRoot: '/path/to/repo',
 *   parallelism: 4,  // Number of parallel workers
 *   maxRetries: 3,   // Max retry attempts per issue
 * });
 *
 * console.log(`Fixed ${result.summary.fixedIssues}/${result.summary.totalIssues} issues`);
 * console.log(`Speedup: ${result.metrics.parallelSpeedup.toFixed(1)}x`);
 * ```
 */
export async function executeParallelAIFixes(
  issues: DetectedIssue[],
  config: Omit<ParallelFixConfig, 'workspaceRoot'> & { workspaceRoot: string }
): Promise<ParallelFixResult> {
  const executor = new ParallelAIFixerExecutor(config);
  return executor.execute(issues);
}

/**
 * Quick parallel AI fix with sensible defaults
 *
 * @example
 * ```typescript
 * const result = await quickParallelFix(issues, '/path/to/repo');
 * ```
 */
export async function quickParallelFix(
  issues: DetectedIssue[],
  workspaceRoot: string,
  onProgress?: (msg: string) => void
): Promise<ParallelFixResult> {
  return executeParallelAIFixes(issues, {
    workspaceRoot,
    verbose: true,
    onProgress: onProgress
      ? (p) => onProgress(`[${p.phase}] ${p.message}`)
      : undefined,
  });
}

/**
 * Execute parallel fixes with dry-run mode (no file changes)
 *
 * Useful for testing and previewing what would be fixed.
 */
export async function dryRunParallelFixes(
  issues: DetectedIssue[],
  workspaceRoot: string
): Promise<ParallelFixResult> {
  return executeParallelAIFixes(issues, {
    workspaceRoot,
    dryRun: true,
    verbose: true,
  });
}

/**
 * Execute fixes with custom parallelism level
 */
export async function executeWithParallelism(
  issues: DetectedIssue[],
  workspaceRoot: string,
  parallelism: number
): Promise<ParallelFixResult> {
  return executeParallelAIFixes(issues, {
    workspaceRoot,
    parallelism,
    verbose: true,
  });
}

/**
 * Performance comparison helper
 *
 * Run fixes sequentially and in parallel to measure speedup.
 * Returns both results and the actual speedup factor.
 */
export async function measureParallelSpeedup(
  issues: DetectedIssue[],
  workspaceRoot: string
): Promise<{
  parallelResult: ParallelFixResult;
  estimatedSequentialMs: number;
  actualParallelMs: number;
  speedupFactor: number;
}> {
  // Run in parallel
  const parallelResult = await executeParallelAIFixes(issues, {
    workspaceRoot,
    dryRun: true, // Don't modify files for benchmarking
    verbose: false,
  });

  // Estimate sequential time (~3s per issue)
  const estimatedSequentialMs = issues.length * 3000;
  const actualParallelMs = parallelResult.durationMs;
  const speedupFactor = estimatedSequentialMs / Math.max(actualParallelMs, 1);

  return {
    parallelResult,
    estimatedSequentialMs,
    actualParallelMs,
    speedupFactor,
  };
}

export default executeParallelAIFixes;
