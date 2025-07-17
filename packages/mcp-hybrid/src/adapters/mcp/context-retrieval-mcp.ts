/**
 * Context Retrieval MCP Adapter
 * Retrieves relevant context from Vector DB and codebase
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

export class ContextRetrievalMCPAdapter extends BaseMCPAdapter {
  readonly id = 'context-retrieval-mcp';
  readonly name = 'Context Retrieval MCP';
  readonly version = '1.0.0';
  
  readonly capabilities: ToolCapability[] = [
    {
      name: 'context-retrieval',
      category: 'documentation',
      languages: [], // All languages
      fileTypes: [] // All file types
    }
  ];
  
  readonly requirements: ToolRequirements = {
    executionMode: 'on-demand',
    timeout: 30000,
    authentication: {
      type: 'none',
      required: false
    }
  };
  
  protected readonly mcpServerArgs = ['context-mcp'];
  
  canAnalyze(context: AnalysisContext): boolean {
    // Can always retrieve context
    return true;
  }
  
  async analyze(context: AnalysisContext): Promise<ToolResult> {
    const startTime = Date.now();
    
    try {
      // Simulate context retrieval
      const findings: ToolFinding[] = [];
      
      // Analyze changed files to determine what context might be relevant
      const changedClasses = new Set<string>();
      const changedFunctions = new Set<string>();
      const importedModules = new Set<string>();
      
      for (const file of context.pr.files) {
        // Extract class names (simple regex for demo)
        const classMatches = file.content.matchAll(/class\s+(\w+)/g);
        for (const match of classMatches) {
          changedClasses.add(match[1]);
        }
        
        // Extract function names
        const funcMatches = file.content.matchAll(/(?:function|const|let|var)\s+(\w+)\s*[=:]/g);
        for (const match of funcMatches) {
          changedFunctions.add(match[1]);
        }
        
        // Extract imports
        const importMatches = file.content.matchAll(/import\s+.*from\s+['"]([^'"]+)['"]/g);
        for (const match of importMatches) {
          importedModules.add(match[1]);
        }
      }
      
      // Create context findings
      if (changedClasses.size > 0) {
        findings.push({
          type: 'info',
          severity: 'info',
          category: 'context',
          message: `Changed classes: ${Array.from(changedClasses).join(', ')}`,
          ruleId: 'context/changed-classes'
        });
      }
      
      if (changedFunctions.size > 0) {
        findings.push({
          type: 'info',
          severity: 'info',
          category: 'context',
          message: `Changed functions: ${Array.from(changedFunctions).slice(0, 5).join(', ')}${changedFunctions.size > 5 ? '...' : ''}`,
          ruleId: 'context/changed-functions'
        });
      }
      
      if (importedModules.size > 0) {
        findings.push({
          type: 'info',
          severity: 'info',
          category: 'context',
          message: `Dependencies used: ${Array.from(importedModules).slice(0, 5).join(', ')}${importedModules.size > 5 ? '...' : ''}`,
          ruleId: 'context/dependencies'
        });
      }
      
      // Add PR context
      findings.push({
        type: 'info',
        severity: 'info',
        category: 'context',
        message: `PR: ${context.pr.title} by ${context.pr.author}`,
        ruleId: 'context/pr-info'
      });
      
      return {
        success: true,
        toolId: this.id,
        executionTime: Date.now() - startTime,
        findings,
        metrics: {
          filesAnalyzed: context.pr.files.length,
          classesIdentified: changedClasses.size,
          functionsIdentified: changedFunctions.size,
          modulesIdentified: importedModules.size
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
      description: 'Retrieves relevant context from Vector DB and codebase for better analysis',
      author: 'CodeQual',
      supportedRoles: ['security', 'codeQuality', 'architecture', 'performance', 'dependency', 'educational'] as AgentRole[],
      supportedLanguages: [], // All languages
      tags: ['context', 'retrieval', 'vector-db'],
      securityVerified: true,
      lastVerified: new Date('2025-07-15')
    };
  }
}