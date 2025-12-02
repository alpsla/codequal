/**
 * Fix Scheduler Module
 *
 * Manages the execution order and parallelism of fix operations.
 * Groups issues by fixer and schedules based on performance characteristics.
 *
 * Part of the Three-Tier Fix System (P0 Priority)
 */

import { RoutedIssue, routeAndGroupIssues, EnrichedIssue, getFixerConfig } from './fix-router';

// Performance categories for fixers
export type PerformanceCategory = 'fast' | 'medium' | 'slow';

export interface FixerPerformance {
  category: PerformanceCategory;
  maxParallel: number;       // Max concurrent executions
  batchSize: number;         // Max issues per batch
  estimatedTimePerIssue: number;  // ms per issue
}

// Performance profiles for each fixer
const FIXER_PERFORMANCE: Record<string, FixerPerformance> = {
  // Fast fixers (high parallelism)
  'ruff': { category: 'fast', maxParallel: 8, batchSize: 100, estimatedTimePerIssue: 10 },
  'ruff-format': { category: 'fast', maxParallel: 8, batchSize: 100, estimatedTimePerIssue: 5 },
  'prettier': { category: 'fast', maxParallel: 8, batchSize: 50, estimatedTimePerIssue: 10 },
  'autoflake': { category: 'fast', maxParallel: 8, batchSize: 50, estimatedTimePerIssue: 15 },
  'isort': { category: 'fast', maxParallel: 8, batchSize: 100, estimatedTimePerIssue: 5 },
  'gofmt': { category: 'fast', maxParallel: 8, batchSize: 100, estimatedTimePerIssue: 5 },
  'goimports': { category: 'fast', maxParallel: 8, batchSize: 100, estimatedTimePerIssue: 8 },

  // Medium fixers (limited parallelism)
  'eslint': { category: 'medium', maxParallel: 4, batchSize: 30, estimatedTimePerIssue: 50 },
  'typescript-eslint': { category: 'medium', maxParallel: 4, batchSize: 30, estimatedTimePerIssue: 50 },
  'semgrep': { category: 'medium', maxParallel: 2, batchSize: 20, estimatedTimePerIssue: 100 },
  'pyupgrade': { category: 'medium', maxParallel: 4, batchSize: 30, estimatedTimePerIssue: 30 },
  'black': { category: 'medium', maxParallel: 4, batchSize: 30, estimatedTimePerIssue: 30 },
  'golangci-lint': { category: 'medium', maxParallel: 2, batchSize: 20, estimatedTimePerIssue: 100 },

  // Slow fixers (sequential, JVM overhead)
  'sorald': { category: 'slow', maxParallel: 1, batchSize: 10, estimatedTimePerIssue: 500 },
  'openrewrite': { category: 'slow', maxParallel: 1, batchSize: 5, estimatedTimePerIssue: 2000 },
  'error-prone': { category: 'slow', maxParallel: 1, batchSize: 10, estimatedTimePerIssue: 300 },
  'renovate': { category: 'slow', maxParallel: 1, batchSize: 1, estimatedTimePerIssue: 30000 },
  'npm-check-updates': { category: 'slow', maxParallel: 1, batchSize: 1, estimatedTimePerIssue: 5000 },

  // AI fallback (rate limited)
  'ai': { category: 'medium', maxParallel: 3, batchSize: 5, estimatedTimePerIssue: 3000 },
};

export interface FixBatch {
  id: string;
  fixer: string;
  tier: 1 | 2 | 3;
  issues: RoutedIssue[];
  priority: number;          // Lower = higher priority
  estimatedTime: number;     // Total estimated time in ms
  performance: FixerPerformance;
}

export interface ScheduledExecution {
  batches: FixBatch[];
  phases: FixBatch[][];      // Batches grouped by execution phase
  totalEstimatedTime: number;
  parallelismPlan: {
    phase: number;
    concurrent: number;
    batches: string[];
  }[];
}

/**
 * Get performance profile for a fixer
 */
export function getFixerPerformance(fixer: string): FixerPerformance {
  return FIXER_PERFORMANCE[fixer] || {
    category: 'slow',
    maxParallel: 1,
    batchSize: 10,
    estimatedTimePerIssue: 1000,
  };
}

/**
 * Create batches from grouped issues
 */
function createBatches(groupedIssues: Map<string, RoutedIssue[]>): FixBatch[] {
  const batches: FixBatch[] = [];
  let batchId = 0;

  for (const [key, issues] of Array.from(groupedIssues.entries())) {
    if (issues.length === 0) continue;

    const [tierStr, fixer] = key.split('-');
    const tier = parseInt(tierStr) as 1 | 2 | 3;
    const performance = getFixerPerformance(fixer);

    // Split into appropriately sized batches
    for (let i = 0; i < issues.length; i += performance.batchSize) {
      const batchIssues = issues.slice(i, i + performance.batchSize);
      const estimatedTime = batchIssues.length * performance.estimatedTimePerIssue;

      batches.push({
        id: `batch-${batchId++}`,
        fixer,
        tier,
        issues: batchIssues,
        priority: calculatePriority(tier, fixer, batchIssues),
        estimatedTime,
        performance,
      });
    }
  }

  return batches;
}

/**
 * Calculate priority for a batch (lower = higher priority)
 * Priority order:
 * 1. Tier 1 (native fixes) - fastest, most reliable
 * 2. Tier 2 (dedicated fixers) - good reliability
 * 3. Tier 3 (AI fallback) - slower, less reliable
 * Within tiers, prioritize by:
 * - Security issues first
 * - Fast fixers before slow ones
 * - Larger batches (more impact)
 */
function calculatePriority(tier: 1 | 2 | 3, fixer: string, issues: RoutedIssue[]): number {
  let priority = tier * 100;  // Base priority by tier

  // Prioritize security issues
  const securityCount = issues.filter(i => i.classification.issueType === 'security').length;
  priority -= securityCount * 10;

  // Prioritize fast fixers
  const performance = getFixerPerformance(fixer);
  if (performance.category === 'fast') priority -= 20;
  else if (performance.category === 'medium') priority -= 10;

  // Prioritize larger batches (more impact per operation)
  priority -= Math.min(issues.length, 50);

  return priority;
}

/**
 * Schedule batches into execution phases
 * Phases run sequentially, batches within a phase can run in parallel
 */
function scheduleBatches(batches: FixBatch[]): ScheduledExecution {
  // Sort by priority (lower = higher priority)
  const sortedBatches = [...batches].sort((a, b) => a.priority - b.priority);

  // Group into phases based on performance category
  const phases: FixBatch[][] = [];
  const parallelismPlan: ScheduledExecution['parallelismPlan'] = [];

  // Phase 1: All fast fixers (can run highly parallel)
  const fastBatches = sortedBatches.filter(b => b.performance.category === 'fast');
  if (fastBatches.length > 0) {
    phases.push(fastBatches);
    parallelismPlan.push({
      phase: phases.length,
      concurrent: 8,
      batches: fastBatches.map(b => b.id),
    });
  }

  // Phase 2: Medium fixers (limited parallelism)
  const mediumBatches = sortedBatches.filter(b => b.performance.category === 'medium');
  if (mediumBatches.length > 0) {
    phases.push(mediumBatches);
    parallelismPlan.push({
      phase: phases.length,
      concurrent: 4,
      batches: mediumBatches.map(b => b.id),
    });
  }

  // Phase 3: Slow fixers (sequential)
  const slowBatches = sortedBatches.filter(b => b.performance.category === 'slow');
  if (slowBatches.length > 0) {
    phases.push(slowBatches);
    parallelismPlan.push({
      phase: phases.length,
      concurrent: 1,
      batches: slowBatches.map(b => b.id),
    });
  }

  // Calculate total estimated time
  let totalEstimatedTime = 0;
  for (const phase of phases) {
    // Time for a phase is the maximum batch time (parallel execution)
    const maxTime = Math.max(...phase.map(b => b.estimatedTime));
    totalEstimatedTime += maxTime;
  }

  return {
    batches: sortedBatches,
    phases,
    totalEstimatedTime,
    parallelismPlan,
  };
}

/**
 * Create a fix execution schedule from a list of issues
 */
export function createSchedule(issues: EnrichedIssue[]): ScheduledExecution {
  // Route and group issues
  const grouped = routeAndGroupIssues(issues);

  // Create batches
  const batches = createBatches(grouped);

  // Schedule batches
  return scheduleBatches(batches);
}

/**
 * Get schedule summary for display
 */
export function getScheduleSummary(schedule: ScheduledExecution): {
  totalIssues: number;
  totalBatches: number;
  totalPhases: number;
  estimatedTime: string;
  breakdown: {
    tier: 1 | 2 | 3;
    fixer: string;
    issues: number;
    batches: number;
    time: string;
  }[];
} {
  const breakdown: {
    tier: 1 | 2 | 3;
    fixer: string;
    issues: number;
    batches: number;
    time: string;
  }[] = [];

  // Group batches by tier and fixer
  const groups = new Map<string, FixBatch[]>();
  for (const batch of schedule.batches) {
    const key = `${batch.tier}-${batch.fixer}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(batch);
  }

  for (const [key, batches] of Array.from(groups.entries())) {
    const [tierStr, fixer] = key.split('-');
    const tier = parseInt(tierStr) as 1 | 2 | 3;
    const issues = batches.reduce((sum, b) => sum + b.issues.length, 0);
    const time = batches.reduce((sum, b) => sum + b.estimatedTime, 0);

    breakdown.push({
      tier,
      fixer,
      issues,
      batches: batches.length,
      time: formatTime(time),
    });
  }

  // Sort breakdown by tier then fixer
  breakdown.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    return a.fixer.localeCompare(b.fixer);
  });

  return {
    totalIssues: schedule.batches.reduce((sum, b) => sum + b.issues.length, 0),
    totalBatches: schedule.batches.length,
    totalPhases: schedule.phases.length,
    estimatedTime: formatTime(schedule.totalEstimatedTime),
    breakdown,
  };
}

/**
 * Format time in ms to human-readable string
 */
function formatTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}m ${seconds}s`;
}

/**
 * Execution context for running fixes
 */
export interface FixExecutionContext {
  workingDirectory: string;
  dryRun: boolean;
  maxParallel?: number;
  timeout?: number;
  onProgress?: (completed: number, total: number, batch: FixBatch) => void;
  onBatchComplete?: (batch: FixBatch, success: boolean, result: FixResult) => void;
}

export interface FixResult {
  batchId: string;
  fixer: string;
  success: boolean;
  issuesFixed: number;
  issuesFailed: number;
  error?: string;
  duration: number;
  changes?: {
    file: string;
    linesChanged: number;
  }[];
}

/**
 * Execute a fix schedule (placeholder - actual execution in tool-fixers)
 */
export async function executeSchedule(
  schedule: ScheduledExecution,
  context: FixExecutionContext
): Promise<FixResult[]> {
  const results: FixResult[] = [];
  let completed = 0;
  const total = schedule.batches.length;

  for (let phaseIdx = 0; phaseIdx < schedule.phases.length; phaseIdx++) {
    const phase = schedule.phases[phaseIdx];
    const plan = schedule.parallelismPlan[phaseIdx];

    // Execute batches in this phase with appropriate parallelism
    const maxParallel = context.maxParallel || plan.concurrent;

    // Process in chunks of maxParallel
    for (let i = 0; i < phase.length; i += maxParallel) {
      const chunk = phase.slice(i, i + maxParallel);

      // Execute chunk in parallel
      const chunkResults = await Promise.all(
        chunk.map(async (batch) => {
          const startTime = Date.now();

          try {
            // In dry run mode, just simulate
            if (context.dryRun) {
              await simulateBatchExecution(batch);
              const result: FixResult = {
                batchId: batch.id,
                fixer: batch.fixer,
                success: true,
                issuesFixed: batch.issues.length,
                issuesFailed: 0,
                duration: Date.now() - startTime,
              };

              if (context.onBatchComplete) {
                context.onBatchComplete(batch, true, result);
              }

              return result;
            }

            // Actual execution would happen here via tool-fixers
            // For now, return a placeholder result
            const result: FixResult = {
              batchId: batch.id,
              fixer: batch.fixer,
              success: true,
              issuesFixed: batch.issues.length,
              issuesFailed: 0,
              duration: Date.now() - startTime,
            };

            if (context.onBatchComplete) {
              context.onBatchComplete(batch, true, result);
            }

            return result;
          } catch (error) {
            const result: FixResult = {
              batchId: batch.id,
              fixer: batch.fixer,
              success: false,
              issuesFixed: 0,
              issuesFailed: batch.issues.length,
              error: error instanceof Error ? error.message : String(error),
              duration: Date.now() - startTime,
            };

            if (context.onBatchComplete) {
              context.onBatchComplete(batch, false, result);
            }

            return result;
          }
        })
      );

      results.push(...chunkResults);
      completed += chunk.length;

      if (context.onProgress) {
        context.onProgress(completed, total, chunk[chunk.length - 1]);
      }
    }
  }

  return results;
}

/**
 * Simulate batch execution for dry run mode
 */
async function simulateBatchExecution(batch: FixBatch): Promise<void> {
  // Simulate processing time based on batch size and fixer performance
  const simulatedTime = Math.min(
    batch.estimatedTime * 0.1,  // 10% of estimated time for simulation
    500  // Max 500ms simulation time
  );
  await new Promise(resolve => setTimeout(resolve, simulatedTime));
}

// Export performance profiles for extension
export { FIXER_PERFORMANCE };
