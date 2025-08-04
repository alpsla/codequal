import { DeepWikiAnalysisResult } from '../types/deepwiki';
export interface ParsedAnalysis {
    vulnerabilities?: Array<{
        id: string;
        severity: string;
        category: string;
        title: string;
        location: {
            file: string;
            line: number;
            column?: number;
        };
        cwe?: {
            id: string;
            name: string;
        };
        cvss?: {
            score: number;
            vector: string;
        };
        impact: string;
        evidence?: {
            snippet: string;
        };
        remediation: {
            immediate: string;
            steps: string[];
        };
    }>;
    recommendations?: Array<{
        id: string;
        category: string;
        priority: string;
        title: string;
        description: string;
        impact: string;
        effort: string;
        estimated_hours?: number;
        steps?: string[];
    }>;
    scores?: {
        overall: number;
        security: number;
        performance: number;
        maintainability: number;
        testing?: number;
    };
    statistics?: {
        files_analyzed: number;
        total_issues: number;
        issues_by_severity?: {
            critical: number;
            high: number;
            medium: number;
            low: number;
        };
        languages?: Record<string, number>;
    };
    quality?: {
        metrics?: {
            cyclomatic_complexity: number;
            cognitive_complexity: number;
            maintainability_index: number;
        };
        duplicated_lines_percent?: number;
        technical_debt_hours?: number;
    };
    testing?: {
        coverage_percent?: number;
        missing_tests?: number;
    };
    dependencies?: {
        total: number;
        direct: number;
        vulnerable: number;
        outdated: number;
        deprecated: number;
    };
}
export declare class DeepWikiApiManager {
    private readonly POD_NAME;
    private readonly NAMESPACE;
    private readonly API_PORT;
    private readonly USE_PORT_FORWARD;
    private modelVersionSync;
    private modelSelector;
    private prContextService;
    private cacheIntegration;
    constructor();
    /**
     * Initialize cache integration (lazy initialization)
     */
    private getCacheIntegration;
    private getModelSelector;
    /**
     * Get optimal model for DeepWiki analysis
     */
    private getOptimalModel;
    /**
     * Analyze a repository using the DeepWiki API
     */
    analyzeRepository(repositoryUrl: string, options?: {
        branch?: string;
        commit?: string;
        prId?: string;
        skipCache?: boolean;
    }): Promise<DeepWikiAnalysisResult>;
    /**
     * Get the actual DeepWiki pod name
     */
    private getDeepWikiPodName;
    /**
     * Build the analysis prompt for the API
     */
    private buildAnalysisPrompt;
    /**
     * Call the DeepWiki API via kubectl exec or port-forward
     */
    private callDeepWikiApi;
    /**
     * Parse the API response to extract analysis data
     */
    private parseApiResponse;
    /**
     * Convert parsed analysis to our DeepWiki format
     */
    private convertToDeepWikiFormat;
    /**
     * Map category to issue type
     */
    private mapCategoryToType;
    /**
     * Create a degraded result when API fails
     */
    private createDegradedResult;
    /**
     * Convert RepositorySizeCategory enum to string
     */
    private convertSizeEnumToString;
    /**
     * Check if the API is available
     */
    checkApiHealth(): Promise<boolean>;
    /**
     * Check if repository exists in the system
     */
    checkRepositoryExists(repositoryUrl: string): Promise<boolean>;
    /**
     * Get cached repository files from the cloned repository
     */
    getCachedRepositoryFiles(repositoryUrl: string, branch?: string): Promise<Array<Record<string, unknown>>>;
    /**
     * Trigger repository analysis
     */
    triggerRepositoryAnalysis(repositoryUrl: string, options?: Record<string, unknown>): Promise<string>;
    /**
     * Wait for analysis completion
     */
    waitForAnalysisCompletion(repositoryUrl: string): Promise<DeepWikiAnalysisResult>;
    /**
     * Get active jobs - stub implementation
     */
    getActiveJobs(): Promise<Array<Record<string, unknown>>>;
    /**
     * Clean up the cloned repository after all analysis is complete
     * This should be called by the orchestrator after MCP tools and agents have finished
     */
    cleanupRepository(repositoryUrl: string): Promise<void>;
    /**
     * Internal cleanup method
     */
    private cleanupDeepWikiRepositories;
    /**
     * Get job status - stub implementation
     */
    getJobStatus(jobId: string): Promise<Record<string, unknown>>;
    /**
     * Cancel job - stub implementation
     */
    cancelJob(jobId: string): Promise<boolean>;
}
export declare const deepWikiApiManager: DeepWikiApiManager;
//# sourceMappingURL=deepwiki-api-manager.d.ts.map