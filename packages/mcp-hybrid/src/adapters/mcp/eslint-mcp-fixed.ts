/**
 * ESLint MCP Adapter - Fixed version
 * Uses correct MCP method names
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

export class ESLintMCPAdapterFixed extends BaseMCPAdapter {
  readonly id = 'eslint-mcp';
  readonly name = 'ESLint MCP';
  readonly version = '9.0.0';
  
  readonly capabilities: ToolCapability[] = [
    {
      name: 'linting',
      category: 'quality',
      languages: ['javascript', 'typescript'],
      fileTypes: ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']
    }
  ];
  
  readonly requirements: ToolRequirements = {
    minFiles: 1,
    executionMode: 'persistent',
    timeout: 30000,
    authentication: {
      type: 'none',
      required: false
    }
  };
  
  protected readonly mcpServerArgs = ['@eslint/mcp'];
  
  canAnalyze(context: AnalysisContext): boolean {
    const supportedExtensions = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'];
    return context.pr.files.some(file => {
      const ext = path.extname(file.path).toLowerCase();
      return supportedExtensions.includes(ext) && file.changeType !== 'deleted';
    });
  }
  
  async analyze(context: AnalysisContext): Promise<ToolResult> {
    const startTime = Date.now();
    
    try {
      // Initialize MCP server if needed
      await this.initializeMCPServer();
      
      const supportedExtensions = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'];
      const jsFiles = this.filterSupportedFiles(context.pr.files, supportedExtensions);
      
      if (jsFiles.length === 0) {
        return this.createEmptyResult(startTime);
      }
      
      // Create temporary directory and write files
      const tempDir = await this.createTempDirectory(context);
      
      try {
        await this.writeFilesToTemp(jsFiles, tempDir);
        
        // Execute ESLint through MCP
        const result = await this.executeMCPCommand<{
          results: Array<{
            filePath: string;
            messages: Array<{
              ruleId: string;
              severity: number;
              message: string;
              line: number;
              column: number;
              fix?: {
                range: [number, number];
                text: string;
              };
            }>;
            errorCount: number;
            warningCount: number;
          }>;
        }>({
          method: 'eslint/lint',
          params: {
            directory: tempDir,
            options: {
              fix: false,
              extensions: supportedExtensions
            }
          }
        });
        
        // Convert ESLint results to ToolFindings
        const findings: ToolFinding[] = [];
        let totalErrors = 0;
        let totalWarnings = 0;
        
        for (const fileResult of result.results) {
          for (const message of fileResult.messages) {
            const relativePath = path.relative(tempDir, fileResult.filePath);
            
            findings.push({
              type: message.severity === 2 ? 'issue' : 'suggestion',
              severity: this.mapSeverity(message.severity),
              category: 'code-quality',
              message: message.message,
              file: relativePath,
              line: message.line,
              column: message.column,
              ruleId: message.ruleId || 'unknown',
              autoFixable: !!message.fix
            });
          }
          
          totalErrors += fileResult.errorCount;
          totalWarnings += fileResult.warningCount;
        }
        
        // Cleanup temp directory
        await this.cleanupTempDirectory(tempDir);
        
        return {
          success: true,
          toolId: this.id,
          executionTime: Date.now() - startTime,
          findings,
          metrics: {
            filesAnalyzed: jsFiles.length,
            totalIssues: findings.length,
            errors: totalErrors,
            warnings: totalWarnings
          }
        };
      } catch (error) {
        // Ensure cleanup even on error
        await this.cleanupTempDirectory(tempDir);
        throw error;
      }
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
      description: 'ESLint Model Context Protocol adapter',
      author: 'CodeQual',
      supportedRoles: ['codeQuality'] as AgentRole[],
      supportedLanguages: ['javascript', 'typescript'],
      tags: ['linting', 'code-quality'],
      securityVerified: true,
      lastVerified: new Date('2025-06-08')
    };
  }
}

export const eslintMCPAdapterFixed = new ESLintMCPAdapterFixed();
