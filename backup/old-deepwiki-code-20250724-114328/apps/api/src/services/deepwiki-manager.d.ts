import { AuthenticatedUser } from '../middleware/auth-middleware';
export interface AnalysisJob {
    jobId: string;
    repositoryUrl: string;
    status: 'queued' | 'processing' | 'completed' | 'failed';
    startedAt: Date;
    completedAt?: Date;
    error?: string;
}
export interface AnalysisFinding {
    type: string;
    severity: string;
    message: string;
    file?: string;
    line?: number;
}

export interface AnalysisSection {
    summary: string;
    score: number;
    findings: AnalysisFinding[];
    recommendations: string[];
    metrics?: Record<string, unknown>;
}

export interface AnalysisResults {
    repositoryUrl: string;
    analysis: {
        architecture: AnalysisSection;
        security: AnalysisSection;
        performance: AnalysisSection;
        codeQuality: AnalysisSection;
        dependencies: AnalysisSection;
    };
    metadata: {
        analyzedAt: Date;
        analysisVersion: string;
        processingTime: number;
    };
}
/**
 * Simplified DeepWiki Manager - handles Vector DB existence checks and repository analysis coordination
 * Design decision: Only checks Vector DB existence, delegates actual analysis to DeepWiki service
 */
export declare class DeepWikiManager {
    private authenticatedUser;
    private vectorContextService;
    private activeJobs;
    constructor(authenticatedUser: AuthenticatedUser);
    /**
     * Check if repository analysis exists in Vector DB
     * Simple Vector DB existence check - core responsibility
     */
    checkRepositoryExists(repositoryUrl: string): Promise<boolean>;
    /**
     * Trigger repository analysis via DeepWiki service
     * Queues analysis but doesn't wait for completion
     */
    triggerRepositoryAnalysis(repositoryUrl: string): Promise<string>;
    /**
     * Wait for analysis completion and store results in Vector DB
     */
    waitForAnalysisCompletion(repositoryUrl: string): Promise<AnalysisResults>;
    /**
     * Get job status for tracking
     */
    getJobStatus(jobId: string): Promise<AnalysisJob | null>;
    /**
     * Get all active jobs for user
     */
    getActiveJobs(): Promise<AnalysisJob[]>;
    /**
     * Cancel an active analysis job
     */
    cancelJob(jobId: string): Promise<boolean>;
    /**
     * Simulate DeepWiki API call for repository analysis
     * In production, this would call the actual DeepWiki Kubernetes service
     */
    private simulateDeepWikiApiCall;
    /**
     * Poll for analysis results until completion
     */
    private pollForResults;
    /**
     * Store analysis results in Vector DB
     */
    private storeAnalysisResults;
    /**
     * Generate mock analysis results for testing
     * In production, this would parse actual DeepWiki output
     */
    private generateMockAnalysisResults;
    /**
     * Extract repository name from URL
     */
    private extractRepositoryName;
    /**
     * Convert API AuthenticatedUser to Agent AuthenticatedUser
     */
    private convertToAgentUser;
    /**
     * Create mock RAG service for VectorContextService
     */
    private createMockRAGService;
}
//# sourceMappingURL=deepwiki-manager.d.ts.map