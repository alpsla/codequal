import { AuthenticatedUser } from '../middleware/auth-middleware';
import { RepositorySizeCategory } from '@codequal/core/services/model-selection/ModelVersionSync';
import { ReportFormat } from '@codequal/agents/multi-agent/reporter-agent';
export interface PRAnalysisRequest {
    repositoryUrl: string;
    prNumber: number;
    analysisMode: 'quick' | 'comprehensive' | 'deep';
    authenticatedUser: AuthenticatedUser;
    githubToken?: string;
    reportFormat?: ReportFormat;
}
export interface PRContext {
    repositoryUrl: string;
    prNumber: number;
    prDetails: any;
    diff: any;
    changedFiles: string[];
    primaryLanguage: string;
    repositorySize: RepositorySizeCategory;
    analysisMode: string;
    baseBranch?: string;
    files?: Array<{
        path: string;
        content?: string;
        diff?: string;
        previousContent?: string;
    }>;
}
export interface RepositoryStatus {
    existsInVectorDB: boolean;
    lastAnalyzed?: Date;
    analysisQuality: 'fresh' | 'stale' | 'outdated';
    needsReanalysis: boolean;
}
export interface AnalysisResult {
    analysisId: string;
    status: 'complete';
    repository: {
        url: string;
        name: string;
        primaryLanguage: string;
    };
    pr: {
        number: number;
        title: string;
        changedFiles: number;
    };
    analysis: {
        mode: string;
        agentsUsed: string[];
        totalFindings: number;
        processingTime: number;
    };
    findings: {
        security: any[];
        architecture: any[];
        performance: any[];
        codeQuality: any[];
    };
    recommendations?: any;
    educationalContent: any[];
    compiledEducationalData?: any;
    metrics: {
        totalFindings: number;
        severity: {
            critical: number;
            high: number;
            medium: number;
            low: number;
        };
        confidence: number;
        coverage: number;
    };
    report: {
        summary: string;
        recommendations: string[];
        prComment: string;
        fullReport?: any;
        htmlReportUrl?: string;
    };
    metadata: {
        timestamp: Date;
        modelVersions: Record<string, string>;
        processingSteps: string[];
        prContentAnalysis?: {
            changeTypes: string[];
            complexity: string;
            riskLevel: string;
            agentsSkipped: string[];
            skipReasons: Record<string, string>;
        } | null;
    };
}
/**
 * Main Result Orchestrator - coordinates the complete PR analysis workflow
 */
export declare class ResultOrchestrator {
    private authenticatedUser;
    private readonly logger;
    private modelVersionSync;
    private vectorContextService;
    private toolResultRetrievalService;
    private deepWikiManager;
    private prContextService;
    private resultProcessor;
    private educationalService;
    private educationalToolOrchestrator;
    private educationalAgent;
    private reporterAgent;
    private recommendationService;
    private educationalCompilationService;
    private agentAuthenticatedUser;
    private prContentAnalyzer;
    private intelligentResultMerger;
    constructor(authenticatedUser: AuthenticatedUser);
    /**
     * Main orchestration method - coordinates entire PR analysis workflow
     */
    analyzePR(request: PRAnalysisRequest): Promise<AnalysisResult>;
    /**
     * Compile findings into format expected by Educational Agent
     */
    private compileFindings;
    /**
     * Generate PR comment with educational insights
     */
    private generatePRComment;
    /**
     * Extract PR context including diff, changed files, and repository information
     */
    private extractPRContext;
    /**
     * Analyze PR content to determine which agents to skip
     */
    private analyzePRContent;
    /**
     * Check if repository exists in Vector DB and its freshness
     */
    private checkRepositoryStatus;
    /**
     * Trigger repository analysis if needed
     */
    private ensureFreshRepositoryAnalysis;
    /**
     * Select optimal orchestrator model based on context
     */
    private selectOrchestratorModel;
    /**
     * Retrieve tool results from Vector DB for agent consumption
     */
    private retrieveToolResults;
    /**
     * Coordinate multi-agent analysis using existing enhanced executor
     */
    private coordinateAgents;
    /**
     * Process and deduplicate agent results using intelligent merging
     */
    private processResults;
    /**
     * Generate educational content based on findings
     */
    private generateEducationalContent;
    /**
     * Generate final report
     */
    private generateReport;
    private selectAgentsForAnalysis;
    private configureAgents;
    private getAgentSpecificContext;
    private extractRepositoryName;
    private extractRepositoryId;
    private extractAgentNames;
    private countTotalFindings;
    private calculateMetrics;
    private extractModelVersions;
    private extractRecommendations;
    /**
     * Convert API AuthenticatedUser to Agent AuthenticatedUser
     */
    private convertToAgentUser;
    /**
     * Create mock RAG service for VectorContextService
     */
    private createMockRAGService;
    /**
     * Create mock Vector Storage service for tool result retrieval
     */
    private createMockVectorStorageService;
    /**
     * Evaluate if schedule needs adjustment based on analysis results
     */
    private evaluateScheduleAdjustment;
    /**
     * Format agent results for intelligent merger
     */
    private formatAgentResults;
    /**
     * Extract educational topics from recommendations
     */
    private extractEducationalTopics;
    /**
     * Extract package names from PR context
     */
    private extractPackageNames;
    /**
     * Retrieve relevant DeepWiki report sections based on agent role and context
     */
    private retrieveRelevantDeepWikiReport;
    /**
     * Get DeepWiki summary for recommendation generation
     */
    private getDeepWikiSummary;
    /**
     * Store standardized report in Supabase for UI consumption
     */
    private storeReportInSupabase;
    /**
     * Generate executive summary from processed results and recommendations
     */
    private generateExecutiveSummary;
    /**
     * Convert compiled educational data to sections format
     */
    private convertCompiledDataToSections;
    /**
     * Extract recommendations list from recommendation module
     */
    private extractRecommendationsList;
}
//# sourceMappingURL=result-orchestrator.d.ts.map