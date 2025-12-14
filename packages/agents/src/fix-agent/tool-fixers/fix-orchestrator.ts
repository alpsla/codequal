/**
 * Fix Orchestrator - Coordinates tool execution across tiers
 *
 * This is the main entry point for executing fixes. It:
 * 1. Routes issues to appropriate fixers
 * 2. Schedules execution based on performance profiles
 * 3. Manages fallback from Tier 1 → Tier 2 → Tier 3
 * 4. Aggregates results across all executions
 */

import { ToolExecutorBase, ToolExecutionResult, ToolExecutionOptions } from './tool-executor-base';
import { createTier1Executor, getTier1ToolNames } from './tier1-executor';
import { createTier2Executor, getTier2ToolNames } from './tier2-executor';
import { createTier3Executor, Tier3Issue } from './tier3-executor';
import { createPipAuditFixer, createSemgrepAutoFixer } from './python-fixer';
import { createDependencyFixer, isDependencyVulnerability } from './dependency-fixer';

// ================================================================================
// ORCHESTRATOR TYPES (Self-contained)
// ================================================================================

export interface FixIssue {
  id: string;
  ruleId: string;
  tool: string;
  file: string;
  line: number;
  column?: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface OrchestratorConfig {
  workingDir: string;
  dryRun?: boolean;
  verbose?: boolean;
  maxParallel?: number;
  timeoutMs?: number;
  onProgress?: (update: ProgressUpdate) => void;
  enableTier3Fallback?: boolean;
  tier3ApiKey?: string;
  /** User tier - affects whether fixes are applied or just recommended */
  userTier?: 'basic' | 'pro';
  /** Pattern store for checking existing fix patterns */
  patternStore?: PatternStore;
  /** Language hint for tool selection */
  language?: string;
}

/** Interface for pattern store (Supabase or mock) */
export interface PatternStore {
  getPattern(ruleId: string, tool: string): Promise<FixPattern | null>;
  savePattern(pattern: FixPattern): Promise<void>;
}

/** Fix pattern from Supabase */
export interface FixPattern {
  ruleId: string;
  tool: string;
  fixTemplate: string;
  confidence: number;
  language: string;
}

export interface ProgressUpdate {
  phase: 'routing' | 'scheduling' | 'executing' | 'complete';
  tool?: string;
  progress: number; // 0-100
  message: string;
  result?: ToolExecutionResult;
}

export interface OrchestratorResult {
  success: boolean;
  totalIssues: number;
  fixedIssues: number;
  failedIssues: number;
  skippedIssues: number;
  results: ToolExecutionResult[];
  summary: {
    tier1: { attempted: number; fixed: number };
    tier2: { attempted: number; fixed: number };
    tier3: { attempted: number; fixed: number };
  };
  durationMs: number;
}

// Internal batch type for scheduling
interface OrchestratorBatch {
  id: string;
  tool: string;
  issues: FixIssue[];
  files: string[];
  tier: 1 | 2 | 3;
  phase: number;
  estimatedTimeMs: number;
}

// Internal schedule type
interface OrchestratorSchedule {
  batches: OrchestratorBatch[];
  phases: number;
  estimatedTotalMs: number;
}

// Performance profiles for fixers
const TOOL_PERFORMANCE: Record<string, {
  category: 'fast' | 'medium' | 'slow';
  batchSize: number;
  avgTimeMs: number;
}> = {
  // Fast - high parallelism
  'ruff': { category: 'fast', batchSize: 100, avgTimeMs: 1000 },
  'ruff-format': { category: 'fast', batchSize: 100, avgTimeMs: 500 },
  'prettier': { category: 'fast', batchSize: 50, avgTimeMs: 500 },
  'gofmt': { category: 'fast', batchSize: 100, avgTimeMs: 500 },
  'goimports': { category: 'fast', batchSize: 100, avgTimeMs: 800 },
  'rustfmt': { category: 'fast', batchSize: 50, avgTimeMs: 1000 },
  'isort': { category: 'fast', batchSize: 100, avgTimeMs: 500 },
  'autoflake': { category: 'fast', batchSize: 50, avgTimeMs: 1500 },
  'black': { category: 'fast', batchSize: 30, avgTimeMs: 3000 },

  // Medium - limited parallelism
  'eslint': { category: 'medium', batchSize: 30, avgTimeMs: 5000 },
  'golangci-lint': { category: 'medium', batchSize: 20, avgTimeMs: 10000 },
  'rubocop': { category: 'medium', batchSize: 30, avgTimeMs: 5000 },
  'clippy': { category: 'medium', batchSize: 20, avgTimeMs: 15000 },
  'phpcbf': { category: 'medium', batchSize: 30, avgTimeMs: 3000 },
  'swiftlint': { category: 'medium', batchSize: 30, avgTimeMs: 5000 },
  'ktlint': { category: 'medium', batchSize: 30, avgTimeMs: 5000 },
  'pyupgrade': { category: 'medium', batchSize: 30, avgTimeMs: 3000 },

  // Slow - mostly sequential
  'sorald': { category: 'slow', batchSize: 10, avgTimeMs: 30000 },
  'openrewrite': { category: 'slow', batchSize: 5, avgTimeMs: 60000 },
  'clang-tidy': { category: 'slow', batchSize: 10, avgTimeMs: 20000 },
  'clang-format': { category: 'slow', batchSize: 20, avgTimeMs: 10000 },
  'dotnet-format': { category: 'slow', batchSize: 20, avgTimeMs: 15000 },

  // AI (rate limited)
  'ai': { category: 'medium', batchSize: 5, avgTimeMs: 30000 },

  // Python dependency and security fixers (SESSION 53)
  'pip-audit-fixer': { category: 'medium', batchSize: 10, avgTimeMs: 30000 },
  'semgrep-autofix': { category: 'medium', batchSize: 20, avgTimeMs: 15000 },
  'dependency-fixer': { category: 'medium', batchSize: 10, avgTimeMs: 30000 },
};

// Default performance for unknown tools
const DEFAULT_PERFORMANCE = {
  category: 'medium' as const,
  batchSize: 20,
  avgTimeMs: 10000,
};

/**
 * Fix Orchestrator - Main coordinator for all fix operations
 *
 * SESSION 53: Added support for:
 * - BASIC vs PRO tier (dryRun for basic, apply for pro)
 * - Supabase pattern checking before tool execution
 * - Python dependency fixers (pip-audit) and security fixers (semgrep --autofix)
 */
export class FixOrchestrator {
  private config: OrchestratorConfig & {
    dryRun: boolean;
    verbose: boolean;
    maxParallel: number;
    timeoutMs: number;
    enableTier3Fallback: boolean;
    tier3ApiKey: string;
    userTier: 'basic' | 'pro';
    language: string;
    onProgress: (update: ProgressUpdate) => void;
  };
  private installedTools: Set<string> = new Set();

  constructor(config: OrchestratorConfig) {
    this.config = {
      dryRun: false,
      verbose: false,
      maxParallel: 4,
      timeoutMs: 300000, // 5 minutes
      enableTier3Fallback: false,
      tier3ApiKey: '',
      userTier: 'basic', // Default to basic tier
      language: 'unknown',
      onProgress: () => { /* no-op */ },
      ...config,
    };

    // For BASIC tier, always run in dry-run mode (recommendations only)
    if (this.config.userTier === 'basic') {
      this.config.dryRun = true;
    }
  }

  /**
   * Check which tools are installed and available
   */
  async discoverTools(): Promise<void> {
    this.report({ phase: 'routing', progress: 0, message: 'Discovering installed tools...' });

    const allTools = [...getTier1ToolNames(), ...getTier2ToolNames()];
    const checkPromises = allTools.map(async (toolName) => {
      const executor = createTier1Executor(toolName) || createTier2Executor(toolName);
      if (executor) {
        const installed = await executor.checkInstalled();
        if (installed) {
          this.installedTools.add(toolName);
        }
      }
    });

    await Promise.all(checkPromises);

    if (this.config.verbose) {
      console.log(`Discovered ${this.installedTools.size} installed tools:`,
        Array.from(this.installedTools).join(', '));
    }
  }

  /**
   * Execute fixes for a batch of issues
   */
  async executeAll(issues: FixIssue[]): Promise<OrchestratorResult> {
    const startTime = Date.now();
    const results: ToolExecutionResult[] = [];

    this.report({ phase: 'routing', progress: 0, message: `Processing ${issues.length} issues...` });

    // Step 1: Route issues to tools based on rule IDs
    const byTool = this.groupByTool(issues);

    this.report({
      phase: 'routing',
      progress: 25,
      message: `Routed to ${Object.keys(byTool).length} different tools`
    });

    // Step 2: Create execution schedule
    const schedule = this.createSchedule(byTool);

    this.report({
      phase: 'scheduling',
      progress: 50,
      message: `Scheduled ${schedule.batches.length} batches across ${schedule.phases} phases`,
    });

    // Step 3: Execute by phase
    let fixedCount = 0;
    let failedCount = 0;
    const skippedCount = 0;

    const summary = {
      tier1: { attempted: 0, fixed: 0 },
      tier2: { attempted: 0, fixed: 0 },
      tier3: { attempted: 0, fixed: 0 },
    };

    for (let phase = 1; phase <= schedule.phases; phase++) {
      const phaseBatches = schedule.batches.filter(b => b.phase === phase);

      this.report({
        phase: 'executing',
        progress: 50 + (phase / schedule.phases) * 40,
        message: `Executing phase ${phase}/${schedule.phases} (${phaseBatches.length} batches)`,
      });

      // Execute batches in parallel within each phase
      const phaseResults = await this.executePhase(phaseBatches);

      for (const result of phaseResults) {
        results.push(result);

        const tier = this.getToolTier(result.tool);
        summary[`tier${tier}` as keyof typeof summary].attempted++;

        if (result.success) {
          fixedCount += result.issuesFixed;
          summary[`tier${tier}` as keyof typeof summary].fixed += result.issuesFixed;
        } else {
          failedCount++;
        }

        this.report({
          phase: 'executing',
          progress: 50 + (phase / schedule.phases) * 40,
          message: `${result.tool}: ${result.success ? 'success' : 'failed'}`,
          result,
        });
      }
    }

    // Step 4: Tier 3 fallback for remaining issues (if enabled)
    if (this.config.enableTier3Fallback && failedCount > 0) {
      this.report({
        phase: 'executing',
        progress: 90,
        message: 'Running Tier 3 AI fallback for remaining issues...',
      });

      // Collect failed issues for Tier 3 processing
      const failedIssues: Tier3Issue[] = [];
      for (const result of results) {
        if (!result.success) {
          // Find original issues that failed
          const batch = schedule.batches.find(b => b.tool === result.tool);
          if (batch?.issues) {
            for (const issue of batch.issues) {
              failedIssues.push({
                id: issue.id,
                ruleId: issue.ruleId,
                tool: issue.tool,
                file: issue.file,
                line: issue.line,
                column: issue.column,
                message: issue.message,
                severity: issue.severity,
              });
            }
          }
        }
      }

      if (failedIssues.length > 0) {
        const tier3Executor = createTier3Executor();
        const tier3Result = await tier3Executor.executeFixWithIssues({
          workingDir: this.config.workingDir,
          dryRun: this.config.dryRun,
          verbose: this.config.verbose,
          timeout: this.config.timeoutMs,
          language: this.detectPrimaryLanguage(failedIssues),
          issues: failedIssues,
          apiKey: this.config.tier3ApiKey,
        });

        results.push(tier3Result);
        summary.tier3.attempted += failedIssues.length;

        if (tier3Result.success) {
          summary.tier3.fixed += tier3Result.issuesFixed;
          fixedCount += tier3Result.issuesFixed;
          failedCount = Math.max(0, failedCount - tier3Result.issuesFixed);
        }

        this.report({
          phase: 'executing',
          progress: 95,
          message: `Tier 3 AI: ${tier3Result.success ? 'success' : 'failed'} (${tier3Result.issuesFixed} fixed)`,
          result: tier3Result,
        });
      }
    }

    this.report({
      phase: 'complete',
      progress: 100,
      message: `Complete: ${fixedCount} fixed, ${failedCount} failed, ${skippedCount} skipped`,
    });

    return {
      success: failedCount === 0,
      totalIssues: issues.length,
      fixedIssues: fixedCount,
      failedIssues: failedCount,
      skippedIssues: skippedCount,
      results,
      summary,
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Group issues by their originating tool
   */
  private groupByTool(issues: FixIssue[]): Record<string, FixIssue[]> {
    const groups: Record<string, FixIssue[]> = {};

    for (const issue of issues) {
      // Use the tool that reported the issue to route to appropriate fixer
      // SESSION 53: Pass ruleId for dependency vulnerability detection
      const tool = this.mapToolToFixer(issue.tool, issue.ruleId);
      if (!groups[tool]) {
        groups[tool] = [];
      }
      groups[tool].push(issue);
    }

    return groups;
  }

  /**
   * Map detection tool to appropriate fixer tool
   *
   * SESSION 53: Updated to support Python dependency and security fixers
   */
  private mapToolToFixer(detectionTool: string, ruleId?: string): string {
    const tool = detectionTool.toLowerCase();

    // Special case: dependency vulnerability tools route to dedicated fixers
    if (isDependencyVulnerability(tool, ruleId || '')) {
      // Python dependencies
      if (tool === 'pip-audit' || tool === 'safety') {
        return 'pip-audit-fixer';
      }
      // JavaScript/Node.js dependencies
      if (tool === 'npm-audit' || tool === 'snyk') {
        return 'dependency-fixer';
      }
    }

    // Special case: semgrep with autofix rules
    if (tool === 'semgrep' && this.config.language === 'python') {
      return 'semgrep-autofix';
    }

    // Map detection tools to their fixers
    const toolMap: Record<string, string> = {
      // JS/TS
      'eslint': 'eslint',
      'typescript-eslint': 'eslint',
      'prettier': 'prettier',
      'tsc': 'eslint', // TypeScript errors often fixable by ESLint rules

      // Python - route to appropriate fixer
      'ruff': 'ruff',
      'pylint': 'ruff',
      'bandit': 'semgrep-autofix', // Bandit findings often fixable via semgrep
      'mypy': 'ruff',
      'flake8': 'ruff',

      // Java
      'pmd': 'sorald',
      'checkstyle': 'sorald',
      'spotbugs': 'sorald',
      'error-prone': 'openrewrite',

      // Go
      'golangci-lint': 'golangci-lint',
      'gosec': 'golangci-lint',

      // Rust
      'clippy': 'clippy',

      // Ruby
      'rubocop': 'rubocop',
      'brakeman': 'rubocop',

      // PHP
      'phpcs': 'phpcbf',
      'phpstan': 'phpcbf',

      // C/C++
      'cppcheck': 'clang-tidy',

      // Swift
      'swiftlint': 'swiftlint',

      // Kotlin
      'detekt': 'ktlint',

      // C#
      'roslyn-analyzers': 'dotnet-format',

      // Cross-language security (try semgrep autofix first)
      'semgrep': 'semgrep-autofix',
      'gitleaks': 'ai', // Secrets - no autofix, needs manual review
    };

    return toolMap[tool] || 'ai';
  }

  /**
   * Create execution schedule from grouped issues
   */
  private createSchedule(byTool: Record<string, FixIssue[]>): OrchestratorSchedule {
    const batches: OrchestratorBatch[] = [];

    for (const [tool, issues] of Object.entries(byTool)) {
      const performance = TOOL_PERFORMANCE[tool] || DEFAULT_PERFORMANCE;

      // Split into batches based on performance profile
      const batchSize = performance.batchSize;
      for (let i = 0; i < issues.length; i += batchSize) {
        const batchIssues = issues.slice(i, i + batchSize);
        const files = Array.from(new Set(batchIssues.map(issue => issue.file)));

        batches.push({
          id: `${tool}-${Math.floor(i / batchSize)}`,
          tool,
          issues: batchIssues,
          files,
          tier: this.getToolTier(tool),
          phase: performance.category === 'fast' ? 1 : performance.category === 'medium' ? 2 : 3,
          estimatedTimeMs: performance.avgTimeMs,
        });
      }
    }

    // Determine number of phases
    const phases = batches.length > 0 ? Math.max(...batches.map(b => b.phase)) : 0;

    return {
      batches,
      phases,
      estimatedTotalMs: batches.reduce((sum, b) => sum + b.estimatedTimeMs, 0),
    };
  }

  /**
   * Execute all batches in a phase
   */
  private async executePhase(batches: OrchestratorBatch[]): Promise<ToolExecutionResult[]> {
    const results: ToolExecutionResult[] = [];

    // Execute in parallel up to maxParallel
    const chunks = this.chunk(batches, this.config.maxParallel);

    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map(batch => this.executeBatch(batch))
      );
      results.push(...chunkResults);
    }

    return results;
  }

  /**
   * Execute a single batch of fixes
   *
   * SESSION 53: Updated to support Python dependency and security fixers
   */
  private async executeBatch(batch: OrchestratorBatch): Promise<ToolExecutionResult> {
    // Get executor - check new Python fixers first, then standard tiers
    const executor = this.getExecutorForTool(batch.tool);

    if (!executor) {
      return {
        success: false,
        tool: batch.tool,
        command: '',
        exitCode: null,
        stdout: '',
        stderr: '',
        filesFixed: [],
        issuesFixed: 0,
        durationMs: 0,
        error: `No executor found for tool: ${batch.tool}`,
      };
    }

    // Check if tool is installed
    if (!this.installedTools.has(batch.tool)) {
      const isInstalled = await executor.checkInstalled();
      if (!isInstalled) {
        return {
          success: false,
          tool: batch.tool,
          command: '',
          exitCode: null,
          stdout: '',
          stderr: '',
          filesFixed: [],
          issuesFixed: 0,
          durationMs: 0,
          error: `Tool not installed: ${batch.tool}`,
        };
      }
      this.installedTools.add(batch.tool);
    }

    const options: ToolExecutionOptions = {
      workingDir: this.config.workingDir,
      dryRun: this.config.dryRun,
      verbose: this.config.verbose,
      files: batch.files,
      timeout: this.config.timeoutMs,
    };

    return executor.executeFix(options);
  }

  /**
   * Get the tier for a tool (1, 2, or 3)
   */
  private getToolTier(tool: string): 1 | 2 | 3 {
    if (getTier1ToolNames().includes(tool)) return 1;
    if (getTier2ToolNames().includes(tool)) return 2;
    return 3;
  }

  /**
   * Split array into chunks
   */
  private chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Report progress
   */
  private report(update: ProgressUpdate): void {
    this.config.onProgress(update);
    if (this.config.verbose) {
      console.log(`[Orchestrator] ${update.phase}: ${update.message}`);
    }
  }

  /**
   * Detect primary language from issues based on file extensions
   */
  private detectPrimaryLanguage(issues: Tier3Issue[]): string {
    const extToLanguage: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.mjs': 'javascript',
      '.py': 'python',
      '.java': 'java',
      '.kt': 'kotlin',
      '.go': 'go',
      '.rs': 'rust',
      '.rb': 'ruby',
      '.php': 'php',
      '.swift': 'swift',
      '.cs': 'csharp',
      '.c': 'c',
      '.cpp': 'cpp',
      '.h': 'c',
      '.hpp': 'cpp',
    };

    const languageCounts: Record<string, number> = {};

    for (const issue of issues) {
      const ext = issue.file.slice(issue.file.lastIndexOf('.'));
      const language = extToLanguage[ext] || 'unknown';
      languageCounts[language] = (languageCounts[language] || 0) + 1;
    }

    // Find the most common language
    let maxCount = 0;
    let primaryLanguage = 'typescript'; // Default

    for (const [lang, count] of Object.entries(languageCounts)) {
      if (count > maxCount) {
        maxCount = count;
        primaryLanguage = lang;
      }
    }

    return primaryLanguage;
  }

  /**
   * Get the appropriate executor for a tool
   *
   * SESSION 53: Added support for Python dependency and security fixers
   */
  private getExecutorForTool(toolName: string): ToolExecutorBase | null {
    // Python dependency fixer
    if (toolName === 'pip-audit-fixer') {
      return createPipAuditFixer();
    }

    // Python security autofix
    if (toolName === 'semgrep-autofix') {
      return createSemgrepAutoFixer();
    }

    // npm/Node.js dependency fixer
    if (toolName === 'dependency-fixer') {
      return createDependencyFixer();
    }

    // Standard tier 1 and tier 2 executors
    return createTier1Executor(toolName) || createTier2Executor(toolName);
  }
}

/**
 * Quick helper to execute fixes on a directory
 */
export async function executeFixes(
  issues: FixIssue[],
  workingDir: string,
  options?: Partial<OrchestratorConfig>
): Promise<OrchestratorResult> {
  const orchestrator = new FixOrchestrator({
    workingDir,
    ...options,
  });

  await orchestrator.discoverTools();
  return orchestrator.executeAll(issues);
}
