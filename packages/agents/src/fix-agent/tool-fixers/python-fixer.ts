/**
 * Python-Specific Fixer Executors
 *
 * This module contains Python-specific fixers that extend the base tier system:
 * - PipAuditFixerExecutor: Fixes Python dependency vulnerabilities using pip-audit --fix
 * - SemgrepAutoFixExecutor: Applies Semgrep autofix for security issues
 *
 * SESSION 53: Added to support Python PRO tier with auto-fix capabilities
 *
 * @module python-fixer
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import {
  ToolExecutorBase,
  ToolExecutionResult,
  ToolExecutionOptions,
} from './tool-executor-base';

// =============================================================================
// PIP-AUDIT FIXER - Python Dependency Vulnerability Fixer
// =============================================================================

export interface PipAuditVulnerability {
  /** Package name (e.g., "requests", "flask") */
  packageName: string;
  /** Current vulnerable version */
  currentVersion?: string;
  /** Fixed version recommended by pip-audit */
  fixedVersion?: string;
  /** Vulnerability ID (PYSEC-*, CVE-*, GHSA-*) */
  vulnerabilityId: string;
  /** Severity level */
  severity: 'critical' | 'high' | 'medium' | 'low';
  /** Human-readable description */
  description?: string;
}

export interface PipAuditFixResult extends ToolExecutionResult {
  /** Number of packages upgraded */
  packagesUpgraded: number;
  /** Packages that were upgraded */
  upgradedPackages: string[];
  /** Vulnerabilities that couldn't be fixed */
  unfixable: {
    packageName: string;
    reason: string;
  }[];
}

/**
 * Pip-Audit Fixer Executor
 *
 * Uses `pip-audit --fix` to automatically upgrade vulnerable Python packages.
 * Falls back to manual pip install for packages that can't be auto-fixed.
 */
export class PipAuditFixerExecutor extends ToolExecutorBase {
  constructor() {
    super({
      name: 'pip-audit-fixer',
      command: 'pip-audit',
      fixCommand: 'pip-audit --fix',
    });
  }

  protected getVersionCommand(): string {
    return 'pip-audit --version';
  }

  /**
   * Execute pip-audit --fix on the working directory
   */
  async executeFix(options: ToolExecutionOptions): Promise<PipAuditFixResult> {
    const startTime = Date.now();

    // Check for requirements.txt or pyproject.toml
    const reqPath = path.join(options.workingDir, 'requirements.txt');
    const pyprojectPath = path.join(options.workingDir, 'pyproject.toml');
    const hasReqs = fs.existsSync(reqPath);
    const hasPyproject = fs.existsSync(pyprojectPath);

    if (!hasReqs && !hasPyproject) {
      return {
        success: false,
        tool: this.config.name,
        command: 'pip-audit --fix',
        exitCode: 1,
        stdout: '',
        stderr: 'No requirements.txt or pyproject.toml found',
        filesFixed: [],
        issuesFixed: 0,
        durationMs: Date.now() - startTime,
        error: 'No Python dependency files found',
        packagesUpgraded: 0,
        upgradedPackages: [],
        unfixable: [],
      };
    }

    // Build the fix command
    let command = 'pip-audit --fix';
    if (hasReqs) {
      command += ` -r ${reqPath}`;
    }

    if (options.dryRun) {
      command += ' --dry-run';
      return {
        success: true,
        tool: this.config.name,
        command,
        exitCode: 0,
        stdout: `[DRY RUN] Would execute: ${command}`,
        stderr: '',
        filesFixed: hasReqs ? [reqPath] : [pyprojectPath],
        issuesFixed: 0,
        durationMs: Date.now() - startTime,
        packagesUpgraded: 0,
        upgradedPackages: [],
        unfixable: [],
      };
    }

    // Execute pip-audit --fix
    const result = await this.executeCommand(command, options);

    // Parse results to determine what was fixed
    const parseResult = this.parsePipAuditOutput(result.stdout, result.stderr);

    return {
      ...result,
      packagesUpgraded: parseResult.upgradedPackages.length,
      upgradedPackages: parseResult.upgradedPackages,
      unfixable: parseResult.unfixable,
    };
  }

  /**
   * Fix a specific vulnerability
   */
  async fixVulnerability(
    workingDir: string,
    vulnerability: PipAuditVulnerability,
    options: { dryRun?: boolean; verbose?: boolean } = {}
  ): Promise<PipAuditFixResult> {
    const startTime = Date.now();

    if (options.verbose) {
      console.log(`[pip-audit-fixer] Fixing ${vulnerability.packageName}`);
      console.log(`  Vulnerability: ${vulnerability.vulnerabilityId}`);
      console.log(`  Target version: ${vulnerability.fixedVersion || 'latest'}`);
    }

    // Try to install the fixed version directly
    const fixVersion = vulnerability.fixedVersion || 'latest';
    const installCmd =
      fixVersion === 'latest'
        ? `pip install --upgrade ${vulnerability.packageName}`
        : `pip install "${vulnerability.packageName}>=${fixVersion}"`;

    if (options.dryRun) {
      return {
        success: true,
        tool: this.config.name,
        command: `[DRY RUN] ${installCmd}`,
        exitCode: 0,
        stdout: `Would execute: ${installCmd}`,
        stderr: '',
        filesFixed: [],
        issuesFixed: 0,
        durationMs: Date.now() - startTime,
        packagesUpgraded: 0,
        upgradedPackages: [],
        unfixable: [],
      };
    }

    try {
      const output = execSync(installCmd, {
        cwd: workingDir,
        encoding: 'utf-8',
        timeout: 120000,
      });

      return {
        success: true,
        tool: this.config.name,
        command: installCmd,
        exitCode: 0,
        stdout: output,
        stderr: '',
        filesFixed: [],
        issuesFixed: 1,
        durationMs: Date.now() - startTime,
        packagesUpgraded: 1,
        upgradedPackages: [vulnerability.packageName],
        unfixable: [],
      };
    } catch (error) {
      return {
        success: false,
        tool: this.config.name,
        command: installCmd,
        exitCode: 1,
        stdout: '',
        stderr: String(error),
        filesFixed: [],
        issuesFixed: 0,
        durationMs: Date.now() - startTime,
        error: `Failed to upgrade ${vulnerability.packageName}`,
        packagesUpgraded: 0,
        upgradedPackages: [],
        unfixable: [
          {
            packageName: vulnerability.packageName,
            reason: String(error),
          },
        ],
      };
    }
  }

  /**
   * Parse pip-audit output to extract fixed packages
   */
  private parsePipAuditOutput(
    stdout: string,
    stderr: string
  ): { upgradedPackages: string[]; unfixable: { packageName: string; reason: string }[] } {
    const upgradedPackages: string[] = [];
    const unfixable: { packageName: string; reason: string }[] = [];

    // Look for successful upgrade messages
    // pip-audit outputs: "fixed: package-name (version -> version)"
    const fixedPattern = /fixed:\s+([^\s(]+)/gi;
    let match;
    while ((match = fixedPattern.exec(stdout)) !== null) {
      upgradedPackages.push(match[1]);
    }

    // Check stderr for failed upgrades
    // "failed to fix: package-name"
    const failedPattern = /failed to fix:\s+([^\s]+)/gi;
    while ((match = failedPattern.exec(stderr)) !== null) {
      unfixable.push({
        packageName: match[1],
        reason: 'pip-audit could not automatically fix this package',
      });
    }

    return { upgradedPackages, unfixable };
  }
}

// =============================================================================
// SEMGREP AUTOFIX EXECUTOR
// =============================================================================

export interface SemgrepAutoFixResult extends ToolExecutionResult {
  /** Number of autofixes applied */
  autofixesApplied: number;
  /** Files that were modified by autofix */
  modifiedFiles: string[];
  /** Rules that had fixes applied */
  fixedRules: string[];
}

/**
 * Semgrep AutoFix Executor
 *
 * Uses `semgrep --autofix` to automatically apply security fixes.
 * Works with rules that have `fix:` definitions.
 *
 * Important: Not all Semgrep rules have autofix support.
 * Only rules with defined fixes can be auto-applied.
 */
export class SemgrepAutoFixExecutor extends ToolExecutorBase {
  constructor() {
    super({
      name: 'semgrep-autofix',
      command: 'semgrep scan',
      fixCommand: 'semgrep scan --autofix',
    });
  }

  protected getVersionCommand(): string {
    return 'semgrep --version';
  }

  /**
   * Execute semgrep --autofix on the working directory
   */
  async executeFix(options: ToolExecutionOptions): Promise<SemgrepAutoFixResult> {
    const startTime = Date.now();

    // Build command - use Python-specific rules with autofix
    // Note: Only p/python rules with fix definitions will apply
    let command = 'semgrep scan --autofix --config p/python';

    // Add specific files if provided
    if (options.files && options.files.length > 0) {
      command += ' ' + options.files.map((f) => `"${f}"`).join(' ');
    } else {
      command += ' .';
    }

    // Add JSON output for parsing
    command += ' --json';

    if (options.dryRun) {
      // Semgrep has --dryrun for autofix
      command = command.replace('--autofix', '--autofix --dryrun');
      return {
        success: true,
        tool: this.config.name,
        command,
        exitCode: 0,
        stdout: `[DRY RUN] Would execute: ${command}`,
        stderr: '',
        filesFixed: options.files || [],
        issuesFixed: 0,
        durationMs: Date.now() - startTime,
        autofixesApplied: 0,
        modifiedFiles: [],
        fixedRules: [],
      };
    }

    const result = await this.executeCommand(command, options);

    // Parse JSON output to count autofixes
    const parseResult = this.parseSemgrepOutput(result.stdout);

    return {
      ...result,
      autofixesApplied: parseResult.autofixesApplied,
      modifiedFiles: parseResult.modifiedFiles,
      fixedRules: parseResult.fixedRules,
    };
  }

  /**
   * Execute autofix for specific rules only
   */
  async executeFixForRules(
    workingDir: string,
    rules: string[],
    files: string[],
    options: { dryRun?: boolean; verbose?: boolean } = {}
  ): Promise<SemgrepAutoFixResult> {
    const startTime = Date.now();

    // Build command with specific rule configurations
    // For custom rules, we need to specify the config
    let command = 'semgrep scan --autofix';

    // Add rule configs
    for (const rule of rules) {
      command += ` --config ${rule}`;
    }

    // Add files
    if (files.length > 0) {
      command += ' ' + files.map((f) => `"${f}"`).join(' ');
    }

    command += ' --json';

    if (options.dryRun) {
      command = command.replace('--autofix', '--autofix --dryrun');
    }

    if (options.verbose) {
      console.log(`[semgrep-autofix] Running: ${command}`);
    }

    const result = await this.executeCommand(command, { workingDir, ...options });

    const parseResult = this.parseSemgrepOutput(result.stdout);

    return {
      ...result,
      autofixesApplied: parseResult.autofixesApplied,
      modifiedFiles: parseResult.modifiedFiles,
      fixedRules: parseResult.fixedRules,
    };
  }

  /**
   * Parse Semgrep JSON output to extract autofix information
   */
  private parseSemgrepOutput(stdout: string): {
    autofixesApplied: number;
    modifiedFiles: string[];
    fixedRules: string[];
  } {
    const modifiedFiles: Set<string> = new Set();
    const fixedRules: Set<string> = new Set();
    let autofixesApplied = 0;

    try {
      const results = JSON.parse(stdout);

      // Semgrep JSON structure: { results: [...], paths: {...}, ... }
      if (results.results && Array.isArray(results.results)) {
        for (const finding of results.results) {
          // Check if autofix was applied
          if (finding.extra?.is_ignored === false && finding.extra?.fix) {
            autofixesApplied++;
            modifiedFiles.add(finding.path);
            fixedRules.add(finding.check_id);
          }
        }
      }

      // Also check for errors/stats that indicate fixes applied
      if (results.stats?.autofix_applied) {
        autofixesApplied = results.stats.autofix_applied;
      }
    } catch {
      // JSON parsing failed - check for text-based output
      // "Applied 5 fixes"
      const fixMatch = stdout.match(/Applied\s+(\d+)\s+fix/i);
      if (fixMatch) {
        autofixesApplied = parseInt(fixMatch[1], 10);
      }
    }

    return {
      autofixesApplied,
      modifiedFiles: Array.from(modifiedFiles),
      fixedRules: Array.from(fixedRules),
    };
  }
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Create a pip-audit fixer executor
 */
export function createPipAuditFixer(): PipAuditFixerExecutor {
  return new PipAuditFixerExecutor();
}

/**
 * Create a semgrep autofix executor
 */
export function createSemgrepAutoFixer(): SemgrepAutoFixExecutor {
  return new SemgrepAutoFixExecutor();
}

/**
 * Get all Python-specific fixer tool names
 */
export function getPythonFixerToolNames(): string[] {
  return ['pip-audit-fixer', 'semgrep-autofix', 'ruff', 'ruff-format', 'black', 'isort', 'autoflake', 'pyupgrade'];
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if a Python vulnerability can be auto-fixed
 */
export function isPythonVulnerabilityAutoFixable(tool: string, rule: string): boolean {
  const normalizedTool = tool.toLowerCase();

  // pip-audit vulnerabilities are generally auto-fixable
  if (normalizedTool === 'pip-audit' || normalizedTool === 'safety') {
    return true;
  }

  // Semgrep with Python security rules - check if rule has a fix
  if (normalizedTool === 'semgrep') {
    // Most p/python security rules have autofix
    // Specific rules without fixes:
    const noAutofix = ['hardcoded-password', 'sql-injection-dynamic', 'exec-detected'];
    return !noAutofix.some((nofix) => rule.toLowerCase().includes(nofix));
  }

  // Ruff and bandit - ruff has fixes for many rules
  if (normalizedTool === 'ruff') {
    // S (security) rules in ruff are often fixable
    return true;
  }

  // Bandit findings - not directly auto-fixable but can be addressed via semgrep
  if (normalizedTool === 'bandit') {
    return false; // Use semgrep autofix instead
  }

  return false;
}

/**
 * Parse a pip-audit vulnerability from a message
 */
export function parsePythonVulnerabilityFromMessage(
  message: string,
  rule: string,
  severity: string = 'medium'
): PipAuditVulnerability | null {
  // Try to extract package name from message
  // Format: "package-name has vulnerability CVE-2023-xxxx"
  const pkgMatch = message.match(/^([a-z][a-z0-9_-]*)/i);

  if (!pkgMatch) {
    return null;
  }

  return {
    packageName: pkgMatch[1].toLowerCase(),
    vulnerabilityId: rule,
    severity: normalizeSeverity(severity),
    description: message,
  };
}

function normalizeSeverity(severity: string): 'critical' | 'high' | 'medium' | 'low' {
  const lower = severity.toLowerCase();
  if (lower === 'critical' || lower === 'error') return 'critical';
  if (lower === 'high' || lower === 'major') return 'high';
  if (lower === 'medium' || lower === 'moderate' || lower === 'warning') return 'medium';
  return 'low';
}
