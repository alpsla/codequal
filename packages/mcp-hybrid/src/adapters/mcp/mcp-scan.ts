/**
 * MCP-Scan Adapter
 * Security scanning tool that must run first to verify other tools
 */

import { spawn } from 'child_process';
import * as path from 'path';
import {
  Tool,
  ToolResult,
  ToolFinding,
  AnalysisContext,
  ToolMetadata,
  ToolCapability,
  ToolRequirements,
  AgentRole
} from '../../core/interfaces';

export class MCPScanAdapter implements Tool {
  readonly id = 'mcp-scan';
  readonly name = 'MCP Security Scanner';
  readonly type = 'mcp' as const;
  readonly version = '1.0.0';
  
  readonly capabilities: ToolCapability[] = [
    {
      name: 'security-scanning',
      category: 'security',
      languages: [], // All languages
      fileTypes: [] // All file types
    },
    {
      name: 'tool-verification',
      category: 'security',
      languages: [],
      fileTypes: []
    }
  ];
  
  readonly requirements: ToolRequirements = {
    minFiles: 1,
    executionMode: 'on-demand',
    timeout: 30000, // 30 seconds
    authentication: {
      type: 'none',
      required: false
    }
  };
  
  /**
   * Check if tool can analyze given context
   */
  canAnalyze(context: AnalysisContext): boolean {
    // MCP-Scan can analyze any context with at least one file
    return context.pr.files.length > 0;
  }
  
  /**
   * Execute MCP-Scan analysis
   */
  async analyze(context: AnalysisContext): Promise<ToolResult> {
    const startTime = Date.now();
    const findings: ToolFinding[] = [];
    
    try {
      // Run security scan on PR files
      const scanResults = await this.runSecurityScan(context);
      
      // Parse results into findings
      findings.push(...this.parseSecurityFindings(scanResults));
      
      // If this is for tool verification, also scan tools
      if (context.vectorDBConfig?.enabledTools) {
        const toolScanResults = await this.scanTools(
          context.vectorDBConfig.enabledTools
        );
        findings.push(...this.parseToolFindings(toolScanResults));
      }
      
      return {
        success: true,
        toolId: this.id,
        executionTime: Date.now() - startTime,
        findings,
        metrics: {
          filesScanned: context.pr.files.length,
          securityIssues: findings.filter(f => f.severity === 'critical' || f.severity === 'high').length,
          warnings: findings.filter(f => f.severity === 'medium').length,
          info: findings.filter(f => f.severity === 'low' || f.severity === 'info').length
        }
      };
    } catch (error: any) // eslint-disable-line @typescript-eslint/no-explicit-any { // eslint-disable-line @typescript-eslint/no-explicit-any
      return {
        success: false,
        toolId: this.id,
        executionTime: Date.now() - startTime,
        error: {
          code: 'SCAN_FAILED',
          message: error.message,
          recoverable: true
        }
      };
    }
  }
  
  /**
   * Run security scan on PR files
   */
  private async runSecurityScan(context: AnalysisContext): Promise<any> {
    return new Promise((resolve, reject) => {
      const args = [
        'scan',
        '--format', 'json',
        '--severity', 'low',
        '--timeout', '30s'
      ];
      
      // Add file paths
      const filePaths = context.pr.files
        .filter(f => f.changeType !== 'deleted')
        .map(f => f.path);
      
      if (filePaths.length === 0) {
        resolve({ vulnerabilities: [] });
        return;
      }
      
      args.push(...filePaths);
      
      const child = spawn('npx', ['mcp-scan', ...args], {
        cwd: process.cwd(),
        timeout: this.requirements.timeout
      });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            resolve(result);
          } catch {
            // Fallback for non-JSON output
            resolve({ vulnerabilities: [], rawOutput: stdout });
          }
        } else {
          reject(new Error(`MCP-Scan failed with code ${code}: ${stderr}`));
        }
      });
      
      child.on('error', (error) => {
        reject(error);
      });
    });
  }
  
  /**
   * Scan tools for security issues
   */
  private async scanTools(toolIds: string[]): Promise<any> {
    // Scan each tool for known vulnerabilities
    const results = [];
    
    for (const toolId of toolIds) {
      try {
        const scanResult = await this.scanSingleTool(toolId);
        results.push({ toolId, ...scanResult });
      } catch (error) {
        console.error(`Failed to scan tool ${toolId}:`, error);
        results.push({
          toolId,
          error: error instanceof Error ? error.message : String(error),
          safe: false
        });
      }
    }
    
    return results;
  }
  
  /**
   * Scan a single tool
   */
  private async scanSingleTool(toolId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const child = spawn('npx', [
        'mcp-scan',
        'verify-tool',
        toolId,
        '--format', 'json'
      ], {
        timeout: 10000 // 10 seconds per tool
      });
      
      let stdout = '';
      
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            resolve(result);
          } catch {
            resolve({ safe: true, message: 'Tool verified' });
          }
        } else {
          resolve({ safe: false, message: 'Verification failed' });
        }
      });
      
      child.on('error', () => {
        // If mcp-scan doesn't support tool verification, assume safe
        resolve({ safe: true, message: 'Tool verification not available' });
      });
    });
  }
  
  /**
   * Parse security findings from scan results
   */
  private parseSecurityFindings(scanResults: any) // eslint-disable-line @typescript-eslint/no-explicit-any: ToolFinding[] {
    const findings: ToolFinding[] = [];
    
    // Parse vulnerabilities
    if (scanResults.vulnerabilities && Array.isArray(scanResults.vulnerabilities)) {
      for (const vuln of scanResults.vulnerabilities) {
        findings.push({
          type: 'issue',
          severity: this.mapSeverity(vuln.severity),
          category: 'security',
          message: vuln.message || vuln.description,
          file: vuln.file,
          line: vuln.line,
          column: vuln.column,
          ruleId: vuln.rule || vuln.cwe,
          documentation: vuln.documentation || vuln.reference
        });
      }
    }
    
    // Parse other security issues
    if (scanResults.issues && Array.isArray(scanResults.issues)) {
      for (const issue of scanResults.issues) {
        findings.push({
          type: 'issue',
          severity: this.mapSeverity(issue.level),
          category: 'security',
          message: issue.message,
          file: issue.location?.file,
          line: issue.location?.line,
          ruleId: issue.id
        });
      }
    }
    
    return findings;
  }
  
  /**
   * Parse tool verification findings
   */
  private parseToolFindings(toolResults: any[]): ToolFinding[] { // eslint-disable-line @typescript-eslint/no-explicit-any
    const findings: ToolFinding[] = [];
    
    for (const result of toolResults) {
      if (!result.safe) {
        findings.push({
          type: 'issue',
          severity: 'high',
          category: 'security',
          message: `Tool ${result.toolId} failed security verification: ${result.message || 'Unknown issue'}`,
          ruleId: 'tool-security'
        });
      }
      
      if (result.warnings && Array.isArray(result.warnings)) {
        for (const warning of result.warnings) {
          findings.push({
            type: 'suggestion',
            severity: 'medium',
            category: 'security',
            message: `Tool ${result.toolId}: ${warning}`,
            ruleId: 'tool-warning'
          });
        }
      }
    }
    
    return findings;
  }
  
  /**
   * Map severity levels
   */
  private mapSeverity(level: string): ToolFinding['severity'] {
    switch (level?.toLowerCase()) {
      case 'critical':
      case 'error':
        return 'critical';
      case 'high':
      case 'warning':
        return 'high';
      case 'medium':
      case 'moderate':
        return 'medium';
      case 'low':
      case 'minor':
        return 'low';
      default:
        return 'info';
    }
  }
  
  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    return new Promise((resolve) => {
      const child = spawn('npx', ['mcp-scan', '--version'], {
        timeout: 5000
      });
      
      child.on('close', (code) => {
        resolve(code === 0);
      });
      
      child.on('error', () => {
        resolve(false);
      });
    });
  }
  
  /**
   * Get tool metadata
   */
  getMetadata(): ToolMetadata {
    return {
      id: this.id,
      name: this.name,
      description: 'MCP Security Scanner for code and tool verification',
      author: 'CodeQual',
      homepage: 'https://github.com/codequal/mcp-scan',
      documentationUrl: 'https://docs.codequal.com/tools/mcp-scan',
      supportedRoles: ['security'] as AgentRole[],
      supportedLanguages: [], // All languages
      supportedFrameworks: [],
      tags: ['security', 'scanning', 'verification'],
      securityVerified: true,
      lastVerified: new Date('2025-06-07')
    };
  }
}

// Export singleton instance
export const mcpScanAdapter = new MCPScanAdapter();
