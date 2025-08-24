/**
 * Query types that help determine the best search strategy
 */
export declare enum QueryType {
    CODE_SEARCH = "code_search",
    DOCUMENTATION = "documentation",
    EXAMPLE_REQUEST = "example_request",
    ARCHITECTURE = "architecture",
    BEST_PRACTICES = "best_practices",
    TROUBLESHOOTING = "troubleshooting",
    API_REFERENCE = "api_reference",
    CONFIGURATION = "configuration"
}
/**
 * Content types to filter by
 */
export declare enum ContentType {
    CODE = "code",
    DOCUMENTATION = "documentation",
    CONFIG = "config",
    TEST = "test",
    EXAMPLE = "example"
}
/**
 * Difficulty levels for educational content
 */
export declare enum DifficultyLevel {
    BEGINNER = "beginner",
    INTERMEDIATE = "intermediate",
    ADVANCED = "advanced"
}
/**
 * Analyzed query with extracted metadata filters
 */
export interface AnalyzedQuery {
    originalQuery: string;
    queryType: QueryType;
    programmingLanguage?: string;
    frameworks: string[];
    contentTypes: ContentType[];
    difficultyLevel?: DifficultyLevel;
    isLookingForExamples: boolean;
    isLookingForDocumentation: boolean;
    isLookingForTroubleshooting: boolean;
    semanticQuery: string;
    keywordFilters: string[];
    analysisConfidence: number;
    suggestedRefinements?: string[];
}
/**
 * User context that influences query analysis
 */
export interface UserContext {
    skillLevel?: DifficultyLevel;
    preferredLanguages?: string[];
    recentRepositories?: string[];
    searchHistory?: string[];
}
/**
 * Repository context for filtering
 */
export interface RepositoryContext {
    repositoryId?: number;
    primaryLanguage?: string;
    frameworkStack?: string[];
    repositorySize?: number;
}
/**
 * Intelligent query analyzer that extracts metadata filters and intent
 * from natural language queries to optimize RAG search results.
 */
export declare class QueryAnalyzer {
    private logger;
    private readonly QUERY_TYPE_PATTERNS;
    private readonly LANGUAGE_PATTERNS;
    private readonly FRAMEWORK_PATTERNS;
    private readonly CONTENT_TYPE_PATTERNS;
    /**
     * Analyze a query to extract intent, filters, and search parameters
     */
    analyzeQuery(query: string, userContext?: UserContext, repositoryContext?: RepositoryContext): Promise<AnalyzedQuery>;
    /**
     * Extract the primary query type from the query text
     */
    private extractQueryType;
    /**
     * Extract programming language from query, context, and user preferences
     */
    private extractProgrammingLanguage;
    /**
     * Extract framework references from query and context
     */
    private extractFrameworks;
    /**
     * Extract content types based on query and type
     */
    private extractContentTypes;
    /**
     * Extract difficulty level from query and user context
     */
    private extractDifficultyLevel;
    /**
     * Detect if user is looking for examples
     */
    private detectExampleIntent;
    /**
     * Detect if user is looking for documentation
     */
    private detectDocumentationIntent;
    /**
     * Detect if user is troubleshooting
     */
    private detectTroubleshootingIntent;
    /**
     * Clean query text for semantic search
     */
    private cleanQueryForSemanticSearch;
    /**
     * Extract specific keywords for exact matching
     */
    private extractKeywordFilters;
    /**
     * Calculate confidence in the query analysis
     */
    private calculateAnalysisConfidence;
    /**
     * Generate suggestions for query refinement
     */
    private generateRefinementSuggestions;
}
