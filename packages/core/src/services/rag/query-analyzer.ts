import { createLogger } from '../../utils/logger';

/**
 * Query types that help determine the best search strategy
 */
export enum QueryType {
  CODE_SEARCH = 'code_search',
  DOCUMENTATION = 'documentation',
  EXAMPLE_REQUEST = 'example_request',
  ARCHITECTURE = 'architecture',
  BEST_PRACTICES = 'best_practices',
  TROUBLESHOOTING = 'troubleshooting',
  API_REFERENCE = 'api_reference',
  CONFIGURATION = 'configuration'
}

/**
 * Content types to filter by
 */
export enum ContentType {
  CODE = 'code',
  DOCUMENTATION = 'documentation',
  CONFIG = 'config',
  TEST = 'test',
  EXAMPLE = 'example'
}

/**
 * Difficulty levels for educational content
 */
export enum DifficultyLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced'
}

/**
 * Analyzed query with extracted metadata filters
 */
export interface AnalyzedQuery {
  originalQuery: string;
  queryType: QueryType;
  
  // Extracted filters
  programmingLanguage?: string;
  frameworks: string[];
  contentTypes: ContentType[];
  difficultyLevel?: DifficultyLevel;
  
  // Intent and context
  isLookingForExamples: boolean;
  isLookingForDocumentation: boolean;
  isLookingForTroubleshooting: boolean;
  
  // Search parameters
  semanticQuery: string; // cleaned query for embedding
  keywordFilters: string[]; // specific terms to filter by
  
  // Confidence scoring
  analysisConfidence: number; // 0-1, how confident we are in the analysis
  
  // Suggestions for refinement
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
export class QueryAnalyzer {
  private logger = createLogger('QueryAnalyzer');
  
  // Pattern matchers for different query types
  private readonly QUERY_TYPE_PATTERNS = {
    [QueryType.CODE_SEARCH]: [
      /how to (implement|create|build|write)/i,
      /show me.*code/i,
      /example.*function/i,
      /implementation of/i,
      /(function|method|class).*that/i
    ],
    [QueryType.DOCUMENTATION]: [
      /what is/i,
      /explain/i,
      /documentation for/i,
      /how does.*work/i,
      /overview of/i
    ],
    [QueryType.EXAMPLE_REQUEST]: [
      /example/i,
      /sample/i,
      /demo/i,
      /(show|give).*example/i,
      /how to use/i
    ],
    [QueryType.ARCHITECTURE]: [
      /architecture/i,
      /structure/i,
      /design pattern/i,
      /how is.*organized/i,
      /system design/i
    ],
    [QueryType.BEST_PRACTICES]: [
      /best practice/i,
      /recommended/i,
      /should i/i,
      /proper way/i,
      /convention/i
    ],
    [QueryType.TROUBLESHOOTING]: [
      /error/i,
      /problem/i,
      /issue/i,
      /not working/i,
      /fix/i,
      /debug/i,
      /why.*fail/i
    ],
    [QueryType.API_REFERENCE]: [
      /api/i,
      /endpoint/i,
      /request/i,
      /response/i,
      /parameters/i
    ],
    [QueryType.CONFIGURATION]: [
      /config/i,
      /setup/i,
      /install/i,
      /environment/i,
      /settings/i
    ]
  };
  
  // Programming language patterns
  private readonly LANGUAGE_PATTERNS = {
    'typescript': [/typescript/i, /\.ts$/i, /interface/i, /type/i],
    'javascript': [/javascript/i, /\.js$/i, /node\.?js/i, /npm/i],
    'python': [/python/i, /\.py$/i, /pip/i, /django/i, /flask/i],
    'java': [/java/i, /\.java$/i, /spring/i, /maven/i],
    'go': [/golang/i, /\bgo\b/i, /\.go$/i],
    'rust': [/rust/i, /\.rs$/i, /cargo/i],
    'c++': [/c\+\+/i, /cpp/i, /\.cpp$/i, /\.h$/i],
    'c#': [/c#/i, /csharp/i, /\.cs$/i, /dotnet/i],
    'php': [/php/i, /\.php$/i, /laravel/i],
    'ruby': [/ruby/i, /\.rb$/i, /rails/i, /gem/i],
    'sql': [/sql/i, /database/i, /query/i, /select/i],
    'html': [/html/i, /\.html$/i, /markup/i],
    'css': [/css/i, /\.css$/i, /styling/i, /sass/i, /scss/i]
  };
  
  // Framework patterns
  private readonly FRAMEWORK_PATTERNS = {
    'react': [/react/i, /jsx/i, /hooks/i, /component/i],
    'vue': [/vue/i, /\.vue$/i, /vuex/i],
    'angular': [/angular/i, /ng-/i, /directive/i],
    'express': [/express/i, /middleware/i, /router/i],
    'nestjs': [/nest/i, /nestjs/i, /@controller/i, /@service/i],
    'fastapi': [/fastapi/i, /pydantic/i],
    'django': [/django/i, /models\.py/i],
    'spring': [/spring/i, /@autowired/i, /@component/i],
    'laravel': [/laravel/i, /eloquent/i, /artisan/i],
    'rails': [/rails/i, /activerecord/i],
    'docker': [/docker/i, /dockerfile/i, /container/i],
    'kubernetes': [/kubernetes/i, /k8s/i, /kubectl/i, /pod/i],
    'aws': [/aws/i, /lambda/i, /s3/i, /ec2/i],
    'mongodb': [/mongodb/i, /mongoose/i, /nosql/i],
    'postgresql': [/postgres/i, /psql/i, /pg/i],
    'redis': [/redis/i, /cache/i, /session/i]
  };
  
  // Content type patterns
  private readonly CONTENT_TYPE_PATTERNS = {
    [ContentType.CODE]: [
      /function/i, /class/i, /method/i, /implementation/i,
      /algorithm/i, /logic/i, /code/i
    ],
    [ContentType.DOCUMENTATION]: [
      /readme/i, /docs/i, /documentation/i, /guide/i,
      /tutorial/i, /manual/i, /wiki/i
    ],
    [ContentType.CONFIG]: [
      /config/i, /configuration/i, /setup/i, /environment/i,
      /\.json$/i, /\.yaml$/i, /\.yml$/i, /\.env$/i
    ],
    [ContentType.TEST]: [
      /test/i, /spec/i, /\.test\./i, /\.spec\./i,
      /unit test/i, /integration test/i
    ],
    [ContentType.EXAMPLE]: [
      /example/i, /sample/i, /demo/i, /snippet/i,
      /playground/i, /showcase/i
    ]
  };
  
  /**
   * Analyze a query to extract intent, filters, and search parameters
   */
  async analyzeQuery(
    query: string,
    userContext?: UserContext,
    repositoryContext?: RepositoryContext
  ): Promise<AnalyzedQuery> {
    this.logger.info('Analyzing query', { query, hasUserContext: !!userContext });
    
    const startTime = Date.now();
    
    try {
      // Extract query type
      const queryType = this.extractQueryType(query);
      
      // Extract programming language
      const programmingLanguage = this.extractProgrammingLanguage(
        query, 
        userContext, 
        repositoryContext
      );
      
      // Extract frameworks
      const frameworks = this.extractFrameworks(query, repositoryContext);
      
      // Extract content types
      const contentTypes = this.extractContentTypes(query, queryType);
      
      // Extract difficulty level
      const difficultyLevel = this.extractDifficultyLevel(query, userContext);
      
      // Determine intent flags
      const isLookingForExamples = this.detectExampleIntent(query);
      const isLookingForDocumentation = this.detectDocumentationIntent(query);
      const isLookingForTroubleshooting = this.detectTroubleshootingIntent(query);
      
      // Clean query for semantic search
      const semanticQuery = this.cleanQueryForSemanticSearch(query);
      
      // Extract keyword filters
      const keywordFilters = this.extractKeywordFilters(query);
      
      // Calculate confidence
      const analysisConfidence = this.calculateAnalysisConfidence(
        query,
        queryType,
        programmingLanguage,
        frameworks
      );
      
      // Generate refinement suggestions
      const suggestedRefinements = this.generateRefinementSuggestions(
        query,
        queryType,
        analysisConfidence
      );
      
      const result: AnalyzedQuery = {
        originalQuery: query,
        queryType,
        programmingLanguage,
        frameworks,
        contentTypes,
        difficultyLevel,
        isLookingForExamples,
        isLookingForDocumentation,
        isLookingForTroubleshooting,
        semanticQuery,
        keywordFilters,
        analysisConfidence,
        suggestedRefinements
      };
      
      const analysisTime = Date.now() - startTime;
      this.logger.info('Query analysis completed', { 
        analysisTime, 
        queryType, 
        confidence: analysisConfidence 
      });
      
      return result;
      
    } catch (error) {
      this.logger.error('Error analyzing query', { error, query });
      
      // Return basic fallback analysis
      return {
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
      };
    }
  }
  
  /**
   * Extract the primary query type from the query text
   */
  private extractQueryType(query: string): QueryType {
    let maxMatches = 0;
    let detectedType = QueryType.CODE_SEARCH; // default
    
    for (const [type, patterns] of Object.entries(this.QUERY_TYPE_PATTERNS)) {
      const matches = patterns.filter(pattern => pattern.test(query)).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        detectedType = type as QueryType;
      }
    }
    
    return detectedType;
  }
  
  /**
   * Extract programming language from query, context, and user preferences
   */
  private extractProgrammingLanguage(
    query: string,
    userContext?: UserContext,
    repositoryContext?: RepositoryContext
  ): string | undefined {
    // First try to extract from query text
    for (const [language, patterns] of Object.entries(this.LANGUAGE_PATTERNS)) {
      if (patterns.some(pattern => pattern.test(query))) {
        return language;
      }
    }
    
    // Fall back to repository context
    if (repositoryContext?.primaryLanguage) {
      return repositoryContext.primaryLanguage.toLowerCase();
    }
    
    // Fall back to user preferences
    if (userContext?.preferredLanguages?.length) {
      return userContext.preferredLanguages[0];
    }
    
    return undefined;
  }
  
  /**
   * Extract framework references from query and context
   */
  private extractFrameworks(
    query: string,
    repositoryContext?: RepositoryContext
  ): string[] {
    const frameworks: string[] = [];
    
    // Extract from query text
    for (const [framework, patterns] of Object.entries(this.FRAMEWORK_PATTERNS)) {
      if (patterns.some(pattern => pattern.test(query))) {
        frameworks.push(framework);
      }
    }
    
    // Add from repository context if no frameworks found in query
    if (frameworks.length === 0 && repositoryContext?.frameworkStack) {
      frameworks.push(...repositoryContext.frameworkStack);
    }
    
    return frameworks;
  }
  
  /**
   * Extract content types based on query and type
   */
  private extractContentTypes(query: string, queryType: QueryType): ContentType[] {
    const contentTypes: ContentType[] = [];
    
    // Extract from query text
    for (const [type, patterns] of Object.entries(this.CONTENT_TYPE_PATTERNS)) {
      if (patterns.some(pattern => pattern.test(query))) {
        contentTypes.push(type as ContentType);
      }
    }
    
    // Add default based on query type if nothing found
    if (contentTypes.length === 0) {
      switch (queryType) {
        case QueryType.CODE_SEARCH:
        case QueryType.EXAMPLE_REQUEST:
          contentTypes.push(ContentType.CODE);
          break;
        case QueryType.DOCUMENTATION:
          contentTypes.push(ContentType.DOCUMENTATION);
          break;
        case QueryType.CONFIGURATION:
          contentTypes.push(ContentType.CONFIG);
          break;
        default:
          contentTypes.push(ContentType.CODE, ContentType.DOCUMENTATION);
      }
    }
    
    return contentTypes;
  }
  
  /**
   * Extract difficulty level from query and user context
   */
  private extractDifficultyLevel(
    query: string,
    userContext?: UserContext
  ): DifficultyLevel | undefined {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('beginner') || lowerQuery.includes('basic') || 
        lowerQuery.includes('simple') || lowerQuery.includes('easy')) {
      return DifficultyLevel.BEGINNER;
    }
    
    if (lowerQuery.includes('advanced') || lowerQuery.includes('complex') || 
        lowerQuery.includes('sophisticated') || lowerQuery.includes('enterprise')) {
      return DifficultyLevel.ADVANCED;
    }
    
    if (lowerQuery.includes('intermediate') || lowerQuery.includes('moderate')) {
      return DifficultyLevel.INTERMEDIATE;
    }
    
    // Fall back to user context
    return userContext?.skillLevel;
  }
  
  /**
   * Detect if user is looking for examples
   */
  private detectExampleIntent(query: string): boolean {
    const patterns = [
      /example/i, /sample/i, /demo/i, /show me/i,
      /how to use/i, /usage/i, /snippet/i
    ];
    return patterns.some(pattern => pattern.test(query));
  }
  
  /**
   * Detect if user is looking for documentation
   */
  private detectDocumentationIntent(query: string): boolean {
    const patterns = [
      /what is/i, /explain/i, /documentation/i, /docs/i,
      /overview/i, /guide/i, /manual/i, /reference/i
    ];
    return patterns.some(pattern => pattern.test(query));
  }
  
  /**
   * Detect if user is troubleshooting
   */
  private detectTroubleshootingIntent(query: string): boolean {
    const patterns = [
      /error/i, /problem/i, /issue/i, /not working/i,
      /fix/i, /debug/i, /troubleshoot/i, /why.*fail/i,
      /broken/i, /stuck/i
    ];
    return patterns.some(pattern => pattern.test(query));
  }
  
  /**
   * Clean query text for semantic search
   */
  private cleanQueryForSemanticSearch(query: string): string {
    return query
      // Remove common stop words that don't add semantic value
      .replace(/\b(how|to|do|i|can|you|show|me|find|get|make|create|build)\b/gi, ' ')
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  /**
   * Extract specific keywords for exact matching
   */
  private extractKeywordFilters(query: string): string[] {
    const keywords: string[] = [];
    
    // Extract quoted strings
    const quotedMatches = query.match(/"([^"]+)"/g);
    if (quotedMatches) {
      keywords.push(...quotedMatches.map(match => match.replace(/"/g, '')));
    }
    
    // Extract technical terms (camelCase, snake_case, etc.)
    const technicalTerms = query.match(/\b[a-zA-Z][a-zA-Z0-9_]*[A-Z][a-zA-Z0-9_]*\b/g);
    if (technicalTerms) {
      keywords.push(...technicalTerms);
    }
    
    return keywords;
  }
  
  /**
   * Calculate confidence in the query analysis
   */
  private calculateAnalysisConfidence(
    query: string,
    queryType: QueryType,
    programmingLanguage?: string,
    frameworks?: string[]
  ): number {
    let confidence = 0.5; // base confidence
    
    // Boost confidence for clear intent signals
    const typePatterns = this.QUERY_TYPE_PATTERNS[queryType] || [];
    const typeMatches = typePatterns.filter(pattern => pattern.test(query)).length;
    confidence += typeMatches * 0.15;
    
    // Boost confidence for identified language
    if (programmingLanguage) {
      confidence += 0.2;
    }
    
    // Boost confidence for identified frameworks
    if (frameworks && frameworks.length > 0) {
      confidence += frameworks.length * 0.1;
    }
    
    // Boost confidence for longer, more specific queries
    const wordCount = query.split(/\s+/).length;
    if (wordCount > 5) {
      confidence += 0.1;
    }
    if (wordCount > 10) {
      confidence += 0.1;
    }
    
    return Math.min(confidence, 1.0);
  }
  
  /**
   * Generate suggestions for query refinement
   */
  private generateRefinementSuggestions(
    query: string,
    queryType: QueryType,
    confidence: number
  ): string[] | undefined {
    if (confidence > 0.8) {
      return undefined; // Query is already well-formed
    }
    
    const suggestions: string[] = [];
    
    if (confidence < 0.4) {
      suggestions.push('Try being more specific about what you\'re looking for');
    }
    
    if (!query.match(/\b(typescript|javascript|python|java|go|rust|c\+\+|c#|php|ruby)\b/i)) {
      suggestions.push('Consider specifying the programming language');
    }
    
    if (queryType === QueryType.CODE_SEARCH && !query.includes('example')) {
      suggestions.push('Add "example" to get code samples');
    }
    
    if (queryType === QueryType.TROUBLESHOOTING && !query.includes('error')) {
      suggestions.push('Include the specific error message if available');
    }
    
    return suggestions.length > 0 ? suggestions : undefined;
  }
}