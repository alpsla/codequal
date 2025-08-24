import { SupabaseClient as SupabaseJSClient } from '@supabase/supabase-js';
import { AnalyzedQuery, UserContext, RepositoryContext } from './query-analyzer';
/**
 * Search result from the vector database
 */
export interface RAGSearchResult {
    id: string;
    repositoryId: number;
    filePath: string;
    contentChunk: string;
    contentType: string;
    contentLanguage?: string;
    importanceScore: number;
    similarity: number;
    metadata: Record<string, unknown>;
    relevanceScore: number;
}
/**
 * Educational content result
 */
export interface EducationalContentResult {
    id: string;
    title: string;
    content: string;
    contentType: string;
    programmingLanguage?: string;
    difficultyLevel?: string;
    frameworks: string[];
    qualityScore: number;
    similarity: number;
}
/**
 * Search configuration options
 */
export interface SearchOptions {
    maxResults?: number;
    similarityThreshold?: number;
    includeEducationalContent?: boolean;
    boost?: {
        importanceWeight?: number;
        recencyWeight?: number;
        frameworkWeight?: number;
    };
}
/**
 * Complete search response with multiple content types
 */
export interface RAGSearchResponse {
    query: AnalyzedQuery;
    documentResults: RAGSearchResult[];
    educationalResults: EducationalContentResult[];
    totalResults: number;
    searchDurationMs: number;
    searchInsights?: {
        suggestedRefinements?: string[];
        alternativeQueries?: string[];
        missingContext?: string[];
    };
}
/**
 * Embedding service interface for generating vectors
 */
export interface EmbeddingService {
    generateEmbedding(text: string): Promise<number[]>;
}
/**
 * Selective RAG Service that provides intelligent, filtered vector search
 * capabilities with metadata-based filtering and context awareness.
 */
export declare class SelectiveRAGService {
    private embeddingService;
    private queryAnalyzer;
    private logger;
    private supabase;
    constructor(embeddingService: EmbeddingService, supabaseClient?: SupabaseJSClient);
    /**
     * Perform intelligent search with automatic query analysis and filtering
     */
    search(query: string, userContext?: UserContext, repositoryContext?: RepositoryContext, options?: SearchOptions): Promise<RAGSearchResponse>;
    /**
     * Search documents with intelligent filtering
     */
    private searchDocuments;
    /**
     * Search educational content
     */
    private searchEducationalContent;
    /**
     * Build document search filters from analyzed query
     */
    private buildDocumentFilters;
    /**
     * Select the most relevant content type for filtering
     */
    private selectPrimaryContentType;
    /**
     * Calculate minimum importance threshold based on query analysis
     */
    private calculateMinImportance;
    /**
     * Re-rank document results with additional scoring factors
     */
    private rerankDocumentResults;
    /**
     * Determine if educational content should be included
     */
    private shouldIncludeEducationalContent;
    /**
     * Infer difficulty level from query characteristics
     */
    private inferDifficultyFromQuery;
    /**
     * Generate insights about the search results
     */
    private generateSearchInsights;
    /**
     * Generate alternative query suggestions
     */
    private generateAlternativeQueries;
    /**
     * Log query pattern for learning and optimization
     */
    private logQueryPattern;
}
