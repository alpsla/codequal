"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SelectiveRAGService = void 0;
const supabase_client_factory_1 = require("../supabase/supabase-client.factory");
const logger_1 = require("../../utils/logger");
const query_analyzer_1 = require("./query-analyzer");
/**
 * Selective RAG Service that provides intelligent, filtered vector search
 * capabilities with metadata-based filtering and context awareness.
 */
class SelectiveRAGService {
    constructor(embeddingService, supabaseClient) {
        this.embeddingService = embeddingService;
        this.logger = (0, logger_1.createLogger)('SelectiveRAGService');
        this.queryAnalyzer = new query_analyzer_1.QueryAnalyzer();
        this.supabase = (supabaseClient || (0, supabase_client_factory_1.getSupabaseClient)());
    }
    /**
     * Perform intelligent search with automatic query analysis and filtering
     */
    async search(query, userContext, repositoryContext, options = {}) {
        const startTime = Date.now();
        try {
            this.logger.info('Starting selective RAG search', {
                query,
                hasUserContext: !!userContext,
                hasRepositoryContext: !!repositoryContext
            });
            // Analyze the query to extract intent and filters
            const analyzedQuery = await this.queryAnalyzer.analyzeQuery(query, userContext, repositoryContext);
            this.logger.debug('Query analysis completed', {
                queryType: analyzedQuery.queryType,
                confidence: analyzedQuery.analysisConfidence,
                frameworks: analyzedQuery.frameworks
            });
            // Generate embedding for semantic search
            const queryEmbedding = await this.embeddingService.generateEmbedding(analyzedQuery.semanticQuery);
            // Search documents with intelligent filtering
            let documentResults = [];
            try {
                documentResults = await this.searchDocuments(analyzedQuery, queryEmbedding, repositoryContext, options);
            }
            catch (error) {
                this.logger.error('Document search failed', { error });
                documentResults = [];
            }
            // Search educational content if requested or beneficial
            let educationalResults = [];
            if (this.shouldIncludeEducationalContent(analyzedQuery, options)) {
                try {
                    educationalResults = await this.searchEducationalContent(analyzedQuery, queryEmbedding, options);
                }
                catch (error) {
                    this.logger.error('Educational content search failed', { error });
                    educationalResults = [];
                }
            }
            // Generate search insights
            const searchInsights = this.generateSearchInsights(analyzedQuery, documentResults, educationalResults);
            const searchDurationMs = Date.now() - startTime;
            this.logger.info('Search completed', {
                documentResults: documentResults.length,
                educationalResults: educationalResults.length,
                searchDurationMs
            });
            // Log query for learning and optimization
            await this.logQueryPattern(analyzedQuery, queryEmbedding, {
                documentResults: documentResults.length,
                educationalResults: educationalResults.length,
                searchDurationMs,
                wasSuccessful: documentResults.length > 0 || educationalResults.length > 0
            });
            return {
                query: analyzedQuery,
                documentResults,
                educationalResults,
                totalResults: documentResults.length + educationalResults.length,
                searchDurationMs,
                searchInsights
            };
        }
        catch (error) {
            const searchDurationMs = Date.now() - startTime;
            this.logger.error('Search failed', { error, query, searchDurationMs });
            // Return empty results on error
            return {
                query: {
                    originalQuery: query,
                    queryType: query_analyzer_1.QueryType.CODE_SEARCH,
                    frameworks: [],
                    contentTypes: [query_analyzer_1.ContentType.CODE],
                    isLookingForExamples: false,
                    isLookingForDocumentation: false,
                    isLookingForTroubleshooting: false,
                    semanticQuery: query,
                    keywordFilters: [],
                    analysisConfidence: 0.1
                },
                documentResults: [],
                educationalResults: [],
                totalResults: 0,
                searchDurationMs,
                searchInsights: {
                    missingContext: ['Search failed due to technical error. Please try again.']
                }
            };
        }
    }
    /**
     * Search documents with intelligent filtering
     */
    async searchDocuments(analyzedQuery, queryEmbedding, repositoryContext, options = {}) {
        const { maxResults = 10, similarityThreshold = 0.7, boost = {} } = options;
        const { importanceWeight = 0.3, recencyWeight = 0.1, frameworkWeight = 0.2 } = boost;
        try {
            // Build filters based on analyzed query
            const filters = this.buildDocumentFilters(analyzedQuery, repositoryContext);
            // Execute search with filters
            const { data, error } = await this.supabase.rpc('rag_search_documents', {
                query_embedding: queryEmbedding,
                repository_filter: filters.repositoryId,
                content_type_filter: filters.contentType,
                language_filter: filters.language,
                min_importance: filters.minImportance,
                framework_filter: filters.framework,
                match_threshold: similarityThreshold,
                match_count: maxResults * 2 // Get more results for re-ranking
            });
            if (error) {
                this.logger.error('Document search failed', { error, filters });
                return [];
            }
            if (!data || data.length === 0) {
                this.logger.info('No documents found', { filters });
                return [];
            }
            // Re-rank results with additional scoring
            const rerankedResults = this.rerankDocumentResults(data, analyzedQuery, { importanceWeight, recencyWeight, frameworkWeight });
            // Return top results after re-ranking
            return rerankedResults.slice(0, maxResults);
        }
        catch (error) {
            this.logger.error('Error searching documents', { error });
            return [];
        }
    }
    /**
     * Search educational content
     */
    async searchEducationalContent(analyzedQuery, queryEmbedding, options = {}) {
        const { maxResults = 5, similarityThreshold = 0.7 } = options;
        try {
            // Determine appropriate difficulty filter
            let difficultyFilter = analyzedQuery.difficultyLevel;
            // If no specific difficulty requested, include all levels
            // but prefer appropriate level based on query complexity
            if (!difficultyFilter) {
                difficultyFilter = this.inferDifficultyFromQuery(analyzedQuery);
            }
            const { data, error } = await this.supabase.rpc('rag_search_educational_content', {
                query_embedding: queryEmbedding,
                language_filter: analyzedQuery.programmingLanguage,
                difficulty_filter: difficultyFilter,
                framework_filter: analyzedQuery.frameworks[0], // Use primary framework
                match_threshold: similarityThreshold,
                match_count: maxResults
            });
            if (error) {
                this.logger.error('Educational content search failed', { error });
                return [];
            }
            return (data || []).map((item) => ({
                id: item.id.toString(),
                title: item.title,
                content: item.content,
                contentType: item.content_type,
                programmingLanguage: item.programming_language,
                difficultyLevel: item.difficulty_level,
                frameworks: item.frameworks || [],
                qualityScore: item.quality_score || 0.5,
                similarity: item.similarity
            }));
        }
        catch (error) {
            this.logger.error('Error searching educational content', { error });
            return [];
        }
    }
    /**
     * Build document search filters from analyzed query
     */
    buildDocumentFilters(analyzedQuery, repositoryContext) {
        return {
            repositoryId: repositoryContext?.repositoryId || null,
            contentType: this.selectPrimaryContentType(analyzedQuery.contentTypes),
            language: analyzedQuery.programmingLanguage || null,
            minImportance: this.calculateMinImportance(analyzedQuery),
            framework: analyzedQuery.frameworks[0] || null // Use primary framework
        };
    }
    /**
     * Select the most relevant content type for filtering
     */
    selectPrimaryContentType(contentTypes) {
        if (contentTypes.length === 0)
            return null;
        // Priority order for content types
        const priority = [
            query_analyzer_1.ContentType.CODE,
            query_analyzer_1.ContentType.EXAMPLE,
            query_analyzer_1.ContentType.DOCUMENTATION,
            query_analyzer_1.ContentType.CONFIG,
            query_analyzer_1.ContentType.TEST
        ];
        for (const type of priority) {
            if (contentTypes.includes(type)) {
                return type;
            }
        }
        return contentTypes[0];
    }
    /**
     * Calculate minimum importance threshold based on query analysis
     */
    calculateMinImportance(analyzedQuery) {
        let minImportance = 0.0;
        // Increase threshold for high-confidence queries
        if (analyzedQuery.analysisConfidence > 0.8) {
            minImportance = 0.3;
        }
        else if (analyzedQuery.analysisConfidence > 0.6) {
            minImportance = 0.1;
        }
        // Increase threshold for specific query types
        if (analyzedQuery.queryType === query_analyzer_1.QueryType.BEST_PRACTICES ||
            analyzedQuery.queryType === query_analyzer_1.QueryType.ARCHITECTURE) {
            minImportance += 0.2;
        }
        return Math.min(minImportance, 0.7); // Cap at 0.7
    }
    /**
     * Re-rank document results with additional scoring factors
     */
    rerankDocumentResults(results, analyzedQuery, weights) {
        return results.map((item) => {
            const baseScore = item.similarity;
            const importanceBoost = item.importance_score * weights.importanceWeight;
            // Framework matching boost
            let frameworkBoost = 0;
            if (analyzedQuery.frameworks.length > 0 && item.framework_references) {
                const matchingFrameworks = analyzedQuery.frameworks.filter(f => item.framework_references.includes(f));
                frameworkBoost = (matchingFrameworks.length / analyzedQuery.frameworks.length) * weights.frameworkWeight;
            }
            // Recency boost (assuming we have updated_at)
            let recencyBoost = 0;
            if (item.updated_at) {
                const daysSinceUpdate = (Date.now() - new Date(item.updated_at).getTime()) / (1000 * 60 * 60 * 24);
                recencyBoost = Math.max(0, (30 - daysSinceUpdate) / 30) * weights.recencyWeight;
            }
            const relevanceScore = baseScore + importanceBoost + frameworkBoost + recencyBoost;
            return {
                id: item.id.toString(),
                repositoryId: item.repository_id,
                filePath: item.file_path,
                contentChunk: item.content_chunk,
                contentType: item.content_type,
                contentLanguage: item.content_language,
                importanceScore: item.importance_score,
                similarity: item.similarity,
                metadata: item.metadata || {},
                relevanceScore
            };
        }).sort((a, b) => b.relevanceScore - a.relevanceScore);
    }
    /**
     * Determine if educational content should be included
     */
    shouldIncludeEducationalContent(analyzedQuery, options) {
        // Explicitly requested
        if (options.includeEducationalContent === true) {
            return true;
        }
        // Explicitly disabled
        if (options.includeEducationalContent === false) {
            return false;
        }
        // Auto-detect based on query type
        return analyzedQuery.queryType === query_analyzer_1.QueryType.EXAMPLE_REQUEST ||
            analyzedQuery.queryType === query_analyzer_1.QueryType.BEST_PRACTICES ||
            analyzedQuery.queryType === query_analyzer_1.QueryType.DOCUMENTATION ||
            analyzedQuery.isLookingForExamples;
    }
    /**
     * Infer difficulty level from query characteristics
     */
    inferDifficultyFromQuery(analyzedQuery) {
        const query = analyzedQuery.originalQuery.toLowerCase();
        // Check for beginner indicators
        if (query.includes('tutorial') || query.includes('getting started') ||
            query.includes('basic') || query.includes('simple')) {
            return query_analyzer_1.DifficultyLevel.BEGINNER;
        }
        // Check for advanced indicators
        if (query.includes('optimization') || query.includes('performance') ||
            query.includes('advanced') || query.includes('enterprise') ||
            query.includes('scalability')) {
            return query_analyzer_1.DifficultyLevel.ADVANCED;
        }
        // Default to intermediate for most queries
        return query_analyzer_1.DifficultyLevel.INTERMEDIATE;
    }
    /**
     * Generate insights about the search results
     */
    generateSearchInsights(analyzedQuery, documentResults, educationalResults) {
        const insights = {};
        // Add refinement suggestions if confidence is low
        if (analyzedQuery.analysisConfidence < 0.6) {
            insights.suggestedRefinements = analyzedQuery.suggestedRefinements || [
                'Try being more specific about your programming language',
                'Include specific framework names if applicable',
                'Add example-related keywords if you need code samples'
            ];
        }
        // Suggest alternative queries if few results
        if (documentResults.length < 3) {
            insights.alternativeQueries = this.generateAlternativeQueries(analyzedQuery);
        }
        // Identify missing context
        const missingContext = [];
        if (!analyzedQuery.programmingLanguage) {
            missingContext.push('Programming language not specified');
        }
        if (analyzedQuery.frameworks.length === 0) {
            missingContext.push('No specific framework mentioned');
        }
        if (missingContext.length > 0) {
            insights.missingContext = missingContext;
        }
        return Object.keys(insights).length > 0 ? insights : undefined;
    }
    /**
     * Generate alternative query suggestions
     */
    generateAlternativeQueries(analyzedQuery) {
        const alternatives = [];
        const baseQuery = analyzedQuery.semanticQuery;
        // Add language-specific alternatives
        if (!analyzedQuery.programmingLanguage) {
            alternatives.push(`${baseQuery} in TypeScript`);
            alternatives.push(`${baseQuery} in Python`);
            alternatives.push(`${baseQuery} in JavaScript`);
        }
        // Add framework-specific alternatives
        if (analyzedQuery.frameworks.length === 0) {
            alternatives.push(`${baseQuery} with React`);
            alternatives.push(`${baseQuery} with Express`);
        }
        // Add example-focused alternatives
        if (!analyzedQuery.isLookingForExamples) {
            alternatives.push(`${baseQuery} example`);
            alternatives.push(`how to ${baseQuery}`);
        }
        return alternatives.slice(0, 3); // Limit to 3 suggestions
    }
    /**
     * Log query pattern for learning and optimization
     */
    async logQueryPattern(analyzedQuery, queryEmbedding, searchMetrics) {
        try {
            await this.supabase
                .from('rag_query_patterns')
                .insert({
                query_text: analyzedQuery.originalQuery,
                query_type: analyzedQuery.queryType,
                query_embedding: queryEmbedding,
                result_count: searchMetrics.documentResults + searchMetrics.educationalResults,
                was_successful: searchMetrics.wasSuccessful,
                search_duration_ms: searchMetrics.searchDurationMs
            });
        }
        catch (error) {
            this.logger.warn('Failed to log query pattern', { error });
            // Don't throw - this is non-critical
        }
    }
}
exports.SelectiveRAGService = SelectiveRAGService;
