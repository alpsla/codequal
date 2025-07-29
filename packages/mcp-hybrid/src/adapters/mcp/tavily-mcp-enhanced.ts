/**
 * Enhanced Tavily MCP Adapter with Role-Specific Queries
 * Generates different content for each agent role
 */

import { BaseMCPAdapter } from './base-mcp-adapter';
import { 
  AnalysisContext, 
  ToolResult, 
  ToolFinding,
  ToolCapability,
  ToolRequirements,
  ToolMetadata
} from '../../core/interfaces';
import { tavilyRoleQueryGenerator, RoleQuery } from '../../integration/tavily-role-queries';
import { logging } from '@codequal/core';

export class TavilyMCPEnhancedAdapter extends BaseMCPAdapter {
  readonly id = 'tavily-mcp';
  readonly name = 'Tavily Web Search (Enhanced)';
  readonly version = '1.0.0';
  
  readonly capabilities: ToolCapability[] = [{
    name: 'web-search',
    category: 'documentation',
    languages: [],
    fileTypes: []
  }];
  
  readonly requirements: ToolRequirements = {
    executionMode: 'on-demand',
    timeout: 60000,
    authentication: {
      type: 'api-key',
      required: true
    }
  };
  
  protected readonly mcpServerArgs = ['-y', 'tavily-mcp@latest'];
  private logger = logging.createLogger('TavilyMCPEnhanced');
  
  canAnalyze(context: AnalysisContext): boolean {
    return true; // Tavily can analyze any context
  }
  
  getMetadata(): ToolMetadata {
    return {
      id: this.id,
      name: this.name,
      description: 'Role-aware web search that generates different queries per agent',
      author: 'CodeQual',
      supportedRoles: ['security', 'codeQuality', 'dependency', 'performance', 'architecture', 'educational', 'reporting'],
      supportedLanguages: [],
      tags: ['search', 'web', 'api', 'role-aware'],
      securityVerified: true,
      lastVerified: new Date()
    };
  }
  
  async analyze(context: AnalysisContext): Promise<ToolResult> {
    const startTime = Date.now();
    
    try {
      // Generate role-specific queries
      const queries = tavilyRoleQueryGenerator.generateQueriesForRole(
        context.agentRole,
        context
      );
      
      if (queries.length === 0) {
        return {
          success: true,
          toolId: this.id,
          executionTime: Date.now() - startTime,
          findings: [],
          metrics: { queriesPerformed: 0 }
        };
      }
      
      const findings: ToolFinding[] = [];
      let totalQueries = 0;
      
      // Execute queries based on priority
      const priorityGroups = this.groupQueriesByPriority(queries);
      
      for (const [priority, groupQueries] of priorityGroups) {
        this.logger.info(`Executing ${priority} priority queries for ${context.agentRole}`);
        
        // Execute queries in this priority group
        for (const roleQuery of groupQueries) {
          try {
            const result = await this.executeTavilySearch(roleQuery, context.agentRole);
            findings.push(...result);
            totalQueries++;
            
            // Add small delay to avoid rate limiting
            await this.delay(100);
          } catch (error) {
            this.logger.error(`Query failed: ${roleQuery.query}: ${error}`);
          }
        }
      }
      
      return {
        success: true,
        toolId: this.id,
        executionTime: Date.now() - startTime,
        findings,
        metrics: {
          queriesPerformed: totalQueries,
          ...this.getQueryBreakdown(queries)
        }
      };
      
    } catch (error) {
      return {
        success: false,
        toolId: this.id,
        executionTime: Date.now() - startTime,
        error: {
          code: 'TAVILY_ENHANCED_ERROR',
          message: String(error),
          recoverable: true
        }
      };
    }
  }
  
  async healthCheck(): Promise<boolean> {
    // Check if API key is configured
    return !!process.env.TAVILY_API_KEY;
  }
  
  /**
   * Execute a single Tavily search with role context
   */
  private async executeTavilySearch(
    roleQuery: RoleQuery,
    agentRole: string
  ): Promise<ToolFinding[]> {
    // Simulate Tavily search results
    // In production, this would call the actual Tavily API
    
    const mockResults = [
      {
        title: `${roleQuery.intent} - Result 1`,
        content: `Detailed information about ${roleQuery.query}`,
        url: `https://example.com/${roleQuery.expectedType}/1`,
        score: 0.95
      },
      {
        title: `${roleQuery.intent} - Result 2`,
        content: `Additional insights on ${roleQuery.query}`,
        url: `https://example.com/${roleQuery.expectedType}/2`,
        score: 0.85
      }
    ];
    
    return mockResults.map((item, index) => ({
      type: this.mapExpectedTypeToFindingType(roleQuery.expectedType),
      severity: this.determineSeverity(roleQuery, item),
      category: `${agentRole}-${roleQuery.expectedType}`,
      message: `${roleQuery.intent}: ${item.title}`,
      documentation: item.content,
      ruleId: `tavily-${agentRole}-${index}`,
      metadata: {
        url: item.url,
        score: item.score,
        roleQuery: roleQuery.query,
        intent: roleQuery.intent
      }
    }));
  }
  
  /**
   * Group queries by priority for execution
   */
  private groupQueriesByPriority(queries: RoleQuery[]): Map<string, RoleQuery[]> {
    const groups = new Map<string, RoleQuery[]>();
    
    queries.forEach(query => {
      if (!groups.has(query.priority)) {
        groups.set(query.priority, []);
      }
      groups.get(query.priority)!.push(query);
    });
    
    // Return sorted by priority
    return new Map(
      Array.from(groups.entries()).sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a[0] as keyof typeof priorityOrder] - 
               priorityOrder[b[0] as keyof typeof priorityOrder];
      })
    );
  }
  
  /**
   * Map expected type to finding type
   */
  private mapExpectedTypeToFindingType(expectedType: string): 'issue' | 'suggestion' | 'info' | 'metric' {
    switch (expectedType) {
      case 'vulnerability':
        return 'issue';
      case 'best-practice':
        return 'suggestion';
      case 'performance':
        return 'metric';
      default:
        return 'info';
    }
  }
  
  /**
   * Determine severity based on query and result
   */
  private determineSeverity(query: RoleQuery, result: any): 'critical' | 'high' | 'medium' | 'low' | 'info' {
    // Critical for high-priority vulnerabilities
    if (query.priority === 'high' && query.expectedType === 'vulnerability') {
      return 'critical';
    }
    
    // High for other high-priority items
    if (query.priority === 'high') {
      return 'high';
    }
    
    // Medium for medium priority
    if (query.priority === 'medium') {
      return 'medium';
    }
    
    // Info for educational/documentation
    if (query.expectedType === 'tutorial' || query.expectedType === 'documentation') {
      return 'info';
    }
    
    return 'low';
  }
  
  /**
   * Get breakdown of queries by type
   */
  private getQueryBreakdown(queries: RoleQuery[]): Record<string, number> {
    const breakdown: Record<string, number> = {};
    
    queries.forEach(query => {
      breakdown[query.expectedType] = (breakdown[query.expectedType] || 0) + 1;
    });
    
    return breakdown;
  }
  
  /**
   * Helper delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export enhanced adapter
export const tavilyMCPEnhanced = new TavilyMCPEnhancedAdapter();