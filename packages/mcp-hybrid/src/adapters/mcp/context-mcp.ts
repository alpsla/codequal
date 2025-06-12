/**
 * Context MCP Adapter
 * Retrieves relevant context from Vector DB and web for educational purposes
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

interface ContextSearchResult {
  source: 'vectorDB' | 'web' | 'documentation';
  title: string;
  content: string;
  relevanceScore: number;
  url?: string;
  metadata: {
    skillLevel?: string;
    topics?: string[];
    difficulty?: string;
    learningPath?: string;
    timestamp?: string;
  };
}

interface MCPContextResponse {
  results: ContextSearchResult[];
  totalResults: number;
  searchTime: number;
}

export class ContextMCPAdapter extends BaseMCPAdapter {
  readonly id = 'context-mcp';
  readonly name = 'Context Retrieval MCP';
  readonly version = '1.0.0';
  
  readonly capabilities: ToolCapability[] = [
    {
      name: 'context-retrieval',
      category: 'documentation',
      languages: [], // All languages
      fileTypes: []
    },
    {
      name: 'knowledge-search',
      category: 'documentation',
      languages: [],
      fileTypes: []
    },
    {
      name: 'skill-assessment',
      category: 'documentation',
      languages: [],
      fileTypes: []
    }
  ];
  
  readonly requirements: ToolRequirements = {
    minFiles: 0, // Can work without files to search for context
    executionMode: 'on-demand',
    timeout: 30000, // 30 seconds
    authentication: {
      type: 'api-key',
      required: false // Can work without but better with API keys
    }
  };
  
  protected readonly mcpServerArgs = ['@codequal/context-mcp'];
  
  /**
   * Check if tool can analyze given context
   */
  canAnalyze(context: AnalysisContext): boolean {
    // Always available for educational agent
    return context.agentRole === 'educational' || 
           context.agentRole === 'reporting';
  }
  
  /**
   * Execute context retrieval
   */
  async analyze(context: AnalysisContext): Promise<ToolResult> {
    const startTime = Date.now();
    
    try {
      // Initialize MCP server if not already running
      await this.initializeMCPServer();
      
      // Extract key concepts from PR
      const concepts = this.extractConcepts(context);
      
      if (concepts.length === 0) {
        // Return with all expected metrics
        return {
          success: true,
          toolId: this.id,
          executionTime: Date.now() - startTime,
          findings: [],
          metrics: {
            contextSourcesFound: 0,
            skillGapsIdentified: 0,
            learningResourcesFound: 0,
            relevanceScore: 0,
            searchTime: 0
          }
        };
      }
      
      // Search for educational content via MCP
      const searchResults = await this.searchForContext(concepts, context);
      
      // Identify skill gaps
      const skillGaps = this.identifySkillGaps(context, searchResults.results);
      
      // Generate educational findings
      const findings = this.generateEducationalFindings(
        searchResults.results,
        skillGaps,
        context
      );
      
      return {
        success: true,
        toolId: this.id,
        executionTime: Date.now() - startTime,
        findings,
        metrics: {
          contextSourcesFound: searchResults.totalResults,
          skillGapsIdentified: skillGaps.length,
          learningResourcesFound: findings.filter(f => f.type === 'info').length,
          relevanceScore: this.calculateAverageRelevance(searchResults.results),
          searchTime: searchResults.searchTime
        }
      };
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error : new Error(String(error)),
        startTime
      );
    }
  }
  
  /**
   * Extract key concepts from PR for context search
   */
  private extractConcepts(context: AnalysisContext): string[] {
    const concepts: Set<string> = new Set();
    
    // Extract from PR title and description
    const titleWords = context.pr.title.toLowerCase().split(/\s+/);
    const descWords = (context.pr.description || '').toLowerCase().split(/\s+/);
    
    // Common programming concepts to look for
    const programmingConcepts = [
      'api', 'database', 'authentication', 'security', 'performance',
      'testing', 'deployment', 'ci/cd', 'react', 'vue', 'angular',
      'typescript', 'javascript', 'python', 'async', 'promise',
      'hook', 'component', 'service', 'controller', 'model',
      'graphql', 'rest', 'websocket', 'microservice', 'docker',
      'kubernetes', 'aws', 'azure', 'gcp', 'terraform'
    ];
    
    // Find matching concepts
    [...titleWords, ...descWords].forEach(word => {
      if (programmingConcepts.includes(word)) {
        concepts.add(word);
      }
    });
    
    // Add language-specific concepts
    context.repository.languages.forEach(lang => {
      concepts.add(lang.toLowerCase());
    });
    
    // Add framework concepts
    context.repository.frameworks?.forEach(framework => {
      concepts.add(framework.toLowerCase());
    });
    
    // Extract from file paths
    context.pr.files.forEach(file => {
      const pathParts = file.path.split('/');
      pathParts.forEach(part => {
        if (programmingConcepts.includes(part.toLowerCase())) {
          concepts.add(part.toLowerCase());
        }
      });
    });
    
    return Array.from(concepts);
  }
  
  /**
   * Search for context via MCP
   */
  private async searchForContext(
    concepts: string[],
    context: AnalysisContext
  ): Promise<MCPContextResponse> {
    // Call MCP server to search for context
    const response = await this.executeMCPCommand<MCPContextResponse>({
      method: 'searchContext',
      params: {
        query: concepts.join(' '),
        sources: ['vectorDB', 'web', 'documentation'],
        filters: {
          repository: context.repository.name,
          languages: context.repository.languages,
          frameworks: context.repository.frameworks,
          userLevel: 'intermediate' // Could be determined from user profile
        },
        limit: 10
      }
    });
    
    return response;
  }
  
  /**
   * Identify skill gaps based on PR and context
   */
  private identifySkillGaps(
    context: AnalysisContext,
    searchResults: ContextSearchResult[]
  ): string[] {
    const gaps: string[] = [];
    const prFiles = context.pr.files;
    
    // No tests added?
    const hasTestFiles = prFiles.some(f => 
      f.path.includes('test') || 
      f.path.includes('spec') || 
      f.path.endsWith('.test.ts') ||
      f.path.endsWith('.test.js')
    );
    
    if (!hasTestFiles && prFiles.some(f => f.changeType === 'added')) {
      gaps.push('Unit testing');
    }
    
    // No documentation?
    const hasDocumentation = prFiles.some(f => 
      f.path.endsWith('.md') || 
      f.path.includes('docs') ||
      f.content.includes('/**') // JSDoc
    );
    
    if (!hasDocumentation && prFiles.length > 3) {
      gaps.push('Documentation practices');
    }
    
    // Complex code without comments?
    const hasComplexCode = prFiles.some(f => {
      if (f.changeType === 'deleted') return false;
      const lines = f.content.split('\n');
      const codeLines = lines.filter(l => l.trim() && !l.trim().startsWith('//')).length;
      const commentLines = lines.filter(l => l.trim().startsWith('//') || l.includes('/*')).length;
      return codeLines > 50 && commentLines < 5;
    });
    
    if (hasComplexCode) {
      gaps.push('Code commenting');
    }
    
    // No error handling?
    const hasErrorHandling = prFiles.some(f => 
      f.content.includes('try') || 
      f.content.includes('catch') || 
      f.content.includes('.catch') ||
      f.content.includes('error')
    );
    
    if (!hasErrorHandling && prFiles.some(f => f.content.includes('async'))) {
      gaps.push('Error handling');
    }
    
    // TypeScript but no types?
    if (context.repository.languages.includes('typescript')) {
      const hasAnyType = prFiles.some(f => 
        f.path.endsWith('.ts') && f.content.includes(': any')
      );
      if (hasAnyType) {
        gaps.push('TypeScript typing');
      }
    }
    
    return gaps;
  }
  
  /**
   * Generate educational findings
   */
  private generateEducationalFindings(
    searchResults: ContextSearchResult[],
    skillGaps: string[],
    context: AnalysisContext
  ): ToolFinding[] {
    const findings: ToolFinding[] = [];
    
    // Group results by source
    const vectorDBResults = searchResults.filter(r => r.source === 'vectorDB');
    const webResults = searchResults.filter(r => r.source === 'web');
    const docResults = searchResults.filter(r => r.source === 'documentation');
    
    // Add relevant educational resources from Vector DB
    vectorDBResults.slice(0, 3).forEach(result => {
      findings.push({
        type: 'info',
        severity: 'info',
        category: 'documentation',
        message: `📚 Internal resource: "${result.title}"`,
        ruleId: 'educational-resource-internal',
        documentation: result.content
        // Removed metadata property - not part of ToolFinding interface
      });
    });
    
    // Add external resources
    webResults.slice(0, 2).forEach(result => {
      findings.push({
        type: 'info',
        severity: 'info',
        category: 'documentation',
        message: `🌐 External tutorial: "${result.title}"`,
        ruleId: 'educational-resource-external',
        documentation: result.url ? `${result.content}\n\nRead more: ${result.url}` : result.content
        // Removed metadata property - not part of ToolFinding interface
      });
    });
    
    // Add skill gap findings
    skillGaps.forEach(gap => {
      // Find related resources for the gap
      const relatedResource = searchResults.find(r => 
        r.content.toLowerCase().includes(gap.toLowerCase()) ||
        r.title.toLowerCase().includes(gap.toLowerCase())
      );
      
      findings.push({
        type: 'suggestion',
        severity: 'low',
        category: 'documentation',
        message: `💡 Learning opportunity: ${gap}`,
        ruleId: 'skill-gap',
        documentation: relatedResource 
          ? `Consider improving your ${gap} skills. Related resource: "${relatedResource.title}"`
          : `Consider improving your ${gap} skills for better code quality`
      });
    });
    
    // Add learning path if multiple gaps
    if (skillGaps.length > 2) {
      findings.push({
        type: 'info',
        severity: 'info',
        category: 'documentation',
        message: `🎯 Suggested learning path based on this PR`,
        ruleId: 'learning-path',
        documentation: this.generateLearningPath(skillGaps, searchResults)
      });
    }
    
    // Add best practices reminder if relevant
    if (context.pr.files.length > 5) {
      findings.push({
        type: 'info',
        severity: 'info',
        category: 'documentation',
        message: `📋 Best practices for large PRs`,
        ruleId: 'best-practices',
        documentation: 'Consider breaking large PRs into smaller, focused changes for easier review. Each PR should ideally address a single concern or feature.'
      });
    }
    
    return findings;
  }
  
  /**
   * Generate learning path documentation
   */
  private generateLearningPath(gaps: string[], resources: ContextSearchResult[]): string {
    let path = 'Based on the identified areas for improvement, here\'s a suggested learning path:\n\n';
    
    gaps.forEach((gap, index) => {
      path += `${index + 1}. **${gap}**\n`;
      const relatedResources = resources.filter(r => 
        r.title.toLowerCase().includes(gap.toLowerCase()) ||
        r.metadata.topics?.some(t => t.toLowerCase().includes(gap.toLowerCase()))
      );
      
      if (relatedResources.length > 0) {
        path += `   - Start with: "${relatedResources[0].title}"\n`;
        if (relatedResources[0].metadata.difficulty) {
          path += `   - Difficulty: ${relatedResources[0].metadata.difficulty}\n`;
        }
      }
      path += '\n';
    });
    
    path += '\n💡 Pro tip: Focus on one area at a time for better retention!';
    
    return path;
  }
  
  /**
   * Calculate average relevance score
   */
  private calculateAverageRelevance(results: ContextSearchResult[]): number {
    if (results.length === 0) return 0;
    const sum = results.reduce((acc, r) => acc + r.relevanceScore, 0);
    return sum / results.length;
  }
  
  /**
   * Get tool metadata
   */
  getMetadata(): ToolMetadata {
    return {
      id: this.id,
      name: this.name,
      description: 'Retrieves educational context from Vector DB and web sources using MCP',
      author: 'CodeQual',
      homepage: 'https://github.com/codequal/context-mcp',
      documentationUrl: 'https://docs.codequal.com/tools/context-mcp',
      supportedRoles: ['educational', 'reporting'] as AgentRole[],
      supportedLanguages: [], // All languages
      supportedFrameworks: [],
      tags: ['education', 'context', 'knowledge', 'learning', 'vectordb', 'rag'],
      securityVerified: true,
      lastVerified: new Date('2025-06-07')
    };
  }
}

// Export singleton instance
export const contextMCPAdapter = new ContextMCPAdapter();
