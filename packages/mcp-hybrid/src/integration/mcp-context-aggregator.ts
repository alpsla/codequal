/**
 * MCP Context Aggregator
 * Collects and stores MCP tool results in Vector DB for agent consumption
 * Similar to DeepWiki approach but for MCP tools
 */

import { toolRegistry } from '../core/registry';
import { AnalysisContext, AgentRole, ToolResult } from '../core/interfaces';
import { createLogger } from '@codequal/core';

// Mock VectorDBService until the real one is available
class VectorDBService {
  async store(key: string, data: any): Promise<void> {
    // TODO: Implement actual vector DB storage
    console.log(`Storing in Vector DB: ${key}`);
  }
  
  async retrieve(key: string): Promise<any> {
    // TODO: Implement actual vector DB retrieval
    console.log(`Retrieving from Vector DB: ${key}`);
    return null;
  }
}

export interface MCPContextData {
  toolId: string;
  toolType: 'mcp' | 'direct';
  agentRole: AgentRole;
  findings: any[];
  metrics?: Record<string, any>;
  searchQueries?: string[]; // For Tavily tracking
  timestamp: Date;
}

export interface AggregatedMCPContext {
  repository: string;
  prNumber: number;
  contexts: Record<AgentRole, MCPContextData[]>;
  tavilySearches: {
    total: number;
    byRole: Record<AgentRole, number>;
    queries: string[];
  };
}

export class MCPContextAggregator {
  private logger = createLogger('MCPContextAggregator');
  private vectorDB: VectorDBService;
  
  constructor(vectorDB: VectorDBService) {
    this.vectorDB = vectorDB;
  }
  
  /**
   * Run all MCP tools and store results in Vector DB
   * This is called once during initial analysis
   */
  async preComputeMCPAnalysis(context: AnalysisContext): Promise<AggregatedMCPContext> {
    this.logger.info('Starting MCP pre-computation phase');
    
    const aggregatedContext: AggregatedMCPContext = {
      repository: context.repository.name,
      prNumber: context.pr.prNumber,
      contexts: {} as Record<AgentRole, MCPContextData[]>,
      tavilySearches: {
        total: 0,
        byRole: {} as Record<AgentRole, number>,
        queries: []
      }
    };
    
    // Get all agent roles
    const agentRoles: AgentRole[] = ['security', 'codeQuality', 'dependency', 'performance', 'architecture', 'educational'];
    
    // Run tools for each role
    for (const role of agentRoles) {
      this.logger.info(`Running MCP tools for role: ${role}`);
      aggregatedContext.contexts[role] = [];
      aggregatedContext.tavilySearches.byRole[role] = 0;
      
      // Get tools for this role
      const tools = toolRegistry.getToolsForRole(role);
      const mcpTools = tools.filter(t => t.type === 'mcp');
      
      // Execute each tool
      for (const tool of mcpTools) {
        try {
          // Create role-specific context
          const roleContext = { ...context, agentRole: role };
          
          // Execute tool
          const result: ToolResult = await tool.analyze(roleContext);
          
          if (result.success && result.findings) {
            const contextData: MCPContextData = {
              toolId: tool.id,
              toolType: tool.type,
              agentRole: role,
              findings: result.findings,
              metrics: result.metrics,
              timestamp: new Date()
            };
            
            // Track Tavily searches
            if (tool.id === 'tavily-mcp') {
              const searchCount = result.metrics?.queriesPerformed || 0;
              aggregatedContext.tavilySearches.total += searchCount;
              aggregatedContext.tavilySearches.byRole[role] += searchCount;
              
              // Extract search queries from findings
              const queries = result.findings
                .filter(f => f.category === 'search')
                .map(f => f.message.replace(/^.*?: /, ''));
              contextData.searchQueries = queries;
              aggregatedContext.tavilySearches.queries.push(...queries);
            }
            
            aggregatedContext.contexts[role].push(contextData);
          }
        } catch (error) {
          this.logger.error(`Failed to run tool ${tool.id} for role ${role}: ${error}`);
        }
      }
    }
    
    // Store in Vector DB
    await this.storeMCPContext(aggregatedContext);
    
    this.logger.info(`MCP pre-computation complete. Total Tavily searches: ${aggregatedContext.tavilySearches.total}`);
    
    return aggregatedContext;
  }
  
  /**
   * Store MCP context in Vector DB with embeddings
   */
  private async storeMCPContext(context: AggregatedMCPContext): Promise<void> {
    const key = `mcp-context:${context.repository}:pr-${context.prNumber}`;
    
    // Create embeddings for each role's findings
    for (const [role, contextData] of Object.entries(context.contexts)) {
      if (contextData.length === 0) continue;
      
      // Combine all findings for embedding
      const findingsText = contextData
        .flatMap(cd => cd.findings)
        .map(f => `${f.type} ${f.severity}: ${f.message}`)
        .join('\n');
      
      // Store with role-specific key
      const roleKey = `${key}:${role}`;
      await this.vectorDB.store(roleKey, {
        role,
        contextData,
        findingsText,
        timestamp: new Date()
      });
    }
    
    // Store aggregated metadata
    await this.vectorDB.store(`${key}:metadata`, {
      tavilySearches: context.tavilySearches,
      roles: Object.keys(context.contexts),
      timestamp: new Date()
    });
  }
  
  /**
   * Retrieve MCP context for a specific agent role
   * Called by agents during their analysis phase
   */
  async getMCPContextForAgent(
    repository: string, 
    prNumber: number, 
    role: AgentRole
  ): Promise<MCPContextData[]> {
    const key = `mcp-context:${repository}:pr-${prNumber}:${role}`;
    
    try {
      const stored = await this.vectorDB.retrieve(key);
      return stored?.contextData || [];
    } catch (error) {
      this.logger.error(`Failed to retrieve MCP context for ${role}: ${error}`);
      return [];
    }
  }
  
  /**
   * Get Tavily search statistics
   */
  async getTavilyUsageStats(repository: string, prNumber: number): Promise<any> {
    const key = `mcp-context:${repository}:pr-${prNumber}:metadata`;
    
    try {
      const metadata = await this.vectorDB.retrieve(key);
      return metadata?.tavilySearches || { total: 0, byRole: {}, queries: [] };
    } catch (error) {
      this.logger.error(`Failed to retrieve Tavily stats: ${error}`);
      return { total: 0, byRole: {}, queries: [] };
    }
  }
}

// Export singleton instance
export const mcpContextAggregator = new MCPContextAggregator(
  new VectorDBService() // This would be injected in real implementation
);