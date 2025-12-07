/**
 * Template Fix Engine
 *
 * Two-tier fix system that:
 * 1. First tries template-based fixes (fast, deterministic)
 * 2. Falls back to AI fixes for issues without patterns
 *
 * Integration with ParallelAIFixer:
 * - Template fixes run synchronously (fast)
 * - AI fixes run in parallel (slow but parallel)
 * - Results merged for final output
 */

import { DetectedIssue } from '../scan-fix-executor';
import { IndexedIssue, IssueIndex } from './issue-index';
import { FileCache } from './file-cache';
import {
  getFixPatternRegistry,
  applyFixPattern,
  hasPatternForRule,
  FixPattern,
} from '../fix-pattern-registry';

// ============================================================================
// TYPES
// ============================================================================

export interface TemplateFixResult {
  /** Whether a template fix was applied */
  applied: boolean;
  /** The pattern used (if any) */
  pattern?: FixPattern;
  /** Fixed code (if successful) */
  fixedCode?: string;
  /** Confidence in the fix */
  confidence: number;
  /** Source of the fix */
  source: 'template' | 'ai' | 'manual';
  /** Error message if failed */
  error?: string;
}

export interface TemplateFixEngineConfig {
  /** Minimum confidence to apply template fix */
  minConfidence?: number;
  /** Whether to skip security fixes (require manual review) */
  skipSecurityFixes?: boolean;
  /** Verbose logging */
  verbose?: boolean;
}

export interface TemplateFixStats {
  /** Total issues processed */
  totalIssues: number;
  /** Issues fixed by templates */
  templateFixed: number;
  /** Issues requiring AI */
  needsAI: number;
  /** Issues requiring manual review */
  needsManual: number;
  /** Time spent on template fixes (ms) */
  templateTimeMs: number;
  /** Patterns used */
  patternsUsed: Map<string, number>;
}

export interface PartitionedIssues {
  /** Issues that can be fixed by templates */
  templateFixable: IndexedIssue[];
  /** Issues that need AI fixes */
  needsAI: IndexedIssue[];
  /** Issues that require manual review */
  needsManual: IndexedIssue[];
}

// ============================================================================
// TEMPLATE FIX ENGINE
// ============================================================================

/**
 * Template Fix Engine
 *
 * Usage:
 * ```typescript
 * const engine = new TemplateFixEngine(issueIndex, fileCache, {
 *   minConfidence: 80,
 *   verbose: true,
 * });
 *
 * // Partition issues
 * const partitioned = await engine.partitionIssues();
 *
 * // Apply template fixes
 * const stats = await engine.applyTemplateFixes(partitioned.templateFixable);
 *
 * // Remaining issues go to AI fixer
 * // partitioned.needsAI -> ParallelAIFixer
 * ```
 */
export class TemplateFixEngine {
  private config: Required<TemplateFixEngineConfig>;
  private issueIndex: IssueIndex;
  private fileCache: FileCache;
  private registry = getFixPatternRegistry();
  private stats: TemplateFixStats;

  constructor(
    issueIndex: IssueIndex,
    fileCache: FileCache,
    config: TemplateFixEngineConfig = {}
  ) {
    this.config = {
      minConfidence: config.minConfidence ?? 80,
      skipSecurityFixes: config.skipSecurityFixes ?? false,
      verbose: config.verbose ?? false,
    };
    this.issueIndex = issueIndex;
    this.fileCache = fileCache;
    this.stats = this.createEmptyStats();
  }

  // ============================================================================
  // PARTITION ISSUES
  // ============================================================================

  /**
   * Partition issues into template-fixable, needs-AI, and needs-manual
   *
   * This is the first step before applying any fixes.
   */
  async partitionIssues(): Promise<PartitionedIssues> {
    const startTime = Date.now();
    const pending = this.issueIndex.getAllPending();

    const templateFixable: IndexedIssue[] = [];
    const needsAI: IndexedIssue[] = [];
    const needsManual: IndexedIssue[] = [];

    for (const issue of pending) {
      // Check if pattern exists for this rule
      const hasPattern = await hasPatternForRule(issue.rule, issue.tool);

      if (hasPattern) {
        // Check pattern confidence
        const lookup = await this.registry.lookup({
          ruleId: issue.rule,
          tool: issue.tool,
          activeOnly: true,
        });

        if (lookup.found && lookup.recommended) {
          const pattern = lookup.recommended;

          // Skip security fixes if configured
          if (this.config.skipSecurityFixes && this.isSecurityFix(pattern)) {
            needsManual.push(issue);
            continue;
          }

          // Check confidence threshold
          if (pattern.confidence >= this.config.minConfidence) {
            templateFixable.push(issue);
          } else {
            // Low confidence pattern - use AI instead
            needsAI.push(issue);
          }
        } else {
          needsAI.push(issue);
        }
      } else {
        // No pattern - needs AI
        needsAI.push(issue);
      }
    }

    this.stats.totalIssues = pending.length;
    this.stats.templateFixed = 0; // Will be updated after applying
    this.stats.needsAI = needsAI.length;
    this.stats.needsManual = needsManual.length;

    if (this.config.verbose) {
      console.log(
        `[TemplateFixEngine] Partitioned ${pending.length} issues: ` +
        `${templateFixable.length} template, ${needsAI.length} AI, ${needsManual.length} manual ` +
        `(${Date.now() - startTime}ms)`
      );
    }

    return { templateFixable, needsAI, needsManual };
  }

  // ============================================================================
  // APPLY TEMPLATE FIXES
  // ============================================================================

  /**
   * Apply template fixes to issues
   *
   * Returns the number of successfully fixed issues.
   */
  async applyTemplateFixes(issues: IndexedIssue[]): Promise<number> {
    const startTime = Date.now();
    let fixedCount = 0;

    for (const issue of issues) {
      const result = await this.applyTemplateFix(issue);

      if (result.applied && result.fixedCode) {
        // Update file cache with fixed code
        const lines = this.fileCache.getLines(issue.file);
        if (lines) {
          // Apply fix to the file
          this.fileCache.setContent(issue.file, result.fixedCode);

          // Mark issue as fixed
          this.issueIndex.markFixed(issue.id, result.pattern?.id);

          // Track pattern usage
          if (result.pattern) {
            const count = this.stats.patternsUsed.get(result.pattern.id) || 0;
            this.stats.patternsUsed.set(result.pattern.id, count + 1);
          }

          fixedCount++;
        }
      }
    }

    this.stats.templateFixed = fixedCount;
    this.stats.templateTimeMs = Date.now() - startTime;

    if (this.config.verbose) {
      console.log(
        `[TemplateFixEngine] Applied ${fixedCount}/${issues.length} template fixes ` +
        `in ${this.stats.templateTimeMs}ms`
      );
    }

    return fixedCount;
  }

  /**
   * Apply a single template fix to an issue
   */
  private async applyTemplateFix(issue: IndexedIssue): Promise<TemplateFixResult> {
    try {
      // Get file content
      const fileContent = this.fileCache.getContent(issue.file);
      if (!fileContent) {
        return {
          applied: false,
          confidence: 0,
          source: 'manual',
          error: `Could not read file: ${issue.file}`,
        };
      }

      // Create enriched issue for applicator
      const enrichedIssue = {
        rule: issue.rule,
        tool: issue.tool,
        file: issue.file,
        line: issue.line,
        message: issue.message,
        severity: issue.severity,
      };

      // Apply pattern
      const result = await applyFixPattern(enrichedIssue as any, fileContent);

      if (result.patternApplied && result.fixCode) {
        return {
          applied: true,
          pattern: result.pattern,
          fixedCode: result.fixCode,
          confidence: result.confidence,
          source: 'template',
        };
      }

      return {
        applied: false,
        pattern: result.pattern,
        confidence: result.confidence,
        source: result.source === 'pattern_registry' ? 'template' : 'manual',
        error: result.message,
      };
    } catch (error) {
      return {
        applied: false,
        confidence: 0,
        source: 'manual',
        error: (error as Error).message,
      };
    }
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  /**
   * Check if a pattern is for a security fix
   */
  private isSecurityFix(pattern: FixPattern): boolean {
    // Check tags
    if (pattern.metadata.tags) {
      const securityTags = ['security', 'injection', 'xss', 'sqli', 'auth'];
      for (const tag of pattern.metadata.tags) {
        if (securityTags.some(st => tag.toLowerCase().includes(st))) {
          return true;
        }
      }
    }

    // Check rule ID
    const securityRules = [
      'injection', 'xss', 'sqli', 'security', 'auth',
      'csrf', 'ssrf', 'rce', 'command-injection',
    ];
    for (const rule of securityRules) {
      if (pattern.ruleId.toLowerCase().includes(rule)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Create empty stats object
   */
  private createEmptyStats(): TemplateFixStats {
    return {
      totalIssues: 0,
      templateFixed: 0,
      needsAI: 0,
      needsManual: 0,
      templateTimeMs: 0,
      patternsUsed: new Map(),
    };
  }

  /**
   * Get current stats
   */
  getStats(): TemplateFixStats {
    return { ...this.stats };
  }

  /**
   * Reset stats
   */
  resetStats(): void {
    this.stats = this.createEmptyStats();
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick partition and template fix
 *
 * Returns issues that need AI fixing.
 */
export async function quickTemplateFix(
  issueIndex: IssueIndex,
  fileCache: FileCache,
  config?: TemplateFixEngineConfig
): Promise<{
  aiIssues: IndexedIssue[];
  manualIssues: IndexedIssue[];
  templateFixedCount: number;
  stats: TemplateFixStats;
}> {
  const engine = new TemplateFixEngine(issueIndex, fileCache, config);

  // Partition
  const partitioned = await engine.partitionIssues();

  // Apply template fixes
  const templateFixedCount = await engine.applyTemplateFixes(partitioned.templateFixable);

  return {
    aiIssues: partitioned.needsAI,
    manualIssues: partitioned.needsManual,
    templateFixedCount,
    stats: engine.getStats(),
  };
}

export default TemplateFixEngine;
