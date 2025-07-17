/**
 * Tool Results Vector Storage Service
 * Stores MCP tool execution results in Vector DB for future retrieval and learning
 */

import { createLogger } from '@codequal/core/utils';
import { v4 as uuidv4 } from 'uuid';

export interface ToolResultData {
  toolId: string;
  agentRole: string;
  executionTime: number;
  findings: Array<{
    type: 'issue' | 'suggestion' | 'info' | 'metric';
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    category: string;
    message: string;
    file?: string;
    line?: number;
    code?: string;
    suggestion?: string;
  }>;
  metrics?: Record<string, number>;
  context: {
    repositoryId: string;
    prNumber: number;
    analysisId: string;
    timestamp: Date;
  };
}

export interface ToolResultVectorEntry {
  id: string;
  content: string;
  metadata: {
    tool_id: string;
    agent_role: string;
    repository_id: string;
    pr_number: number;
    analysis_id: string;
    finding_type: string;
    severity: string;
    category: string;
    execution_time: number;
    created_at: string;
    metrics?: Record<string, number>;
  };
  embedding?: number[];
}

export class ToolResultsVectorStorage {
  private readonly logger = createLogger('ToolResultsVectorStorage');
  
  constructor(
    private readonly supabase: any,
    private readonly embeddingService: any
  ) {}

  /**
   * Store tool execution results in Vector DB
   */
  async storeToolResults(
    analysisId: string,
    repositoryId: string,
    prNumber: number,
    toolResults: ToolResultData[]
  ): Promise<void> {
    try {
      this.logger.info('Storing tool results in Vector DB', {
        analysisId,
        repositoryId,
        prNumber,
        resultsCount: toolResults.length
      });

      // Convert tool results to vector entries
      const vectorEntries = await this.createVectorEntries(
        analysisId,
        repositoryId,
        prNumber,
        toolResults
      );

      // Store in batches to avoid overwhelming the DB
      const batchSize = 50;
      for (let i = 0; i < vectorEntries.length; i += batchSize) {
        const batch = vectorEntries.slice(i, i + batchSize);
        await this.storeBatch(batch);
      }

      this.logger.info('Successfully stored tool results', {
        analysisId,
        entriesStored: vectorEntries.length
      });

    } catch (error) {
      this.logger.error('Failed to store tool results', {
        analysisId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Retrieve similar tool findings for a repository
   */
  async retrieveSimilarFindings(
    repositoryId: string,
    query: string,
    options: {
      toolId?: string;
      agentRole?: string;
      severity?: string;
      limit?: number;
      similarityThreshold?: number;
    } = {}
  ): Promise<ToolResultVectorEntry[]> {
    try {
      const filters: any = {
        repository_id: repositoryId
      };

      if (options.toolId) {
        filters.tool_id = options.toolId;
      }
      if (options.agentRole) {
        filters.agent_role = options.agentRole;
      }
      if (options.severity) {
        filters.severity = options.severity;
      }

      // Generate embedding for the query
      const queryEmbedding = await this.embeddingService.generateEmbedding(query);

      // Search in vector DB
      const { data, error } = await this.supabase
        .rpc('match_tool_results', {
          query_embedding: queryEmbedding,
          match_threshold: options.similarityThreshold || 0.7,
          match_count: options.limit || 10,
          filter: filters
        });

      if (error) {
        throw error;
      }

      return data || [];

    } catch (error) {
      this.logger.error('Failed to retrieve similar findings', {
        repositoryId,
        query,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get historical tool metrics for a repository
   */
  async getHistoricalMetrics(
    repositoryId: string,
    options: {
      toolId?: string;
      agentRole?: string;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<Record<string, any>> {
    try {
      let query = this.supabase
        .from('tool_results_vectors')
        .select('metadata')
        .eq('metadata->>repository_id', repositoryId);

      if (options.toolId) {
        query = query.eq('metadata->>tool_id', options.toolId);
      }
      if (options.agentRole) {
        query = query.eq('metadata->>agent_role', options.agentRole);
      }
      if (options.startDate) {
        query = query.gte('metadata->>created_at', options.startDate.toISOString());
      }
      if (options.endDate) {
        query = query.lte('metadata->>created_at', options.endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      // Aggregate metrics
      return this.aggregateMetrics(data || []);

    } catch (error) {
      this.logger.error('Failed to get historical metrics', {
        repositoryId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Create vector entries from tool results
   */
  private async createVectorEntries(
    analysisId: string,
    repositoryId: string,
    prNumber: number,
    toolResults: ToolResultData[]
  ): Promise<ToolResultVectorEntry[]> {
    const entries: ToolResultVectorEntry[] = [];

    for (const result of toolResults) {
      // Create entries for each finding
      for (const finding of result.findings) {
        const content = this.createFindingContent(finding, result);
        const embedding = await this.embeddingService.generateEmbedding(content);

        entries.push({
          id: uuidv4(),
          content,
          metadata: {
            tool_id: result.toolId,
            agent_role: result.agentRole,
            repository_id: repositoryId,
            pr_number: prNumber,
            analysis_id: analysisId,
            finding_type: finding.type,
            severity: finding.severity,
            category: finding.category,
            execution_time: result.executionTime,
            created_at: new Date().toISOString(),
            metrics: result.metrics
          },
          embedding
        });
      }

      // Create a summary entry for the tool execution
      if (result.findings.length > 0) {
        const summaryContent = this.createToolSummaryContent(result);
        const summaryEmbedding = await this.embeddingService.generateEmbedding(summaryContent);

        entries.push({
          id: uuidv4(),
          content: summaryContent,
          metadata: {
            tool_id: result.toolId,
            agent_role: result.agentRole,
            repository_id: repositoryId,
            pr_number: prNumber,
            analysis_id: analysisId,
            finding_type: 'summary',
            severity: this.getHighestSeverity(result.findings),
            category: 'tool_summary',
            execution_time: result.executionTime,
            created_at: new Date().toISOString(),
            metrics: {
              ...result.metrics,
              findings_count: result.findings.length,
              critical_count: result.findings.filter(f => f.severity === 'critical').length,
              high_count: result.findings.filter(f => f.severity === 'high').length
            }
          },
          embedding: summaryEmbedding
        });
      }
    }

    return entries;
  }

  /**
   * Create content string for a finding
   */
  private createFindingContent(finding: any, result: ToolResultData): string {
    const parts = [
      `Tool: ${result.toolId}`,
      `Agent: ${result.agentRole}`,
      `Type: ${finding.type}`,
      `Severity: ${finding.severity}`,
      `Category: ${finding.category}`,
      `Message: ${finding.message}`
    ];

    if (finding.file) {
      parts.push(`File: ${finding.file}`);
    }
    if (finding.line) {
      parts.push(`Line: ${finding.line}`);
    }
    if (finding.code) {
      parts.push(`Code: ${finding.code}`);
    }
    if (finding.suggestion) {
      parts.push(`Suggestion: ${finding.suggestion}`);
    }

    return parts.join('\n');
  }

  /**
   * Create summary content for tool execution
   */
  private createToolSummaryContent(result: ToolResultData): string {
    const severityCounts = {
      critical: result.findings.filter(f => f.severity === 'critical').length,
      high: result.findings.filter(f => f.severity === 'high').length,
      medium: result.findings.filter(f => f.severity === 'medium').length,
      low: result.findings.filter(f => f.severity === 'low').length,
      info: result.findings.filter(f => f.severity === 'info').length
    };

    const categoryCounts = result.findings.reduce((acc, f) => {
      acc[f.category] = (acc[f.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const parts = [
      `Tool ${result.toolId} Analysis Summary`,
      `Agent Role: ${result.agentRole}`,
      `Total Findings: ${result.findings.length}`,
      `Execution Time: ${result.executionTime}ms`,
      '',
      'Severity Distribution:',
      ...Object.entries(severityCounts)
        .filter(([_, count]) => count > 0)
        .map(([severity, count]) => `  ${severity}: ${count}`),
      '',
      'Categories:',
      ...Object.entries(categoryCounts)
        .map(([category, count]) => `  ${category}: ${count}`)
    ];

    if (result.metrics) {
      parts.push('', 'Metrics:');
      parts.push(...Object.entries(result.metrics)
        .map(([key, value]) => `  ${key}: ${value}`)
      );
    }

    return parts.join('\n');
  }

  /**
   * Get highest severity from findings
   */
  private getHighestSeverity(findings: any[]): string {
    const severityOrder = ['critical', 'high', 'medium', 'low', 'info'];
    
    for (const severity of severityOrder) {
      if (findings.some(f => f.severity === severity)) {
        return severity;
      }
    }
    
    return 'info';
  }

  /**
   * Store a batch of vector entries
   */
  private async storeBatch(entries: ToolResultVectorEntry[]): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('tool_results_vectors')
        .insert(entries);

      if (error) {
        throw error;
      }

      this.logger.debug('Stored batch of tool results', {
        batchSize: entries.length
      });

    } catch (error) {
      this.logger.error('Failed to store batch', {
        batchSize: entries.length,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Aggregate metrics from historical data
   */
  private aggregateMetrics(data: any[]): Record<string, any> {
    const aggregated: Record<string, any> = {
      totalExecutions: data.length,
      byTool: {},
      byAgent: {},
      bySeverity: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        info: 0
      },
      averageExecutionTime: 0,
      totalFindings: 0
    };

    let totalExecutionTime = 0;

    for (const entry of data) {
      const metadata = entry.metadata;
      
      // By tool
      if (!aggregated.byTool[metadata.tool_id]) {
        aggregated.byTool[metadata.tool_id] = {
          executions: 0,
          findings: 0,
          avgExecutionTime: 0
        };
      }
      aggregated.byTool[metadata.tool_id].executions++;

      // By agent
      if (!aggregated.byAgent[metadata.agent_role]) {
        aggregated.byAgent[metadata.agent_role] = {
          executions: 0,
          findings: 0
        };
      }
      aggregated.byAgent[metadata.agent_role].executions++;

      // Execution time
      totalExecutionTime += metadata.execution_time || 0;

      // Findings count
      if (metadata.metrics?.findings_count) {
        aggregated.totalFindings += metadata.metrics.findings_count;
        aggregated.byTool[metadata.tool_id].findings += metadata.metrics.findings_count;
        aggregated.byAgent[metadata.agent_role].findings += metadata.metrics.findings_count;
      }

      // Severity counts
      if (metadata.metrics?.critical_count) {
        aggregated.bySeverity.critical += metadata.metrics.critical_count;
      }
      if (metadata.metrics?.high_count) {
        aggregated.bySeverity.high += metadata.metrics.high_count;
      }
    }

    aggregated.averageExecutionTime = data.length > 0 ? totalExecutionTime / data.length : 0;

    return aggregated;
  }
}

// Singleton instance
let toolResultsStorage: ToolResultsVectorStorage | null = null;

/**
 * Get or create tool results storage instance
 */
export function getToolResultsVectorStorage(
  supabase: any,
  embeddingService: any
): ToolResultsVectorStorage {
  if (!toolResultsStorage) {
    toolResultsStorage = new ToolResultsVectorStorage(supabase, embeddingService);
  }
  return toolResultsStorage;
}