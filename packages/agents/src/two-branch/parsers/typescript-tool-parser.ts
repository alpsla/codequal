/**
 * TypeScript/JavaScript Tool Output Parser
 * Parses real output from TypeScript/JavaScript analysis tools:
 * - ESLint (linting and code quality)
 * - TypeScript Compiler (type checking)
 * - npm audit (security vulnerabilities)
 * - jest (test coverage)
 * - bundlesize (performance)
 */

import { exec as execCallback } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';

const exec = promisify(execCallback);

export interface TypeScriptIssue {
  id: string;
  type: 'security' | 'performance' | 'quality' | 'bug' | 'style' | 'type-error' | 'test';
  severity: 'critical' | 'high' | 'medium' | 'low';
  file: string;
  line: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  message: string;
  suggestion?: string;
  tool: string;
  category?: string;
  code?: string;
  help?: string;
  fixable?: boolean;
}

export interface TypeScriptToolResult {
  tool: string;
  executionTime: number;
  exitCode: number;
  issues: TypeScriptIssue[];
  rawOutput?: string;
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    fixable?: number;
  };
  coverage?: {
    lines: number;
    branches: number;
    functions: number;
    statements: number;
  };
}

export class TypeScriptToolParser {
  
  /**
   * Run ESLint and parse its output
   */
  async runESLint(repoPath: string, files?: string[]): Promise<TypeScriptToolResult> {
    const startTime = Date.now();
    let issues: TypeScriptIssue[] = [];
    let exitCode = 0;
    let rawOutput = '';
    let fixableCount = 0;

    try {
      // Run ESLint with JSON output for better parsing
      // CRITICAL: Don't use '.' (scans everything including node_modules traversal)
      // GLOB FIX: Use glob library to discover files first, then pass explicit file list to ESLint
      // This fixes the issue where ESLint's glob patterns work differently from different directory contexts
      let fileArgs: string;

      if (files && files.length > 0) {
        fileArgs = files.filter(f => f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js') || f.endsWith('.jsx')).join(' ');
      } else {
        // Use glob to find files matching our patterns
        const patterns = [
          'src/**/*.{ts,tsx,js,jsx}',
          'lib/**/*.{ts,tsx,js,jsx}',
          'app/**/*.{ts,tsx,js,jsx}',
          'packages/**/src/**/*.{ts,tsx,js,jsx}',
          'packages/**/lib/**/*.{ts,tsx,js,jsx}',
          'apps/**/src/**/*.{ts,tsx,js,jsx}',
          '*.{ts,tsx,js,jsx}'
        ];

        // Find all matching files
        const matchedFiles: string[] = [];
        for (const pattern of patterns) {
          try {
            const found = await glob(pattern, {
              cwd: repoPath,
              ignore: [
                '**/node_modules/**',
                '**/dist/**',
                '**/build/**',
                '**/.next/**',
                '**/.output/**',
                '**/coverage/**',
                '**/*.d.ts',
                '**/vendor/**'
              ],
              nodir: true
            } as any);  // Type assertion to bypass TypeScript issues with glob versions

            // Convert to array if it's an iterator or IGlob object
            const filesArray = Array.isArray(found) ? found : Array.from(found as any);
            matchedFiles.push(...filesArray);
          } catch (err) {
            // Ignore errors from individual patterns (e.g., if directory doesn't exist)
            console.log(`[ESLint] Pattern ${pattern} matched no files`);
          }
        }

        // Remove duplicates and convert to space-separated string
        const uniqueFiles = Array.from(new Set(matchedFiles));
        fileArgs = uniqueFiles.length > 0 ? uniqueFiles.join(' ') : '.';

        console.log(`[ESLint] Discovered ${uniqueFiles.length} files to scan`);
      }

      // BUG-077 FIX: Add ignore patterns to ESLint command to exclude build artifacts
      const ignorePatterns = '--ignore-pattern "**/dist/**" --ignore-pattern "**/build/**" --ignore-pattern "**/.next/**" --ignore-pattern "**/coverage/**" --ignore-pattern "**/.output/**"';
      const command = `cd ${repoPath} && npx eslint ${fileArgs} ${ignorePatterns} --format json 2>&1`;

      // DEBUG: Log the exact command being executed
      console.log('[DEBUG ESLint] Repository path:', repoPath);
      console.log('[DEBUG ESLint] Files to scan:', fileArgs.split(' ').length);
      console.log('[DEBUG ESLint] Full command (truncated):', command.substring(0, 200) + '...');

      const { stdout, stderr } = await exec(command, {
        maxBuffer: 10 * 1024 * 1024,  // 10MB buffer
        timeout: 120000  // 2 minute timeout - should complete in seconds, this catches hangs
      });
      
      rawOutput = stdout + stderr;
      
      // Parse JSON output
      try {
        const eslintOutput = JSON.parse(stdout);
        // DEBUG: Log ESLint results
        console.log('[DEBUG ESLint] Files scanned:', Array.isArray(eslintOutput) ? eslintOutput.length : 0);
        if (Array.isArray(eslintOutput)) {
          const totalMessages = eslintOutput.reduce((sum, f) => sum + (f.messages?.length || 0), 0);
          console.log('[DEBUG ESLint] Total messages:', totalMessages);
          const result = this.parseESLintResults(eslintOutput);
          issues = result.issues;
          fixableCount = result.fixableCount;
          console.log('[DEBUG ESLint] Parsed issues:', issues.length);
        }
      } catch (e) {
        // Fallback to text parsing
        issues = this.parseESLintTextOutput(rawOutput);
      }

    } catch (error: any) {
      exitCode = error.code || 1;
      rawOutput = error.stdout || error.message;
      
      // Even if ESLint fails with exit code 1 (has lint errors), parse output
      try {
        // Try to extract JSON from output
        const jsonMatch = rawOutput.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const eslintOutput = JSON.parse(jsonMatch[0]);
          const result = this.parseESLintResults(eslintOutput);
          issues = result.issues;
          fixableCount = result.fixableCount;
        } else {
          issues = this.parseESLintTextOutput(rawOutput);
        }
      } catch {
        issues = this.parseESLintTextOutput(rawOutput);
      }
    }

    const executionTime = (Date.now() - startTime) / 1000;
    const summary = this.generateSummary(issues);
    
    return {
      tool: 'eslint',
      executionTime,
      exitCode,
      issues,
      rawOutput: rawOutput.substring(0, 5000),
      summary: {
        ...summary,
        fixable: fixableCount
      }
    };
  }

  /**
   * Run TypeScript Compiler and parse its output
   */
  async runTypeScriptCompiler(repoPath: string, files?: string[]): Promise<TypeScriptToolResult> {
    const startTime = Date.now();
    let issues: TypeScriptIssue[] = [];
    let exitCode = 0;
    let rawOutput = '';

    try {
      // Check if tsconfig.json exists
      const tsconfigPath = path.join(repoPath, 'tsconfig.json');
      const hasTsConfig = await fs.access(tsconfigPath).then(() => true).catch(() => false);
      
      // Run tsc with appropriate options
      const fileArgs = files && files.length > 0 
        ? files.filter(f => f.endsWith('.ts') || f.endsWith('.tsx')).join(' ')
        : '';
      
      const command = hasTsConfig
        ? `cd ${repoPath} && npx tsc --noEmit --pretty false ${fileArgs} 2>&1`
        : `cd ${repoPath} && npx tsc --noEmit --allowJs --checkJs --strict --pretty false ${fileArgs || '**/*.ts'} 2>&1`;
      
      const { stdout, stderr } = await exec(command, { 
        maxBuffer: 10 * 1024 * 1024,
        timeout: 120000
      });
      
      rawOutput = stdout + stderr;
      
      // Parse TypeScript compiler output
      issues = this.parseTscOutput(rawOutput);

    } catch (error: any) {
      exitCode = error.code || 1;
      rawOutput = error.stdout || error.message;
      // TypeScript compiler returns non-zero exit code when there are errors
      issues = this.parseTscOutput(rawOutput);
    }

    const executionTime = (Date.now() - startTime) / 1000;
    
    return {
      tool: 'typescript',
      executionTime,
      exitCode,
      issues,
      rawOutput: rawOutput.substring(0, 5000),
      summary: this.generateSummary(issues)
    };
  }

  /**
   * Run npm audit and parse its output
   */
  async runNpmAudit(repoPath: string): Promise<TypeScriptToolResult> {
    const startTime = Date.now();
    let issues: TypeScriptIssue[] = [];
    let exitCode = 0;
    let rawOutput = '';

    try {
      // Run npm audit with JSON output
      const command = `cd ${repoPath} && npm audit --json 2>&1`;
      
      const { stdout, stderr } = await exec(command, { 
        maxBuffer: 5 * 1024 * 1024,
        timeout: 60000
      });
      
      rawOutput = stdout;
      
      // Parse JSON output
      try {
        const auditResult = JSON.parse(stdout);
        if (auditResult.vulnerabilities) {
          issues = this.parseNpmAuditVulnerabilities(auditResult.vulnerabilities);
        } else if (auditResult.advisories) {
          issues = this.parseNpmAuditAdvisories(auditResult.advisories);
        }
      } catch (e) {
        // Fallback to text parsing
        issues = this.parseNpmAuditTextOutput(rawOutput);
      }

    } catch (error: any) {
      exitCode = error.code || 1;
      rawOutput = error.stdout || error.message;
      // Try to parse any available output
      try {
        const auditResult = JSON.parse(rawOutput);
        if (auditResult.vulnerabilities) {
          issues = this.parseNpmAuditVulnerabilities(auditResult.vulnerabilities);
        } else if (auditResult.advisories) {
          issues = this.parseNpmAuditAdvisories(auditResult.advisories);
        }
      } catch {
        issues = this.parseNpmAuditTextOutput(rawOutput);
      }
    }

    const executionTime = (Date.now() - startTime) / 1000;
    
    return {
      tool: 'npm-audit',
      executionTime,
      exitCode,
      issues,
      rawOutput: rawOutput.substring(0, 5000),
      summary: this.generateSummary(issues)
    };
  }

  /**
   * Run Jest with coverage and parse its output
   */
  async runJestCoverage(repoPath: string): Promise<TypeScriptToolResult> {
    const startTime = Date.now();
    let issues: TypeScriptIssue[] = [];
    let exitCode = 0;
    let rawOutput = '';
    let coverage = {
      lines: 0,
      branches: 0,
      functions: 0,
      statements: 0
    };

    try {
      // Run jest with coverage and JSON output
      const command = `cd ${repoPath} && npx jest --coverage --json --outputFile=coverage-report.json 2>&1`;
      
      const { stdout, stderr } = await exec(command, { 
        maxBuffer: 10 * 1024 * 1024,
        timeout: 300000 // 5 minutes for tests
      });
      
      rawOutput = stdout + stderr;
      
      // Try to read the coverage report
      try {
        const reportPath = path.join(repoPath, 'coverage-report.json');
        const reportContent = await fs.readFile(reportPath, 'utf-8');
        const report = JSON.parse(reportContent);
        
        if (report.coverageMap) {
          const result = this.parseJestCoverage(report.coverageMap);
          issues = result.issues;
          coverage = result.coverage;
        }
        
        // Clean up the report file
        await fs.unlink(reportPath).catch(() => {
          // Ignore cleanup errors
        });
      } catch (e) {
        // Parse from stdout if JSON file not available
        issues = this.parseJestTextOutput(rawOutput);
      }

    } catch (error: any) {
      exitCode = error.code || 1;
      rawOutput = error.stdout || error.message;
      issues = this.parseJestTextOutput(rawOutput);
    }

    const executionTime = (Date.now() - startTime) / 1000;
    
    return {
      tool: 'jest',
      executionTime,
      exitCode,
      issues,
      rawOutput: rawOutput.substring(0, 5000),
      summary: this.generateSummary(issues),
      coverage
    };
  }

  /**
   * Parse ESLint results
   */
  private parseESLintResults(results: any[]): { issues: TypeScriptIssue[], fixableCount: number } {
    const issues: TypeScriptIssue[] = [];
    let fixableCount = 0;
    
    for (const file of results) {
      if (!file.messages || file.messages.length === 0) continue;
      
      for (const msg of file.messages) {
        const issue: TypeScriptIssue = {
          id: `eslint-${msg.ruleId}-${file.filePath}-${msg.line}-${msg.column}`,
          type: this.mapESLintType(msg.ruleId, msg.severity),
          severity: this.mapESLintSeverity(msg.severity, msg.ruleId),
          file: file.filePath,
          line: msg.line || 0,
          column: msg.column,
          endLine: msg.endLine,
          endColumn: msg.endColumn,
          message: msg.message,
          tool: 'eslint',
          category: msg.ruleId,
          fixable: !!msg.fix
        };
        
        if (msg.fix) {
          fixableCount++;
          issue.suggestion = 'Auto-fixable with --fix';
        }
        
        issues.push(issue);
      }
    }
    
    return { issues, fixableCount };
  }

  /**
   * Parse ESLint text output (fallback)
   */
  private parseESLintTextOutput(output: string): TypeScriptIssue[] {
    const issues: TypeScriptIssue[] = [];
    const lines = output.split('\n');
    
    // Pattern: /path/to/file.ts:line:column severity message rule-id
    const eslintRegex = /^(.+?):(\d+):(\d+)\s+(error|warning)\s+(.+?)\s+(.+)$/;
    
    for (const line of lines) {
      const match = line.match(eslintRegex);
      if (match) {
        issues.push({
          id: `eslint-${match[6]}-${match[1]}-${match[2]}-${match[3]}`,
          type: this.mapESLintType(match[6], match[4] === 'error' ? 2 : 1),
          severity: this.mapESLintSeverity(match[4] === 'error' ? 2 : 1, match[6]),
          file: match[1],
          line: parseInt(match[2]),
          column: parseInt(match[3]),
          message: match[5],
          tool: 'eslint',
          category: match[6]
        });
      }
    }
    
    return issues;
  }

  /**
   * Parse TypeScript compiler output
   */
  private parseTscOutput(output: string): TypeScriptIssue[] {
    const issues: TypeScriptIssue[] = [];
    const lines = output.split('\n');
    
    // Pattern: file.ts(line,column): error TS2345: message
    const tscRegex = /^(.+?)\((\d+),(\d+)\):\s+(error|warning)\s+TS(\d+):\s+(.+)$/;
    
    for (const line of lines) {
      const match = line.match(tscRegex);
      if (match) {
        issues.push({
          id: `tsc-TS${match[5]}-${match[1]}-${match[2]}-${match[3]}`,
          type: 'type-error',
          severity: match[4] === 'error' ? 'high' : 'medium',
          file: match[1],
          line: parseInt(match[2]),
          column: parseInt(match[3]),
          message: match[6],
          tool: 'typescript',
          category: `TS${match[5]}`,
          code: `TS${match[5]}`
        });
      }
    }
    
    return issues;
  }

  /**
   * Parse npm audit vulnerabilities (new format)
   */
  private parseNpmAuditVulnerabilities(vulnerabilities: any): TypeScriptIssue[] {
    const issues: TypeScriptIssue[] = [];
    
    Object.entries(vulnerabilities).forEach(([pkg, vuln]: [string, any]) => {
      if (vuln.via && Array.isArray(vuln.via)) {
        vuln.via.forEach((advisory: any) => {
          if (typeof advisory === 'object' && advisory.title) {
            issues.push({
              id: `npm-audit-${advisory.source || Date.now()}`,
              type: 'security',
              severity: this.mapNpmAuditSeverity(advisory.severity || vuln.severity),
              file: 'package.json',
              line: 1,
              message: `${advisory.title} in ${pkg}`,
              suggestion: advisory.fixAvailable ? 'Fix available via npm audit fix' : 'Manual review required',
              tool: 'npm-audit',
              category: 'dependency-vulnerability',
              help: advisory.url
            });
          }
        });
      }
    });
    
    return issues;
  }

  /**
   * Parse npm audit advisories (old format)
   */
  private parseNpmAuditAdvisories(advisories: any): TypeScriptIssue[] {
    const issues: TypeScriptIssue[] = [];
    
    Object.values(advisories).forEach((advisory: any) => {
      issues.push({
        id: `npm-audit-${advisory.id}`,
        type: 'security',
        severity: this.mapNpmAuditSeverity(advisory.severity),
        file: 'package.json',
        line: 1,
        message: `${advisory.title} in ${advisory.module_name}`,
        suggestion: `${advisory.recommendation}`,
        tool: 'npm-audit',
        category: 'dependency-vulnerability',
        help: advisory.url || advisory.references
      });
    });
    
    return issues;
  }

  /**
   * Parse npm audit text output (fallback)
   */
  private parseNpmAuditTextOutput(output: string): TypeScriptIssue[] {
    const issues: TypeScriptIssue[] = [];
    const lines = output.split('\n');
    
    // Look for severity patterns
    const severityRegex = /(\d+)\s+(critical|high|moderate|low)\s+severity vulnerabilit/i;
    const packageRegex = /^(.+?)\s+<(.+?)>\s+(.+)$/;
    
    let currentSeverity = 'medium';
    
    for (const line of lines) {
      const severityMatch = line.match(severityRegex);
      if (severityMatch) {
        currentSeverity = this.mapNpmAuditSeverity(severityMatch[2]);
      }
      
      const packageMatch = line.match(packageRegex);
      if (packageMatch) {
        issues.push({
          id: `npm-audit-${Date.now()}-${issues.length}`,
          type: 'security',
          severity: currentSeverity as TypeScriptIssue['severity'],
          file: 'package.json',
          line: 1,
          message: `Vulnerability in ${packageMatch[1]}: ${packageMatch[3]}`,
          tool: 'npm-audit'
        });
      }
    }
    
    return issues;
  }

  /**
   * Parse Jest coverage data
   */
  private parseJestCoverage(coverageMap: any): { issues: TypeScriptIssue[], coverage: any } {
    const issues: TypeScriptIssue[] = [];
    let totalLines = 0;
    let coveredLines = 0;
    let totalBranches = 0;
    let coveredBranches = 0;
    let totalFunctions = 0;
    let coveredFunctions = 0;
    let totalStatements = 0;
    let coveredStatements = 0;
    
    Object.entries(coverageMap).forEach(([file, data]: [string, any]) => {
      const summary = data.s || data;
      
      // Aggregate coverage data
      if (summary.lines) {
        totalLines += summary.lines.total || 0;
        coveredLines += summary.lines.covered || 0;
        
        // Create issue for low coverage files
        const linesCoverage = (summary.lines.covered / summary.lines.total) * 100;
        if (linesCoverage < 80) {
          issues.push({
            id: `jest-coverage-${file}`,
            type: 'test',
            severity: linesCoverage < 50 ? 'high' : 'medium',
            file,
            line: 1,
            message: `Low test coverage: ${linesCoverage.toFixed(1)}% lines covered`,
            suggestion: 'Add more tests to improve coverage',
            tool: 'jest',
            category: 'coverage'
          });
        }
      }
      
      if (summary.branches) {
        totalBranches += summary.branches.total || 0;
        coveredBranches += summary.branches.covered || 0;
      }
      
      if (summary.functions) {
        totalFunctions += summary.functions.total || 0;
        coveredFunctions += summary.functions.covered || 0;
      }
      
      if (summary.statements) {
        totalStatements += summary.statements.total || 0;
        coveredStatements += summary.statements.covered || 0;
      }
    });
    
    const coverage = {
      lines: totalLines > 0 ? (coveredLines / totalLines) * 100 : 0,
      branches: totalBranches > 0 ? (coveredBranches / totalBranches) * 100 : 0,
      functions: totalFunctions > 0 ? (coveredFunctions / totalFunctions) * 100 : 0,
      statements: totalStatements > 0 ? (coveredStatements / totalStatements) * 100 : 0
    };
    
    return { issues, coverage };
  }

  /**
   * Parse Jest text output (fallback)
   */
  private parseJestTextOutput(output: string): TypeScriptIssue[] {
    const issues: TypeScriptIssue[] = [];
    const lines = output.split('\n');
    
    // Look for failed tests
    const failRegex = /^\s*✕\s+(.+?)\s+\((\d+)\s+ms\)$/;
    const fileRegex = /^\s*●\s+(.+?)$/;
    
    let currentFile = '';
    
    for (const line of lines) {
      const fileMatch = line.match(fileRegex);
      if (fileMatch) {
        currentFile = fileMatch[1];
      }
      
      const failMatch = line.match(failRegex);
      if (failMatch && currentFile) {
        issues.push({
          id: `jest-test-${Date.now()}-${issues.length}`,
          type: 'test',
          severity: 'high',
          file: currentFile,
          line: 1,
          message: `Test failed: ${failMatch[1]}`,
          tool: 'jest',
          category: 'test-failure'
        });
      }
    }
    
    // Look for coverage warnings
    const coverageRegex = /^File\s+\|\s+%\s+Stmts\s+\|\s+%\s+Branch/;
    const fileCoverageRegex = /^(.+?)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)/;
    
    let inCoverageSection = false;
    
    for (const line of lines) {
      if (line.match(coverageRegex)) {
        inCoverageSection = true;
        continue;
      }
      
      if (inCoverageSection) {
        const match = line.match(fileCoverageRegex);
        if (match) {
          const stmtCoverage = parseFloat(match[2]);
          if (stmtCoverage < 80) {
            issues.push({
              id: `jest-coverage-${match[1]}`,
              type: 'test',
              severity: stmtCoverage < 50 ? 'high' : 'medium',
              file: match[1],
              line: 1,
              message: `Low test coverage: ${stmtCoverage}% statements covered`,
              suggestion: 'Add more tests to improve coverage',
              tool: 'jest',
              category: 'coverage'
            });
          }
        }
      }
    }
    
    return issues;
  }

  /**
   * Map ESLint rule to issue type
   */
  private mapESLintType(ruleId: string, severity: number): TypeScriptIssue['type'] {
    if (!ruleId) return 'quality';
    
    // Security-related rules
    if (ruleId.includes('security') || ruleId.includes('xss') || ruleId.includes('injection')) {
      return 'security';
    }
    
    // Performance rules
    if (ruleId.includes('performance') || ruleId.includes('prefer-') || ruleId.includes('no-unnecessary')) {
      return 'performance';
    }
    
    // Style rules
    if (ruleId.includes('style') || ruleId.includes('indent') || ruleId.includes('space') || 
        ruleId.includes('quote') || ruleId.includes('semi')) {
      return 'style';
    }
    
    // Bug-related rules
    if (severity === 2 || ruleId.includes('no-undef') || ruleId.includes('no-unused') || 
        ruleId.includes('no-unreachable')) {
      return 'bug';
    }
    
    return 'quality';
  }

  /**
   * Map ESLint severity based on rule ID and severity level
   * BUG-081 FIX: Not all ESLint errors deserve HIGH severity
   * - TRUE runtime errors (no-undef, no-unreachable) → HIGH
   * - Style/preference errors (no-var-requires, prefer-const) → MEDIUM
   */
  private mapESLintSeverity(severity: number, ruleId?: string): TypeScriptIssue['severity'] {
    // Warnings are always medium
    if (severity === 1) return 'medium';

    // For errors, check if the rule truly deserves HIGH severity
    if (severity === 2) {
      // Rules that ARE true runtime errors or critical bugs - keep HIGH
      const highSeverityRules = [
        'no-undef',           // Undefined variable - will crash at runtime
        'no-unreachable',     // Dead code after return/throw - logic bug
        'no-redeclare',       // Variable already declared
        'no-dupe-keys',       // Duplicate object keys
        'no-func-assign',     // Reassigning function
        'constructor-super',  // Must call super() in constructor
        'no-class-assign',    // Reassigning class
        'no-const-assign',    // Assigning to const
        'no-dupe-args',       // Duplicate function arguments
        'no-import-assign',   // Assigning to imports
        'no-new-symbol',      // new Symbol() instead of Symbol()
        'no-this-before-super', // Using this before super()
        'getter-return',      // Getter must return
        'no-setter-return',   // Setter should not return
      ];

      // Rules that are style/preference - downgrade to MEDIUM
      const mediumSeverityRules = [
        'no-var-requires',    // Style: use import instead of require
        '@typescript-eslint/no-var-requires',
        'no-unused-vars',     // Dead code but won't crash
        '@typescript-eslint/no-unused-vars',
        'no-inferrable-types', // Redundant type annotations
        '@typescript-eslint/no-inferrable-types',
        'prefer-const',       // Style: use const instead of let
        'no-extra-semi',      // Extra semicolons
        'no-empty',           // Empty blocks
        'no-useless-escape',  // Unnecessary escape chars
        'no-useless-constructor', // Empty constructor
        'no-useless-return',  // Unnecessary return
        'prefer-arrow-callback', // Style preference
        'prefer-template',    // Style preference
        'object-shorthand',   // Style preference
      ];

      // Check rule ID for downgrade to MEDIUM
      if (ruleId) {
        // If explicitly in medium list, downgrade
        if (mediumSeverityRules.some(rule => ruleId.includes(rule))) {
          return 'medium';
        }

        // If explicitly in high list, keep high
        if (highSeverityRules.some(rule => ruleId.includes(rule))) {
          return 'high';
        }

        // Default: if it's an error but not in high list, use medium
        // This is safer than marking everything as high
        return 'medium';
      }

      // No rule ID, default to high for errors
      return 'high';
    }

    return 'low';
  }

  /**
   * Map npm audit severity
   */
  private mapNpmAuditSeverity(severity: string): TypeScriptIssue['severity'] {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'critical';
      case 'high':
        return 'high';
      case 'moderate':
      case 'medium':
        return 'medium';
      case 'low':
        return 'low';
      default:
        return 'medium';
    }
  }

  /**
   * Generate summary statistics
   */
  private generateSummary(issues: TypeScriptIssue[]) {
    return {
      total: issues.length,
      critical: issues.filter(i => i.severity === 'critical').length,
      high: issues.filter(i => i.severity === 'high').length,
      medium: issues.filter(i => i.severity === 'medium').length,
      low: issues.filter(i => i.severity === 'low').length
    };
  }
}

export default TypeScriptToolParser;