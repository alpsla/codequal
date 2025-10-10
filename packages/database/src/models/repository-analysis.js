"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RepositoryAnalysisModel = exports.RepositoryAnalyzer = void 0;
const client_1 = require("../supabase/client");
/**
 * Repository analyzer type
 */
var RepositoryAnalyzer;
(function (RepositoryAnalyzer) {
    RepositoryAnalyzer["DEEPWIKI"] = "deepwiki";
    RepositoryAnalyzer["STATIC_ANALYZER"] = "static_analyzer";
})(RepositoryAnalyzer || (exports.RepositoryAnalyzer = RepositoryAnalyzer = {}));
/**
 * Repository analysis model for database operations
 */
class RepositoryAnalysisModel {
    /**
     * Get latest repository analysis by repository ID and analyzer
     * @param repositoryId Repository ID
     * @param analyzer Repository analyzer
     * @returns Repository analysis or null if not found
     */
    static async getLatest(repositoryId, analyzer) {
        const supabase = (0, client_1.getSupabase)();
        const { data, error } = await supabase
            .from('repository_analysis')
            .select()
            .eq('repository_id', repositoryId)
            .eq('analyzer', analyzer)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (error) {
            throw new Error(`Error getting repository analysis: ${error.message}`);
        }
        if (!data) {
            return null;
        }
        return this.mapToRepositoryAnalysis(data);
    }
    /**
     * Get valid cached repository analysis by repository ID and analyzer
     * @param repositoryId Repository ID
     * @param analyzer Repository analyzer
     * @returns Repository analysis or null if no valid cache exists
     */
    static async getValidCache(repositoryId, analyzer) {
        const supabase = (0, client_1.getSupabase)();
        const now = new Date().toISOString();
        const { data, error } = await supabase
            .from('repository_analysis')
            .select()
            .eq('repository_id', repositoryId)
            .eq('analyzer', analyzer)
            .gt('cached_until', now)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (error) {
            throw new Error(`Error getting repository analysis cache: ${error.message}`);
        }
        if (!data) {
            return null;
        }
        return this.mapToRepositoryAnalysis(data);
    }
    /**
     * Store repository analysis
     * @param repositoryId Repository ID
     * @param analyzer Repository analyzer
     * @param analysisData Analysis data
     * @param cacheTTL Cache time-to-live in seconds (default: 24 hours)
     * @param metadata Metadata (optional)
     * @param executionTimeMs Execution time in milliseconds (optional)
     * @param tokenCount Token count (optional)
     * @returns Created repository analysis
     */
    static async store(repositoryId, analyzer, analysisData, cacheTTL = 24 * 60 * 60, // 24 hours in seconds
    metadata, executionTimeMs, tokenCount) {
        const supabase = (0, client_1.getSupabase)();
        // Calculate cache expiration time
        const cachedUntil = new Date();
        cachedUntil.setSeconds(cachedUntil.getSeconds() + cacheTTL);
        const { data, error } = await supabase
            .from('repository_analysis')
            .insert({
            repository_id: repositoryId,
            analyzer: analyzer,
            analysis_data: analysisData,
            metadata: metadata || {},
            cached_until: cachedUntil.toISOString(),
            execution_time_ms: executionTimeMs,
            token_count: tokenCount
        })
            .select()
            .single();
        if (error) {
            throw new Error(`Error storing repository analysis: ${error.message}`);
        }
        if (!data) {
            throw new Error('Failed to store repository analysis: No data returned');
        }
        return this.mapToRepositoryAnalysis(data);
    }
    /**
     * Invalidate cache for repository analysis
     * @param repositoryId Repository ID
     * @param analyzer Repository analyzer (optional)
     */
    static async invalidateCache(repositoryId, analyzer) {
        const supabase = (0, client_1.getSupabase)();
        const now = new Date().toISOString();
        let query = supabase
            .from('repository_analysis')
            .update({ cached_until: now })
            .eq('repository_id', repositoryId);
        if (analyzer) {
            query = query.eq('analyzer', analyzer);
        }
        const { error } = await query;
        if (error) {
            throw new Error(`Error invalidating repository analysis cache: ${error.message}`);
        }
    }
    /**
     * Map database record to repository analysis
     * @param data Database record
     * @returns Repository analysis
     */
    static mapToRepositoryAnalysis(data) {
        return {
            id: data.id,
            repositoryId: data.repository_id,
            analyzer: data.analyzer,
            analysisData: data.analysis_data,
            metadata: data.metadata,
            cachedUntil: new Date(data.cached_until),
            executionTimeMs: data.execution_time_ms,
            tokenCount: data.token_count,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at)
        };
    }
}
exports.RepositoryAnalysisModel = RepositoryAnalysisModel;
//# sourceMappingURL=repository-analysis.js.map