import { SupabaseClient as SupabaseJSClient } from '@supabase/supabase-js';

// Compatible interface for our RAG services
interface SupabaseClient {
  from(table: string): any;
  rpc(functionName: string, params: any): Promise<{ data: any; error: any }>;
}
import { getSupabaseClient } from '../supabase/supabase-client.factory';
import { createLogger } from '../../utils/logger';
import { 
  QueryAnalyzer, 
  AnalyzedQuery, 
  UserContext, 
  RepositoryContext,
  QueryType,
  ContentType,
  DifficultyLevel 
} from './query-analyzer';

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
  
  // Computed fields
  relevanceScore: number; // Combined similarity + importance + context relevance
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
    importanceWeight?: number; // 0-1, how much to weight importance vs similarity
    recencyWeight?: number; // 0-1, how much to boost recent content
    frameworkWeight?: number; // 0-1, how much to boost matching frameworks
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
  
  // Insights for the user
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
export class SelectiveRAGService {
  private queryAnalyzer: QueryAnalyzer;
  private logger = createLogger('SelectiveRAGService');
  private supabase: SupabaseClient;
  
  constructor(
    private embeddingService: EmbeddingService,
    supabaseClient?: SupabaseJSClient
  ) {
    this.queryAnalyzer = new QueryAnalyzer();
    this.supabase = (supabaseClient || getSupabaseClient()) as any;
  }
  
  /**
   * Perform intelligent search with automatic query analysis and filtering
   */
  async search(
    query: string,
    userContext?: UserContext,
    repositoryContext?: RepositoryContext,
    options: SearchOptions = {}
  ): Promise<RAGSearchResponse> {
    const startTime = Date.now();
    
    try {
      this.logger.info('Starting selective RAG search', { 
        query, 
        hasUserContext: !!userContext,
        hasRepositoryContext: !!repositoryContext 
      });
      
      // Analyze the query to extract intent and filters
      const analyzedQuery = await this.queryAnalyzer.analyzeQuery(
        query,
        userContext,
        repositoryContext
      );
      
      this.logger.debug('Query analysis completed', { 
        queryType: analyzedQuery.queryType,
        confidence: analyzedQuery.analysisConfidence,
        frameworks: analyzedQuery.frameworks
      });
      
      // Generate embedding for semantic search
      const queryEmbedding = await this.embeddingService.generateEmbedding(
        analyzedQuery.semanticQuery
      );
      
      // Search documents with intelligent filtering
      const documentResults = await this.searchDocuments(
        analyzedQuery,
        queryEmbedding,
        repositoryContext,
        options
      );
      
      // Search educational content if requested or beneficial
      let educationalResults: EducationalContentResult[] = [];
      if (this.shouldIncludeEducationalContent(analyzedQuery, options)) {
        educationalResults = await this.searchEducationalContent(
          analyzedQuery,
          queryEmbedding,
          options
        );
      }
      
      // Generate search insights
      const searchInsights = this.generateSearchInsights(
        analyzedQuery,
        documentResults,
        educationalResults
      );
      
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
      
    } catch (error) {
      const searchDurationMs = Date.now() - startTime;
      this.logger.error('Search failed', { error, query, searchDurationMs });
      
      // Return empty results on error
      return {
        query: {
          originalQuery: query,
          queryType: QueryType.CODE_SEARCH,
          frameworks: [],
          contentTypes: [ContentType.CODE],
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
  private async searchDocuments(
    analyzedQuery: AnalyzedQuery,
    queryEmbedding: number[],
    repositoryContext?: RepositoryContext,
    options: SearchOptions = {}
  ): Promise<RAGSearchResult[]> {
    const {
      maxResults = 10,
      similarityThreshold = 0.7,
      boost = {}
    } = options;
    
    const {
      importanceWeight = 0.3,
      recencyWeight = 0.1,
      frameworkWeight = 0.2
    } = boost;
    
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
      const rerankedResults = this.rerankDocumentResults(
        data,
        analyzedQuery,
        { importanceWeight, recencyWeight, frameworkWeight }
      );
      
      // Return top results after re-ranking
      return rerankedResults.slice(0, maxResults);
      
    } catch (error) {
      this.logger.error('Error searching documents', { error });
      return [];
    }
  }
  
  /**
   * Search educational content
   */
  private async searchEducationalContent(
    analyzedQuery: AnalyzedQuery,
    queryEmbedding: number[],
    options: SearchOptions = {}
  ): Promise<EducationalContentResult[]> {
    const {
      maxResults = 5,
      similarityThreshold = 0.7
    } = options;
    
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
      
      return (data || []).map((item: any) => ({
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
      
    } catch (error) {
      this.logger.error('Error searching educational content', { error });
      return [];
    }
  }
  
  /**
   * Build document search filters from analyzed query
   */
  private buildDocumentFilters(
    analyzedQuery: AnalyzedQuery,
    repositoryContext?: RepositoryContext
  ) {
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
  private selectPrimaryContentType(contentTypes: ContentType[]): string | null {
    if (contentTypes.length === 0) return null;
    
    // Priority order for content types
    const priority = [
      ContentType.CODE,
      ContentType.EXAMPLE,
      ContentType.DOCUMENTATION,
      ContentType.CONFIG,
      ContentType.TEST
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
  private calculateMinImportance(analyzedQuery: AnalyzedQuery): number {
    let minImportance = 0.0;
    
    // Increase threshold for high-confidence queries
    if (analyzedQuery.analysisConfidence > 0.8) {
      minImportance = 0.3;
    } else if (analyzedQuery.analysisConfidence > 0.6) {
      minImportance = 0.1;
    }
    
    // Increase threshold for specific query types
    if (analyzedQuery.queryType === QueryType.BEST_PRACTICES ||
        analyzedQuery.queryType === QueryType.ARCHITECTURE) {
      minImportance += 0.2;
    }
    
    return Math.min(minImportance, 0.7); // Cap at 0.7
  }
  
  /**
   * Re-rank document results with additional scoring factors
   */
  private rerankDocumentResults(
    results: any[],
    analyzedQuery: AnalyzedQuery,
    weights: { importanceWeight: number; recencyWeight: number; frameworkWeight: number }
  ): RAGSearchResult[] {
    return results.map(item => {
      const baseScore = item.similarity;
      const importanceBoost = item.importance_score * weights.importanceWeight;
      
      // Framework matching boost
      let frameworkBoost = 0;
      if (analyzedQuery.frameworks.length > 0 && item.framework_references) {
        const matchingFrameworks = analyzedQuery.frameworks.filter(f => 
          item.framework_references.includes(f)
        );
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
  private shouldIncludeEducationalContent(
    analyzedQuery: AnalyzedQuery,
    options: SearchOptions
  ): boolean {
    // Explicitly requested
    if (options.includeEducationalContent === true) {
      return true;
    }
    
    // Explicitly disabled
    if (options.includeEducationalContent === false) {
      return false;
    }
    
    // Auto-detect based on query type
    return analyzedQuery.queryType === QueryType.EXAMPLE_REQUEST ||
           analyzedQuery.queryType === QueryType.BEST_PRACTICES ||
           analyzedQuery.queryType === QueryType.DOCUMENTATION ||
           analyzedQuery.isLookingForExamples;
  }
  
  /**
   * Infer difficulty level from query characteristics
   */
  private inferDifficultyFromQuery(analyzedQuery: AnalyzedQuery): DifficultyLevel {
    const query = analyzedQuery.originalQuery.toLowerCase();
    
    // Check for beginner indicators
    if (query.includes('tutorial') || query.includes('getting started') ||
        query.includes('basic') || query.includes('simple')) {
      return DifficultyLevel.BEGINNER;
    }
    
    // Check for advanced indicators
    if (query.includes('optimization') || query.includes('performance') ||
        query.includes('advanced') || query.includes('enterprise') ||
        query.includes('scalability')) {
      return DifficultyLevel.ADVANCED;
    }
    
    // Default to intermediate for most queries
    return DifficultyLevel.INTERMEDIATE;
  }
  
  /**
   * Generate insights about the search results
   */
  private generateSearchInsights(
    analyzedQuery: AnalyzedQuery,
    documentResults: RAGSearchResult[],
    educationalResults: EducationalContentResult[]
  ) {
    const insights: any = {};
    
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
    const missingContext: string[] = [];
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
  private generateAlternativeQueries(analyzedQuery: AnalyzedQuery): string[] {
    const alternatives: string[] = [];
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
  private async logQueryPattern(
    analyzedQuery: AnalyzedQuery,
    queryEmbedding: number[],
    searchMetrics: {
      documentResults: number;
      educationalResults: number;
      searchDurationMs: number;
      wasSuccessful: boolean;
    }
  ): Promise<void> {
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
    } catch (error) {
      this.logger.warn('Failed to log query pattern', { error });
      // Don't throw - this is non-critical
    }
  }
}