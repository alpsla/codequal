/**
 * Go Performance Fixer (Tier 2)
 *
 * Uses golangci-lint --fix and pattern-based fixes for detected performance issues.
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
  fixMethod: 'golangci-lint' | 'gofmt' | 'pattern' | 'none';
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
 * Pattern-based fixes for common Go performance issues
 */
const PATTERN_FIXES: Record<string, {
  pattern: RegExp;
  replacement: string | ((match: string, ...groups: string[]) => string);
  description: string;
}> = {
  'no-prealloc': {
    // Pattern: make([]T, 0) followed by append in loop
    pattern: /(\w+)\s*:=\s*make\(\[]\w+,\s*0\)(\s*\n\s*for\s+[^{]+\{[^}]*append\(\1)/g,
    replacement: (_match, varName, loopPart) =>
      `${varName} := make([]string, 0, len(items))${loopPart}`,
    description: 'Add capacity to slice allocation'
  },
  'map-no-size-hint': {
    // Pattern: make(map[K]V) followed by assignment in loop
    pattern: /(\w+)\s*:=\s*make\(map\[(\w+)](\w+)\)(\s*\n\s*for\s+[^{]+\{[^}]*\1\[)/g,
    replacement: (_match, varName, keyType, valType, loopPart) =>
      `${varName} := make(map[${keyType}]${valType}, len(items))${loopPart}`,
    description: 'Add size hint to map allocation'
  },
  'string-concat-in-loop-go': {
    // Pattern: result := "" followed by result += in loop
    pattern: /(\w+)\s*:=\s*""\s*\n(\s*)for\s+([^{]+)\{([^}]*)\1\s*\+=\s*(\w+)/g,
    replacement: (_match, _resultVar, indent, loopHeader, _body, appendVar) =>
      `var sb strings.Builder\n${indent}for ${loopHeader}{ sb.WriteString(${appendVar})`,
    description: 'Replace string concatenation with strings.Builder'
  },
  'defer-in-loop': {
    // Pattern: defer inside for loop
    pattern: /(for\s+[^{]+\{[^}]*)(defer\s+\w+\.\w+\(\))/g,
    replacement: (_match, loopPart, deferStmt) =>
      loopPart.replace(deferStmt, `func() { ${deferStmt} }()`),
    description: 'Wrap defer in anonymous function to execute immediately'
  }
};

/**
 * Go Performance Fixer
 * Applies Tier 2 fixes for detected performance issues
 */
export class GoPerformanceFixer {
  private golangciAvailable: boolean | null = null;
  private gofmtAvailable: boolean | null = null;

  /**
   * Check if golangci-lint is available
   */
  private async checkGolangci(): Promise<boolean> {
    if (this.golangciAvailable !== null) return this.golangciAvailable;

    try {
      await execAsync('golangci-lint --version');
      this.golangciAvailable = true;
    } catch {
      this.golangciAvailable = false;
    }
    return this.golangciAvailable;
  }

  /**
   * Check if gofmt is available
   */
  private async checkGofmt(): Promise<boolean> {
    if (this.gofmtAvailable !== null) return this.gofmtAvailable;

    try {
      await execAsync('gofmt --help 2>&1');
      this.gofmtAvailable = true;
    } catch {
      // gofmt returns non-zero for --help but is still available
      this.gofmtAvailable = true;
    }
    return this.gofmtAvailable;
  }

  /**
   * Fix with golangci-lint --fix
   */
  async fixWithGolangci(repoPath: string): Promise<PerformanceFixResult[]> {
    const results: PerformanceFixResult[] = [];

    if (!(await this.checkGolangci())) {
      console.log('[GoPerformanceFixer] golangci-lint not available');
      return results;
    }

    try {
      // Enable performance-related linters
      const { stdout } = await execAsync(
        `cd "${repoPath}" && golangci-lint run --fix --enable prealloc,ineffassign,staticcheck -q 2>&1`,
        { maxBuffer: 50 * 1024 * 1024 }
      );

      if (stdout && stdout.includes('Fixed')) {
        results.push({
          file: repoPath,
          ruleId: 'golangci-perf',
          fixed: true,
          fixMethod: 'golangci-lint'
        });
      }

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // golangci-lint returns non-zero if issues found, which is expected
      if (!errorMessage.includes('exit code 1') && !errorMessage.includes('issues')) {
        console.log('[GoPerformanceFixer] golangci-lint error:', errorMessage);
      }
    }

    return results;
  }

  /**
   * Format Go files with gofmt
   */
  async formatWithGofmt(filePath: string): Promise<boolean> {
    if (!(await this.checkGofmt())) {
      return false;
    }

    try {
      await execAsync(`gofmt -w "${filePath}"`);
      return true;
    } catch {
      return false;
    }
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

      // Format with gofmt after fix
      await this.formatWithGofmt(filePath);
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

    // First, try golangci-lint --fix
    const golangciResults = await this.fixWithGolangci(repoPath);
    allResults.push(...golangciResults);

    // Apply pattern-based fixes
    if (issues && issues.length > 0) {
      const issuesByFile = new Map<string, PerformanceIssue[]>();
      for (const issue of issues) {
        const filePath = path.isAbsolute(issue.file)
          ? issue.file
          : path.join(repoPath, issue.file);

        const existing = issuesByFile.get(filePath) || [];
        existing.push(issue);
        issuesByFile.set(filePath, existing);
      }

      for (const [filePath, fileIssues] of issuesByFile) {
        // Apply pattern fixes for all applicable issues
        const patternableIssues = fileIssues.filter(i => PATTERN_FIXES[i.rule]);

        if (patternableIssues.length > 0) {
          const patternResults = await this.fixWithPatterns(filePath, patternableIssues);
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
