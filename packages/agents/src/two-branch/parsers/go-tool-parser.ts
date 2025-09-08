/**
 * Go Tool Output Parser
 * Parses real output from Go analysis tools:
 * - go vet (correctness and bugs)
 * - golint/golangci-lint (style and quality)
 * - gosec (security vulnerabilities)
 * - go test (test results and coverage)
 * - go mod (dependency management)
 */

import { exec as execCallback } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const exec = promisify(execCallback);

export interface GoIssue {
  id: string;
  type: 'security' | 'performance' | 'quality' | 'bug' | 'style' | 'test';
  severity: 'critical' | 'high' | 'medium' | 'low';
  file: string;
  line: number;
  column?: number;
  message: string;
  suggestion?: string;
  tool: string;
  category?: string;
  code?: string;
  help?: string;
  linter?: string;
}

export interface GoToolResult {
  tool: string;
  executionTime: number;
  exitCode: number;
  issues: GoIssue[];
  rawOutput?: string;
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  coverage?: {
    percentage: number;
    packages: { [key: string]: number };
  };
}

export class GoToolParser {
  
  /**
   * Run go vet and parse its output
   */
  async runGoVet(repoPath: string, files?: string[]): Promise<GoToolResult> {
    const startTime = Date.now();
    let issues: GoIssue[] = [];
    let exitCode = 0;
    let rawOutput = '';

    try {
      // Run go vet with JSON output for better parsing
      const fileArgs = files && files.length > 0 
        ? files.filter(f => f.endsWith('.go')).join(' ')
        : './...';
      
      const command = `cd ${repoPath} && go vet -json ${fileArgs} 2>&1`;
      
      const { stdout, stderr } = await exec(command, { 
        maxBuffer: 10 * 1024 * 1024,  // 10MB buffer
        timeout: 120000  // 2 minute timeout
      });
      
      rawOutput = stdout + stderr;
      
      // Parse JSON output line by line (go vet outputs JSON lines)
      const lines = rawOutput.split('\n');
      for (const line of lines) {
        if (line.trim() && line.startsWith('{')) {
          try {
            const vetResult = JSON.parse(line);
            const issue = this.parseGoVetMessage(vetResult);
            if (issue) {
              issues.push(issue);
            }
          } catch (e) {
            // Not valid JSON, skip
          }
        }
      }
      
      // If no JSON output, try text parsing
      if (issues.length === 0) {
        issues = this.parseGoVetTextOutput(rawOutput);
      }

    } catch (error: any) {
      exitCode = error.code || 1;
      rawOutput = error.stdout || error.message;
      // Even if go vet fails, try to parse any output
      issues = this.parseGoVetTextOutput(rawOutput);
    }

    const executionTime = (Date.now() - startTime) / 1000;
    
    return {
      tool: 'go-vet',
      executionTime,
      exitCode,
      issues,
      rawOutput: rawOutput.substring(0, 5000),
      summary: this.generateSummary(issues)
    };
  }

  /**
   * Run golangci-lint and parse its output
   */
  async runGolangciLint(repoPath: string, files?: string[]): Promise<GoToolResult> {
    const startTime = Date.now();
    let issues: GoIssue[] = [];
    let exitCode = 0;
    let rawOutput = '';

    try {
      // Run golangci-lint with JSON output
      const fileArgs = files && files.length > 0 
        ? files.filter(f => f.endsWith('.go')).join(' ')
        : './...';
      
      const command = `cd ${repoPath} && golangci-lint run --out-format json ${fileArgs} 2>&1`;
      
      const { stdout, stderr } = await exec(command, { 
        maxBuffer: 10 * 1024 * 1024,
        timeout: 180000  // 3 minutes
      });
      
      rawOutput = stdout + stderr;
      
      // Parse JSON output
      try {
        const lintResult = JSON.parse(stdout);
        if (lintResult.Issues) {
          issues = this.parseGolangciLintIssues(lintResult.Issues);
        }
      } catch (e) {
        // Fallback to text parsing
        issues = this.parseGolangciLintTextOutput(rawOutput);
      }

    } catch (error: any) {
      exitCode = error.code || 1;
      rawOutput = error.stdout || error.message;
      
      // golangci-lint returns non-zero if issues found
      try {
        // Try to extract JSON from output
        const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const lintResult = JSON.parse(jsonMatch[0]);
          if (lintResult.Issues) {
            issues = this.parseGolangciLintIssues(lintResult.Issues);
          }
        } else {
          issues = this.parseGolangciLintTextOutput(rawOutput);
        }
      } catch {
        issues = this.parseGolangciLintTextOutput(rawOutput);
      }
    }

    const executionTime = (Date.now() - startTime) / 1000;
    
    return {
      tool: 'golangci-lint',
      executionTime,
      exitCode,
      issues,
      rawOutput: rawOutput.substring(0, 5000),
      summary: this.generateSummary(issues)
    };
  }

  /**
   * Run gosec and parse its output
   */
  async runGosec(repoPath: string, files?: string[]): Promise<GoToolResult> {
    const startTime = Date.now();
    let issues: GoIssue[] = [];
    let exitCode = 0;
    let rawOutput = '';

    try {
      // Run gosec with JSON output
      const fileArgs = files && files.length > 0 
        ? files.filter(f => f.endsWith('.go')).join(' ')
        : './...';
      
      const command = `cd ${repoPath} && gosec -fmt json ${fileArgs} 2>&1`;
      
      const { stdout, stderr } = await exec(command, { 
        maxBuffer: 5 * 1024 * 1024,
        timeout: 120000
      });
      
      rawOutput = stdout;
      
      // Parse JSON output
      try {
        const gosecResult = JSON.parse(stdout);
        if (gosecResult.Issues) {
          issues = this.parseGosecIssues(gosecResult.Issues);
        }
      } catch (e) {
        // Fallback to text parsing
        issues = this.parseGosecTextOutput(rawOutput);
      }

    } catch (error: any) {
      exitCode = error.code || 1;
      rawOutput = error.stdout || error.message;
      
      // Try to parse any available output
      try {
        const gosecResult = JSON.parse(rawOutput);
        if (gosecResult.Issues) {
          issues = this.parseGosecIssues(gosecResult.Issues);
        }
      } catch {
        issues = this.parseGosecTextOutput(rawOutput);
      }
    }

    const executionTime = (Date.now() - startTime) / 1000;
    
    return {
      tool: 'gosec',
      executionTime,
      exitCode,
      issues,
      rawOutput: rawOutput.substring(0, 5000),
      summary: this.generateSummary(issues)
    };
  }

  /**
   * Run go test with coverage and parse its output
   */
  async runGoTest(repoPath: string): Promise<GoToolResult> {
    const startTime = Date.now();
    let issues: GoIssue[] = [];
    let exitCode = 0;
    let rawOutput = '';
    let coverage = {
      percentage: 0,
      packages: {} as { [key: string]: number }
    };

    try {
      // Run go test with coverage and JSON output
      const command = `cd ${repoPath} && go test -json -cover ./... 2>&1`;
      
      const { stdout, stderr } = await exec(command, { 
        maxBuffer: 10 * 1024 * 1024,
        timeout: 300000  // 5 minutes for tests
      });
      
      rawOutput = stdout + stderr;
      
      // Parse JSON output line by line
      const lines = rawOutput.split('\n');
      const testResults: any[] = [];
      let coverageData: any = {};
      
      for (const line of lines) {
        if (line.trim() && line.startsWith('{')) {
          try {
            const result = JSON.parse(line);
            testResults.push(result);
            
            // Extract coverage info
            if (result.Output && result.Output.includes('coverage:')) {
              const match = result.Output.match(/coverage:\s+([\d.]+)%/);
              if (match) {
                const pkg = result.Package || 'unknown';
                coverageData[pkg] = parseFloat(match[1]);
              }
            }
          } catch (e) {
            // Not valid JSON, skip
          }
        }
      }
      
      // Process test results
      const parsedResults = this.parseGoTestResults(testResults);
      issues = parsedResults.issues;
      
      // Calculate overall coverage
      const coverageValues = Object.values(coverageData).filter((val): val is number => typeof val === 'number');
      if (coverageValues.length > 0) {
        coverage.percentage = coverageValues.reduce((a: number, b: number) => a + b, 0) / coverageValues.length;
        coverage.packages = coverageData;
      }
      
      // If no JSON output, try text parsing
      if (issues.length === 0 && testResults.length === 0) {
        issues = this.parseGoTestTextOutput(rawOutput);
      }

    } catch (error: any) {
      exitCode = error.code || 1;
      rawOutput = error.stdout || error.message;
      issues = this.parseGoTestTextOutput(rawOutput);
    }

    const executionTime = (Date.now() - startTime) / 1000;
    
    return {
      tool: 'go-test',
      executionTime,
      exitCode,
      issues,
      rawOutput: rawOutput.substring(0, 5000),
      summary: this.generateSummary(issues),
      coverage
    };
  }

  /**
   * Run go mod and check for outdated dependencies
   */
  async runGoMod(repoPath: string): Promise<GoToolResult> {
    const startTime = Date.now();
    let issues: GoIssue[] = [];
    let exitCode = 0;
    let rawOutput = '';

    try {
      // First, run go list to get outdated modules
      const command = `cd ${repoPath} && go list -u -m -json all 2>&1`;
      
      const { stdout, stderr } = await exec(command, { 
        maxBuffer: 5 * 1024 * 1024,
        timeout: 60000
      });
      
      rawOutput = stdout + stderr;
      
      // Parse JSON output line by line
      const lines = rawOutput.split('\n');
      for (const line of lines) {
        if (line.trim() && line.startsWith('{')) {
          try {
            const module = JSON.parse(line);
            if (module.Update) {
              issues.push({
                id: `go-mod-${module.Path}`,
                type: 'quality',
                severity: 'low',
                file: 'go.mod',
                line: 1,
                message: `Outdated dependency: ${module.Path} ${module.Version} -> ${module.Update.Version}`,
                suggestion: `Update ${module.Path} to ${module.Update.Version}`,
                tool: 'go-mod',
                category: 'dependency'
              });
            }
          } catch (e) {
            // Not valid JSON, skip
          }
        }
      }
      
      // Also check for vulnerabilities using go mod audit (if available)
      try {
        const auditCommand = `cd ${repoPath} && go list -m -json all | nancy sleuth 2>&1`;
        const auditResult = await exec(auditCommand, { 
          maxBuffer: 5 * 1024 * 1024,
          timeout: 60000
        }).catch(() => null);
        
        if (auditResult) {
          const vulnIssues = this.parseGoModAuditOutput(auditResult.stdout);
          issues.push(...vulnIssues);
        }
      } catch {
        // Nancy not installed, skip vulnerability check
      }

    } catch (error: any) {
      exitCode = error.code || 1;
      rawOutput = error.stdout || error.message;
      issues = this.parseGoModTextOutput(rawOutput);
    }

    const executionTime = (Date.now() - startTime) / 1000;
    
    return {
      tool: 'go-mod',
      executionTime,
      exitCode,
      issues,
      rawOutput: rawOutput.substring(0, 5000),
      summary: this.generateSummary(issues)
    };
  }

  /**
   * Parse go vet JSON message
   */
  private parseGoVetMessage(message: any): GoIssue | null {
    if (!message || !message.Message) {
      return null;
    }
    
    // Extract file and position from message
    const posMatch = message.Message.match(/^(.+?):(\d+):(\d+):\s+(.+)$/);
    if (!posMatch) {
      return null;
    }
    
    return {
      id: `go-vet-${Date.now()}-${Math.random()}`,
      type: 'bug',
      severity: 'high',
      file: posMatch[1],
      line: parseInt(posMatch[2]),
      column: parseInt(posMatch[3]),
      message: posMatch[4],
      tool: 'go-vet',
      category: 'correctness'
    };
  }

  /**
   * Parse go vet text output (fallback)
   */
  private parseGoVetTextOutput(output: string): GoIssue[] {
    const issues: GoIssue[] = [];
    const lines = output.split('\n');
    
    // Pattern: file.go:line:column: message
    const vetRegex = /^(.+?):(\d+):(\d+):\s+(.+)$/;
    
    for (const line of lines) {
      const match = line.match(vetRegex);
      if (match) {
        issues.push({
          id: `go-vet-${Date.now()}-${issues.length}`,
          type: 'bug',
          severity: 'high',
          file: match[1],
          line: parseInt(match[2]),
          column: parseInt(match[3]),
          message: match[4],
          tool: 'go-vet',
          category: 'correctness'
        });
      }
    }
    
    return issues;
  }

  /**
   * Parse golangci-lint issues
   */
  private parseGolangciLintIssues(lintIssues: any[]): GoIssue[] {
    const issues: GoIssue[] = [];
    
    for (const issue of lintIssues) {
      issues.push({
        id: `golangci-${issue.FromLinter}-${issue.Pos?.Filename}-${issue.Pos?.Line}`,
        type: this.mapGolangciLintType(issue.FromLinter),
        severity: this.mapGolangciLintSeverity(issue.Severity || issue.FromLinter),
        file: issue.Pos?.Filename || issue.FilePath || 'unknown',
        line: issue.Pos?.Line || issue.Line || 0,
        column: issue.Pos?.Column || issue.Column,
        message: issue.Text,
        tool: 'golangci-lint',
        linter: issue.FromLinter,
        category: issue.FromLinter,
        code: issue.Code
      });
    }
    
    return issues;
  }

  /**
   * Parse golangci-lint text output (fallback)
   */
  private parseGolangciLintTextOutput(output: string): GoIssue[] {
    const issues: GoIssue[] = [];
    const lines = output.split('\n');
    
    // Pattern: file.go:line:column: message (linter)
    const lintRegex = /^(.+?):(\d+):(\d+):\s+(.+?)\s+\((.+?)\)$/;
    
    for (const line of lines) {
      const match = line.match(lintRegex);
      if (match) {
        issues.push({
          id: `golangci-${match[5]}-${match[1]}-${match[2]}`,
          type: this.mapGolangciLintType(match[5]),
          severity: this.mapGolangciLintSeverity(match[5]),
          file: match[1],
          line: parseInt(match[2]),
          column: parseInt(match[3]),
          message: match[4],
          tool: 'golangci-lint',
          linter: match[5],
          category: match[5]
        });
      }
    }
    
    return issues;
  }

  /**
   * Parse gosec issues
   */
  private parseGosecIssues(gosecIssues: any[]): GoIssue[] {
    const issues: GoIssue[] = [];
    
    for (const issue of gosecIssues) {
      issues.push({
        id: `gosec-${issue.rule_id}-${issue.file}-${issue.line}`,
        type: 'security',
        severity: this.mapGosecSeverity(issue.severity),
        file: issue.file,
        line: parseInt(issue.line),
        column: parseInt(issue.column),
        message: issue.details,
        tool: 'gosec',
        category: issue.rule_id,
        code: issue.code,
        help: issue.cwe?.url
      });
    }
    
    return issues;
  }

  /**
   * Parse gosec text output (fallback)
   */
  private parseGosecTextOutput(output: string): GoIssue[] {
    const issues: GoIssue[] = [];
    const lines = output.split('\n');
    
    // Pattern for gosec output
    const issueRegex = /^\[(.+?):(\d+)\]\s+-\s+(.+?)\s+\(CWE-(\d+)\)/;
    
    for (const line of lines) {
      const match = line.match(issueRegex);
      if (match) {
        issues.push({
          id: `gosec-CWE${match[4]}-${match[1]}-${match[2]}`,
          type: 'security',
          severity: 'high',
          file: match[1],
          line: parseInt(match[2]),
          message: match[3],
          tool: 'gosec',
          category: `CWE-${match[4]}`
        });
      }
    }
    
    return issues;
  }

  /**
   * Parse go test results
   */
  private parseGoTestResults(results: any[]): { issues: GoIssue[] } {
    const issues: GoIssue[] = [];
    const failedTests = new Map<string, any>();
    
    for (const result of results) {
      if (result.Action === 'fail' && result.Test) {
        const key = `${result.Package}-${result.Test}`;
        if (!failedTests.has(key)) {
          failedTests.set(key, result);
        }
      }
      
      // Capture test output for failed tests
      if (result.Action === 'output' && result.Test && result.Output) {
        const key = `${result.Package}-${result.Test}`;
        if (failedTests.has(key)) {
          const failure = failedTests.get(key);
          failure.output = (failure.output || '') + result.Output;
        }
      }
    }
    
    // Convert failed tests to issues
    for (const [key, failure] of failedTests) {
      // Try to extract file and line from output
      let file = failure.Package || 'unknown';
      let line = 1;
      
      if (failure.output) {
        const fileMatch = failure.output.match(/(.+?_test\.go):(\d+):/);
        if (fileMatch) {
          file = fileMatch[1];
          line = parseInt(fileMatch[2]);
        }
      }
      
      issues.push({
        id: `go-test-${key}`,
        type: 'test',
        severity: 'high',
        file,
        line,
        message: `Test failed: ${failure.Test}`,
        tool: 'go-test',
        category: 'test-failure',
        help: failure.output?.substring(0, 500)
      });
    }
    
    return { issues };
  }

  /**
   * Parse go test text output (fallback)
   */
  private parseGoTestTextOutput(output: string): GoIssue[] {
    const issues: GoIssue[] = [];
    const lines = output.split('\n');
    
    // Pattern for failed tests
    const failRegex = /^---\s+FAIL:\s+(.+?)\s+\([\d.]+s\)$/;
    const fileRegex = /^\s+(.+?_test\.go):(\d+):/;
    
    let currentTest: Partial<GoIssue> | null = null;
    
    for (const line of lines) {
      const failMatch = line.match(failRegex);
      if (failMatch) {
        if (currentTest && currentTest.file) {
          issues.push(currentTest as GoIssue);
        }
        
        currentTest = {
          id: `go-test-${failMatch[1]}`,
          type: 'test',
          severity: 'high',
          message: `Test failed: ${failMatch[1]}`,
          tool: 'go-test',
          category: 'test-failure',
          file: 'unknown',
          line: 1
        };
      }
      
      const fileMatch = line.match(fileRegex);
      if (fileMatch && currentTest) {
        currentTest.file = fileMatch[1];
        currentTest.line = parseInt(fileMatch[2]);
      }
    }
    
    if (currentTest && currentTest.file) {
      issues.push(currentTest as GoIssue);
    }
    
    // Look for coverage warnings
    const coverageRegex = /^(.+?)\s+coverage:\s+([\d.]+)%/;
    
    for (const line of lines) {
      const match = line.match(coverageRegex);
      if (match) {
        const coverage = parseFloat(match[2]);
        if (coverage < 80) {
          issues.push({
            id: `go-coverage-${match[1]}`,
            type: 'test',
            severity: coverage < 50 ? 'high' : 'medium',
            file: match[1],
            line: 1,
            message: `Low test coverage: ${coverage}%`,
            suggestion: 'Add more tests to improve coverage',
            tool: 'go-test',
            category: 'coverage'
          });
        }
      }
    }
    
    return issues;
  }

  /**
   * Parse go mod text output (fallback)
   */
  private parseGoModTextOutput(output: string): GoIssue[] {
    const issues: GoIssue[] = [];
    const lines = output.split('\n');
    
    // Look for update available patterns
    const updateRegex = /^(.+?)\s+v([\d.]+)\s+\[v([\d.]+)\]$/;
    
    for (const line of lines) {
      const match = line.match(updateRegex);
      if (match) {
        issues.push({
          id: `go-mod-${match[1]}`,
          type: 'quality',
          severity: 'low',
          file: 'go.mod',
          line: 1,
          message: `Outdated dependency: ${match[1]} v${match[2]} -> v${match[3]}`,
          suggestion: `Update ${match[1]} to v${match[3]}`,
          tool: 'go-mod',
          category: 'dependency'
        });
      }
    }
    
    return issues;
  }

  /**
   * Parse go mod audit output (Nancy)
   */
  private parseGoModAuditOutput(output: string): GoIssue[] {
    const issues: GoIssue[] = [];
    const lines = output.split('\n');
    
    // Look for vulnerability patterns
    const vulnRegex = /^(.+?)\s+(.+?)\s+CVE-(\d{4}-\d+)/;
    
    for (const line of lines) {
      const match = line.match(vulnRegex);
      if (match) {
        issues.push({
          id: `go-mod-CVE-${match[3]}`,
          type: 'security',
          severity: 'high',
          file: 'go.mod',
          line: 1,
          message: `Security vulnerability CVE-${match[3]} in ${match[1]} ${match[2]}`,
          tool: 'go-mod',
          category: 'vulnerability'
        });
      }
    }
    
    return issues;
  }

  /**
   * Map golangci-lint linter to issue type
   */
  private mapGolangciLintType(linter: string): GoIssue['type'] {
    if (!linter) return 'quality';
    
    const lowerLinter = linter.toLowerCase();
    
    // Security linters
    if (lowerLinter.includes('sec') || lowerLinter === 'gosec') {
      return 'security';
    }
    
    // Performance linters
    if (lowerLinter.includes('perf') || lowerLinter === 'prealloc' || 
        lowerLinter === 'maligned') {
      return 'performance';
    }
    
    // Style linters
    if (lowerLinter === 'gofmt' || lowerLinter === 'goimports' || 
        lowerLinter === 'whitespace' || lowerLinter === 'misspell') {
      return 'style';
    }
    
    // Bug linters
    if (lowerLinter === 'errcheck' || lowerLinter === 'ineffassign' || 
        lowerLinter === 'staticcheck' || lowerLinter === 'govet') {
      return 'bug';
    }
    
    return 'quality';
  }

  /**
   * Map golangci-lint severity
   */
  private mapGolangciLintSeverity(linter: string): GoIssue['severity'] {
    if (!linter) return 'medium';
    
    const lowerLinter = linter.toLowerCase();
    
    // High severity linters
    if (lowerLinter === 'gosec' || lowerLinter === 'errcheck' || 
        lowerLinter === 'staticcheck' || lowerLinter === 'govet') {
      return 'high';
    }
    
    // Low severity linters
    if (lowerLinter === 'gofmt' || lowerLinter === 'goimports' || 
        lowerLinter === 'whitespace' || lowerLinter === 'misspell') {
      return 'low';
    }
    
    return 'medium';
  }

  /**
   * Map gosec severity
   */
  private mapGosecSeverity(severity: string): GoIssue['severity'] {
    switch (severity?.toLowerCase()) {
      case 'high':
        return 'critical';
      case 'medium':
        return 'high';
      case 'low':
        return 'medium';
      default:
        return 'high';
    }
  }

  /**
   * Generate summary statistics
   */
  private generateSummary(issues: GoIssue[]) {
    return {
      total: issues.length,
      critical: issues.filter(i => i.severity === 'critical').length,
      high: issues.filter(i => i.severity === 'high').length,
      medium: issues.filter(i => i.severity === 'medium').length,
      low: issues.filter(i => i.severity === 'low').length
    };
  }
}

export default GoToolParser;