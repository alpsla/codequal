/**
 * Mock ESLint MCP Adapter for testing
 * Returns simulated results for testing the integration
 */

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

export class MockESLintMCPAdapter extends BaseMCPAdapter {
  readonly id = 'eslint-mcp-mock';
  readonly name = 'Mock ESLint MCP';
  readonly version = '1.0.0';
  
  protected readonly mcpServerArgs = ['mock'];  // Required by base class
  
  readonly capabilities: ToolCapability[] = [
    {
      name: 'linting',
      category: 'quality',
      languages: ['javascript', 'typescript'],
      fileTypes: ['.js', '.jsx', '.ts', '.tsx']
    }
  ];
  
  readonly requirements: ToolRequirements = {
    minFiles: 1,
    executionMode: 'on-demand',
    timeout: 5000,
    authentication: { type: 'none', required: false }
  };
  
  canAnalyze(context: AnalysisContext): boolean {
    // Check if we have JavaScript/TypeScript files
    return context.pr.files.some(f => 
      ['.js', '.jsx', '.ts', '.tsx'].some(ext => f.path.endsWith(ext))
    );
  }
  
  async analyze(context: AnalysisContext): Promise<ToolResult> {
    const startTime = Date.now();
    
    // Simulate some findings based on the files
    const findings: ToolFinding[] = [];
    
    const jsFiles = context.pr.files.filter(f => 
      ['.js', '.jsx', '.ts', '.tsx'].some(ext => f.path.endsWith(ext))
    );
    
    // Add some mock findings
    if (jsFiles.length > 0) {
      findings.push({
        type: 'issue',
        severity: 'medium',
        category: 'quality',
        message: 'Unexpected console statement',
        file: jsFiles[0].path,
        line: 42,
        column: 5,
        ruleId: 'no-console',
        autoFixable: true
      });
      
      if (jsFiles.length > 1) {
        findings.push({
          type: 'issue',
          severity: 'low',
          category: 'quality',
          message: 'Missing semicolon',
          file: jsFiles[1].path,
          line: 15,
          column: 35,
          ruleId: 'semi',
          autoFixable: true
        });
      }
    }
    
    return {
      success: true,
      toolId: this.id,
      executionTime: Date.now() - startTime,
      findings,
      metrics: {
        filesAnalyzed: jsFiles.length,
        totalIssues: findings.length,
        errors: 0,
        warnings: findings.length
      }
    };
  }
  
  async healthCheck(): Promise<boolean> {
    // Mock always healthy
    return true;
  }
  
  protected async connectToServer(): Promise<boolean> {
    // Mock connection
    return true;
  }
  
  protected async callServerMethod(method: string, params: any): Promise<any> {
    // Mock method call
    return { success: true };
  }
  
  getMetadata(): ToolMetadata {
    return {
      id: this.id,
      name: this.name,
      description: 'Mock ESLint tool for testing MCP integration',
      author: 'CodeQual',
      supportedRoles: ['codeQuality'] as AgentRole[],
      supportedLanguages: ['javascript', 'typescript'],
      tags: ['linting', 'code-quality', 'mock'],
      securityVerified: true
    };
  }
}