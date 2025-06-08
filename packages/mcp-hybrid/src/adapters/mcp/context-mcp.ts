/**
 * Context MCP Adapter
 * Retrieves relevant context from Vector DB and web for educational purposes
 */

import { spawn } from 'child_process';
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

interface ContextSearchResult {
  source: 'vectorDB' | 'web' | 'documentation';
  title: string;
  content: string;
  relevanceScore: number;
  metadata: {
    skillLevel?: string;
    topics?: string[];
    difficulty?: string;
    learningPath?: string;
  };
}

export class ContextMCPAdapter implements Tool {
  readonly id = 'context-mcp';
  readonly name = 'Context Retrieval MCP';
  readonly type = 'mcp' as const;
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
    const findings: ToolFinding[] = [];
    
    try {
      // Extract key concepts from PR
      const concepts = this.extractConcepts(context);
      
      // Search Vector DB for relevant educational content
      const vectorResults = await this.searchVectorDB(concepts, context);
      
      // Search web for additional resources
      const webResults = await this.searchWeb(concepts, context);
      
      // Identify skill gaps and learning opportunities
      const skillGaps = this.identifySkillGaps(context, vectorResults);
      
      // Generate educational findings
      findings.push(...this.generateEducationalFindings(
        vectorResults,
        webResults,
        skillGaps,
        context
      ));
      
      return {
        success: true,
        toolId: this.id,
        executionTime: Date.now() - startTime,
        findings,
        metrics: {
          contextSourcesFound: vectorResults.length + webResults.length,
          skillGapsIdentified: skillGaps.length,
          learningResourcesFound: findings.filter(f => f.type === 'info').length,
          relevanceScore: this.calculateAverageRelevance(vectorResults)
        }
      };
    } catch (error: any) // eslint-disable-line @typescript-eslint/no-explicit-any { // eslint-disable-line @typescript-eslint/no-explicit-any
      return {
        success: false,
        toolId: this.id,
        executionTime: Date.now() - startTime,
        error: {
          code: 'CONTEXT_RETRIEVAL_FAILED',
          message: error.message,
          recoverable: true
        }
      };
    }
  }
  
  /**
   * Extract key concepts from PR for context search
   */
  private extractConcepts(context: AnalysisContext): string[] {
    const concepts: Set<string> = new Set();
    
    // Extract from PR title and description
    const titleWords = context.pr.title.toLowerCase().split(/\s+/);
    const descWords = context.pr.description.toLowerCase().split(/\s+/);
    
    // Common programming concepts to look for
    const programmingConcepts = [
      'api', 'database', 'authentication', 'security', 'performance',
      'testing', 'deployment', 'ci/cd', 'react', 'vue', 'angular',
      'typescript', 'javascript', 'python', 'async', 'promise',
      'hook', 'component', 'service', 'controller', 'model'
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
    
    return Array.from(concepts);
  }
  
  /**
   * Search Vector DB for educational content
   */
  private async searchVectorDB(
    concepts: string[],
    context: AnalysisContext
  ): Promise<ContextSearchResult[]> {
    // In real implementation, this would call the actual context-mcp tool
    // For now, return mock results
    
    const results: ContextSearchResult[] = [];
    
    // Simulate Vector DB search
    for (const concept of concepts.slice(0, 3)) { // Top 3 concepts
      results.push({
        source: 'vectorDB',
        title: `Best practices for ${concept}`,
        content: `Educational content about ${concept} from internal knowledge base...`,
        relevanceScore: 0.85,
        metadata: {
          skillLevel: 'intermediate',
          topics: [concept, 'best-practices'],
          difficulty: 'medium'
        }
      });
    }
    
    return results;
  }
  
  /**
   * Search web for educational resources
   */
  private async searchWeb(
    concepts: string[],
    context: AnalysisContext
  ): Promise<ContextSearchResult[]> {
    // Would integrate with web-search-mcp
    const results: ContextSearchResult[] = [];
    
    // Simulate web search
    if (concepts.length > 0) {
      results.push({
        source: 'web',
        title: `${concepts[0]} tutorial for beginners`,
        content: `External tutorial resource...`,
        relevanceScore: 0.75,
        metadata: {
          skillLevel: 'beginner',
          topics: concepts,
          learningPath: 'fundamentals'
        }
      });
    }
    
    return results;
  }
  
  /**
   * Identify skill gaps based on PR and context
   */
  private identifySkillGaps(
    context: AnalysisContext,
    vectorResults: ContextSearchResult[]
  ): string[] {
    const gaps: string[] = [];
    
    // Check for common patterns that indicate skill gaps
    const prFiles = context.pr.files;
    
    // No tests added?
    if (!prFiles.some(f => f.path.includes('test') || f.path.includes('spec'))) {
      gaps.push('Unit testing');
    }
    
    // No documentation?
    if (!prFiles.some(f => f.path.endsWith('.md') || f.path.includes('docs'))) {
      gaps.push('Documentation practices');
    }
    
    // Complex code without comments?
    const hasComplexCode = prFiles.some(f => 
      f.content.split('\n').length > 100 && 
      !f.content.includes('/**') && 
      !f.content.includes('//')
    );
    if (hasComplexCode) {
      gaps.push('Code commenting');
    }
    
    return gaps;
  }
  
  /**
   * Generate educational findings
   */
  private generateEducationalFindings(
    vectorResults: ContextSearchResult[],
    webResults: ContextSearchResult[],
    skillGaps: string[],
    context: AnalysisContext
  ): ToolFinding[] {
    const findings: ToolFinding[] = [];
    
    // Add relevant educational resources
    vectorResults.forEach(result => {
      findings.push({
        type: 'info',
        severity: 'info',
        category: 'documentation',
        message: `Educational resource found: "${result.title}" (relevance: ${result.relevanceScore.toFixed(2)})`,
        ruleId: 'educational-resource',
        documentation: result.content
      });
    });
    
    // Add skill gap findings
    skillGaps.forEach(gap => {
      findings.push({
        type: 'suggestion',
        severity: 'low',
        category: 'documentation',
        message: `Learning opportunity identified: ${gap}`,
        ruleId: 'skill-gap',
        documentation: `Consider improving your ${gap} skills for better code quality`
      });
    });
    
    // Add learning path suggestions
    if (skillGaps.length > 0) {
      findings.push({
        type: 'info',
        severity: 'info',
        category: 'documentation',
        message: `Suggested learning path: ${skillGaps.join(' → ')}`,
        ruleId: 'learning-path'
      });
    }
    
    return findings;
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
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    // Check if context-mcp service is available
    // In real implementation, would check actual service
    return true;
  }
  
  /**
   * Get tool metadata
   */
  getMetadata(): ToolMetadata {
    return {
      id: this.id,
      name: this.name,
      description: 'Retrieves educational context from Vector DB and web sources',
      author: 'CodeQual',
      homepage: 'https://github.com/codequal/context-mcp',
      documentationUrl: 'https://docs.codequal.com/tools/context-mcp',
      supportedRoles: ['educational'] as AgentRole[],
      supportedLanguages: [], // All languages
      supportedFrameworks: [],
      tags: ['education', 'context', 'knowledge', 'learning'],
      securityVerified: true,
      lastVerified: new Date('2025-06-07')
    };
  }
}

// Export singleton instance
export const contextMCPAdapter = new ContextMCPAdapter();
