import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';

const execAsync = promisify(exec);

interface ESLintMessage {
  ruleId: string | null;
  severity: 1 | 2; // 1 = warning, 2 = error
  message: string;
  line: number;
  column: number;
  nodeType: string;
  messageId?: string;
  endLine?: number;
  endColumn?: number;
  fix?: {
    range: [number, number];
    text: string;
  };
  suggestions?: Array<{
    desc: string;
    fix: {
      range: [number, number];
      text: string;
    };
  }>;
}

interface ESLintResult {
  filePath: string;
  messages: ESLintMessage[];
  errorCount: number;
  warningCount: number;
  fixableErrorCount: number;
  fixableWarningCount: number;
  source?: string;
  usedDeprecatedRules?: Array<{
    ruleId: string;
    replacedBy: string[];
  }>;
}

interface MCPCodeQualityFinding {
  type: 'code-quality';
  severity: 'error' | 'warning' | 'info';
  category: string;
  rule: string;
  message: string;
  file: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  fixable: boolean;
  fix?: string;
  suggestions?: string[];
}

export class ESLintMCP {
  private configPresets: Map<string, string> = new Map([
    ['react', 'eslint-config-react-app'],
    ['vue', 'eslint-plugin-vue/recommended'],
    ['angular', '@angular-eslint/recommended'],
    ['node', 'eslint-config-node'],
    ['typescript', '@typescript-eslint/recommended'],
    ['standard', 'eslint-config-standard'],
    ['airbnb', 'eslint-config-airbnb'],
    ['google', 'eslint-config-google']
  ]);

  /**
   * Analyzes code quality using ESLint
   * @param targetPath Path to analyze
   * @param config Optional ESLint config file or preset
   * @param fix Whether to apply auto-fixes
   * @returns MCP-formatted code quality findings
   */
  async analyze(targetPath = '.', config?: string, fix = false) {
    try {
      // Build ESLint command
      const command = this.buildESLintCommand(targetPath, config, fix);
      
      // Execute ESLint
      const { stdout, stderr } = await execAsync(command, {
        cwd: path.resolve(targetPath),
        timeout: 180000, // 3 minute timeout
        maxBuffer: 20 * 1024 * 1024 // 20MB buffer
      });
      
      // Parse results
      const results: ESLintResult[] = JSON.parse(stdout);
      
      // Convert to MCP format
      return {
        tool: 'eslint',
        success: true,
        findings: this.convertToMCPFormat(results),
        metrics: this.calculateMetrics(results),
        fixed: fix
      };
    } catch (error) {
      // ESLint returns non-zero exit code when issues are found
      if (this.isESLintError(error)) {
        try {
          const stdout = (error as any).stdout;
          const results: ESLintResult[] = JSON.parse(stdout);
          
          return {
            tool: 'eslint',
            success: true,
            findings: this.convertToMCPFormat(results),
            metrics: this.calculateMetrics(results),
            fixed: fix
          };
        } catch (parseError) {
          return this.handleError(error);
        }
      }
      
      return this.handleError(error);
    }
  }

  /**
   * Runs ESLint with TypeScript configuration
   */
  async analyzeTypeScript(targetPath = '.', fix = false) {
    return this.analyze(targetPath, '@typescript-eslint/recommended', fix);
  }

  /**
   * Runs ESLint for React projects
   */
  async analyzeReact(targetPath = '.', fix = false) {
    return this.analyze(targetPath, 'react', fix);
  }

  /**
   * Runs ESLint for Node.js projects
   */
  async analyzeNode(targetPath = '.', fix = false) {
    return this.analyze(targetPath, 'node', fix);
  }

  /**
   * Builds the ESLint command
   */
  private buildESLintCommand(targetPath: string, config?: string, fix = false): string {
    const baseCommand = 'npx eslint';
    const outputFormat = '--format json';
    
    // File extensions to check
    const extensions = '--ext .js,.jsx,.ts,.tsx,.mjs,.cjs';
    
    // Additional flags
    const flags = [];
    
    if (fix) {
      flags.push('--fix');
    }
    
    if (config) {
      // Check if it's a preset or a file path
      if (this.configPresets.has(config)) {
        flags.push(`--config ${this.configPresets.get(config)}`);
      } else if (fs.existsSync(config)) {
        flags.push(`--config ${config}`);
      } else {
        flags.push(`--extends ${config}`);
      }
    }
    
    // Ignore patterns
    flags.push('--ignore-pattern node_modules');
    flags.push('--ignore-pattern dist');
    flags.push('--ignore-pattern build');
    flags.push('--ignore-pattern coverage');
    
    return `${baseCommand} ${outputFormat} ${extensions} ${flags.join(' ')} ${targetPath}`;
  }

  /**
   * Converts ESLint results to MCP format
   */
  private convertToMCPFormat(results: ESLintResult[]): MCPCodeQualityFinding[] {
    const findings: MCPCodeQualityFinding[] = [];
    
    for (const result of results) {
      for (const message of result.messages) {
        findings.push({
          type: 'code-quality',
          severity: this.mapSeverity(message.severity),
          category: this.categorizeRule(message.ruleId),
          rule: message.ruleId || 'unknown',
          message: message.message,
          file: path.relative(process.cwd(), result.filePath),
          line: message.line,
          column: message.column,
          endLine: message.endLine,
          endColumn: message.endColumn,
          fixable: !!message.fix,
          fix: message.fix ? this.formatFix(message.fix) : undefined,
          suggestions: message.suggestions?.map(s => s.desc)
        });
      }
    }
    
    return findings;
  }

  /**
   * Maps ESLint severity to MCP severity
   */
  private mapSeverity(eslintSeverity: 1 | 2): 'error' | 'warning' {
    return eslintSeverity === 2 ? 'error' : 'warning';
  }

  /**
   * Categorizes ESLint rules
   */
  private categorizeRule(ruleId: string | null): string {
    if (!ruleId) return 'general';
    
    // Common rule categories
    if (ruleId.includes('indent') || ruleId.includes('space') || ruleId.includes('quotes')) {
      return 'formatting';
    }
    if (ruleId.includes('unused') || ruleId.includes('no-use')) {
      return 'unused-code';
    }
    if (ruleId.includes('camel') || ruleId.includes('naming')) {
      return 'naming';
    }
    if (ruleId.includes('complexity') || ruleId.includes('max-')) {
      return 'complexity';
    }
    if (ruleId.includes('import') || ruleId.includes('require')) {
      return 'imports';
    }
    if (ruleId.includes('jsdoc') || ruleId.includes('comment')) {
      return 'documentation';
    }
    if (ruleId.includes('react')) {
      return 'react';
    }
    if (ruleId.includes('typescript') || ruleId.includes('@typescript')) {
      return 'typescript';
    }
    if (ruleId.includes('security')) {
      return 'security';
    }
    if (ruleId.includes('promise') || ruleId.includes('async')) {
      return 'async';
    }
    if (ruleId.includes('console') || ruleId.includes('debugger')) {
      return 'debugging';
    }
    
    return 'best-practices';
  }

  /**
   * Formats a fix for display
   */
  private formatFix(fix: { range: [number, number]; text: string }): string {
    return `Replace characters ${fix.range[0]}-${fix.range[1]} with: ${fix.text}`;
  }

  /**
   * Calculates metrics from ESLint results
   */
  private calculateMetrics(results: ESLintResult[]) {
    let totalErrors = 0;
    let totalWarnings = 0;
    let fixableErrors = 0;
    let fixableWarnings = 0;
    let filesWithIssues = 0;
    
    const ruleViolations: Record<string, number> = {};
    const categoryCount: Record<string, number> = {};
    
    for (const result of results) {
      if (result.errorCount > 0 || result.warningCount > 0) {
        filesWithIssues++;
      }
      
      totalErrors += result.errorCount;
      totalWarnings += result.warningCount;
      fixableErrors += result.fixableErrorCount;
      fixableWarnings += result.fixableWarningCount;
      
      // Count rule violations
      for (const message of result.messages) {
        const rule = message.ruleId || 'unknown';
        ruleViolations[rule] = (ruleViolations[rule] || 0) + 1;
        
        const category = this.categorizeRule(rule);
        categoryCount[category] = (categoryCount[category] || 0) + 1;
      }
    }
    
    // Find top violated rules
    const topRules = Object.entries(ruleViolations)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([rule, count]) => ({ rule, count }));
    
    return {
      total: totalErrors + totalWarnings,
      errors: totalErrors,
      warnings: totalWarnings,
      fixable: {
        errors: fixableErrors,
        warnings: fixableWarnings,
        total: fixableErrors + fixableWarnings
      },
      filesAnalyzed: results.length,
      filesWithIssues,
      topViolatedRules: topRules,
      byCategory: categoryCount
    };
  }

  /**
   * Checks if error is from ESLint
   */
  private isESLintError(error: unknown): boolean {
    return !!(
      error &&
      typeof error === 'object' &&
      'code' in error &&
      'stdout' in error &&
      (error as any).stdout &&
      (error as any).code === 1 // ESLint exits with 1 when issues found
    );
  }

  /**
   * Handles errors
   */
  private handleError(error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Check if ESLint is not installed
    if (errorMessage.includes('command not found') || errorMessage.includes('not recognized')) {
      return {
        tool: 'eslint',
        success: false,
        error: 'ESLint is not installed. Please install it using: npm install -D eslint',
        findings: [],
        metrics: null
      };
    }
    
    // Check for missing config
    if (errorMessage.includes('No ESLint configuration')) {
      return {
        tool: 'eslint',
        success: false,
        error: 'No ESLint configuration found. Please create .eslintrc.js or use --config',
        findings: [],
        metrics: null
      };
    }
    
    return {
      tool: 'eslint',
      success: false,
      error: errorMessage,
      findings: [],
      metrics: null
    };
  }

  /**
   * Gets a summary of code quality issues
   */
  async getSummary(targetPath = '.', config?: string): Promise<string> {
    const result = await this.analyze(targetPath, config);
    
    if (!result.success) {
      return `Error running ESLint: ${(result as any).error}`;
    }
    
    const metrics = result.metrics;
    if (!metrics || metrics.total === 0) {
      return 'No code quality issues found';
    }
    
    const parts = [];
    if (metrics.errors > 0) parts.push(`${metrics.errors} errors`);
    if (metrics.warnings > 0) parts.push(`${metrics.warnings} warnings`);
    
    const fixableMsg = metrics.fixable.total > 0 
      ? ` (${metrics.fixable.total} auto-fixable)`
      : '';
    
    return `Found ${metrics.total} issues: ${parts.join(', ')}${fixableMsg}`;
  }

  /**
   * Checks if ESLint is installed
   */
  async isInstalled(): Promise<boolean> {
    try {
      await execAsync('npx eslint --version');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Initializes ESLint configuration
   */
  async init(targetPath = '.'): Promise<boolean> {
    try {
      await execAsync('npx eslint --init', {
        cwd: targetPath
      });
      return true;
    } catch {
      return false;
    }
  }
}

export default ESLintMCP;