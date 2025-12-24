/**
 * Python Performance Fixer (Tier 2)
 *
 * Uses Ruff's PERF rules and other tools to auto-fix detected performance issues.
 * This is a Tier 2 fixer that applies deterministic fixes for common patterns.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export interface PerformanceFixResult {
  file: string;
  ruleId: string;
  fixed: boolean;
  fixMethod: 'ruff' | 'pattern' | 'none';
  diff?: string;
  error?: string;
}

export interface PerformanceIssue {
  file: string;
  line: number;
  rule: string;
  message: string;
}

/**
 * Pattern-based fixes for common Python performance issues
 */
const PATTERN_FIXES: Record<string, {
  pattern: RegExp;
  replacement: string | ((match: string, ...groups: string[]) => string);
  description: string;
}> = {
  'mutable-default-argument': {
    pattern: /def\s+(\w+)\s*\([^)]*(\w+)\s*=\s*\[\]\s*[^)]*\)/g,
    replacement: (_match, funcName, argName) =>
      `def ${funcName}(${argName}=None):\n    if ${argName} is None:\n        ${argName} = []`,
    description: 'Replace mutable default argument with None pattern'
  },
  'string-concat-in-loop-python': {
    pattern: /(\w+)\s*=\s*""\s*\n\s*for\s+(\w+)\s+in\s+(\w+):\s*\n\s*\1\s*\+=\s*\2/g,
    replacement: (_match, resultVar, iterVar, iterableVar) =>
      `${resultVar} = "".join(${iterableVar})`,
    description: 'Replace string concatenation in loop with join()'
  }
};

/**
 * Python Performance Fixer
 * Applies Tier 2 fixes for detected performance issues
 */
export class PythonPerformanceFixer {
  private ruffAvailable: boolean | null = null;

  /**
   * Check if ruff is available
   */
  private async checkRuff(): Promise<boolean> {
    if (this.ruffAvailable !== null) return this.ruffAvailable;

    try {
      await execAsync('ruff --version');
      this.ruffAvailable = true;
    } catch {
      this.ruffAvailable = false;
    }
    return this.ruffAvailable;
  }

  /**
   * Fix performance issues using Ruff --fix
   */
  async fixWithRuff(repoPath: string): Promise<PerformanceFixResult[]> {
    const results: PerformanceFixResult[] = [];

    if (!(await this.checkRuff())) {
      console.log('[PythonPerformanceFixer] Ruff not available');
      return results;
    }

    try {
      // Run ruff check --fix for PERF rules
      const { stdout, stderr } = await execAsync(
        `ruff check --fix --select PERF --output-format json "${repoPath}"`,
        { maxBuffer: 50 * 1024 * 1024 }
      );

      // Parse fixed files from output
      if (stdout) {
        try {
          const fixedData = JSON.parse(stdout);
          if (Array.isArray(fixedData)) {
            for (const item of fixedData) {
              results.push({
                file: item.filename || item.file,
                ruleId: item.code || 'PERF',
                fixed: true,
                fixMethod: 'ruff'
              });
            }
          }
        } catch {
          // Non-JSON output means fixes were applied
          console.log('[PythonPerformanceFixer] Ruff fixes applied');
        }
      }

      if (stderr && !stderr.includes('Fixed')) {
        console.log('[PythonPerformanceFixer] Ruff stderr:', stderr);
      }

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Ruff returns non-zero if it finds issues, which is expected
      if (!errorMessage.includes('exit code 1')) {
        console.log('[PythonPerformanceFixer] Ruff error:', errorMessage);
      }
    }

    return results;
  }

  /**
   * Apply pattern-based fixes for specific issues
   */
  async fixWithPatterns(filePath: string, issues: PerformanceIssue[]): Promise<PerformanceFixResult[]> {
    const results: PerformanceFixResult[] = [];

    if (!fs.existsSync(filePath)) {
      return results;
    }

    let content = fs.readFileSync(filePath, 'utf-8');
    let modified = false;

    for (const issue of issues) {
      const patternFix = PATTERN_FIXES[issue.rule];
      if (patternFix) {
        const originalContent = content;
        if (typeof patternFix.replacement === 'function') {
          content = content.replace(patternFix.pattern, patternFix.replacement as (...args: string[]) => string);
        } else {
          content = content.replace(patternFix.pattern, patternFix.replacement);
        }

        if (content !== originalContent) {
          modified = true;
          results.push({
            file: filePath,
            ruleId: issue.rule,
            fixed: true,
            fixMethod: 'pattern',
            diff: `Applied: ${patternFix.description}`
          });
        }
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content);
    }

    return results;
  }

  /**
   * Fix all performance issues in a repository
   */
  async fixAll(repoPath: string, issues?: PerformanceIssue[]): Promise<{
    results: PerformanceFixResult[];
    summary: {
      fixed: number;
      byMethod: Record<string, number>;
      failed: number;
    };
  }> {
    const allResults: PerformanceFixResult[] = [];

    // First, try Ruff for PERF rules (most reliable)
    const ruffResults = await this.fixWithRuff(repoPath);
    allResults.push(...ruffResults);

    // Then apply pattern-based fixes for issues not fixable by ruff
    if (issues && issues.length > 0) {
      // Group issues by file
      const issuesByFile = new Map<string, PerformanceIssue[]>();
      for (const issue of issues) {
        const filePath = path.isAbsolute(issue.file)
          ? issue.file
          : path.join(repoPath, issue.file);

        const existing = issuesByFile.get(filePath) || [];
        existing.push(issue);
        issuesByFile.set(filePath, existing);
      }

      // Apply pattern fixes
      for (const [filePath, fileIssues] of issuesByFile) {
        // Only apply pattern fixes for rules not handled by ruff
        const nonRuffIssues = fileIssues.filter(i =>
          !i.rule.startsWith('PERF') && PATTERN_FIXES[i.rule]
        );

        if (nonRuffIssues.length > 0) {
          const patternResults = await this.fixWithPatterns(filePath, nonRuffIssues);
          allResults.push(...patternResults);
        }
      }
    }

    // Calculate summary
    const byMethod: Record<string, number> = {};
    let fixed = 0;
    let failed = 0;

    for (const result of allResults) {
      if (result.fixed) {
        fixed++;
        byMethod[result.fixMethod] = (byMethod[result.fixMethod] || 0) + 1;
      } else {
        failed++;
      }
    }

    return {
      results: allResults,
      summary: { fixed, byMethod, failed }
    };
  }
}
