import { Finding, DeduplicationResult } from './basic-deduplicator';
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
export declare class AgentResultProcessor {
    private readonly logger;
    private readonly deduplicator;
    /**
     * Process a single agent's results with deduplication
     */
    processAgentResult(result: AgentResult): ProcessedAgentResult;
    /**
     * Process multiple agent results
     */
    processMultipleAgentResults(results: AgentResult[]): ProcessedAgentResult[];
    /**
     * Extract findings from various agent result formats
     * Agents may return results in different formats, this normalizes them
     */
    static extractFindings(agentResult: any): Finding[];
    /**
     * Transform agent results to include deduplicated findings
     */
    static transformAgentResults(rawResults: any[]): ProcessedAgentResult[];
}
