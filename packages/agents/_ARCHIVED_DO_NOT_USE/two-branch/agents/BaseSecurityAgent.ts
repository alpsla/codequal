/**
 * Base Security Agent for simplified agent implementations
 * Provides common functionality for security analysis agents
 */

import { FileInfo, SecurityIssue } from '../interfaces/agent-interfaces';

export abstract class BaseSecurityAgent {
  protected agentName: string;
  protected monitoring: any;

  constructor(agentName: string, monitoring?: any) {
    this.agentName = agentName;
    this.monitoring = monitoring;
  }

  /**
   * Main method to analyze files for a branch
   */
  abstract analyzeBranch(branch: string, files: FileInfo[]): Promise<SecurityIssue[]>;

  /**
   * Analyze method for compatibility with test suite
   */
  async analyze(context: any): Promise<any> {
    // Extract files and branch from context
    const files = context.files || [];
    const branch = context.headBranch || context.branch || 'main';
    
    // Run the actual analysis
    const issues = await this.analyzeBranch(branch, files);
    
    // Return in expected format
    return {
      issues,
      toolsUsed: this.getAvailableTools ? await this.getAvailableTools() : [],
      summary: {
        totalIssues: issues.length,
        critical: issues.filter(i => i.severity === 'critical').length,
        high: issues.filter(i => i.severity === 'high').length,
        medium: issues.filter(i => i.severity === 'medium').length,
        low: issues.filter(i => i.severity === 'low').length
      }
    };
  }

  /**
   * Optional method to get available tools
   */
  protected async getAvailableTools?(): Promise<string[]>;

  /**
   * Execute a tool command
   */
  protected async executeTool(command: string, files: FileInfo[]): Promise<string> {
    // Mock implementation for testing
    // In real implementation, this would execute the actual tool
    return '';
  }

  /**
   * Deduplicate issues based on fingerprint
   */
  protected deduplicateIssues(issues: SecurityIssue[]): SecurityIssue[] {
    const seen = new Set<string>();
    const unique: SecurityIssue[] = [];

    for (const issue of issues) {
      const fingerprint = `${issue.file}:${issue.line}:${issue.title}:${issue.cwe || ''}`;
      if (!seen.has(fingerprint)) {
        seen.add(fingerprint);
        unique.push(issue);
      }
    }

    return unique;
  }

  /**
   * Map severity from tool-specific format
   */
  protected mapSeverity(toolSeverity: string): 'critical' | 'high' | 'medium' | 'low' {
    const normalized = toolSeverity.toLowerCase();
    if (normalized.includes('critical') || normalized.includes('blocker')) return 'critical';
    if (normalized.includes('high') || normalized.includes('error')) return 'high';
    if (normalized.includes('medium') || normalized.includes('warning')) return 'medium';
    return 'low';
  }
}

// Also export as BaseMultiToolAgent for compatibility
export { BaseSecurityAgent as BaseMultiToolAgent };