/**
 * Java Performance Fixer (Tier 2)
 *
 * Uses Sorald and pattern-based fixes to auto-fix detected performance issues.
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
  fixMethod: 'sorald' | 'pattern' | 'google-java-format' | 'none';
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
 * Pattern-based fixes for common Java performance issues
 */
const PATTERN_FIXES: Record<string, {
  pattern: RegExp;
  replacement: string | ((match: string, ...groups: string[]) => string);
  description: string;
}> = {
  'UseStringBufferForStringAppends': {
    // Basic pattern: String result = ""; for (...) { result += x; }
    pattern: /(String\s+\w+\s*=\s*"";)\s*\n(\s*)for\s*\([^)]+\)\s*\{([^}]*)\1\s*\+=\s*([^;]+);/g,
    replacement: (_match, _init, indent, _body, appendExpr) =>
      `StringBuilder sb = new StringBuilder();\n${indent}for (...) { sb.append(${appendExpr});`,
    description: 'Replace string concatenation with StringBuilder'
  },
  'AvoidFileStream': {
    // Pattern: new FileInputStream(x) without try-with-resources
    pattern: /(\w+)\s*=\s*new\s+FileInputStream\(([^)]+)\);/g,
    replacement: (_match, varName, arg) =>
      `try (FileInputStream ${varName} = new FileInputStream(${arg})) {`,
    description: 'Wrap FileInputStream in try-with-resources'
  }
};

/**
 * Java Performance Fixer
 * Applies Tier 2 fixes for detected performance issues
 */
export class JavaPerformanceFixer {
  private soraldAvailable: boolean | null = null;
  private googleJavaFormatAvailable: boolean | null = null;

  /**
   * Check if Sorald is available
   */
  private async checkSorald(): Promise<boolean> {
    if (this.soraldAvailable !== null) return this.soraldAvailable;

    try {
      await execAsync('java -jar sorald.jar --version 2>/dev/null || which sorald');
      this.soraldAvailable = true;
    } catch {
      this.soraldAvailable = false;
    }
    return this.soraldAvailable;
  }

  /**
   * Check if google-java-format is available
   */
  private async checkGoogleJavaFormat(): Promise<boolean> {
    if (this.googleJavaFormatAvailable !== null) return this.googleJavaFormatAvailable;

    try {
      await execAsync('google-java-format --version 2>/dev/null');
      this.googleJavaFormatAvailable = true;
    } catch {
      this.googleJavaFormatAvailable = false;
    }
    return this.googleJavaFormatAvailable;
  }

  /**
   * Fix with Sorald (if available)
   */
  async fixWithSorald(repoPath: string, ruleId: string): Promise<PerformanceFixResult[]> {
    const results: PerformanceFixResult[] = [];

    if (!(await this.checkSorald())) {
      console.log('[JavaPerformanceFixer] Sorald not available');
      return results;
    }

    try {
      // Sorald rule mapping (PMD rule -> Sorald rule ID)
      const soraldRules: Record<string, number> = {
        'UseStringBufferForStringAppends': 1217,
        'AvoidInstantiatingObjectsInLoops': 1217,
        'AvoidFileStream': 2755
      };

      const soraldRule = soraldRules[ruleId];
      if (!soraldRule) {
        return results;
      }

      await execAsync(
        `java -jar sorald.jar repair --source "${repoPath}" --ruleKey S${soraldRule}`,
        { maxBuffer: 50 * 1024 * 1024 }
      );

      results.push({
        file: repoPath,
        ruleId,
        fixed: true,
        fixMethod: 'sorald'
      });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log('[JavaPerformanceFixer] Sorald error:', errorMessage);
    }

    return results;
  }

  /**
   * Format Java files with google-java-format
   */
  async formatWithGoogleJavaFormat(filePath: string): Promise<boolean> {
    if (!(await this.checkGoogleJavaFormat())) {
      return false;
    }

    try {
      await execAsync(`google-java-format -i "${filePath}"`);
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

      // Try to format after fix
      await this.formatWithGoogleJavaFormat(filePath);
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

    // Collect unique rules to fix with Sorald
    const uniqueRules = new Set<string>();
    if (issues) {
      issues.forEach(i => uniqueRules.add(i.rule));
    }

    // Try Sorald for each rule
    for (const rule of uniqueRules) {
      const soraldResults = await this.fixWithSorald(repoPath, rule);
      allResults.push(...soraldResults);
    }

    // Apply pattern-based fixes for issues not fixable by Sorald
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
        // Only apply pattern fixes for issues we have patterns for
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
