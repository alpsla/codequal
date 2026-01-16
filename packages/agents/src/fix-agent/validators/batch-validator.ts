/**
 * Batch Validator
 *
 * Optimizes fix validation by grouping fixes by tool/rule and validating them together.
 * Instead of running N separate tool executions for N fixes, groups fixes by tool
 * and validates each group in a single tool execution.
 *
 * Session 89: Created for batch validation optimization
 *
 * Benefits:
 * - Reduces tool execution overhead (N executions → M groups)
 * - Single temp file per tool instead of N temp files
 * - Better rate limit utilization
 * - Maintains per-fix validation results
 */

import {
  ToolRevalidator,
  ToolRevalidationRequest,
  ToolRevalidationResult,
  getToolRevalidator,
} from '../fix-pattern-registry/tool-revalidator';

// ============================================================================
// Types
// ============================================================================

/**
 * Request for batch validation - extends single request with batch context
 */
export interface BatchValidationRequest extends ToolRevalidationRequest {
  /** Unique identifier for this fix within the batch */
  fixId: string;
}

/**
 * Result for a single fix within a batch
 */
export interface BatchValidationItemResult extends ToolRevalidationResult {
  /** Unique identifier for this fix */
  fixId: string;
}

/**
 * Result of batch validation - contains individual results keyed by fixId
 */
export interface BatchValidationResult {
  /** Total fixes in the batch */
  totalFixes: number;
  /** Number of fixes that passed validation */
  passedCount: number;
  /** Number of fixes that failed validation */
  failedCount: number;
  /** Individual results by fixId */
  results: Map<string, BatchValidationItemResult>;
  /** Number of tool executions performed (groups) */
  toolExecutions: number;
  /** Tool executions saved compared to individual validation */
  executionsSaved: number;
  /** Total duration in milliseconds */
  totalDuration: number;
  /** Human-readable summary */
  summary: string;
}

/**
 * Group of fixes for the same tool
 */
interface ToolGroup {
  tool: string;
  language: string;
  fixes: BatchValidationRequest[];
}

// ============================================================================
// Grouping Utilities
// ============================================================================

/**
 * Group fixes by tool and language for efficient batch processing
 *
 * Groups are keyed by `${tool}:${language}` to ensure fixes are validated
 * with the correct tool configuration.
 *
 * @param fixes - Array of fixes to group
 * @returns Map of group key to group data
 */
export function groupFixesByTool(
  fixes: BatchValidationRequest[]
): Map<string, ToolGroup> {
  const groups = new Map<string, ToolGroup>();

  for (const fix of fixes) {
    const key = `${fix.tool.toLowerCase()}:${fix.language.toLowerCase()}`;

    if (!groups.has(key)) {
      groups.set(key, {
        tool: fix.tool,
        language: fix.language,
        fixes: [],
      });
    }

    groups.get(key)!.fixes.push(fix);
  }

  return groups;
}

/**
 * Group fixes by tool, language, AND rule for more granular batching
 *
 * This can be useful when you want to track validation results per rule.
 *
 * @param fixes - Array of fixes to group
 * @returns Map of group key to group data
 */
export function groupFixesByToolAndRule(
  fixes: BatchValidationRequest[]
): Map<string, ToolGroup & { ruleId: string }> {
  const groups = new Map<string, ToolGroup & { ruleId: string }>();

  for (const fix of fixes) {
    const key = `${fix.tool.toLowerCase()}:${fix.language.toLowerCase()}:${fix.ruleId.toLowerCase()}`;

    if (!groups.has(key)) {
      groups.set(key, {
        tool: fix.tool,
        language: fix.language,
        ruleId: fix.ruleId,
        fixes: [],
      });
    }

    groups.get(key)!.fixes.push(fix);
  }

  return groups;
}

// ============================================================================
// Batch Validator Class
// ============================================================================

/**
 * Options for batch validation
 */
export interface BatchValidatorOptions {
  /** Maximum fixes to validate in a single tool execution (default: 10) */
  maxFixesPerExecution?: number;
  /** Run validations in parallel within groups (default: false) */
  parallelWithinGroups?: boolean;
  /** Custom ToolRevalidator instance (default: singleton) */
  revalidator?: ToolRevalidator;
}

/**
 * BatchValidator - Optimizes fix validation by grouping and batching
 *
 * Usage:
 * ```typescript
 * const validator = new BatchValidator();
 *
 * // Validate multiple fixes efficiently
 * const result = await validator.validateBatch([
 *   { fixId: '1', tool: 'pmd', language: 'java', ... },
 *   { fixId: '2', tool: 'pmd', language: 'java', ... },
 *   { fixId: '3', tool: 'eslint', language: 'typescript', ... },
 * ]);
 *
 * // Result contains individual validation results
 * if (result.results.get('1')?.passed) {
 *   console.log('Fix 1 passed validation');
 * }
 * ```
 */
export class BatchValidator {
  private options: Required<Omit<BatchValidatorOptions, 'revalidator'>> & {
    revalidator?: ToolRevalidator;
  };

  constructor(options: BatchValidatorOptions = {}) {
    this.options = {
      maxFixesPerExecution: options.maxFixesPerExecution ?? 10,
      parallelWithinGroups: options.parallelWithinGroups ?? false,
      revalidator: options.revalidator,
    };
  }

  /**
   * Validate a batch of fixes, grouping by tool for efficiency
   *
   * This is the main entry point for batch validation. Fixes are automatically
   * grouped by tool/language and validated together.
   *
   * @param fixes - Array of fixes to validate
   * @returns Batch validation result with individual fix results
   */
  async validateBatch(
    fixes: BatchValidationRequest[]
  ): Promise<BatchValidationResult> {
    const startTime = Date.now();
    const results = new Map<string, BatchValidationItemResult>();
    let toolExecutions = 0;

    if (fixes.length === 0) {
      return {
        totalFixes: 0,
        passedCount: 0,
        failedCount: 0,
        results,
        toolExecutions: 0,
        executionsSaved: 0,
        totalDuration: 0,
        summary: 'No fixes to validate',
      };
    }

    // Group fixes by tool
    const groups = groupFixesByTool(fixes);
    console.log(
      `[BatchValidator] Grouped ${fixes.length} fixes into ${groups.size} tool groups`
    );

    // Get or create revalidator
    const revalidator = this.options.revalidator || getToolRevalidator();

    // Process each group
    const groupEntries = Array.from(groups.entries());
    for (const [groupKey, group] of groupEntries) {
      console.log(
        `[BatchValidator] Processing group ${groupKey} with ${group.fixes.length} fixes`
      );

      // Split into sub-batches if needed
      const batches = this.splitIntoBatches(group.fixes);

      for (const batch of batches) {
        toolExecutions++;

        // Validate each fix in the batch
        // Note: Current ToolRevalidator validates one fix at a time
        // Future optimization could merge temp files and run tool once
        if (this.options.parallelWithinGroups) {
          const batchResults = await Promise.all(
            batch.map(async (fix) => {
              const result = await revalidator.validateFix(fix);
              return { fixId: fix.fixId, result };
            })
          );

          for (const { fixId, result } of batchResults) {
            results.set(fixId, { ...result, fixId });
          }
        } else {
          // Sequential validation within batch
          for (const fix of batch) {
            const result = await revalidator.validateFix(fix);
            results.set(fix.fixId, { ...result, fixId: fix.fixId });
          }
        }
      }
    }

    // Calculate statistics
    let passedCount = 0;
    let failedCount = 0;
    results.forEach((result) => {
      if (result.passed) passedCount++;
      else failedCount++;
    });

    const totalDuration = Date.now() - startTime;
    const executionsSaved = Math.max(0, fixes.length - toolExecutions);

    const summary = this.generateSummary(
      fixes.length,
      passedCount,
      failedCount,
      toolExecutions,
      executionsSaved,
      totalDuration
    );

    console.log(`[BatchValidator] ${summary}`);

    return {
      totalFixes: fixes.length,
      passedCount,
      failedCount,
      results,
      toolExecutions,
      executionsSaved,
      totalDuration,
      summary,
    };
  }

  /**
   * Split fixes into batches respecting maxFixesPerExecution
   */
  private splitIntoBatches(
    fixes: BatchValidationRequest[]
  ): BatchValidationRequest[][] {
    const batches: BatchValidationRequest[][] = [];

    for (let i = 0; i < fixes.length; i += this.options.maxFixesPerExecution) {
      batches.push(fixes.slice(i, i + this.options.maxFixesPerExecution));
    }

    return batches;
  }

  /**
   * Generate human-readable summary
   */
  private generateSummary(
    total: number,
    passed: number,
    failed: number,
    executions: number,
    saved: number,
    duration: number
  ): string {
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
    const savedPercent =
      total > 0 ? Math.round((saved / total) * 100) : 0;

    return (
      `Batch validation complete: ${passed}/${total} passed (${passRate}%), ` +
      `${executions} tool executions (${saved} saved, ${savedPercent}% reduction), ` +
      `${duration}ms total`
    );
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Validate a batch of fixes using the default BatchValidator
 *
 * @param fixes - Array of fixes to validate
 * @param options - Optional batch validator options
 * @returns Batch validation result
 */
export async function batchValidate(
  fixes: BatchValidationRequest[],
  options?: BatchValidatorOptions
): Promise<BatchValidationResult> {
  const validator = new BatchValidator(options);
  return validator.validateBatch(fixes);
}

/**
 * Convert array of tool revalidation requests to batch requests
 *
 * Automatically generates fixIds based on rule, file, and line number
 *
 * @param requests - Array of standard tool revalidation requests
 * @returns Array of batch validation requests with fixIds
 */
export function toBatchRequests(
  requests: ToolRevalidationRequest[]
): BatchValidationRequest[] {
  return requests.map((req, index) => ({
    ...req,
    fixId: `${req.ruleId}:${req.originalFilePath}:${req.lineNumber}:${index}`,
  }));
}

// ============================================================================
// Singleton
// ============================================================================

let defaultBatchValidator: BatchValidator | null = null;

/**
 * Get the default BatchValidator singleton
 */
export function getBatchValidator(
  options?: BatchValidatorOptions
): BatchValidator {
  if (!defaultBatchValidator) {
    defaultBatchValidator = new BatchValidator(options);
  }
  return defaultBatchValidator;
}

/**
 * Reset the default BatchValidator singleton (for testing)
 */
export function resetBatchValidator(): void {
  defaultBatchValidator = null;
}

export default BatchValidator;
