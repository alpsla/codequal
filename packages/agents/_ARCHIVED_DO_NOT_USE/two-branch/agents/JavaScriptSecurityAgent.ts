/**
 * JavaScript/TypeScript Security Agent
 * Implements security and code quality analysis for JavaScript and TypeScript projects
 */

import { BaseSecurityAgent } from './BaseSecurityAgent';
import { FileInfo, SecurityIssue } from '../interfaces/agent-interfaces';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface JSSecurityTool {
  name: string;
  command: string;
  available?: boolean;
  parseOutput: (output: string, files: FileInfo[]) => SecurityIssue[];
}

export class JavaScriptSecurityAgent extends BaseSecurityAgent {
  private tools: JSSecurityTool[] = [
    {
      name: 'npm-audit',
      command: 'npm audit --json',
      parseOutput: this.parseNpmAuditOutput.bind(this)
    },
    {
      name: 'eslint',
      command: 'eslint . --format json',
      parseOutput: this.parseEslintOutput.bind(this)
    },
    {
      name: 'semgrep',
      command: 'semgrep --config=auto --json',
      parseOutput: this.parseSemgrepOutput.bind(this)
    },
    {
      name: 'jshint',
      command: 'jshint . --reporter=json',
      parseOutput: this.parseJshintOutput.bind(this)
    },
    {
      name: 'retire',
      command: 'retire --outputformat json',
      parseOutput: this.parseRetireOutput.bind(this)
    }
  ];

  constructor(monitoring?: any) {
    super('JavaScriptSecurityAgent', monitoring);
    this.checkToolAvailability();
  }

  /**
   * Check which tools are available
   */
  private checkToolAvailability(): void {
    this.tools.forEach(tool => {
      try {
        if (tool.name === 'npm-audit') {
          // npm audit is built into npm
          execSync('npm --version', { stdio: 'ignore' });
          tool.available = true;
        } else {
          execSync(`which ${tool.name}`, { stdio: 'ignore' });
          tool.available = true;
        }
      } catch {
        tool.available = false;
      }
    });
  }

  /**
   * Get list of available tools for reporting
   */
  protected async getAvailableTools(): Promise<string[]> {
    return this.tools.filter(t => t.available).map(t => t.name);
  }

  /**
   * Analyze JavaScript/TypeScript files for security issues
   */
  async analyzeBranch(branch: string, files: FileInfo[]): Promise<SecurityIssue[]> {
    const jsFiles = files.filter(f => 
      f.path.endsWith('.js') || 
      f.path.endsWith('.jsx') ||
      f.path.endsWith('.ts') ||
      f.path.endsWith('.tsx') ||
      f.path.endsWith('.mjs') ||
      f.path.endsWith('.cjs')
    );

    if (jsFiles.length === 0) {
      return [];
    }

    const issues: SecurityIssue[] = [];

    // Run available tools
    for (const tool of this.tools) {
      if (!tool.available) {
        console.log(`   Tool ${tool.name} not available, skipping...`);
        continue;
      }

      try {
        console.log(`   Running ${tool.name}...`);
        const output = await this.executeTool(tool.command, jsFiles);
        const toolIssues = tool.parseOutput(output, jsFiles);
        issues.push(...toolIssues);
        console.log(`   ${tool.name} found ${toolIssues.length} issues`);
      } catch (error) {
        console.error(`   Error running ${tool.name}:`, error.message);
      }
    }

    // Add JavaScript-specific security checks
    issues.push(...this.performJavaScriptSpecificChecks(jsFiles));

    return this.deduplicateIssues(issues);
  }

  /**
   * Execute tool command (override for real execution)
   */
  protected async executeTool(command: string, files: FileInfo[]): Promise<string> {
    // For testing, return mock data for available tools
    if (command.includes('npm audit')) {
      return this.getMockNpmAuditData();
    }
    if (command.includes('eslint')) {
      return this.getMockEslintData();
    }
    if (command.includes('semgrep')) {
      return this.getMockSemgrepData();
    }
    return '{}';
  }

  /**
   * Parse npm audit output
   */
  private parseNpmAuditOutput(output: string, files: FileInfo[]): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    
    try {
      const auditData = JSON.parse(output);
      
      Object.entries(auditData.vulnerabilities || {}).forEach(([key, vuln]: [string, any]) => {
        issues.push({
          id: `npm-audit-${key}`,
          type: 'security',
          severity: this.mapNpmSeverity(vuln.severity),
          title: vuln.title || `Vulnerability in ${vuln.name}`,
          description: `${vuln.name}@${vuln.range}: ${vuln.title || vuln.overview}`,
          file: 'package.json',
          tool: 'npm-audit',
          branch: '',
          confidence: 1.0,
          cwe: vuln.cwe
        });
      });
    } catch (error) {
      console.error('Error parsing npm audit output:', error);
    }
    
    return issues;
  }

  /**
   * Parse ESLint output
   */
  private parseEslintOutput(output: string, files: FileInfo[]): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    
    try {
      const eslintData = JSON.parse(output);
      
      eslintData.forEach((file: any) => {
        file.messages?.forEach((message: any) => {
          if (this.isSecurityRelatedEslintRule(message.ruleId)) {
            issues.push({
              id: `eslint-${file.filePath}-${message.line}-${message.column}`,
              type: this.getEslintIssueType(message.ruleId),
              severity: this.mapEslintSeverity(message.severity),
              title: message.ruleId || 'ESLint Issue',
              description: message.message,
              file: file.filePath,
              line: message.line,
              column: message.column,
              tool: 'eslint',
              branch: '',
              confidence: 0.9
            });
          }
        });
      });
    } catch (error) {
      console.error('Error parsing ESLint output:', error);
    }
    
    return issues;
  }

  /**
   * Parse Semgrep output
   */
  private parseSemgrepOutput(output: string, files: FileInfo[]): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    
    try {
      const semgrepData = JSON.parse(output);
      
      semgrepData.results?.forEach((result: any) => {
        issues.push({
          id: `semgrep-${result.path}-${result.start.line}-${result.check_id}`,
          type: 'security',
          severity: this.mapSemgrepSeverity(result.extra.severity),
          title: result.extra.message || result.check_id,
          description: result.extra.metadata?.description || result.extra.message,
          file: result.path,
          line: result.start.line,
          column: result.start.col,
          tool: 'semgrep',
          branch: '',
          confidence: result.extra.metadata?.confidence || 0.85,
          cwe: result.extra.metadata?.cwe
        });
      });
    } catch (error) {
      console.error('Error parsing Semgrep output:', error);
    }
    
    return issues;
  }

  /**
   * Parse JSHint output
   */
  private parseJshintOutput(output: string, files: FileInfo[]): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    
    try {
      const jshintData = JSON.parse(output);
      
      Object.entries(jshintData).forEach(([file, fileData]: [string, any]) => {
        fileData.forEach((issue: any) => {
          if (this.isSecurityRelatedJshintError(issue.code)) {
            issues.push({
              id: `jshint-${file}-${issue.line}-${issue.code}`,
              type: 'code-quality',
              severity: 'medium',
              title: issue.code,
              description: issue.reason,
              file: file,
              line: issue.line,
              column: issue.character,
              tool: 'jshint',
              branch: '',
              confidence: 0.8
            });
          }
        });
      });
    } catch (error) {
      console.error('Error parsing JSHint output:', error);
    }
    
    return issues;
  }

  /**
   * Parse Retire.js output
   */
  private parseRetireOutput(output: string, files: FileInfo[]): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    
    try {
      const retireData = JSON.parse(output);
      
      retireData.forEach((item: any) => {
        item.vulnerabilities?.forEach((vuln: any) => {
          issues.push({
            id: `retire-${item.file}-${vuln.identifiers?.CVE?.[0] || vuln.identifiers?.summary}`,
            type: 'security',
            severity: this.mapRetireSeverity(vuln.severity),
            title: `Vulnerable library: ${item.component}`,
            description: vuln.info?.[0] || vuln.identifiers?.summary || 'Known vulnerability',
            file: item.file,
            tool: 'retire',
            branch: '',
            confidence: 0.95,
            cwe: vuln.identifiers?.CWE?.[0]
          });
        });
      });
    } catch (error) {
      console.error('Error parsing Retire.js output:', error);
    }
    
    return issues;
  }

  /**
   * Perform JavaScript-specific security checks
   */
  private performJavaScriptSpecificChecks(files: FileInfo[]): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    
    files.forEach(file => {
      const content = file.content || '';
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        // Check for eval usage
        if (this.detectEvalUsage(line)) {
          issues.push({
            id: `js-eval-${file.path}-${index + 1}`,
            type: 'security',
            severity: 'high',
            title: 'Use of eval()',
            description: 'eval() can execute arbitrary code and should be avoided',
            file: file.path,
            line: index + 1,
            tool: 'javascript-security-agent',
            branch: file.branch || '',
            confidence: 0.95,
            cwe: 'CWE-94'
          });
        }
        
        // Check for innerHTML usage
        if (this.detectInnerHTMLUsage(line)) {
          issues.push({
            id: `js-xss-${file.path}-${index + 1}`,
            type: 'security',
            severity: 'high',
            title: 'Potential XSS via innerHTML',
            description: 'Direct innerHTML assignment can lead to XSS vulnerabilities',
            file: file.path,
            line: index + 1,
            tool: 'javascript-security-agent',
            branch: file.branch || '',
            confidence: 0.85,
            cwe: 'CWE-79'
          });
        }
        
        // Check for hardcoded secrets
        if (this.detectHardcodedSecrets(line)) {
          issues.push({
            id: `js-secret-${file.path}-${index + 1}`,
            type: 'security',
            severity: 'critical',
            title: 'Potential Hardcoded Secret',
            description: 'Possible hardcoded API key or password detected',
            file: file.path,
            line: index + 1,
            tool: 'javascript-security-agent',
            branch: file.branch || '',
            confidence: 0.8,
            cwe: 'CWE-798'
          });
        }
        
        // Check for SQL injection in template literals
        if (this.detectSQLInjection(line)) {
          issues.push({
            id: `js-sqli-${file.path}-${index + 1}`,
            type: 'security',
            severity: 'high',
            title: 'Potential SQL Injection',
            description: 'Unsafe SQL query construction detected',
            file: file.path,
            line: index + 1,
            tool: 'javascript-security-agent',
            branch: file.branch || '',
            confidence: 0.85,
            cwe: 'CWE-89'
          });
        }
        
        // Check for insecure random
        if (this.detectInsecureRandom(line)) {
          issues.push({
            id: `js-random-${file.path}-${index + 1}`,
            type: 'security',
            severity: 'medium',
            title: 'Insecure Random Number Generation',
            description: 'Math.random() is not cryptographically secure',
            file: file.path,
            line: index + 1,
            tool: 'javascript-security-agent',
            branch: file.branch || '',
            confidence: 0.9,
            cwe: 'CWE-338'
          });
        }
      });
    });
    
    return issues;
  }

  // Detection methods
  private detectEvalUsage(line: string): boolean {
    const patterns = [
      /\beval\s*\(/,
      /new\s+Function\s*\(/,
      /setTimeout\s*\([^,]+,/,
      /setInterval\s*\([^,]+,/
    ];
    
    return patterns.some(pattern => pattern.test(line));
  }

  private detectInnerHTMLUsage(line: string): boolean {
    const patterns = [
      /\.innerHTML\s*=/,
      /\.outerHTML\s*=/,
      /document\.write\s*\(/,
      /document\.writeln\s*\(/
    ];
    
    return patterns.some(pattern => pattern.test(line));
  }

  private detectHardcodedSecrets(line: string): boolean {
    const patterns = [
      /api[_-]?key\s*[:=]\s*["'][A-Za-z0-9]{20,}["']/i,
      /secret\s*[:=]\s*["'][^"']{10,}["']/i,
      /password\s*[:=]\s*["'][^"']+["']/i,
      /token\s*[:=]\s*["'][A-Za-z0-9]{20,}["']/i,
      /aws[_-]?access[_-]?key/i,
      /private[_-]?key\s*[:=]\s*["']/i
    ];
    
    return patterns.some(pattern => pattern.test(line));
  }

  private detectSQLInjection(line: string): boolean {
    const patterns = [
      /`SELECT.*\$\{/i,
      /`INSERT.*\$\{/i,
      /`UPDATE.*\$\{/i,
      /`DELETE.*\$\{/i,
      /query\s*\(\s*`.*\$\{/,
      /execute\s*\(\s*`.*\$\{/
    ];
    
    return patterns.some(pattern => pattern.test(line));
  }

  private detectInsecureRandom(line: string): boolean {
    const patterns = [
      /Math\.random\s*\(\)/,
      /crypto\.pseudoRandomBytes/
    ];
    
    // Check if it's being used for security purposes
    const securityContextPatterns = [
      /token/i,
      /password/i,
      /secret/i,
      /key/i,
      /salt/i,
      /nonce/i
    ];
    
    return patterns.some(pattern => pattern.test(line)) &&
           securityContextPatterns.some(context => context.test(line));
  }

  // Helper methods
  private mapNpmSeverity(severity: string): 'critical' | 'high' | 'medium' | 'low' {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'critical';
      case 'high': return 'high';
      case 'moderate': return 'medium';
      case 'medium': return 'medium';
      default: return 'low';
    }
  }

  private mapEslintSeverity(severity: number): 'critical' | 'high' | 'medium' | 'low' {
    return severity === 2 ? 'high' : 'medium';
  }

  private mapSemgrepSeverity(severity: string): 'critical' | 'high' | 'medium' | 'low' {
    switch (severity?.toUpperCase()) {
      case 'ERROR': return 'high';
      case 'WARNING': return 'medium';
      case 'INFO': return 'low';
      default: return 'medium';
    }
  }

  private mapRetireSeverity(severity: string): 'critical' | 'high' | 'medium' | 'low' {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'critical';
      case 'high': return 'high';
      case 'medium': return 'medium';
      default: return 'low';
    }
  }

  private isSecurityRelatedEslintRule(ruleId: string): boolean {
    if (!ruleId) return false;
    
    const securityRules = [
      'no-eval', 'no-implied-eval', 'no-new-func',
      'no-script-url', 'no-with', 'no-alert',
      'no-console', 'no-debugger', 'security/',
      'node/no-deprecated-api', 'node/no-unpublished-require'
    ];
    
    return securityRules.some(rule => ruleId.includes(rule));
  }

  private getEslintIssueType(ruleId: string): 'security' | 'code-quality' {
    const securityRules = ['no-eval', 'no-implied-eval', 'security/'];
    return securityRules.some(rule => ruleId?.includes(rule)) ? 'security' : 'code-quality';
  }

  private isSecurityRelatedJshintError(code: string): boolean {
    const securityCodes = ['W054', 'W061', 'W066', 'W067'];
    return securityCodes.includes(code);
  }

  // Mock data methods for testing
  private getMockNpmAuditData(): string {
    return JSON.stringify({
      vulnerabilities: {
        'lodash': {
          name: 'lodash',
          severity: 'high',
          range: '<4.17.21',
          title: 'Prototype Pollution',
          cwe: 'CWE-1321'
        }
      }
    });
  }

  private getMockEslintData(): string {
    return JSON.stringify([
      {
        filePath: 'src/app.js',
        messages: [
          {
            ruleId: 'no-eval',
            severity: 2,
            message: 'eval can be harmful.',
            line: 42,
            column: 10
          }
        ]
      }
    ]);
  }

  private getMockSemgrepData(): string {
    return JSON.stringify({
      results: [
        {
          check_id: 'javascript.express.security.audit.xss.direct-response-write',
          path: 'server.js',
          start: { line: 15, col: 5 },
          extra: {
            severity: 'ERROR',
            message: 'Detected direct write to response',
            metadata: {
              description: 'Writing user input directly to response can cause XSS',
              cwe: 'CWE-79',
              confidence: 0.9
            }
          }
        }
      ]
    });
  }
}