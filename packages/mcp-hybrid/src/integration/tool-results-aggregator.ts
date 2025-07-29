/**
 * Tool Results Aggregator with Role-Based Chunking
 * Applies DeepWiki approach to ALL tools (MCP and Direct)
 * Chunks results by agent role for efficient retrieval
 */

import { 
  ToolResult, 
  AgentRole, 
  AnalysisContext,
  ToolFinding 
} from '../core/interfaces';
import { toolRegistry } from '../core/registry';
import { logging } from '@codequal/core';
import { createVectorDB } from '../services/vector-db-service';

// Embedding service interface (matches your existing implementation)
interface EmbeddingService {
  createEmbedding(text: string, type: 'document' | 'code'): Promise<number[]>;
}

// Mock implementation - replace with actual service
class MockEmbeddingService implements EmbeddingService {
  async createEmbedding(text: string, type: 'document' | 'code'): Promise<number[]> {
    // In production, this would call:
    // - OpenAI text-embedding-3-large for documents
    // - Voyage embeddings for code
    console.log(`Creating ${type} embedding using ${type === 'document' ? 'text-embedding-3-large' : 'voyage'}`);
    return Array(1536).fill(0).map(() => Math.random());
  }
}

export interface ChunkedToolResult {
  toolId: string;
  toolType: 'mcp' | 'direct';
  agentRole: AgentRole;
  chunk: {
    findings: ToolFinding[];
    metrics: Record<string, any>;
    summary: string;
  };
  embedding: number[];
  metadata: {
    timestamp: Date;
    executionTime: number;
    findingsCount: number;
  };
}

export interface RoleBasedToolContext {
  repository: string;
  prNumber: number;
  role: AgentRole;
  chunks: ChunkedToolResult[];
  aggregatedMetrics: {
    totalFindings: number;
    criticalFindings: number;
    toolsExecuted: string[];
    tavilySearches?: number;
  };
}

export class ToolResultsAggregator {
  private logger = logging.createLogger('ToolResultsAggregator');
  private embeddingService: EmbeddingService;
  private _vectorDB: any | null = null; // Lazy initialization
  
  constructor(embeddingService: EmbeddingService, vectorDB?: any) {
    this.embeddingService = embeddingService;
    if (vectorDB) {
      this._vectorDB = vectorDB;
    }
  }
  
  // Lazy getter for Vector DB
  private get vectorDB(): any {
    if (!this._vectorDB) {
      this._vectorDB = createVectorDB();
    }
    return this._vectorDB;
  }
  
  /**
   * Apply DeepWiki approach to ALL tools
   * Execute once, chunk by role, store with embeddings
   */
  async aggregateAllToolResults(context: AnalysisContext): Promise<Map<AgentRole, RoleBasedToolContext>> {
    this.logger.info('Starting comprehensive tool aggregation for all roles');
    
    const roleContexts = new Map<AgentRole, RoleBasedToolContext>();
    const agentRoles: AgentRole[] = ['security', 'codeQuality', 'dependency', 'performance', 'architecture', 'educational', 'reporting'];
    
    // Process each role
    for (const role of agentRoles) {
      this.logger.info(`Processing tools for role: ${role}`);
      
      const roleContext: RoleBasedToolContext = {
        repository: context.repository.name,
        prNumber: context.pr.prNumber,
        role,
        chunks: [],
        aggregatedMetrics: {
          totalFindings: 0,
          criticalFindings: 0,
          toolsExecuted: [],
          tavilySearches: 0
        }
      };
      
      // Get ALL tools for this role (MCP + Direct)
      const tools = await toolRegistry.getToolsForRole(role);
      
      // Execute each tool and create chunks
      for (const tool of tools) {
        try {
          const startTime = Date.now();
          const result = await tool.analyze({ ...context, agentRole: role });
          const executionTime = Date.now() - startTime;
          
          if (result.success && result.findings) {
            // Create role-specific chunk
            const chunk = await this.createRoleChunk(
              tool.id,
              tool.type,
              role,
              result,
              executionTime
            );
            
            roleContext.chunks.push(chunk);
            
            // Update aggregated metrics
            roleContext.aggregatedMetrics.totalFindings += result.findings.length;
            roleContext.aggregatedMetrics.criticalFindings += 
              result.findings.filter(f => f.severity === 'critical').length;
            roleContext.aggregatedMetrics.toolsExecuted.push(tool.id);
            
            // Track Tavily searches
            if (tool.id === 'tavily-mcp' && result.metrics?.queriesPerformed) {
              roleContext.aggregatedMetrics.tavilySearches! += result.metrics.queriesPerformed;
            }
          }
        } catch (error) {
          this.logger.error(`Failed to run tool ${tool.id} for role ${role}: ${error}`);
        }
      }
      
      // Store role context in Vector DB
      await this.storeRoleContext(roleContext);
      roleContexts.set(role, roleContext);
    }
    
    return roleContexts;
  }
  
  /**
   * Create a chunk for specific role with embeddings
   */
  private async createRoleChunk(
    toolId: string,
    toolType: 'mcp' | 'direct',
    role: AgentRole,
    result: ToolResult,
    executionTime: number
  ): Promise<ChunkedToolResult> {
    // Create summary text for embedding
    const summaryText = this.createChunkSummary(toolId, role, result);
    
    // Determine embedding type based on content
    const embeddingType = this.isCodeRelated(toolId) ? 'code' : 'document';
    const embedding = await this.embeddingService.createEmbedding(summaryText, embeddingType);
    
    return {
      toolId,
      toolType,
      agentRole: role,
      chunk: {
        findings: result.findings || [],
        metrics: result.metrics || {},
        summary: summaryText
      },
      embedding,
      metadata: {
        timestamp: new Date(),
        executionTime,
        findingsCount: result.findings?.length || 0
      }
    };
  }
  
  /**
   * Create summary text for embedding
   */
  private createChunkSummary(toolId: string, role: AgentRole, result: ToolResult): string {
    const findings = result.findings || [];
    const metrics = result.metrics || {};
    
    // Role-specific summary creation
    let summary = `${role} analysis using ${toolId}:\n`;
    
    // Add findings summary
    if (findings.length > 0) {
      const criticalCount = findings.filter(f => f.severity === 'critical').length;
      const highCount = findings.filter(f => f.severity === 'high').length;
      
      summary += `Found ${findings.length} issues (${criticalCount} critical, ${highCount} high).\n`;
      
      // Include top findings
      const topFindings = findings.slice(0, 5);
      topFindings.forEach(f => {
        summary += `- ${f.severity}: ${f.message}\n`;
      });
    }
    
    // Add metrics summary
    if (Object.keys(metrics).length > 0) {
      summary += `Metrics: ${JSON.stringify(metrics, null, 2)}\n`;
    }
    
    // Special handling for Tavily in reporting role
    if (toolId === 'tavily-mcp' && role === 'reporting') {
      summary += this.createTavilyReportingSummary(result);
    }
    
    return summary;
  }
  
  /**
   * Special summary for Tavily in reporting role
   */
  private createTavilyReportingSummary(result: ToolResult): string {
    let summary = '\nOrganized Web Data for Presentation:\n';
    
    const findings = result.findings || [];
    
    // Group by category for reporting
    const categories = new Map<string, ToolFinding[]>();
    findings.forEach(f => {
      const category = f.category || 'general';
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push(f);
    });
    
    // Create structured summary
    categories.forEach((items, category) => {
      summary += `\n${category.toUpperCase()}:\n`;
      items.forEach(item => {
        summary += `  • ${item.message}\n`;
        if (item.documentation) {
          summary += `    Documentation: ${item.documentation.substring(0, 200)}...\n`;
        }
      });
    });
    
    return summary;
  }
  
  /**
   * Determine if tool produces code-related content
   */
  private isCodeRelated(toolId: string): boolean {
    const codeTools = [
      'semgrep-mcp',
      'eslint-mcp',
      'sonarjs-mcp',
      'prettier-direct',
      'dependency-cruiser-direct',
      'madge-direct',
      'serena-mcp'
    ];
    
    return codeTools.includes(toolId);
  }
  
  /**
   * Store role context in Vector DB with embeddings
   */
  private async storeRoleContext(context: RoleBasedToolContext): Promise<void> {
    const baseKey = `tool-context:${context.repository}:pr-${context.prNumber}:${context.role}`;
    
    // Store individual chunks with embeddings
    for (let i = 0; i < context.chunks.length; i++) {
      const chunk = context.chunks[i];
      const chunkKey = `${baseKey}:chunk-${i}`;
      
      await this.vectorDB.store(chunkKey, {
        chunk: chunk.chunk,
        toolId: chunk.toolId,
        toolType: chunk.toolType,
        embedding: chunk.embedding,
        metadata: chunk.metadata
      });
    }
    
    // Store aggregated metrics
    await this.vectorDB.store(`${baseKey}:metrics`, {
      aggregatedMetrics: context.aggregatedMetrics,
      chunkCount: context.chunks.length,
      timestamp: new Date()
    });
    
    this.logger.info(`Stored ${context.chunks.length} chunks for role ${context.role}`);
  }
  
  /**
   * Retrieve role-specific context for agents
   */
  async getToolContextForAgent(
    repository: string,
    prNumber: number,
    role: AgentRole,
    semanticQuery?: string
  ): Promise<RoleBasedToolContext | null> {
    const baseKey = `tool-context:${repository}:pr-${prNumber}:${role}`;
    
    try {
      // Get metrics
      const metrics = await this.vectorDB.retrieve(`${baseKey}:metrics`);
      if (!metrics) return null;
      
      // If semantic query provided, use vector search
      if (semanticQuery) {
        const queryEmbedding = await this.embeddingService.createEmbedding(
          semanticQuery, 
          'document'
        );
        
        // Vector similarity search
        const relevantChunks = await this.vectorDB.semanticSearch(
          baseKey,
          queryEmbedding,
          5 // top 5 most relevant chunks
        );
        
        return {
          repository,
          prNumber,
          role,
          chunks: relevantChunks,
          aggregatedMetrics: metrics.aggregatedMetrics
        };
      }
      
      // Otherwise, retrieve all chunks
      const chunks: ChunkedToolResult[] = [];
      for (let i = 0; i < metrics.chunkCount; i++) {
        const chunk = await this.vectorDB.retrieve(`${baseKey}:chunk-${i}`);
        if (chunk) chunks.push(chunk);
      }
      
      return {
        repository,
        prNumber,
        role,
        chunks,
        aggregatedMetrics: metrics.aggregatedMetrics
      };
      
    } catch (error) {
      this.logger.error(`Failed to retrieve tool context for ${role}: ${error}`);
      return null;
    }
  }
}

// Export singleton with mock services (replace with actual in production)
export const toolResultsAggregator = new ToolResultsAggregator(
  new MockEmbeddingService()
  // Vector DB will be created lazily when first used
);