/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-unused-vars, no-console */

import { VectorStorageService } from '@codequal/database';
import { Logger } from '../../utils/logger';

/**
 * Tool result data retrieved from Vector DB
 */
export interface ToolResultData {
  toolId: string;
  agentRole: string;
  content: string;
  metadata: {
    executedAt: string;
    prNumber?: number;
    commitHash?: string;
    scheduledRun: boolean;
    isLatest: boolean;
    score?: number;
    [key: string]: any;
  };
  repositoryId: string;
}

/**
 * Aggregated tool results for an agent role
 */
export interface AgentToolResults {
  agentRole: string;
  repositoryId: string;
  lastExecuted: string;
  toolResults: ToolResultData[];
  summary: {
    totalTools: number;
    latestResults: boolean;
    scores: Record<string, number>;
    keyFindings: string[];
  };
}

/**
 * Tool result filtering options
 */
export interface ToolResultFilter {
  repositoryId: string;
  agentRoles?: string[];
  toolIds?: string[];
  includeMetadata?: boolean;
  latestOnly?: boolean;
  minScore?: number;
  maxAge?: number; // in days
}

/**
 * Agent role to tool mapping (from storage service)
 */
const AGENT_TOOL_MAPPING: Record<string, string[]> = {
  'security': ['npm-audit', 'license-checker'],
  'architecture': ['madge', 'dependency-cruiser'],
  'dependency': ['license-checker', 'npm-outdated'],
  'performance': ['bundlephobia', 'lighthouse-ci'],
  'codeQuality': ['eslint', 'prettier-check', 'typescript-strict', 'jest-coverage', 'nyc-coverage']
};

/**
 * Service for retrieving tool results from Vector DB for agent consumption
 */
export class ToolResultRetrievalService {
  private logger: Logger;
  
  constructor(
    private vectorStorage: VectorStorageService,
    logger?: Logger
  ) {
    this.logger = logger || console as any;
  }
  
  /**
   * Retrieve tool results for specific agent roles
   */
  async getToolResultsForAgent(
    repositoryId: string,
    agentRole: string,
    options: {
      includeScores?: boolean;
      minAge?: number;
      latestOnly?: boolean;
    } = {}
  ): Promise<AgentToolResults | null> {
    try {
      const toolIds = AGENT_TOOL_MAPPING[agentRole] || [];
      
      if (toolIds.length === 0) {
        this.logger.info(`No tools configured for agent role: ${agentRole}`);
        return null;
      }
      
      const filter: ToolResultFilter = {
        repositoryId,
        agentRoles: [agentRole],
        toolIds,
        includeMetadata: true,
        latestOnly: options.latestOnly !== false,
        maxAge: options.minAge || 30 // Default 30 days
      };
      
      const toolResults = await this.retrieveToolResults(filter);
      
      if (toolResults.length === 0) {
        this.logger.info(`No tool results found for agent ${agentRole} in repository ${repositoryId}`);
        return null;
      }
      
      return this.aggregateResultsForAgent(agentRole, repositoryId, toolResults);
      
    } catch (error) {
      this.logger.error(`Error retrieving tool results for agent ${agentRole}:`, error as Error);
      return null;
    }
  }
  
  /**
   * Retrieve tool results for multiple agent roles
   */
  async getToolResultsForAgents(
    repositoryId: string,
    agentRoles: string[],
    options: {
      includeScores?: boolean;
      minAge?: number;
      latestOnly?: boolean;
    } = {}
  ): Promise<Record<string, AgentToolResults>> {
    const results: Record<string, AgentToolResults> = {};
    
    // Retrieve results for each agent role in parallel
    const promises = agentRoles.map(async (agentRole) => {
      const agentResults = await this.getToolResultsForAgent(repositoryId, agentRole, options);
      if (agentResults) {
        results[agentRole] = agentResults;
      }
    });
    
    await Promise.all(promises);
    
    return results;
  }
  
  /**
   * Get available tool results summary for a repository
   */
  async getRepositoryToolSummary(repositoryId: string): Promise<{
    hasResults: boolean;
    lastExecuted?: string;
    availableTools: string[];
    agentCoverage: Record<string, string[]>;
    totalResults: number;
  }> {
    try {
      const allResults = await this.retrieveToolResults({
        repositoryId,
        includeMetadata: true,
        latestOnly: true
      });
      
      if (allResults.length === 0) {
        return {
          hasResults: false,
          availableTools: [],
          agentCoverage: {},
          totalResults: 0
        };
      }
      
      const availableTools = [...new Set(allResults.map(r => r.toolId))];
      const lastExecuted = allResults
        .map(r => new Date(r.metadata.executedAt))
        .sort((a, b) => b.getTime() - a.getTime())[0]
        .toISOString();
      
      // Map tools to their agent roles
      const agentCoverage: Record<string, string[]> = {};
      Object.entries(AGENT_TOOL_MAPPING).forEach(([agentRole, toolIds]) => {
        const availableForAgent = toolIds.filter(toolId => 
          availableTools.includes(toolId)
        );
        if (availableForAgent.length > 0) {
          agentCoverage[agentRole] = availableForAgent;
        }
      });
      
      return {
        hasResults: true,
        lastExecuted,
        availableTools,
        agentCoverage,
        totalResults: allResults.length
      };
      
    } catch (error) {
      this.logger.error('Error getting repository tool summary:', error as Error);
      return {
        hasResults: false,
        availableTools: [],
        agentCoverage: {},
        totalResults: 0
      };
    }
  }
  
  /**
   * Core method to retrieve tool results from Vector DB
   */
  private async retrieveToolResults(filter: ToolResultFilter): Promise<ToolResultData[]> {
    try {
      // Build search criteria for Vector DB
      const searchCriteria = {
        repositoryIds: [filter.repositoryId],
        contentTypes: ['tool_result'],
        metadata: {} as any
      };
      
      // Add agent role filter
      if (filter.agentRoles && filter.agentRoles.length > 0) {
        searchCriteria.metadata.agent_role = {
          in: filter.agentRoles
        };
      }
      
      // Add tool ID filter
      if (filter.toolIds && filter.toolIds.length > 0) {
        searchCriteria.metadata.tool_id = {
          in: filter.toolIds
        };
      }
      
      // Add latest only filter
      if (filter.latestOnly) {
        searchCriteria.metadata.is_latest = true;
      }
      
      // Add age filter
      if (filter.maxAge) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - filter.maxAge);
        searchCriteria.metadata.timestamp = {
          gte: cutoffDate.toISOString()
        };
      }
      
      // Query Vector DB for matching chunks
      const chunks = await this.vectorStorage.searchByMetadata(
        searchCriteria,
        100 // Reasonable limit for tool results
      );
      
      // Convert chunks to tool result data
      const toolResults: ToolResultData[] = chunks.map(chunk => ({
        toolId: chunk.metadata.tool_id || chunk.metadata.tool_name,
        agentRole: chunk.metadata.agent_role,
        content: chunk.content || '',
        metadata: {
          executedAt: chunk.metadata.timestamp,
          prNumber: chunk.metadata.pr_number,
          commitHash: chunk.metadata.commit_hash,
          scheduledRun: chunk.metadata.scheduled_run || false,
          isLatest: chunk.metadata.is_latest || false,
          score: this.extractScoreFromMetadata(chunk.metadata),
          ...chunk.metadata
        },
        repositoryId: filter.repositoryId
      }));
      
      // Apply score filter if specified
      if (filter.minScore !== undefined) {
        return toolResults.filter(result => 
          result.metadata.score !== undefined && 
          result.metadata.score >= filter.minScore!
        );
      }
      
      return toolResults;
      
    } catch (error) {
      this.logger.error('Error retrieving tool results from Vector DB:', error as Error);
      return [];
    }
  }
  
  /**
   * Aggregate tool results for a specific agent role
   */
  private aggregateResultsForAgent(
    agentRole: string,
    repositoryId: string,
    toolResults: ToolResultData[]
  ): AgentToolResults {
    const agentResults = toolResults.filter(r => r.agentRole === agentRole);
    
    // Find latest execution time
    const lastExecuted = agentResults
      .map(r => new Date(r.metadata.executedAt))
      .sort((a, b) => b.getTime() - a.getTime())[0]
      ?.toISOString() || new Date().toISOString();
    
    // Calculate scores by tool
    const scores: Record<string, number> = {};
    agentResults.forEach(result => {
      if (result.metadata.score !== undefined) {
        scores[result.toolId] = result.metadata.score;
      }
    });
    
    // Extract key findings
    const keyFindings = this.extractKeyFindings(agentResults);
    
    return {
      agentRole,
      repositoryId,
      lastExecuted,
      toolResults: agentResults,
      summary: {
        totalTools: agentResults.length,
        latestResults: agentResults.every(r => r.metadata.isLatest),
        scores,
        keyFindings
      }
    };
  }
  
  /**
   * Extract score from chunk metadata based on tool type
   */
  private extractScoreFromMetadata(metadata: any): number | undefined {
    // Different tools store scores in different fields
    return metadata.security_score || 
           metadata.compliance_score || 
           metadata.architecture_score || 
           metadata.dependency_score || 
           metadata.maintenance_score;
  }
  
  /**
   * Extract key findings from tool results for agent consumption
   */
  private extractKeyFindings(toolResults: ToolResultData[]): string[] {
    const findings: string[] = [];
    
    toolResults.forEach(result => {
      const metadata = result.metadata;
      
      switch (result.toolId) {
        case 'npm-audit':
          if (metadata.totalVulnerabilities > 0) {
            findings.push(`${metadata.totalVulnerabilities} security vulnerabilities found`);
          }
          break;
          
        case 'license-checker':
          if (metadata.riskyLicenses > 0) {
            findings.push(`${metadata.riskyLicenses} packages with risky licenses`);
          }
          break;
          
        case 'madge':
          if (metadata.circularDependencies > 0) {
            findings.push(`${metadata.circularDependencies} circular dependencies detected`);
          }
          break;
          
        case 'dependency-cruiser':
          if (metadata.violations > 0) {
            findings.push(`${metadata.violations} dependency rule violations`);
          }
          break;
          
        case 'npm-outdated':
          if (metadata.totalOutdated > 0) {
            findings.push(`${metadata.totalOutdated} packages need updates`);
          }
          break;
      }
    });
    
    return findings;
  }
  
  /**
   * Format tool results for agent prompt consumption
   */
  formatToolResultsForPrompt(agentResults: AgentToolResults): string {
    if (!agentResults || agentResults.toolResults.length === 0) {
      return `No recent tool analysis results available for ${agentResults.agentRole} role.`;
    }
    
    let prompt = `## Tool Analysis Results for ${agentResults.agentRole.toUpperCase()} Agent\n\n`;
    prompt += `**Last Analysis:** ${new Date(agentResults.lastExecuted).toLocaleString()}\n`;
    prompt += `**Tools Executed:** ${agentResults.summary.totalTools}\n`;
    
    if (agentResults.summary.keyFindings.length > 0) {
      prompt += `**Key Findings:**\n`;
      agentResults.summary.keyFindings.forEach(finding => {
        prompt += `- ${finding}\n`;
      });
      prompt += '\n';
    }
    
    // Add detailed tool results
    agentResults.toolResults.forEach(result => {
      prompt += `### ${result.toolId.toUpperCase()} Results\n`;
      if (result.metadata.score !== undefined) {
        prompt += `**Score:** ${result.metadata.score}/10\n`;
      }
      prompt += `${result.content}\n\n`;
    });
    
    prompt += `*Use this tool analysis data to inform your ${agentResults.agentRole} assessment of the current PR changes.*\n`;
    
    return prompt;
  }
  
  /**
   * Check if tool results are fresh enough for analysis
   */
  areResultsFresh(agentResults: AgentToolResults, maxAgeHours = 24): boolean {
    const lastExecuted = new Date(agentResults.lastExecuted);
    const now = new Date();
    const ageHours = (now.getTime() - lastExecuted.getTime()) / (1000 * 60 * 60);
    
    return ageHours <= maxAgeHours && agentResults.summary.latestResults;
  }
}