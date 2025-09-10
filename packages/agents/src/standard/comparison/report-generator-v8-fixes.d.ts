/**
 * V8 Report Generator Fixes
 * Addresses all the issues identified in the report validation
 */
export interface ReportFixes {
    adjustSeverityForTestFiles(issue: any): any;
    validateCodeSnippet(issue: any): boolean;
    enhanceIssueContext(issue: any): any;
    getActualModelName(role: string): Promise<string>;
    calculateTestCoverage(issues: any[]): number;
    generateTargetedEducation(issue: any): string;
    addImpactField(issue: any): any;
    getFileStats(repositoryUrl: string): Promise<{
        filesAnalyzed: number;
        totalFiles: number;
    }>;
}
export declare class ReportGeneratorV8Fixes implements ReportFixes {
    private modelSelector;
    constructor();
    /**
     * Adjust severity for issues in test files
     * Test file issues should be low/medium priority, not blocking
     */
    adjustSeverityForTestFiles(issue: any): any;
    /**
     * Validate if code snippet is relevant and complete
     */
    validateCodeSnippet(issue: any): boolean;
    /**
     * Enhance issue context with better explanations
     */
    enhanceIssueContext(issue: any): any;
    /**
     * Calculate impact description for an issue
     */
    private calculateImpact;
    /**
     * Get actual model name instead of "Dynamic Model Selection"
     */
    getActualModelName(role: string): Promise<string>;
    /**
     * Calculate actual test coverage from issues
     */
    calculateTestCoverage(issues: any[]): number;
    /**
     * Generate targeted education based on specific issue
     */
    generateTargetedEducation(issue: any): string;
    /**
     * Add impact field to issue
     */
    addImpactField(issue: any): any;
    /**
     * Get file statistics for the repository
     */
    getFileStats(repositoryUrl: string): Promise<{
        filesAnalyzed: number;
        totalFiles: number;
    }>;
}
