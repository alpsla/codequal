import { AgentSelection, AgentRole } from '../config/agent-registry';
import type { AnalysisResult } from '../types/agent';
interface PRReviewData {
    id: string;
    prUrl: string;
    repositoryId: string;
    userId: string;
    prTitle?: string;
    prDescription?: string;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Service for managing PR reviews
 */
export declare class PRReviewService {
    private skillService;
    private logger;
    constructor();
    /**
     * Analyze a PR using the specified agent configuration
     * @param prUrl PR URL
     * @param userId User ID
     * @param agentSelection Agent selection configuration
     * @returns Analysis results
     */
    analyzePR(prUrl: string, userId: string, agentSelection?: AgentSelection): Promise<{
        prReviewId: string;
        analysisResults: Record<AgentRole, AnalysisResult>;
        combinedResult: AnalysisResult;
    }>;
    /**
     * Extract repository information from PR URL
     * @param prUrl PR URL
     * @returns Repository information
     */
    private extractRepositoryInfo;
    /**
     * Combine results from different agents
     * @param results Analysis results from different agents
     * @returns Combined analysis result
     */
    private combineResults;
    /**
     * Get PR review by ID
     * @param prReviewId PR review ID
     * @returns PR review with results
     */
    getPRReview(prReviewId: string): Promise<{
        prReview: PRReviewData;
        analysisResults: Record<string, AnalysisResult>;
        combinedResult: AnalysisResult;
    }>;
    /**
     * Get PR reviews by user
     * @param userId User ID
     * @returns PR reviews
     */
    getUserPRReviews(userId: string): Promise<PRReviewData[]>;
}
export {};
