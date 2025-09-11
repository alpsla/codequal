export interface Finding {
    id?: string;
    type: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    category: string;
    title: string;
    description: string;
    file?: string;
    line?: number;
    column?: number;
    evidence?: string;
    recommendation?: string;
    confidence?: number;
    tool?: string;
    ruleId?: string;
}
export interface SimilarityGroup {
    representative: Finding;
    similar: Finding[];
    similarityScore: number;
}
export interface DeduplicationResult {
    deduplicated: Finding[];
    similarityGroups: SimilarityGroup[];
    duplicatesRemoved: number;
    statistics: {
        original: number;
        unique: number;
        exact: number;
        similar: number;
    };
}
/**
 * Basic deduplicator for agent findings
 * Performs exact and near-match deduplication within a single agent's results
 */
export declare class BasicDeduplicator {
    private readonly logger;
    private readonly exactMatchThreshold;
    private readonly similarityThreshold;
    /**
     * Deduplicate findings with similarity grouping
     */
    deduplicateFindings(findings: Finding[]): DeduplicationResult;
    /**
     * Remove only exact duplicates (for quick deduplication)
     */
    removeExactDuplicates(findings: Finding[]): {
        unique: Finding[];
        duplicates: number;
    };
    /**
     * Find groups of similar findings
     */
    private findSimilarFindings;
    /**
     * Extract representative findings from similarity groups
     */
    private extractRepresentatives;
    /**
     * Generate a key for exact matching
     */
    private generateExactKey;
    /**
     * Calculate similarity between two findings
     */
    private calculateSimilarity;
    /**
     * Enhanced string similarity with multiple algorithms
     */
    private stringSimilarity;
    /**
     * Generate n-grams from a string
     */
    private getNGrams;
    /**
     * Get similarity groups for orchestrator-level merging
     */
    getSimilarityGroups(findings: Finding[]): SimilarityGroup[];
    /**
     * Merge findings from multiple sources (used by orchestrator)
     */
    static mergeFindings(findingsArrays: Finding[][]): Finding[];
}
