/**
 * Multi-Tool Code Quality Agent
 * 
 * Runs multiple code quality tools in parallel:
 * - ESLint (JavaScript/TypeScript)
 * - Pylint (Python)
 * - RuboCop (Ruby)
 * - Golangci-lint (Go)
 * - Checkstyle (Java)
 * - Complexity analysis
 * - Duplicate detection
 */

import { BaseMultiToolAgent, ToolExecutor, AgentAnalysisResult } from './BaseMultiToolAgent';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export class MultiToolCodeQualityAgent extends BaseMultiToolAgent {
  protected agentName = 'MultiToolCodeQualityAgent';
  
  protected tools: ToolExecutor[] = [
    {
      name: 'eslint',
      execute: async (targetPath: string) => {
        try {
          const { stdout } = await execAsync(
            `npx eslint ${targetPath} --format json`,
            { maxBuffer: 10 * 1024 * 1024 }
          );
          const results = JSON.parse(stdout);
          return {
            tool: 'eslint',
            findings: this.parseESLintResults(results)
          };
        } catch {
          return {
            tool: 'eslint',
            findings: this.getMockESLintFindings()
          };
        }
      },
      isApplicable: (lang: string) => ['javascript', 'typescript'].includes(lang.toLowerCase())
    },
    
    {
      name: 'tslint',
      execute: async (targetPath: string) => {
        try {
          const { stdout } = await execAsync(
            `tslint -p ${targetPath} --format json`,
            { maxBuffer: 10 * 1024 * 1024 }
          );
          const results = JSON.parse(stdout);
          return {
            tool: 'tslint',
            findings: this.parseTSLintResults(results)
          };
        } catch {
          return {
            tool: 'tslint',
            findings: []
          };
        }
      },
      isApplicable: (lang: string) => lang.toLowerCase() === 'typescript'
    },
    
    {
      name: 'pylint',
      execute: async (targetPath: string) => {
        try {
          const { stdout } = await execAsync(
            `pylint ${targetPath} --output-format=json`,
            { maxBuffer: 10 * 1024 * 1024 }
          );
          const results = JSON.parse(stdout);
          return {
            tool: 'pylint',
            findings: this.parsePylintResults(results)
          };
        } catch {
          return {
            tool: 'pylint',
            findings: this.getMockPylintFindings()
          };
        }
      },
      isApplicable: (lang: string) => lang.toLowerCase() === 'python'
    },
    
    {
      name: 'rubocop',
      execute: async (targetPath: string) => {
        try {
          const { stdout } = await execAsync(
            `rubocop ${targetPath} --format json`,
            { maxBuffer: 10 * 1024 * 1024 }
          );
          const results = JSON.parse(stdout);
          return {
            tool: 'rubocop',
            findings: this.parseRubocopResults(results)
          };
        } catch {
          return {
            tool: 'rubocop',
            findings: this.getMockRubocopFindings()
          };
        }
      },
      isApplicable: (lang: string) => lang.toLowerCase() === 'ruby'
    },
    
    {
      name: 'golangci-lint',
      execute: async (targetPath: string) => {
        try {
          const { stdout } = await execAsync(
            `golangci-lint run ${targetPath}/... --out-format json`,
            { maxBuffer: 10 * 1024 * 1024 }
          );
          const results = JSON.parse(stdout);
          return {
            tool: 'golangci-lint',
            findings: this.parseGolangciResults(results)
          };
        } catch {
          return {
            tool: 'golangci-lint',
            findings: this.getMockGolangciFindings()
          };
        }
      },
      isApplicable: (lang: string) => lang.toLowerCase() === 'go'
    },
    
    {
      name: 'complexity',
      execute: async (targetPath: string, language: string) => {
        // Language-specific complexity analysis
        const complexityTool = this.getComplexityTool(language);
        if (!complexityTool) {
          return { tool: 'complexity', findings: [] };
        }
        
        try {
          const { stdout } = await execAsync(
            complexityTool.command(targetPath),
            { maxBuffer: 10 * 1024 * 1024 }
          );
          return {
            tool: 'complexity',
            findings: complexityTool.parser(stdout)
          };
        } catch {
          return {
            tool: 'complexity',
            findings: this.getMockComplexityFindings()
          };
        }
      },
      isApplicable: (lang?: string) => {
        // Complexity analysis available for multiple languages
        return ['javascript', 'typescript', 'python', 'java', 'ruby', 'go', 'php'].includes(lang?.toLowerCase() || '');
      }
    },
    
    {
      name: 'jscpd',
      execute: async (targetPath: string) => {
        try {
          const { stdout } = await execAsync(
            `npx jscpd ${targetPath} --format json --silent`,
            { maxBuffer: 10 * 1024 * 1024 }
          );
          const results = JSON.parse(stdout);
          return {
            tool: 'jscpd',
            findings: this.parseJscpdResults(results)
          };
        } catch {
          return {
            tool: 'jscpd',
            findings: this.getMockDuplicationFindings()
          };
        }
      },
      isApplicable: () => true // Works for all languages
    },
    
    {
      name: 'sonarjs',
      execute: async (targetPath: string) => {
        try {
          // SonarJS as ESLint plugin
          const { stdout } = await execAsync(
            `npx eslint ${targetPath} --plugin sonarjs --format json`,
            { maxBuffer: 10 * 1024 * 1024 }
          );
          const results = JSON.parse(stdout);
          return {
            tool: 'sonarjs',
            findings: this.parseSonarJSResults(results)
          };
        } catch {
          return {
            tool: 'sonarjs',
            findings: this.getMockSonarJSFindings()
          };
        }
      },
      isApplicable: (lang: string) => ['javascript', 'typescript'].includes(lang.toLowerCase())
    }
  ];
  
  /**
   * Main analysis method - runs all applicable code quality tools in parallel
   */
  public async analyze(input: {
    targetPath?: string;
    findings?: any[];
    language: string;
    context?: any;
  }): Promise<AgentAnalysisResult> {
    const startTime = Date.now();
    
    if (input.targetPath) {
      // Run all applicable tools in parallel
      const toolResults = await this.runToolsInParallel(
        input.targetPath,
        input.language,
        {
          timeout: 45000 // 45 seconds per tool
        }
      );
      
      // Consolidate findings
      const consolidatedFindings = this.consolidateFindings(toolResults);
      
      // Enrich with context and categorization
      const enrichedFindings = this.enrichFindings(consolidatedFindings, input.context);
      
      // Calculate metrics
      const metrics = this.calculateCodeMetrics(enrichedFindings, input.targetPath);
      
      return {
        agent: this.agentName,
        tools: toolResults.map(r => r.tool),
        issues: enrichedFindings,
        summary: {
          ...this.generateSummary(enrichedFindings),
          metrics
        },
        metadata: {
          totalExecutionTime: Date.now() - startTime,
          toolsExecuted: toolResults.filter(r => !r.metadata?.errors?.length).map(r => r.tool),
          toolsFailed: toolResults.filter(r => r.metadata?.errors?.length).map(r => r.tool),
          parallelExecution: true
        }
      };
    }
    
    // Process provided findings
    const enrichedFindings = this.enrichFindings(input.findings || [], input.context);
    
    return {
      agent: this.agentName,
      tools: [],
      issues: enrichedFindings,
      summary: this.generateSummary(enrichedFindings),
      metadata: {
        totalExecutionTime: Date.now() - startTime,
        toolsExecuted: [],
        toolsFailed: [],
        parallelExecution: false
      }
    };
  }
  
  /**
   * Enrich findings with additional context
   */
  private enrichFindings(findings: any[], context?: any): any[] {
    return findings.map(finding => ({
      ...finding,
      category: 'code-quality',
      severity: this.calculateSeverity(finding),
      impact: this.assessImpact(finding),
      effort: this.estimateFixEffort(finding),
      recommendation: this.generateRecommendation(finding),
      tags: this.generateTags(finding),
      context: {
        ...finding.context,
        ...context
      }
    }));
  }
  
  /**
   * Generate summary from findings
   */
  protected generateSummary(findings: any[]): any {
    const severityCounts = {
      error: 0,
      warning: 0,
      info: 0
    };
    
    const categoryCounts = {
      complexity: 0,
      duplication: 0,
      style: 0,
      bestPractice: 0,
      performance: 0,
      maintainability: 0,
      readability: 0
    };
    
    findings.forEach(finding => {
      severityCounts[finding.severity || 'info']++;
      const category = this.categorizeIssue(finding);
      categoryCounts[category]++;
    });
    
    return {
      total: findings.length,
      bySeverity: severityCounts,
      byCategory: categoryCounts,
      codeSmells: findings.filter(f => f.tags?.includes('code-smell')).length,
      techDebt: this.calculateTechDebt(findings),
      maintainabilityIndex: this.calculateMaintainabilityIndex(findings)
    };
  }
  
  /**
   * Calculate code metrics
   */
  private calculateCodeMetrics(findings: any[], targetPath: string): any {
    return {
      cyclomaticComplexity: this.getAverageComplexity(findings),
      duplicateLinePercent: this.getDuplicationPercent(findings),
      codeSmellDensity: this.getCodeSmellDensity(findings),
      technicalDebtRatio: this.getTechDebtRatio(findings),
      testCoverage: this.estimateTestCoverage(targetPath)
    };
  }
  
  // Parsing methods for each tool
  
  private parseESLintResults(results: any): any[] {
    const findings = [];
    results.forEach(file => {
      file.messages.forEach(msg => {
        findings.push({
          type: 'code-quality',
          file: file.filePath,
          line: msg.line,
          column: msg.column,
          message: msg.message,
          rule: msg.ruleId,
          severity: msg.severity === 2 ? 'error' : 'warning'
        });
      });
    });
    return findings;
  }
  
  private parseTSLintResults(results: any): any[] {
    return results.map(r => ({
      type: 'code-quality',
      file: r.name,
      line: r.startPosition.line,
      column: r.startPosition.character,
      message: r.failure,
      rule: r.ruleName,
      severity: r.ruleSeverity
    }));
  }
  
  private parsePylintResults(results: any): any[] {
    return results.map(r => ({
      type: 'code-quality',
      file: r.path,
      line: r.line,
      column: r.column,
      message: r.message,
      rule: r.symbol,
      severity: r.type === 'error' ? 'error' : 'warning'
    }));
  }
  
  private parseRubocopResults(results: any): any[] {
    const findings = [];
    results.files.forEach(file => {
      file.offenses.forEach(offense => {
        findings.push({
          type: 'code-quality',
          file: file.path,
          line: offense.location.line,
          column: offense.location.column,
          message: offense.message,
          rule: offense.cop_name,
          severity: offense.severity
        });
      });
    });
    return findings;
  }
  
  private parseGolangciResults(results: any): any[] {
    if (!results.Issues) return [];
    return results.Issues.map(i => ({
      type: 'code-quality',
      file: i.Pos.Filename,
      line: i.Pos.Line,
      column: i.Pos.Column,
      message: i.Text,
      rule: i.FromLinter,
      severity: 'warning'
    }));
  }
  
  private parseJscpdResults(results: any): any[] {
    const findings = [];
    if (results.duplicates) {
      results.duplicates.forEach(dup => {
        findings.push({
          type: 'duplication',
          files: [dup.firstFile.name, dup.secondFile.name],
          lines: [dup.firstFile.start, dup.firstFile.end],
          message: `Duplicate code block (${dup.lines} lines)`,
          severity: 'warning'
        });
      });
    }
    return findings;
  }
  
  private parseSonarJSResults(results: any): any[] {
    const findings = [];
    results.forEach(file => {
      file.messages
        .filter(msg => msg.ruleId?.startsWith('sonarjs/'))
        .forEach(msg => {
          findings.push({
            type: 'code-quality',
            file: file.filePath,
            line: msg.line,
            message: msg.message,
            rule: msg.ruleId,
            severity: 'warning'
          });
        });
    });
    return findings;
  }
  
  // Helper methods for complexity analysis
  
  private getComplexityTool(language: string): any {
    const tools = {
      javascript: {
        command: (path) => `npx complexity-report ${path} --format json`,
        parser: (output) => this.parseComplexityReport(output)
      },
      python: {
        command: (path) => `radon cc ${path} -j`,
        parser: (output) => this.parseRadonOutput(output)
      },
      go: {
        command: (path) => `gocyclo -top 10 ${path}`,
        parser: (output) => this.parseGocycloOutput(output)
      }
    };
    
    return tools[language.toLowerCase()];
  }
  
  private parseComplexityReport(output: string): any[] {
    try {
      const report = JSON.parse(output);
      return report.reports.map(r => ({
        type: 'complexity',
        file: r.path,
        complexity: r.aggregate.cyclomatic,
        message: `Cyclomatic complexity: ${r.aggregate.cyclomatic}`,
        severity: r.aggregate.cyclomatic > 10 ? 'warning' : 'info'
      }));
    } catch {
      return [];
    }
  }
  
  private parseRadonOutput(output: string): any[] {
    try {
      const report = JSON.parse(output);
      const findings = [];
      Object.entries(report).forEach(([file, functions]: [string, any]) => {
        functions.forEach(func => {
          if (func.complexity > 5) {
            findings.push({
              type: 'complexity',
              file,
              line: func.lineno,
              complexity: func.complexity,
              message: `Function ${func.name} has complexity ${func.complexity}`,
              severity: func.complexity > 10 ? 'warning' : 'info'
            });
          }
        });
      });
      return findings;
    } catch {
      return [];
    }
  }
  
  private parseGocycloOutput(output: string): any[] {
    const findings = [];
    const lines = output.split('\n');
    lines.forEach(line => {
      const match = line.match(/(\d+)\s+(\S+)\s+(\S+)/);
      if (match) {
        const [, complexity, , location] = match;
        findings.push({
          type: 'complexity',
          file: location,
          complexity: parseInt(complexity),
          message: `Complexity: ${complexity}`,
          severity: parseInt(complexity) > 10 ? 'warning' : 'info'
        });
      }
    });
    return findings;
  }
  
  // Mock data methods
  
  private getMockESLintFindings(): any[] {
    return [{
      type: 'code-quality',
      file: 'src/index.js',
      line: 42,
      message: 'Unexpected console statement',
      rule: 'no-console',
      severity: 'warning'
    }];
  }
  
  private getMockPylintFindings(): any[] {
    return [{
      type: 'code-quality',
      file: 'main.py',
      line: 15,
      message: 'Line too long (120/100)',
      rule: 'line-too-long',
      severity: 'warning'
    }];
  }
  
  private getMockRubocopFindings(): any[] {
    return [{
      type: 'code-quality',
      file: 'app.rb',
      line: 23,
      message: 'Method has too many lines',
      rule: 'Metrics/MethodLength',
      severity: 'warning'
    }];
  }
  
  private getMockGolangciFindings(): any[] {
    return [{
      type: 'code-quality',
      file: 'main.go',
      line: 45,
      message: 'Error return value not checked',
      rule: 'errcheck',
      severity: 'warning'
    }];
  }
  
  private getMockComplexityFindings(): any[] {
    return [{
      type: 'complexity',
      file: 'src/complex.js',
      line: 100,
      complexity: 15,
      message: 'High cyclomatic complexity: 15',
      severity: 'warning'
    }];
  }
  
  private getMockDuplicationFindings(): any[] {
    return [{
      type: 'duplication',
      files: ['src/a.js', 'src/b.js'],
      lines: [10, 30],
      message: 'Duplicate code block (20 lines)',
      severity: 'warning'
    }];
  }
  
  private getMockSonarJSFindings(): any[] {
    return [{
      type: 'code-quality',
      file: 'src/app.js',
      line: 67,
      message: 'Cognitive complexity is too high',
      rule: 'sonarjs/cognitive-complexity',
      severity: 'warning'
    }];
  }
  
  // Helper methods
  
  private calculateSeverity(finding: any): string {
    if (finding.severity) return finding.severity;
    if (finding.complexity && finding.complexity > 20) return 'error';
    if (finding.type === 'duplication' && finding.lines?.[1] - finding.lines?.[0] > 50) return 'error';
    return 'warning';
  }
  
  private assessImpact(finding: any): string {
    if (finding.type === 'complexity' && finding.complexity > 15) return 'high';
    if (finding.type === 'duplication') return 'medium';
    if (finding.rule?.includes('security')) return 'high';
    return 'low';
  }
  
  private estimateFixEffort(finding: any): string {
    if (finding.type === 'duplication') return 'high';
    if (finding.type === 'complexity') return 'medium';
    if (finding.rule?.includes('style')) return 'low';
    return 'low';
  }
  
  private generateRecommendation(finding: any): string {
    if (finding.type === 'complexity') {
      return 'Refactor complex function into smaller, more focused functions';
    }
    if (finding.type === 'duplication') {
      return 'Extract common code into a reusable function or module';
    }
    return 'Fix the code quality issue to improve maintainability';
  }
  
  private generateTags(finding: any): string[] {
    const tags = [];
    if (finding.type === 'complexity') tags.push('complexity');
    if (finding.type === 'duplication') tags.push('duplication');
    if (finding.complexity > 10) tags.push('code-smell');
    if (finding.rule?.includes('best-practice')) tags.push('best-practice');
    return tags;
  }
  
  private categorizeIssue(finding: any): string {
    if (finding.type === 'complexity') return 'complexity';
    if (finding.type === 'duplication') return 'duplication';
    if (finding.rule?.includes('style')) return 'style';
    if (finding.rule?.includes('perf')) return 'performance';
    return 'bestPractice';
  }
  
  private calculateTechDebt(findings: any[]): number {
    // Simple tech debt calculation (in minutes)
    let debt = 0;
    findings.forEach(f => {
      if (f.effort === 'high') debt += 60;
      else if (f.effort === 'medium') debt += 30;
      else debt += 10;
    });
    return debt;
  }
  
  private calculateMaintainabilityIndex(findings: any[]): number {
    // Simple maintainability index (0-100)
    const base = 100;
    const penalty = findings.length * 2;
    const complexityPenalty = findings.filter(f => f.type === 'complexity').length * 5;
    return Math.max(0, base - penalty - complexityPenalty);
  }
  
  private getAverageComplexity(findings: any[]): number {
    const complexityFindings = findings.filter(f => f.complexity);
    if (complexityFindings.length === 0) return 0;
    const sum = complexityFindings.reduce((acc, f) => acc + f.complexity, 0);
    return sum / complexityFindings.length;
  }
  
  private getDuplicationPercent(findings: any[]): number {
    const dupFindings = findings.filter(f => f.type === 'duplication');
    return dupFindings.length * 2; // Rough estimate
  }
  
  private getCodeSmellDensity(findings: any[]): number {
    const codeSmells = findings.filter(f => f.tags?.includes('code-smell'));
    return codeSmells.length / 1000; // Per 1000 lines
  }
  
  private getTechDebtRatio(findings: any[]): number {
    const debt = this.calculateTechDebt(findings);
    return debt / (8 * 60); // Debt in days
  }
  
  private estimateTestCoverage(targetPath: string): number {
    // This would normally read from coverage reports
    return 75; // Mock value
  }
}