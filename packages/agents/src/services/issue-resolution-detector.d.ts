/**
 * Interface for issue comparison
 */
export interface IssueComparison {
    issueId: string;
    category: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    status: 'fixed' | 'new' | 'unchanged';
    repository: string;
}
/**
 * Service to detect which repository issues were fixed in a PR
 */
export declare class IssueResolutionDetector {
    private readonly logger;
    /**
     * Compare PR analysis with existing repo issues to detect fixes
     */
    detectFixedIssues(prAnalysis: any, existingRepoIssues: {
        security?: any[];
        codeQuality?: any[];
        architecture?: any[];
        performance?: any[];
        dependencies?: any[];
    }, repository: string, prNumber: number): {
        fixedIssues: IssueComparison[];
        newIssues: IssueComparison[];
        unchangedIssues: IssueComparison[];
    };
    /**
     * Generate a unique ID for an issue based on its properties
     */
    private generateIssueId;
    /**
     * Extract severity from issue object
     */
    private extractSeverity;
    /**
     * Group fixed issues by category and severity for reporting
     */
    groupFixedIssues(fixedIssues: IssueComparison[]): Record<string, {
        total: number;
        bySeverity: Record<string, number>;
    }>;
}
