import { AgentProvider, AgentRole, AnalysisResult } from '../shims/core-types';
/**
 * Analysis mode for PR reviews
 */
export declare enum AnalysisMode {
    QUICK = "quick",
    COMPREHENSIVE = "comprehensive"
}
/**
 * Interface for PR review data
 */
export interface PRReview {
    id: string;
    prUrl: string;
    prTitle?: string;
    prDescription?: string;
    repositoryId: string;
    userId: string;
    analysisMode: AnalysisMode;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Interface for analysis result data
 */
export interface AnalysisResultRecord {
    id: string;
    prReviewId: string;
    role: string;
    provider: string;
    insights: any[];
    suggestions: any[];
    educational?: any[];
    metadata?: Record<string, any>;
    executionTimeMs?: number;
    tokenCount?: number;
    createdAt: Date;
}
/**
 * PR Review model for database operations
 */
export declare class PRReviewModel {
    /**
     * Create a new PR review
     * @param prUrl PR URL
     * @param repositoryId Repository ID
     * @param userId User ID
     * @param analysisMode Analysis mode (quick or comprehensive)
     * @param prTitle PR title (optional)
     * @param prDescription PR description (optional)
     * @returns Created PR review
     */
    static create(prUrl: string, repositoryId: string, userId: string, analysisMode?: AnalysisMode, prTitle?: string, prDescription?: string): Promise<PRReview>;
    /**
     * Store analysis result
     * @param prReviewId PR review ID
     * @param role Agent role
     * @param provider Agent provider
     * @param result Analysis result
     * @param executionTimeMs Execution time in milliseconds
     * @param tokenCount Token count
     * @returns Created analysis result record
     */
    static storeAnalysisResult(prReviewId: string, role: AgentRole, provider: AgentProvider, result: AnalysisResult, executionTimeMs?: number, tokenCount?: number): Promise<AnalysisResultRecord>;
    /**
     * Store combined result
     * @param prReviewId PR review ID
     * @param result Combined analysis result
     * @returns Created combined result record
     */
    static storeCombinedResult(prReviewId: string, result: AnalysisResult): Promise<AnalysisResultRecord>;
    /**
     * Get PR review by ID
     * @param id PR review ID
     * @returns PR review
     */
    static getById(id: string): Promise<PRReview>;
    /**
     * Get PR reviews by user ID
     * @param userId User ID
     * @returns PR reviews
     */
    static getByUserId(userId: string): Promise<PRReview[]>;
    /**
     * Get analysis results for PR review
     * @param prReviewId PR review ID
     * @returns Analysis results
     */
    static getAnalysisResults(prReviewId: string): Promise<AnalysisResultRecord[]>;
    /**
     * Get combined result for PR review
     * @param prReviewId PR review ID
     * @returns Combined result
     */
    static getCombinedResult(prReviewId: string): Promise<AnalysisResult | null>;
    /**
     * Map database record to PR review
     * @param data Database record
     * @returns PR review
     */
    private static mapToPRReview;
    /**
     * Map database record to analysis result
     * @param data Database record
     * @returns Analysis result record
     */
    private static mapToAnalysisResult;
}
//# sourceMappingURL=pr-review.d.ts.map