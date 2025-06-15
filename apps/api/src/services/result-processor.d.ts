export interface Finding {
    id: string;
    type: string;
    title: string;
    description: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    confidence: number;
    file?: string;
    line?: number;
    category: string;
    agent: string;
    recommendation?: string;
    metadata?: any;
}
export interface ProcessedResults {
    findings: {
        security: Finding[];
        architecture: Finding[];
        performance: Finding[];
        codeQuality: Finding[];
        dependencies: Finding[];
    };
    metrics: {
        totalFindings: number;
        duplicatesRemoved: number;
        conflictsResolved: number;
        avgConfidence: number;
    };
}
export interface Conflict {
    type: 'contradictory' | 'duplicate' | 'overlapping';
    findings: Finding[];
    confidence: number;
    description: string;
}
/**
 * Result Processor - handles deduplication, conflict resolution, and result organization
 */
export declare class ResultProcessor {
    /**
     * Main processing method - processes raw agent results
     */
    processAgentResults(agentResults: any): Promise<ProcessedResults>;
    /**
     * Extract findings from raw agent results
     */
    private extractFindings;
    /**
     * Deduplicate similar findings
     */
    private deduplicateFindings;
    /**
     * Group similar findings together
     */
    private groupSimilarFindings;
    /**
     * Calculate similarity between two findings
     */
    private calculateSimilarity;
    /**
     * Merge similar findings into one
     */
    private mergeFindings;
    /**
     * Resolve conflicts between findings
     */
    private resolveConflicts;
    /**
     * Detect conflicts between findings
     */
    private detectConflicts;
    /**
     * Resolve a specific conflict
     */
    private resolveConflict;
    /**
     * Resolve contradictory findings by choosing the most reliable one
     */
    private resolveContradictoryFindings;
    /**
     * Organize findings by category
     */
    private organizeByCategory;
    /**
     * Calculate processing metrics
     */
    private calculateProcessingMetrics;
    private normalizeSeverity;
    private normalizeConfidence;
    private determineCategory;
    private stringSimilarity;
    private levenshteinDistance;
    private calculateSubstringSimilarity;
    private calculateTokenSimilarity;
    private calculateEditDistanceSimilarity;
    private calculateKeywordSimilarity;
    private calculateSeveritySimilarity;
    private safeStringValue;
    private safeNumberValue;
    private selectBestTitle;
    private combineDescriptions;
    private calculateMergedConfidence;
    private combineRecommendations;
    private areContradictory;
}
//# sourceMappingURL=result-processor.d.ts.map