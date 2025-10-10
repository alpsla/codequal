"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRReviewModel = exports.AnalysisMode = void 0;
const client_1 = require("../supabase/client");
/**
 * Analysis mode for PR reviews
 */
var AnalysisMode;
(function (AnalysisMode) {
    AnalysisMode["QUICK"] = "quick";
    AnalysisMode["COMPREHENSIVE"] = "comprehensive";
})(AnalysisMode || (exports.AnalysisMode = AnalysisMode = {}));
/**
 * PR Review model for database operations
 */
class PRReviewModel {
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
    static async create(prUrl, repositoryId, userId, analysisMode = AnalysisMode.QUICK, prTitle, prDescription) {
        const supabase = (0, client_1.getSupabase)();
        const { data, error } = await supabase
            .from('pr_reviews')
            .insert({
            pr_url: prUrl,
            pr_title: prTitle,
            pr_description: prDescription,
            repository_id: repositoryId,
            user_id: userId,
            analysis_mode: analysisMode
        })
            .select()
            .single();
        if (error) {
            throw new Error(`Error creating PR review: ${error.message}`);
        }
        if (!data) {
            throw new Error('Failed to create PR review: No data returned');
        }
        return this.mapToPRReview(data);
    }
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
    static async storeAnalysisResult(prReviewId, role, provider, result, executionTimeMs, tokenCount) {
        const supabase = (0, client_1.getSupabase)();
        const { data, error } = await supabase
            .from('analysis_results')
            .insert({
            pull_request_id: prReviewId,
            role: role,
            provider: provider,
            insights: result.insights,
            suggestions: result.suggestions,
            educational: result.educational || [],
            metadata: result.metadata || {},
            execution_time_ms: executionTimeMs,
            token_count: tokenCount
        })
            .select()
            .single();
        if (error) {
            throw new Error(`Error storing analysis result: ${error.message}`);
        }
        if (!data) {
            throw new Error('Failed to store analysis result: No data returned');
        }
        return this.mapToAnalysisResult(data);
    }
    /**
     * Store combined result
     * @param prReviewId PR review ID
     * @param result Combined analysis result
     * @returns Created combined result record
     */
    static async storeCombinedResult(prReviewId, result) {
        const supabase = (0, client_1.getSupabase)();
        const { data, error } = await supabase
            .from('combined_results')
            .insert({
            pull_request_id: prReviewId,
            insights: result.insights,
            suggestions: result.suggestions,
            educational: result.educational || [],
            metadata: result.metadata || {}
        })
            .select()
            .single();
        if (error) {
            throw new Error(`Error storing combined result: ${error.message}`);
        }
        if (!data) {
            throw new Error('Failed to store combined result: No data returned');
        }
        const record = data;
        return {
            id: record.id,
            prReviewId: record.pull_request_id,
            role: 'combined',
            provider: 'combined',
            insights: record.insights,
            suggestions: record.suggestions,
            educational: record.educational || [],
            metadata: record.metadata || {},
            createdAt: new Date(record.created_at)
        };
    }
    /**
     * Get PR review by ID
     * @param id PR review ID
     * @returns PR review
     */
    static async getById(id) {
        const supabase = (0, client_1.getSupabase)();
        const { data, error } = await supabase
            .from('pr_reviews')
            .select()
            .eq('id', id)
            .single();
        if (error) {
            throw new Error(`Error getting PR review: ${error.message}`);
        }
        if (!data) {
            throw new Error(`PR review not found: ${id}`);
        }
        return this.mapToPRReview(data);
    }
    /**
     * Get PR reviews by user ID
     * @param userId User ID
     * @returns PR reviews
     */
    static async getByUserId(userId) {
        const supabase = (0, client_1.getSupabase)();
        const { data, error } = await supabase
            .from('pr_reviews')
            .select()
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (error) {
            throw new Error(`Error getting PR reviews: ${error.message}`);
        }
        if (!data) {
            return [];
        }
        return data.map((item) => this.mapToPRReview(item));
    }
    /**
     * Get analysis results for PR review
     * @param prReviewId PR review ID
     * @returns Analysis results
     */
    static async getAnalysisResults(prReviewId) {
        const supabase = (0, client_1.getSupabase)();
        const { data, error } = await supabase
            .from('analysis_results')
            .select()
            .eq('pull_request_id', prReviewId)
            .order('created_at', { ascending: true });
        if (error) {
            throw new Error(`Error getting analysis results: ${error.message}`);
        }
        if (!data) {
            return [];
        }
        return data.map((item) => this.mapToAnalysisResult(item));
    }
    /**
     * Get combined result for PR review
     * @param prReviewId PR review ID
     * @returns Combined result
     */
    static async getCombinedResult(prReviewId) {
        const supabase = (0, client_1.getSupabase)();
        const { data, error } = await supabase
            .from('combined_results')
            .select()
            .eq('pull_request_id', prReviewId)
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                // No records found
                return null;
            }
            throw new Error(`Error getting combined result: ${error.message}`);
        }
        if (!data) {
            return null;
        }
        const record = data;
        return {
            insights: record.insights,
            suggestions: record.suggestions,
            educational: (record.educational || []).map(item => ({
                title: item.topic,
                content: item.content
            })),
            metadata: record.metadata || {}
        };
    }
    /**
     * Map database record to PR review
     * @param data Database record
     * @returns PR review
     */
    static mapToPRReview(data) {
        return {
            id: data.id,
            prUrl: data.pr_url,
            prTitle: data.pr_title,
            prDescription: data.pr_description,
            repositoryId: data.repository_id,
            userId: data.user_id,
            analysisMode: data.analysis_mode,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at)
        };
    }
    /**
     * Map database record to analysis result
     * @param data Database record
     * @returns Analysis result record
     */
    static mapToAnalysisResult(data) {
        return {
            id: data.id,
            prReviewId: data.pull_request_id,
            role: data.role,
            provider: data.provider,
            insights: data.insights,
            suggestions: data.suggestions,
            educational: data.educational || [],
            metadata: data.metadata || {},
            executionTimeMs: data.execution_time_ms,
            tokenCount: data.token_count,
            createdAt: new Date(data.created_at)
        };
    }
}
exports.PRReviewModel = PRReviewModel;
//# sourceMappingURL=pr-review.js.map