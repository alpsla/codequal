import { createLogger } from '@codequal/core/utils';
import { BasicDeduplicator, Finding, DeduplicationResult } from './basic-deduplicator';

export interface AgentResult {
  agentId: string;
  agentRole: string;
  provider: string;
  findings?: Finding[];
  insights?: string[];
  suggestions?: string[];
  metadata?: any;
  error?: Error;
}

export interface ProcessedAgentResult extends AgentResult {
  deduplicationResult?: DeduplicationResult;
  originalFindingsCount?: number;
}

/**
 * Service to process agent results with deduplication
 * This wraps agent execution results to add deduplication capabilities
 */
export class AgentResultProcessor {
  private readonly logger = createLogger('AgentResultProcessor');
  private readonly deduplicator = new BasicDeduplicator();
  
  /**
   * Process a single agent's results with deduplication
   */
  processAgentResult(result: AgentResult): ProcessedAgentResult {
    // If no findings, return as-is
    if (!result.findings || result.findings.length === 0) {
      return result;
    }
    
    this.logger.debug(`Processing ${result.agentRole} agent results`, {
      findingsCount: result.findings.length
    });
    
    // Apply deduplication
    const deduplicationResult = this.deduplicator.deduplicateFindings(result.findings);
    
    // Create processed result
    const processedResult: ProcessedAgentResult = {
      ...result,
      originalFindingsCount: result.findings.length,
      findings: deduplicationResult.deduplicated,
      deduplicationResult
    };
    
    this.logger.info(`Deduplicated ${result.agentRole} findings`, {
      original: deduplicationResult.statistics.original,
      unique: deduplicationResult.statistics.unique,
      removed: deduplicationResult.duplicatesRemoved
    });
    
    return processedResult;
  }
  
  /**
   * Process multiple agent results
   */
  processMultipleAgentResults(results: AgentResult[]): ProcessedAgentResult[] {
    return results.map(result => this.processAgentResult(result));
  }
  
  /**
   * Extract findings from various agent result formats
   * Agents may return results in different formats, this normalizes them
   */
  static extractFindings(agentResult: any): Finding[] {
    const findings: Finding[] = [];
    
    // Direct findings array
    if (agentResult.findings && Array.isArray(agentResult.findings)) {
      findings.push(...agentResult.findings);
    }
    
    // Results with categorized findings (security, performance, etc.)
    if (agentResult.result?.findings) {
      const categorizedFindings = agentResult.result.findings;
      for (const [category, categoryFindings] of Object.entries(categorizedFindings)) {
        if (Array.isArray(categoryFindings)) {
          findings.push(...categoryFindings.map((f: any) => ({
            ...f,
            category: f.category || category
          })));
        }
      }
    }
    
    // Legacy format with issues array
    if (agentResult.issues && Array.isArray(agentResult.issues)) {
      findings.push(...agentResult.issues.map((issue: any) => ({
        type: issue.type || 'issue',
        severity: issue.severity || 'medium',
        category: issue.category || 'general',
        title: issue.title || issue.message,
        description: issue.description || issue.details || '',
        file: issue.file || issue.location?.file,
        line: issue.line || issue.location?.line,
        evidence: issue.evidence,
        recommendation: issue.recommendation || issue.fix,
        confidence: issue.confidence,
        tool: issue.tool || agentResult.agentId,
        ruleId: issue.ruleId || issue.rule
      })));
    }
    
    return findings;
  }
  
  /**
   * Transform agent results to include deduplicated findings
   */
  static transformAgentResults(rawResults: any[]): ProcessedAgentResult[] {
    const processor = new AgentResultProcessor();
    
    return rawResults.map(rawResult => {
      // Extract basic agent info
      const agentResult: AgentResult = {
        agentId: rawResult.agentId || `${rawResult.config?.provider}-${rawResult.config?.role}`,
        agentRole: rawResult.config?.role || rawResult.role || 'unknown',
        provider: rawResult.config?.provider || rawResult.provider || 'unknown',
        findings: AgentResultProcessor.extractFindings(rawResult),
        insights: rawResult.result?.insights || rawResult.insights || [],
        suggestions: rawResult.result?.suggestions || rawResult.suggestions || [],
        metadata: rawResult.result?.metadata || rawResult.metadata,
        error: rawResult.error
      };
      
      return processor.processAgentResult(agentResult);
    });
  }
}