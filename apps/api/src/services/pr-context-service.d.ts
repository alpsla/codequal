import { RepositorySizeCategory } from '@codequal/core/services/model-selection/ModelVersionSync';
export interface PRDetails {
    number: number;
    title: string;
    description: string;
    author: string;
    baseBranch: string;
    headBranch: string;
    state: 'open' | 'closed' | 'merged';
    url: string;
    createdAt: Date;
    updatedAt: Date;
    changedFiles: number;
    additions: number;
    deletions: number;
}
export interface DiffData {
    files: FileDiff[];
    totalAdditions: number;
    totalDeletions: number;
    totalChanges: number;
}
export interface FileDiff {
    filename: string;
    status: 'added' | 'modified' | 'deleted' | 'renamed';
    additions: number;
    deletions: number;
    changes: number;
    patch?: string;
    previousFilename?: string;
}
export interface ChangeAnalysis {
    impactLevel: 'low' | 'medium' | 'high' | 'critical';
    categories: string[];
    affectedAreas: string[];
    riskFactors: string[];
    complexity: number;
}
/**
 * PR Context Service - handles GitHub/GitLab integration for PR details and diff analysis
 */
export declare class PRContextService {
    private readonly githubApiBase;
    private readonly gitlabApiBase;
    /**
     * Fetch PR details from GitHub or GitLab
     */
    fetchPRDetails(repositoryUrl: string, prNumber: number, accessToken?: string): Promise<PRDetails>;
    /**
     * Get PR diff data
     */
    getPRDiff(prDetails: PRDetails): Promise<DiffData>;
    /**
     * Extract changed files from diff
     */
    extractChangedFiles(diff: DiffData): string[];
    /**
     * Analyze changes for impact and complexity
     */
    analyzeChanges(diff: DiffData): ChangeAnalysis;
    /**
     * Detect primary programming language
     */
    detectPrimaryLanguage(repositoryUrl: string, changedFiles: string[]): Promise<string>;
    /**
     * Estimate repository size category
     */
    estimateRepositorySize(repositoryUrl: string): Promise<RepositorySizeCategory>;
    private parseRepositoryUrl;
    private fetchGitHubPRDetails;
    private fetchGitLabPRDetails;
    private getGitHubDiff;
    private getGitLabDiff;
    private getHeaders;
    private calculateImpactLevel;
    private categorizeChanges;
    private identifyAffectedAreas;
    private assessRiskFactors;
    private calculateComplexity;
    private isCriticalFile;
    private isCoreFile;
    private isTestFile;
    private isDocumentationFile;
    private isConfigFile;
    private isSecurityFile;
    private isDatabaseFile;
    private isUIFile;
    private isAPIFile;
    private getFileExtension;
    private mapExtensionToLanguage;
}
//# sourceMappingURL=pr-context-service.d.ts.map