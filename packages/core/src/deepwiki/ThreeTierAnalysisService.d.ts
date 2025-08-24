import { DeepWikiClient, RepositoryContext, ModelConfig, DeepWikiProvider } from './DeepWikiClient';
import { Logger } from '../utils/logger';
/**
 * Analysis depth options for the three-tier approach
 */
export declare enum AnalysisDepth {
    QUICK = "quick",// PR-only analysis
    COMPREHENSIVE = "comprehensive",// Repository + PR analysis
    TARGETED = "targeted"
}
/**
 * Targeted analysis perspective types
 */
export declare enum TargetedPerspective {
    ARCHITECTURE = "architecture",
    PATTERNS = "patterns",
    PERFORMANCE = "performance",
    SECURITY = "security",
    TESTING = "testing",
    DEPENDENCIES = "dependencies",
    MAINTAINABILITY = "maintainability"
}
/**
 * Options for repository analysis
 */
export interface RepositoryAnalysisOptions {
    /**
     * Analysis depth level
     */
    depth: AnalysisDepth;
    /**
     * Targeted perspectives (only applicable for TARGETED depth)
     */
    perspectives?: TargetedPerspective[];
    /**
     * Override model configuration (optional)
     */
    modelConfig?: ModelConfig<DeepWikiProvider>;
    /**
     * Whether to use cached repository analysis if available
     */
    useCache?: boolean;
}
/**
 * PR analysis options
 */
export interface PullRequestAnalysisOptions extends RepositoryAnalysisOptions {
    /**
     * Pull request number
     */
    prNumber: number;
}
/**
 * Analysis result structure
 */
export interface AnalysisResult {
    /**
     * Repository context
     */
    repository: RepositoryContext;
    /**
     * Analysis options used
     */
    options: RepositoryAnalysisOptions | PullRequestAnalysisOptions;
    /**
     * Analysis results
     */
    results: {
        /**
         * Repository wiki (for comprehensive analysis)
         */
        repositoryWiki?: Record<string, unknown>;
        /**
         * PR analysis (for PR-related analysis)
         */
        prAnalysis?: Record<string, unknown>;
        /**
         * Targeted perspective results (for targeted analysis)
         */
        perspectiveResults?: Record<TargetedPerspective, Record<string, unknown>>;
    };
}
/**
 * Three-tier analysis service that utilizes DeepWiki
 */
export declare class ThreeTierAnalysisService {
    private deepWikiClient;
    private logger;
    /**
     * Constructor
     * @param deepWikiClient DeepWiki client instance
     * @param logger Logger instance
     */
    constructor(deepWikiClient: DeepWikiClient, logger: Logger);
    /**
     * Analyze a pull request
     * @param repository Repository context
     * @param prId Pull request ID
     * @param options Analysis options
     * @returns Analysis result
     */
    analyzePR(repository: RepositoryContext, prId: string, options: RepositoryAnalysisOptions): Promise<AnalysisResult>;
    /**
     * Analyze a repository using the appropriate depth strategy
     * @param repository Repository context
     * @param options Analysis options
     * @returns Analysis result
     */
    analyzeRepository(repository: RepositoryContext, options: RepositoryAnalysisOptions): Promise<AnalysisResult>;
    /**
     * Analyze a pull request using the appropriate depth strategy
     * @param repository Repository context
     * @param options Pull request analysis options
     * @returns Analysis result
     */
    analyzePullRequest(repository: RepositoryContext, options: PullRequestAnalysisOptions): Promise<AnalysisResult>;
    /**
     * Perform quick repository analysis (minimal context)
     * @param repository Repository context
     * @param options Analysis options
     * @returns Analysis result
     */
    private performQuickAnalysis;
    /**
     * Perform comprehensive repository analysis (full context)
     * @param repository Repository context
     * @param options Analysis options
     * @returns Analysis result
     */
    private performComprehensiveAnalysis;
    /**
     * Perform targeted repository analysis (architectural deep dive)
     * @param repository Repository context
     * @param options Analysis options
     * @returns Analysis result
     */
    private performTargetedAnalysis;
    /**
     * Perform quick PR analysis
     * @param repository Repository context
     * @param options Pull request analysis options
     * @returns Analysis result
     */
    private performQuickPRAnalysis;
    /**
     * Perform comprehensive PR analysis (with repository context)
     * @param repository Repository context
     * @param options Pull request analysis options
     * @returns Analysis result
     */
    private performComprehensivePRAnalysis;
    /**
     * Perform targeted PR analysis (with specific architectural perspectives)
     * @param repository Repository context
     * @param options Pull request analysis options
     * @returns Analysis result
     */
    private performTargetedPRAnalysis;
    /**
     * Build a repository URL from context
     * @param repository Repository context
     * @returns Repository URL
     */
    private buildRepoUrl;
}
