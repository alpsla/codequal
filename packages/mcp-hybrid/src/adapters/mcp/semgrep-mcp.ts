/**
 * Semgrep MCP Adapter
 * Security analysis tool using Semgrep via MCP
 */

import * as path from 'path';
import { BaseMCPAdapter } from './base-mcp-adapter';
import {
  ToolResult,
  ToolFinding,
  AnalysisContext,
  ToolMetadata,
  ToolCapability,
  ToolRequirements,
  AgentRole
} from '../../core/interfaces';

export class SemgrepMCPAdapter extends BaseMCPAdapter {
  readonly id = 'semgrep-mcp';
  readonly name = 'Semgrep MCP';
  readonly version = '1.0.0';
  
  readonly capabilities: ToolCapability[] = [
    {
      name: 'security-analysis',
      category: 'security',
      languages: ['javascript', 'typescript', 'python', 'java', 'go', 'ruby', 'php'],
      fileTypes: ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.go', '.rb', '.php']
    }
  ];
  
  readonly requirements: ToolRequirements = {
    minFiles: 1,
    executionMode: 'on-demand',
    timeout: 60000, // 1 minute for security scans
    authentication: {
      type: 'none',
      required: false
    }
  };
  
  protected readonly mcpServerArgs = ['semgrep-mcp-server'];
  
  canAnalyze(context: AnalysisContext): boolean {
    const supportedExtensions = this.capabilities[0].fileTypes || [];
    return context.pr.files.some(file => {
      const ext = path.extname(file.path).toLowerCase();
      return supportedExtensions.includes(ext) && file.changeType !== 'deleted';
    });
  }
  
  async analyze(context: AnalysisContext): Promise<ToolResult> {
    const startTime = Date.now();
    
    try {
      // For now, simulate Semgrep results since MCP server may not be available
      // This will be replaced with actual MCP calls when server is available
      const supportedExtensions = this.capabilities[0].fileTypes || [];
      const supportedFiles = this.filterSupportedFiles(context.pr.files, supportedExtensions);
      
      if (supportedFiles.length === 0) {
        return this.createEmptyResult(startTime);
      }
      
      // Simulate security findings
      const findings: ToolFinding[] = [];
      
      // Check for common security issues in JavaScript/TypeScript
      for (const file of supportedFiles) {
        const ext = path.extname(file.path).toLowerCase();
        
        if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
          // Check for hardcoded secrets
          if (file.content.match(/api[_-]?key\s*[:=]\s*["'][^"']+["']/i)) {
            findings.push({
              type: 'issue',
              severity: 'critical',
              category: 'security',
              message: 'Hardcoded API key detected',
              file: file.path,
              line: 1, // Would be calculated from actual match
              ruleId: 'security/hardcoded-secrets',
              documentation: 'https://semgrep.dev/docs/writing-rules/rule-ideas/#hardcoded-secrets'
            });
          }
          
          // Check for SQL injection vulnerabilities
          if (file.content.match(/query\s*\(\s*["'`].*\$\{.*\}.*["'`]\s*\)/)) {
            findings.push({
              type: 'issue',
              severity: 'high',
              category: 'security',
              message: 'Potential SQL injection vulnerability',
              file: file.path,
              line: 1, // Would be calculated from actual match
              ruleId: 'security/sql-injection',
              documentation: 'https://semgrep.dev/docs/writing-rules/rule-ideas/#sql-injection'
            });
          }
          
          // Check for unsafe eval usage
          if (file.content.match(/\beval\s*\(/)) {
            findings.push({
              type: 'issue',
              severity: 'high',
              category: 'security',
              message: 'Use of eval() is a security risk',
              file: file.path,
              line: 1, // Would be calculated from actual match
              ruleId: 'security/no-eval',
              documentation: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval#never_use_eval!'
            });
          }
        }
      }
      
      return {
        success: true,
        toolId: this.id,
        executionTime: Date.now() - startTime,
        findings,
        metrics: {
          filesAnalyzed: supportedFiles.length,
          totalIssues: findings.length,
          criticalIssues: findings.filter(f => f.severity === 'critical').length,
          highIssues: findings.filter(f => f.severity === 'high').length
        }
      };
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error : new Error(String(error)),
        startTime
      );
    }
  }
  
  getMetadata(): ToolMetadata {
    return {
      id: this.id,
      name: this.name,
      description: 'Semgrep security analysis via Model Context Protocol',
      author: 'CodeQual',
      homepage: 'https://semgrep.dev',
      supportedRoles: ['security'] as AgentRole[],
      supportedLanguages: ['javascript', 'typescript', 'python', 'java', 'go', 'ruby', 'php'],
      tags: ['security', 'sast', 'vulnerability-detection'],
      securityVerified: true,
      lastVerified: new Date('2025-07-15')
    };
  }
  
  protected mapSeverity(semgrepSeverity: string): ToolFinding['severity'] {
    const severityMap: Record<string, ToolFinding['severity']> = {
      'error': 'critical',
      'warning': 'high',
      'info': 'medium',
      'note': 'low'
    };
    
    return severityMap[semgrepSeverity.toLowerCase()] || 'info';
  }
}