import { Issue } from '../types/analysis-types';
export interface MatchResult {
    isMatch: boolean;
    confidence: number;
    matchType: 'exact' | 'line-shift' | 'content' | 'fuzzy' | 'content-exact' | 'content-similar' | 'content-keywords' | 'none';
    details?: string;
}
/**
 * Enhanced issue matcher that handles large code shifts and refactoring
 */
export declare class EnhancedIssueMatcher {
    /**
     * Multi-strategy matching with fallback hierarchy
     */
    matchIssues(issue1: Issue, issue2: Issue): MatchResult;
    /**
     * Content-only matching for AI-generated issues without file locations
     */
    private contentOnlyMatch;
    /**
     * Calculate string similarity using Levenshtein-like approach
     */
    private calculateStringSimilarity;
    /**
     * Extract important keywords from text
     */
    private extractKeywords;
    /**
     * Calculate overlap between two sets
     */
    private calculateSetOverlap;
    /**
     * Strategy 1: Exact or near-exact location match
     */
    private exactLocationMatch;
    /**
     * Strategy 2: Handle small code shifts (3-20 lines)
     */
    private lineShiftMatch;
    /**
     * Strategy 3: Content-based matching for large shifts
     * This handles cases where code moved 100+ lines
     */
    private contentBasedMatch;
    /**
     * Strategy 4: Fuzzy matching for refactored code
     */
    private fuzzyMatch;
    /**
     * Extract a fingerprint from code snippet for matching
     */
    private extractCodeFingerprint;
    private fingerprintsMatch;
    private codeSnippetsMatch;
    private isSameFile;
    private isSameCategory;
    private calculateCategorySimilarity;
    private calculateDescriptionSimilarity;
}
/**
 * Deduplication service for handling issues that appear in multiple locations
 */
export declare class IssueDuplicator {
    private matcher;
    constructor();
    /**
     * Deduplicate issues, keeping the best match for each unique issue
     */
    deduplicateIssues(issues: Issue[]): Issue[];
}
