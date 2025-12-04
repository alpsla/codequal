/**
 * Scan-Time Fix Executor
 *
 * Executes fixes DURING the analysis scan, not after.
 * This is the core of the "Fix During Scan" mode - the PRIMARY fix delivery mode.
 *
 * Key Differences from IDE-Assisted Mode:
 * - This mode CHANGES code directly (tools run with --fix flags)
 * - IDE-Assisted mode only RECOMMENDS changes (metadata for IDE to apply)
 *
 * Integration Point:
 * Called from V9 pipeline AFTER issue detection, BEFORE report generation.
 *
 * Flow:
 * 1. Receive detected issues from tool orchestration
 * 2. Route issues to appropriate fixers (Tier 1 → 2 → 3)
 * 3. Execute fixes in parallel (respecting performance profiles)
 * 4. Return fix results for inclusion in report
 * 5. Optionally generate patch file or commit fixes
 *
 * @module fix-agent/scan-fix-executor
 */

import { FixOrchestrator, OrchestratorConfig, OrchestratorResult, FixIssue } from './tool-fixers/fix-orchestrator';
import { classifyIssue, ClassifiedIssue } from './issue-classifier';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// ============================================================================
// TYPES
// ============================================================================

export interface ScanFixConfig {
  /** Working directory (repository root) */
  workingDir: string;

  /** Language of the codebase */
  language: 'java' | 'typescript' | 'python' | 'go' | 'rust' | 'ruby' | 'php';

  /** Fix mode: what to do with applied fixes */
  outputMode: 'patch' | 'commit' | 'branch' | 'in-place';

  /** Whether to run in dry-run mode (don't actually apply fixes) */
  dryRun?: boolean;

  /** Which tiers to auto-apply */
  autoApplyTiers?: {
    tier1: boolean;  // Safe fixes (formatting, style)
    tier2: boolean;  // Technical fixes (unused code, imports)
    tier3: boolean;  // AI fixes (manual review recommended)
  };

  /** Branch name for 'branch' output mode */
  fixBranchName?: string;

  /** Commit message for 'commit' mode */
  commitMessage?: string;

  /** API key for Tier 3 AI fixes */
  tier3ApiKey?: string;

  /** Progress callback */
  onProgress?: (update: ScanFixProgress) => void;

  /** Verbose logging */
  verbose?: boolean;

  /** User tier: basic (classify only) or pro (auto-fix) */
  userTier?: 'basic' | 'pro';

  /** Apply Tier 3 fixes but flag for owner review (PRO only) */
  fixWithReview?: boolean;
}

export interface ScanFixProgress {
  phase: 'classifying' | 'routing' | 'executing' | 'generating-output' | 'complete';
  current: number;
  total: number;
  message: string;
  tool?: string;
}

export interface ScanFixResult {
  success: boolean;

  /** Summary statistics */
  summary: {
    totalIssues: number;
    fixedIssues: number;
    failedIssues: number;
    skippedIssues: number;
    tier1Fixed: number;
    tier2Fixed: number;
    tier3Fixed: number;
  };

  /** Files that were modified */
  modifiedFiles: string[];

  /** Path to generated patch file (if outputMode='patch') */
  patchFile?: string;

  /** Commit hash (if outputMode='commit') */
  commitHash?: string;

  /** Branch name (if outputMode='branch') */
  fixBranch?: string;

  /** Duration in milliseconds */
  durationMs: number;

  /** Detailed results per fixer */
  details: {
    tool: string;
    tier: 1 | 2 | 3;
    filesFixed: string[];
    issuesFixed: number;
    success: boolean;
    error?: string;
  }[];

  /** Issues that could not be fixed (for manual review) */
  manualReviewRequired: {
    file: string;
    line: number;
    rule: string;
    message: string;
    reason: string;
  }[];
}

export interface DetectedIssue {
  file: string;
  line: number;
  column?: number;
  rule: string;
  tool: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'error' | 'warning' | 'info';
  category?: string;
  snippet?: string;
}

// ============================================================================
// DEFAULTS
// ============================================================================

const DEFAULT_CONFIG: Partial<ScanFixConfig> = {
  dryRun: false,
  outputMode: 'in-place',
  autoApplyTiers: {
    tier1: true,   // Always auto-apply safe fixes
    tier2: true,   // Auto-apply technical fixes
    tier3: false,  // Manual review for AI fixes by default
  },
  verbose: false,
};

// ============================================================================
// SCAN FIX EXECUTOR
// ============================================================================

/**
 * Scan-Time Fix Executor
 *
 * Executes fixes during the scan process, applying tool-based fixes directly.
 */
export class ScanFixExecutor {
  private config: Required<ScanFixConfig>;

  constructor(config: ScanFixConfig) {
    this.config = {
      ...DEFAULT_CONFIG,
      autoApplyTiers: {
        tier1: true,
        tier2: true,
        tier3: false,
      },
      fixBranchName: `codequal/fixes-${Date.now()}`,
      commitMessage: 'fix: Auto-fix code quality issues\n\n🤖 Generated by CodeQual',
      tier3ApiKey: process.env.OPENROUTER_API_KEY || '',
      onProgress: () => { /* no-op */ },
      ...config,
    } as Required<ScanFixConfig>;
  }

  /**
   * Execute fixes for detected issues
   *
   * @param issues - Issues detected from tool orchestration
   * @returns Fix execution results
   */
  async executeFixes(issues: DetectedIssue[]): Promise<ScanFixResult> {
    const startTime = Date.now();
    const results: ScanFixResult['details'] = [];
    const manualReviewRequired: ScanFixResult['manualReviewRequired'] = [];
    let totalFixed = 0;
    let totalFailed = 0;
    let totalSkipped = 0;
    let tier1Fixed = 0;
    let tier2Fixed = 0;
    let tier3Fixed = 0;

    this.report({ phase: 'classifying', current: 0, total: issues.length, message: 'Classifying issues...' });

    // Step 1: Classify issues and determine which to fix
    const classifiedIssues = issues.map(issue => {
      const classification = classifyIssue(issue.rule, issue.tool);
      return {
        ...issue,
        classification,
        shouldFix: this.shouldFixIssue(classification),
      };
    });

    // Separate issues by whether they should be fixed
    const toFix = classifiedIssues.filter(i => i.shouldFix);
    const toSkip = classifiedIssues.filter(i => !i.shouldFix);

    totalSkipped = toSkip.length;

    // Add skipped issues to manual review list
    for (const issue of toSkip) {
      if (issue.classification.fixTier === 3 && !this.config.autoApplyTiers.tier3) {
        manualReviewRequired.push({
          file: issue.file,
          line: issue.line,
          rule: issue.rule,
          message: issue.message,
          reason: 'Tier 3 (AI) fixes require manual review. Enable tier3 auto-apply or review manually.',
        });
      }
    }

    this.report({
      phase: 'routing',
      current: 0,
      total: toFix.length,
      message: `Routing ${toFix.length} issues to fixers (${totalSkipped} skipped)...`
    });

    // Step 2: Convert to FixIssue format for orchestrator
    const fixIssues: FixIssue[] = toFix.map((issue, idx) => ({
      id: `issue-${idx}`,
      ruleId: issue.rule,
      tool: issue.tool,
      file: issue.file,
      line: issue.line,
      column: issue.column,
      message: issue.message,
      severity: this.normalizeSeverity(issue.severity),
    }));

    // Step 3: Execute fixes using orchestrator
    if (fixIssues.length > 0) {
      this.report({
        phase: 'executing',
        current: 0,
        total: fixIssues.length,
        message: 'Executing fixes...'
      });

      const orchestratorConfig: OrchestratorConfig = {
        workingDir: this.config.workingDir,
        dryRun: this.config.dryRun,
        verbose: this.config.verbose,
        enableTier3Fallback: this.config.autoApplyTiers.tier3,
        tier3ApiKey: this.config.tier3ApiKey,
        onProgress: (update) => {
          this.report({
            phase: 'executing',
            current: update.progress,
            total: 100,
            message: update.message,
            tool: update.tool,
          });
        },
      };

      const orchestrator = new FixOrchestrator(orchestratorConfig);
      await orchestrator.discoverTools();
      const orchResult = await orchestrator.executeAll(fixIssues);

      // Aggregate results
      totalFixed = orchResult.fixedIssues;
      totalFailed = orchResult.failedIssues;
      tier1Fixed = orchResult.summary.tier1.fixed;
      tier2Fixed = orchResult.summary.tier2.fixed;
      tier3Fixed = orchResult.summary.tier3.fixed;

      // Map orchestrator results to our format
      for (const result of orchResult.results) {
        results.push({
          tool: result.tool,
          tier: this.getToolTier(result.tool),
          filesFixed: result.filesFixed,
          issuesFixed: result.issuesFixed,
          success: result.success,
          error: result.error,
        });
      }

      // Add failed fixes to manual review
      for (const result of orchResult.results) {
        if (!result.success && result.error) {
          // Find issues that failed for this tool
          const failedIssues = fixIssues.filter(i => {
            const mappedTool = this.mapToolToFixer(i.tool);
            return mappedTool === result.tool;
          });

          for (const issue of failedIssues) {
            manualReviewRequired.push({
              file: issue.file,
              line: issue.line,
              rule: issue.ruleId,
              message: issue.message,
              reason: `Fix failed: ${result.error}`,
            });
          }
        }
      }
    }

    // Step 4: Generate output (patch, commit, or branch)
    this.report({
      phase: 'generating-output',
      current: 0,
      total: 1,
      message: 'Generating output...'
    });

    let patchFile: string | undefined;
    let commitHash: string | undefined;
    let fixBranch: string | undefined;

    if (totalFixed > 0 && !this.config.dryRun) {
      const output = await this.generateOutput();
      patchFile = output.patchFile;
      commitHash = output.commitHash;
      fixBranch = output.fixBranch;
    }

    // Get list of modified files
    const modifiedFiles = results
      .flatMap(r => r.filesFixed)
      .filter((f, i, arr) => arr.indexOf(f) === i);  // Unique

    this.report({
      phase: 'complete',
      current: 1,
      total: 1,
      message: `Complete: ${totalFixed} fixed, ${totalFailed} failed, ${totalSkipped} skipped`
    });

    return {
      success: totalFailed === 0,
      summary: {
        totalIssues: issues.length,
        fixedIssues: totalFixed,
        failedIssues: totalFailed,
        skippedIssues: totalSkipped,
        tier1Fixed,
        tier2Fixed,
        tier3Fixed,
      },
      modifiedFiles,
      patchFile,
      commitHash,
      fixBranch,
      durationMs: Date.now() - startTime,
      details: results,
      manualReviewRequired,
    };
  }

  /**
   * Determine if an issue should be fixed based on tier and config
   */
  private shouldFixIssue(classification: ClassifiedIssue): boolean {
    const tier = classification.fixTier;

    if (tier === 1) return this.config.autoApplyTiers.tier1;
    if (tier === 2) return this.config.autoApplyTiers.tier2;
    if (tier === 3) return this.config.autoApplyTiers.tier3;

    return false;
  }

  /**
   * Normalize severity to orchestrator format
   */
  private normalizeSeverity(severity: string): 'error' | 'warning' | 'info' {
    if (['critical', 'high', 'error'].includes(severity)) return 'error';
    if (['medium', 'warning'].includes(severity)) return 'warning';
    return 'info';
  }

  /**
   * Get tier for a tool
   */
  private getToolTier(tool: string): 1 | 2 | 3 {
    const tier1Tools = ['eslint', 'prettier', 'ruff', 'ruff-format', 'gofmt', 'goimports',
      'golangci-lint', 'rustfmt', 'clippy', 'rubocop', 'phpcbf', 'swiftlint', 'ktlint'];
    const tier2Tools = ['sorald', 'openrewrite', 'autoflake', 'pyupgrade', 'isort', 'black',
      'clang-tidy', 'clang-format', 'dotnet-format'];

    if (tier1Tools.includes(tool)) return 1;
    if (tier2Tools.includes(tool)) return 2;
    return 3;
  }

  /**
   * Map detection tool to fixer tool
   */
  private mapToolToFixer(detectionTool: string): string {
    const toolMap: Record<string, string> = {
      // JS/TS
      'eslint': 'eslint',
      'typescript-eslint': 'eslint',
      'prettier': 'prettier',
      'tsc': 'eslint',
      // Python
      'ruff': 'ruff',
      'pylint': 'ruff',
      'bandit': 'ruff',
      'mypy': 'ruff',
      // Java
      'pmd': 'sorald',
      'checkstyle': 'sorald',
      'spotbugs': 'sorald',
      // Go
      'golangci-lint': 'golangci-lint',
      'gosec': 'golangci-lint',
      // Rust
      'clippy': 'clippy',
      // Ruby
      'rubocop': 'rubocop',
      // PHP
      'phpcs': 'phpcbf',
    };

    return toolMap[detectionTool.toLowerCase()] || 'ai';
  }

  /**
   * Generate output based on outputMode
   */
  private async generateOutput(): Promise<{
    patchFile?: string;
    commitHash?: string;
    fixBranch?: string;
  }> {
    const { workingDir, outputMode, fixBranchName, commitMessage } = this.config;

    if (outputMode === 'in-place') {
      // Files already modified, nothing more to do
      return {};
    }

    if (outputMode === 'patch') {
      // Generate unified patch
      const patchPath = path.join(workingDir, 'codequal-fixes.patch');
      try {
        const patch = execSync('git diff', {
          cwd: workingDir,
          encoding: 'utf-8',
          maxBuffer: 50 * 1024 * 1024,
        });
        fs.writeFileSync(patchPath, patch);
        return { patchFile: patchPath };
      } catch (error) {
        console.error('Failed to generate patch:', error);
        return {};
      }
    }

    if (outputMode === 'commit') {
      // Commit changes
      try {
        execSync('git add -A', { cwd: workingDir, stdio: 'pipe' });
        const result = execSync(`git commit -m "${commitMessage}"`, {
          cwd: workingDir,
          encoding: 'utf-8',
        });
        const hashMatch = result.match(/\[[\w-]+\s+([a-f0-9]+)\]/);
        const hash = hashMatch ? hashMatch[1] : undefined;
        return { commitHash: hash };
      } catch (error) {
        console.error('Failed to commit:', error);
        return {};
      }
    }

    if (outputMode === 'branch') {
      // Create new branch with fixes
      try {
        execSync(`git checkout -b ${fixBranchName}`, { cwd: workingDir, stdio: 'pipe' });
        execSync('git add -A', { cwd: workingDir, stdio: 'pipe' });
        execSync(`git commit -m "${commitMessage}"`, { cwd: workingDir, stdio: 'pipe' });
        return { fixBranch: fixBranchName };
      } catch (error) {
        console.error('Failed to create fix branch:', error);
        return {};
      }
    }

    return {};
  }

  /**
   * Report progress
   */
  private report(update: ScanFixProgress): void {
    this.config.onProgress(update);
    if (this.config.verbose) {
      console.log(`[ScanFix] ${update.phase}: ${update.message}`);
    }
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick helper to execute fixes on detected issues
 */
export async function executeScanFixes(
  issues: DetectedIssue[],
  workingDir: string,
  language: ScanFixConfig['language'],
  options?: Partial<ScanFixConfig>
): Promise<ScanFixResult> {
  const executor = new ScanFixExecutor({
    workingDir,
    language,
    outputMode: 'in-place',
    ...options,
  });

  return executor.executeFixes(issues);
}

/**
 * Execute fixes and generate patch file
 */
export async function executeScanFixesWithPatch(
  issues: DetectedIssue[],
  workingDir: string,
  language: ScanFixConfig['language'],
  options?: Partial<ScanFixConfig>
): Promise<ScanFixResult> {
  const executor = new ScanFixExecutor({
    workingDir,
    language,
    outputMode: 'patch',
    ...options,
  });

  return executor.executeFixes(issues);
}
