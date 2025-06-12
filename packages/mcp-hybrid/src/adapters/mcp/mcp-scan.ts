/**
 * MCP-Scan Adapter
 * Security scanning tool that must run first to verify other tools
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

interface SecurityVulnerability {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  type: string;
  message: string;
  file?: string;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  cwe?: string;
  owasp?: string;
  fixAvailable?: boolean;
  reference?: string;
}

interface ToolVerificationResult {
  toolId: string;
  safe: boolean;
  version?: string;
  lastUpdated?: string;
  vulnerabilities?: string[];
  warnings?: string[];
  recommendation?: string;
}

interface MCPScanResponse {
  vulnerabilities: SecurityVulnerability[];
  toolVerifications?: ToolVerificationResult[];
  summary: {
    filesScanned: number;
    vulnerabilitiesFound: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
  };
}

export class MCPScanAdapter extends BaseMCPAdapter {
  readonly id = 'mcp-scan';
  readonly name = 'MCP Security Scanner';
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
    },
    {
      name: 'vulnerability-detection',
      category: 'security',
      languages: [],
      fileTypes: []
    }
  ];
  
  readonly requirements: ToolRequirements = {
    minFiles: 0, // Can scan tools even without files
    executionMode: 'on-demand',
    timeout: 30000, // 30 seconds
    authentication: {
      type: 'none',
      required: false
    }
  };
  
  protected readonly mcpServerArgs = ['@codequal/mcp-scan'];
  
  /**
   * Check if tool can analyze given context
   */
  canAnalyze(context: AnalysisContext): boolean {
    // MCP-Scan is always available for security role
    // Or when there are files to scan
    return context.agentRole === 'security' || context.pr.files.length > 0;
  }
  
  /**
   * Execute MCP-Scan analysis
   */
  async analyze(context: AnalysisContext): Promise<ToolResult> {
    const startTime = Date.now();
    
    try {
      // Initialize MCP server if not already running
      await this.initializeMCPServer();
      
      // Prepare files for scanning
      const filesToScan = this.filterSupportedFiles(
        context.pr.files,
        [] // All file types supported
      );
      
      // Create temp directory and write files
      const tempDir = await this.createTempDirectory(context);
      
      try {
        if (filesToScan.length > 0) {
          await this.writeFilesToTemp(filesToScan, tempDir);
        }
        
        // Run security scan via MCP
        const scanResults = await this.performSecurityScan(
          tempDir,
          filesToScan,
          context
        );
        
        // Parse results into findings
        const findings = this.parseSecurityFindings(scanResults, filesToScan);
        
        // Calculate metrics
        const metrics = this.calculateMetrics(scanResults);
        
        return {
          success: true,
          toolId: this.id,
          executionTime: Date.now() - startTime,
          findings,
          metrics
        };
      } finally {
        // Cleanup temp directory
        await this.cleanupTempDirectory(tempDir);
      }
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error : new Error(String(error)),
        startTime
      );
    }
  }
  
  /**
   * Perform security scan via MCP
   */
  private async performSecurityScan(
    tempDir: string,
    files: Array<{ path: string; content: string }>,
    context: AnalysisContext
  ): Promise<MCPScanResponse> {
    // Prepare scan parameters
    const scanParams: Record<string, unknown> = {
      directory: tempDir,
      files: files.map(f => path.join(tempDir, f.path)),
      scanType: 'comprehensive',
      includeDevDependencies: true,
      checkPatterns: true,
      detectSecrets: true,
      detectHardcodedCredentials: true
    };
    
    // If context includes tools to verify, add them
    if (context.vectorDBConfig?.enabledTools) {
      scanParams.verifyTools = context.vectorDBConfig.enabledTools;
    }
    
    // Add language-specific rules
    if (context.repository.languages.length > 0) {
      scanParams.languages = context.repository.languages;
    }
    
    // Execute scan via MCP
    const response = await this.executeMCPCommand<MCPScanResponse>({
      method: 'scan',
      params: scanParams
    });
    
    return response;
  }
  
  /**
   * Parse security findings from scan results
   */
  private parseSecurityFindings(
    scanResults: MCPScanResponse,
    scannedFiles: Array<{ path: string; content: string }>
  ): ToolFinding[] {
    const findings: ToolFinding[] = [];
    
    // Parse vulnerabilities
    if (scanResults.vulnerabilities && Array.isArray(scanResults.vulnerabilities)) {
      for (const vuln of scanResults.vulnerabilities) {
        const finding: ToolFinding = {
          type: 'issue',
          severity: this.mapSeverity(vuln.severity),
          category: 'security',
          message: vuln.message,
          file: vuln.file,
          line: vuln.line,
          column: vuln.column,
          ruleId: vuln.id || vuln.cwe,
          documentation: this.generateDocumentation(vuln)
        };
        
        // Add fix information if available
        if (vuln.fixAvailable) {
          finding.autoFixable = true;
          finding.fix = {
            description: `Apply security fix for ${vuln.type}`,
            changes: [] // Would need specific fix details
          };
        }
        
        findings.push(finding);
      }
    }
    
    // Parse tool verification results
    if (scanResults.toolVerifications && Array.isArray(scanResults.toolVerifications)) {
      for (const toolResult of scanResults.toolVerifications) {
        if (!toolResult.safe) {
          findings.push({
            type: 'issue',
            severity: 'critical',
            category: 'security',
            message: `⚠️ Tool '${toolResult.toolId}' failed security verification`,
            ruleId: 'unsafe-tool',
            documentation: this.generateToolVerificationDoc(toolResult)
          });
        } else if (toolResult.warnings && toolResult.warnings.length > 0) {
          for (const warning of toolResult.warnings) {
            findings.push({
              type: 'suggestion',
              severity: 'medium',
              category: 'security',
              message: `Tool '${toolResult.toolId}': ${warning}`,
              ruleId: 'tool-warning'
            });
          }
        }
      }
    }
    
    // Add summary finding if critical issues found
    const criticalCount = scanResults.summary.criticalCount;
    if (criticalCount > 0) {
      findings.unshift({
        type: 'issue',
        severity: 'critical',
        category: 'security',
        message: `🚨 ${criticalCount} critical security ${criticalCount === 1 ? 'issue' : 'issues'} found!`,
        ruleId: 'security-summary',
        documentation: 'Immediate action required. Review and fix all critical security issues before merging.'
      });
    }
    
    return findings;
  }
  
  /**
   * Generate documentation for vulnerability
   */
  private generateDocumentation(vuln: SecurityVulnerability): string {
    const parts: string[] = [];
    
    parts.push(`**${vuln.type}**`);
    parts.push('');
    parts.push(vuln.message);
    
    if (vuln.cwe) {
      parts.push('');
      parts.push(`**CWE:** ${vuln.cwe}`);
    }
    
    if (vuln.owasp) {
      parts.push(`**OWASP:** ${vuln.owasp}`);
    }
    
    if (vuln.reference) {
      parts.push('');
      parts.push(`**Reference:** ${vuln.reference}`);
    }
    
    if (vuln.fixAvailable) {
      parts.push('');
      parts.push('✅ **Automated fix available**');
    }
    
    return parts.join('\n');
  }
  
  /**
   * Generate tool verification documentation
   */
  private generateToolVerificationDoc(result: ToolVerificationResult): string {
    const parts: string[] = [];
    
    parts.push(`Tool ${result.toolId} verification failed.`);
    
    if (result.vulnerabilities && result.vulnerabilities.length > 0) {
      parts.push('');
      parts.push('**Known vulnerabilities:**');
      result.vulnerabilities.forEach(v => parts.push(`- ${v}`));
    }
    
    if (result.recommendation) {
      parts.push('');
      parts.push(`**Recommendation:** ${result.recommendation}`);
    }
    
    return parts.join('\n');
  }
  
  /**
   * Calculate metrics from scan results
   */
  private calculateMetrics(scanResults: MCPScanResponse): Record<string, number> {
    const summary = scanResults.summary;
    
    return {
      filesScanned: summary.filesScanned,
      totalVulnerabilities: summary.vulnerabilitiesFound,
      criticalIssues: summary.criticalCount,
      highIssues: summary.highCount,
      mediumIssues: summary.mediumCount,
      lowIssues: summary.lowCount,
      securityScore: this.calculateSecurityScore(summary),
      toolsVerified: scanResults.toolVerifications?.length || 0,
      unsafeTools: scanResults.toolVerifications?.filter(t => !t.safe).length || 0
    };
  }
  
  /**
   * Calculate security score (0-100)
   */
  private calculateSecurityScore(summary: MCPScanResponse['summary']): number {
    // Simple scoring algorithm
    const weights = {
      critical: 25,
      high: 10,
      medium: 5,
      low: 1
    };
    
    const deductions = 
      summary.criticalCount * weights.critical +
      summary.highCount * weights.high +
      summary.mediumCount * weights.medium +
      summary.lowCount * weights.low;
    
    const score = Math.max(0, 100 - deductions);
    return Math.round(score);
  }
  
  /**
   * Map severity levels
   */
  protected mapSeverity(severity: string): ToolFinding['severity'] {
    const severityMap: Record<string, ToolFinding['severity']> = {
      'critical': 'critical',
      'high': 'high',
      'medium': 'medium',
      'low': 'low',
      'info': 'info'
    };
    
    return severityMap[severity.toLowerCase()] || 'info';
  }
  
  /**
   * Override filterSupportedFiles to support all file types
   */
  protected filterSupportedFiles(
    files: Array<{ path: string; content: string; changeType: string }>,
    supportedExtensions: string[]
  ): Array<{ path: string; content: string }> {
    // MCP-Scan supports all file types, so we don't filter by extension
    return files
      .filter(file => file.changeType !== 'deleted')
      .map(({ path, content }) => ({ path, content }));
  }
  
  /**
   * Get tool metadata
   */
  getMetadata(): ToolMetadata {
    return {
      id: this.id,
      name: this.name,
      description: 'MCP Security Scanner for comprehensive vulnerability detection and tool verification',
      author: 'CodeQual',
      homepage: 'https://github.com/codequal/mcp-scan',
      documentationUrl: 'https://docs.codequal.com/tools/mcp-scan',
      supportedRoles: ['security'] as AgentRole[],
      supportedLanguages: [], // All languages
      supportedFrameworks: [],
      tags: ['security', 'scanning', 'verification', 'vulnerabilities', 'cwe', 'owasp'],
      securityVerified: true,
      lastVerified: new Date('2025-06-07')
    };
  }
}

// Export singleton instance
export const mcpScanAdapter = new MCPScanAdapter();
