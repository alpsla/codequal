/**
 * V9 Tool Orchestrator Base Class
 *
 * Generic orchestration framework for multi-tool analysis across all languages.
 * Implements the V9 canonical flow:
 *
 * Phase 1: REQUIRED tools (parallel execution)
 * Phase 2: CONDITIONAL tools (based on Phase 1 severity counts)
 * Phase 3: PR-ONLY tools (dependency scanning, resource-intensive checks)
 *
 * Language-specific orchestrators extend this base class and implement:
 * - runRequiredTools()
 * - runConditionalTools()
 * - runPROnlyTools()
 */

import { logger } from '../utils/logger';
import { detectDefaultBranch, getModifiedFilesBetweenBranches } from '../utils/git-utils';

// ============================================================
// GENERIC TYPES (Language-agnostic)
// ============================================================

export interface ToolResult {
  tool: string;
  success: boolean;
  duration: number;
  issues: RawIssue[];
  rawOutput?: string;
  error?: string;
  metadata: {
    filesScanned: number;
    issuesFound: number;
    severity: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  };
}

export interface RawIssue {
  tool: string;
  file: string;
  line: number;
  column?: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  rule: string;
  message: string;
  description?: string;
}

export interface OrchestrationResult {
  totalDuration: number;
  toolResults: ToolResult[];
  totalIssues: number;
  severityCounts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  success: boolean;
}

export interface OrchestrationContext {
  repoPath: string;
  branch: 'main' | 'pr';
  language: string;
  modifiedFiles?: string[];
  options?: {
    includeAllSeverities?: boolean;
    skipOptionalTools?: boolean;
  };
}

// ============================================================
// BASE ORCHESTRATOR (Abstract)
// ============================================================

export abstract class V9ToolOrchestratorBase {
  protected language: string;
  protected repoPath: string;

  constructor(language: string) {
    this.language = language;
  }

  /**
   * Main orchestration entry point
   * Implements the V9 3-phase pipeline
   */
  async orchestrate(context: OrchestrationContext): Promise<OrchestrationResult> {
    const startTime = Date.now();
    const toolResults: ToolResult[] = [];

    this.repoPath = context.repoPath;

    logger.info(`🎯 Starting ${this.language} Tool Orchestration (${context.branch} branch)`);
    logger.info(`📁 Repository: ${context.repoPath}`);
    logger.info(`🔧 Mode: ${context.options?.includeAllSeverities ? 'ALL SEVERITIES' : 'CRITICAL/HIGH ONLY'}`);

    try {
      // ============================================================
      // PHASE 1: REQUIRED TOOLS (Parallel)
      // ============================================================
      logger.info('\n🚀 Phase 1: Running REQUIRED tools in parallel...');

      const phase1Results = await this.runRequiredTools(context);
      toolResults.push(...phase1Results);

      // Log Phase 1 results
      logger.info('\n📊 Phase 1 Results:');
      for (const result of phase1Results) {
        logger.info(`✅ ${result.tool}: ${result.duration}ms, ${result.metadata.issuesFound} issues`);
      }

      // ============================================================
      // PHASE 2: CONDITIONAL TOOLS (Based on Phase 1 severity)
      // ============================================================
      const criticalHighCount = this.countCriticalHigh(phase1Results);
      const shouldRunConditional = this.shouldRunConditionalTools(
        criticalHighCount,
        context.options?.includeAllSeverities ?? false
      );

      if (shouldRunConditional) {
        logger.info(`\n📝 Running conditional tools: ${criticalHighCount === 0 ? 'No critical/high issues found' : 'User requested all severities'}`);
        const conditionalResults = await this.runConditionalTools(context, phase1Results);
        toolResults.push(...conditionalResults);

        for (const result of conditionalResults) {
          logger.info(`✅ ${result.tool}: ${result.duration}ms, ${result.metadata.issuesFound} issues`);
        }
      } else {
        logger.info(`\n⏭️  Skipping conditional tools: Found ${criticalHighCount} critical/high issues`);
      }

      // ============================================================
      // PHASE 3: PR-ONLY TOOLS (Dependency scanning, etc.)
      // ============================================================
      if (context.branch === 'pr' && !context.options?.skipOptionalTools) {
        logger.info('\n🔐 Running PR-only tools (dependency scanning, security)...');
        const prOnlyResults = await this.runPROnlyTools(context, toolResults);
        toolResults.push(...prOnlyResults);

        for (const result of prOnlyResults) {
          logger.info(`✅ ${result.tool}: ${result.duration}ms, ${result.metadata.issuesFound} issues`);
        }
      } else if (context.branch === 'main') {
        logger.info('\n⏭️  Skipping PR-only tools on main branch (not needed for baseline)');
      }

      // ============================================================
      // SUMMARY
      // ============================================================
      const totalDuration = Date.now() - startTime;
      const totalIssues = toolResults.reduce((sum, r) => sum + r.metadata.issuesFound, 0);
      const severityCounts = this.aggregateSeverities(toolResults);

      logger.info(`\n✅ Orchestration complete in ${totalDuration}ms`);
      logger.info(`📊 Total issues found: ${totalIssues}`);
      logger.info(`🚨 Blocking issues (critical): ${severityCounts.critical}`);

      return {
        totalDuration,
        toolResults,
        totalIssues,
        severityCounts,
        success: true
      };

    } catch (error) {
      logger.error(`❌ Orchestration failed: ${error}`);
      throw error;
    }
  }

  // ============================================================
  // ABSTRACT METHODS (Language-specific implementation)
  // ============================================================

  /**
   * Phase 1: Run required tools in parallel
   * Example (Java): PMD + Semgrep
   * Example (Python): pylint + bandit
   */
  protected abstract runRequiredTools(context: OrchestrationContext): Promise<ToolResult[]>;

  /**
   * Phase 2: Run conditional tools (if Phase 1 found no critical/high issues)
   * Example (Java): Checkstyle
   * Example (Python): mypy, black
   */
  protected abstract runConditionalTools(
    context: OrchestrationContext,
    phase1Results: ToolResult[]
  ): Promise<ToolResult[]>;

  /**
   * Phase 3: Run PR-only tools (dependency scanning, resource-intensive checks)
   * Example (Java): Dependency-Check
   * Example (Python): safety, pip-audit
   */
  protected abstract runPROnlyTools(
    context: OrchestrationContext,
    previousResults: ToolResult[]
  ): Promise<ToolResult[]>;

  // ============================================================
  // UTILITY METHODS (Shared across all languages)
  // ============================================================

  /**
   * Count critical and high severity issues from tool results
   */
  protected countCriticalHigh(results: ToolResult[]): number {
    return results.reduce(
      (sum, r) => sum + r.metadata.severity.critical + r.metadata.severity.high,
      0
    );
  }

  /**
   * Determine if conditional tools should run
   */
  protected shouldRunConditionalTools(
    criticalHighCount: number,
    includeAllSeverities: boolean
  ): boolean {
    return includeAllSeverities || criticalHighCount === 0;
  }

  /**
   * Aggregate severity counts from all tool results
   */
  protected aggregateSeverities(results: ToolResult[]): {
    critical: number;
    high: number;
    medium: number;
    low: number;
  } {
    return results.reduce(
      (acc, r) => ({
        critical: acc.critical + r.metadata.severity.critical,
        high: acc.high + r.metadata.severity.high,
        medium: acc.medium + r.metadata.severity.medium,
        low: acc.low + r.metadata.severity.low
      }),
      { critical: 0, high: 0, medium: 0, low: 0 }
    );
  }

  /**
   * Get modified files using V9 core git utilities
   */
  protected async getModifiedFiles(prBranch: string, mainBranch?: string): Promise<string[]> {
    try {
      // Auto-detect main branch if not provided
      if (!mainBranch) {
        mainBranch = detectDefaultBranch(this.repoPath);
        logger.info(`🔍 Detected default branch: ${mainBranch}`);
      }

      // Get modified files
      const files = getModifiedFilesBetweenBranches(this.repoPath, mainBranch, prBranch);
      logger.info(`📁 Modified files: ${files.length}`);

      return files;
    } catch (error) {
      logger.warn(`⚠️  Could not determine modified files: ${error}`);
      return [];
    }
  }

  /**
   * Detect default branch using V9 core git utilities
   */
  protected detectDefaultBranch(): string {
    return detectDefaultBranch(this.repoPath);
  }
}
