/**
 * Enhanced Location Finder
 *
 * Uses multiple strategies to find the actual location of issues in the repository:
 * 1. Search by code snippet (if available and realistic)
 * 2. Search by keywords from issue title and description
 * 3. Search by file patterns based on issue category
 * 4. Use AI to analyze the context and find likely locations
 */
export interface IssueToLocate {
    id: string;
    title: string;
    description: string;
    category: string;
    severity: string;
    codeSnippet?: string;
    file?: string;
}
export interface LocationResult {
    issueId: string;
    file: string;
    line: number;
    confidence: number;
    snippet?: string;
    method: string;
}
export declare class EnhancedLocationFinder {
    /**
     * Find locations for issues using multiple strategies
     */
    findLocations(repoPath: string, issues: IssueToLocate[]): Promise<LocationResult[]>;
    /**
     * Check if a code snippet looks realistic (not a generic example)
     */
    private isRealisticSnippet;
    /**
     * Search within a specific file mentioned by DeepWiki
     */
    private searchInSpecificFile;
    /**
     * Search by code snippet
     */
    private searchBySnippet;
    /**
     * Search by keywords from title and description
     */
    private searchByKeywords;
    /**
     * Search using category-based file patterns
     */
    private searchByCategoryPatterns;
    /**
     * Extract search terms from issue title and description
     */
    private extractSearchTerms;
    /**
     * Find a similar file if exact match doesn't exist
     */
    private findSimilarFile;
}
