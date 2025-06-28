import { Finding } from '@codequal/agents/services/basic-deduplicator';
export interface AgentResult {
    agentId: string;
    agentRole: string;
    findings?: Finding[];
    insights?: string[];
    suggestions?: string[];
    metadata?: any;
    deduplicationResult?: any;
}
export interface MergedResult {
    findings: Finding[];
    insights: Record<string, string[]>;
    suggestions: string[];
    crossAgentPatterns: CrossAgentPattern[];
    statistics: MergeStatistics;
}
export interface CrossAgentPattern {
    pattern: string;
    agents: string[];
    findings: Finding[];
    confidence: number;
    severity: 'critical' | 'high' | 'medium' | 'low';
}
export interface MergeStatistics {
    totalFindings: {
        beforeMerge: number;
        afterMerge: number;
        crossAgentDuplicates: number;
    };
    byAgent: Record<string, {
        original: number;
        retained: number;
        merged: number;
    }>;
    bySeverity: Record<string, number>;
    byCategory: Record<string, number>;
    confidenceBoosts: number;
    crossAgentPatterns: number;
}
export interface MergeStrategy {
    crossAgentDeduplication: boolean;
    semanticMerging: boolean;
    confidenceAggregation: boolean;
    patternDetection: boolean;
    prioritization: 'severity' | 'confidence' | 'consensus';
}
/**
 * Intelligent result merger for orchestrator-level cross-agent deduplication
 * and insight synthesis
 */
export declare class IntelligentResultMerger {
    private readonly logger;
    private readonly deduplicator;
    /**
     * Merge results from multiple agents with intelligent deduplication
     */
    mergeResults(agentResults: AgentResult[], deepWikiSummary?: string, strategy?: MergeStrategy): Promise<MergedResult>;
    /**
     * Extract all findings from agent results
     */
    private extractAllFindings;
    /**
     * Perform cross-agent deduplication
     */
    private performCrossAgentDeduplication;
    /**
     * Get location key for grouping findings
     */
    private getLocationKey;
    /**
     * Merge similar findings from different agents
     */
    private mergeSimilarFindings;
    /**
     * Check if two findings are similar
     */
    private areFindingsSimilar;
    /**
     * Perform semantic merging using advanced similarity
     */
    private performSemanticMerging;
    /**
     * Detect patterns across multiple agents
     */
    private detectCrossAgentPatterns;
    /**
     * Aggregate confidence scores based on consensus
     */
    private aggregateConfidenceScores;
    /**
     * Prioritize findings based on strategy
     */
    private prioritizeFindings;
    /**
     * Merge insights from multiple agents
     */
    private mergeInsights;
    /**
     * Merge suggestions and remove duplicates
     */
    private mergeSuggestions;
    /**
     * Calculate merge statistics
     */
    private calculateStatistics;
    /**
     * Get default merge strategy
     */
    private getDefaultStrategy;
}
//# sourceMappingURL=intelligent-result-merger.d.ts.map