import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';
import { getVectorConfig } from '@codequal/core/config/vector-database.config';

export interface SearchResult {
  id: string;
  content: string;
  metadata: Record<string, any>;
  similarity: number;
  chunk_index?: number;
  total_chunks?: number;
  repository_id: string;
}

export interface UnifiedSearchOptions {
  repositoryId?: string;
  maxResults?: number;
  
  // Threshold options (automatic by default)
  similarityThreshold?: 'auto' | 'strict' | 'high' | 'default' | 'medium' | 'low' | number;
  
  // Search context for automatic threshold selection
  context?: {
    contentType?: 'security' | 'architecture' | 'code' | 'documentation' | 'general';
    urgency?: 'critical' | 'high' | 'normal' | 'low';
    precision?: 'exact' | 'high' | 'balanced' | 'broad';
  };
  
  // Advanced options
  enableFiltering?: boolean;
  useCache?: boolean;
  
  // Legacy support for direct embedding queries
  queryEmbedding?: number[];
  
  // Filters for advanced search
  filters?: {
    sourceType?: string;
    storageType?: string;
    metadata?: Record<string, any>;
  };
}

/**
 * Unified Search Service - Single comprehensive search implementation
 * Replaces VectorStorageService, VectorSearchService, and SmartSearchService
 */
export class UnifiedSearchService {
  private supabase: SupabaseClient;
  private openai: OpenAI;
  private config = getVectorConfig();
  private searchConfig = (this.config as any).search || {
    similarity: {
      default: 0.35,
      high: 0.5,
      medium: 0.4,
      low: 0.2,
      strict: 0.6
    },
    maxResults: 10,
    enableFiltering: true,
    caching: { enabled: true, ttl: 300 }
  };
  private embeddingConfig = this.config.embedding;
  private cache = new Map<string, { results: SearchResult[]; timestamp: number }>();

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                       process.env.SUPABASE_SERVICE_KEY || 
                       process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.openai = new OpenAI({ 
      apiKey: this.embeddingConfig.openai.apiKey 
    });
  }

  /**
   * Universal search method - handles both text queries and embeddings
   * Automatically selects optimal similarity threshold unless overridden
   */
  async search(
    query: string | number[], 
    options: UnifiedSearchOptions = {}
  ): Promise<{
    results: SearchResult[];
    selectedThreshold: string | number;
    reasoning: string;
    confidence?: number;
    cached: boolean;
  }> {
    const {
      repositoryId,
      maxResults = this.searchConfig.maxResults,
      similarityThreshold = 'auto',
      context = {},
      enableFiltering = this.searchConfig.enableFiltering,
      useCache = this.searchConfig.caching.enabled,
      queryEmbedding,
      filters
    } = options;

    // Handle different input types
    let embedding: number[];
    let queryText: string;
    
    if (queryEmbedding) {
      // Direct embedding provided (legacy support)
      embedding = queryEmbedding;
      queryText = '[Direct Embedding Query]';
    } else if (Array.isArray(query)) {
      // Query is already an embedding
      embedding = query;
      queryText = '[Embedding Query]';
    } else {
      // Query is text - need to generate embedding
      queryText = query;
      embedding = await this.generateQueryEmbedding(query);
    }

    // Generate cache key
    const cacheKey = this.generateCacheKey(queryText, options);
    
    // Check cache first
    if (useCache && this.isCacheValid(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return {
          ...cached,
          cached: true,
          selectedThreshold: 'cached',
          reasoning: 'Retrieved from cache'
        };
      }
    }

    // Determine the optimal threshold
    const thresholdSelection = this.selectOptimalThreshold(queryText, similarityThreshold, context);
    
    // Perform the search
    const results = await this.performVectorSearch(
      embedding,
      thresholdSelection.value,
      maxResults,
      repositoryId,
      enableFiltering,
      filters
    );

    const searchResult = {
      results,
      selectedThreshold: thresholdSelection.threshold as string | number,
      reasoning: thresholdSelection.reasoning,
      confidence: thresholdSelection.confidence,
      cached: false
    };

    // Cache results if enabled
    if (useCache) {
      this.cacheResults(cacheKey, searchResult);
    }

    return searchResult;
  }

  /**
   * Multi-level search - tries different thresholds and returns the best
   */
  async adaptiveSearch(
    query: string | number[],
    options: UnifiedSearchOptions = {}
  ): Promise<{
    optimalResults: SearchResult[];
    optimalThreshold: string | number;
    allResults: Record<string, SearchResult[]>;
    reasoning: string;
  }> {
    const thresholds = ['strict', 'high', 'default', 'medium', 'low'];
    const allResults: Record<string, SearchResult[]> = {};
    
    // Try all thresholds
    for (const threshold of thresholds) {
      try {
        const result = await this.search(query, {
          ...options,
          similarityThreshold: threshold as any,
          maxResults: 5,
          useCache: false // Don't cache intermediate results
        });
        allResults[threshold] = result.results;
      } catch (error) {
        allResults[threshold] = [];
      }
    }

    // Select the optimal threshold based on results
    const optimal = this.selectOptimalFromResults(allResults, query);
    
    return {
      optimalResults: allResults[optimal.threshold] || [],
      optimalThreshold: optimal.threshold as string | number,
      allResults,
      reasoning: optimal.reasoning
    };
  }

  /**
   * Get search recommendations without performing actual search
   */
  getRecommendation(
    query: string,
    context: UnifiedSearchOptions['context'] = {}
  ): {
    recommended: string;
    reasoning: string;
    alternatives: Array<{
      threshold: string;
      useCase: string;
      expectedResults: string;
    }>;
  } {
    const selection = this.selectOptimalThreshold(query, 'auto', context);
    
    return {
      recommended: selection.threshold as string,
      reasoning: selection.reasoning,
      alternatives: [
        {
          threshold: 'strict',
          useCase: 'When you need exact matches only',
          expectedResults: 'Very few, highly relevant results'
        },
        {
          threshold: 'high',
          useCase: 'When precision is more important than coverage',
          expectedResults: 'Fewer but more relevant results'
        },
        {
          threshold: 'default',
          useCase: 'Balanced search for general use',
          expectedResults: 'Good balance of relevance and coverage'
        },
        {
          threshold: 'medium',
          useCase: 'When you want broader coverage',
          expectedResults: 'More results with decent relevance'
        },
        {
          threshold: 'low',
          useCase: 'Exploratory search or when unsure',
          expectedResults: 'Maximum coverage, varying relevance'
        }
      ]
    };
  }

  /**
   * Clear search cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    return { size: this.cache.size, hitRate: 0 };
  }

  // Private methods

  private async generateQueryEmbedding(query: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: this.embeddingConfig.openai.model,
      input: query,
      dimensions: this.embeddingConfig.openai.dimensions
    });

    return response.data[0].embedding;
  }

  private selectOptimalThreshold(
    query: string,
    requestedThreshold: UnifiedSearchOptions['similarityThreshold'],
    context: UnifiedSearchOptions['context'] = {}
  ): {
    threshold: string | number;
    value: number;
    reasoning: string;
    confidence?: number;
  } {
    // If specific threshold requested, use it
    if (requestedThreshold !== 'auto') {
      if (typeof requestedThreshold === 'number') {
        return {
          threshold: requestedThreshold,
          value: requestedThreshold,
          reasoning: 'User-specified custom threshold',
          confidence: 1.0
        };
      } else {
        const value = this.searchConfig.similarity[requestedThreshold as keyof typeof this.searchConfig.similarity];
        return {
          threshold: requestedThreshold as string,
          value,
          reasoning: `User-specified "${requestedThreshold}" threshold`,
          confidence: 1.0
        };
      }
    }

    // Automatic threshold selection based on query analysis
    const queryLower = query.toLowerCase();
    let threshold = 'default';
    let confidence = 0.7;
    let reasoning = 'Default balanced search';

    // Security-related queries need high precision
    if (this.isSecurityQuery(queryLower) || context.contentType === 'security') {
      threshold = 'strict';
      confidence = 0.9;
      reasoning = '🔒 Security queries require precise matches to avoid false positives';
    }
    // Critical/urgent queries need high precision
    else if (this.isUrgentQuery(queryLower) || context.urgency === 'critical') {
      threshold = 'high';
      confidence = 0.85;
      reasoning = '🚨 Critical/urgent queries need high precision for accuracy';
    }
    // Specific technical queries
    else if (this.isSpecificTechnicalQuery(queryLower) && context.precision !== 'broad') {
      threshold = 'high';
      confidence = 0.8;
      reasoning = '🎯 Specific technical queries benefit from high similarity thresholds';
    }
    // Exploratory queries need broad coverage
    else if (this.isExploratoryQuery(queryLower) || context.precision === 'broad') {
      threshold = 'low';
      confidence = 0.75;
      reasoning = '🔍 Exploratory queries benefit from broader coverage';
    }
    // Documentation queries can be broader
    else if (this.isDocumentationQuery(queryLower) || context.contentType === 'documentation') {
      threshold = 'medium';
      confidence = 0.7;
      reasoning = '📖 Documentation searches benefit from medium thresholds for better coverage';
    }

    return {
      threshold,
      value: this.searchConfig.similarity[threshold],
      reasoning,
      confidence
    };
  }

  private async performVectorSearch(
    embedding: number[],
    threshold: number,
    limit: number,
    repositoryId?: string,
    enableFiltering: boolean = true,
    filters?: UnifiedSearchOptions['filters']
  ): Promise<SearchResult[]> {
    // Build the RPC call for similarity search
    let query = this.supabase.rpc('search_similar_chunks', {
      query_embedding: embedding,
      repo_id: repositoryId,
      match_count: limit,
      min_similarity: threshold
    });
    
    // Apply filters if provided
    if (filters?.sourceType) {
      query = query.eq('source_type', filters.sourceType);
    }
    
    if (filters?.storageType) {
      query = query.eq('storage_type', filters.storageType);
    }
    
    if (filters?.metadata) {
      // Apply JSONB filters
      for (const [key, value] of Object.entries(filters.metadata)) {
        query = query.contains('metadata', { [key]: value });
      }
    }

    const { data: results, error } = await query;

    if (error) {
      throw new Error(`Database search error: ${error.message}`);
    }

    if (!results || results.length === 0) {
      return [];
    }

    // Apply additional filtering if enabled
    let filteredResults = results;
    if (enableFiltering) {
      filteredResults = this.applyAdditionalFiltering(results);
    }

    // Transform to SearchResult format
    return filteredResults.map((result: any) => ({
      id: result.id,
      content: result.content,
      metadata: result.metadata || {},
      similarity: result.similarity,
      chunk_index: result.chunk_index,
      total_chunks: result.total_chunks,
      repository_id: result.repository_id
    }));
  }

  private selectOptimalFromResults(
    allResults: Record<string, SearchResult[]>,
    query: string | number[]
  ): { threshold: string; reasoning: string } {
    const resultCounts = Object.entries(allResults).map(([threshold, results]) => ({
      threshold,
      count: results.length,
      avgSimilarity: results.length > 0 
        ? results.reduce((sum, r) => sum + r.similarity, 0) / results.length 
        : 0
    }));

    // Find the threshold with the best balance of count and quality
    const optimal = resultCounts.reduce((best, current) => {
      const currentScore = this.scoreResults(current.count, current.avgSimilarity);
      const bestScore = this.scoreResults(best.count, best.avgSimilarity);
      
      return currentScore > bestScore ? current : best;
    });

    return {
      threshold: optimal.threshold,
      reasoning: `Adaptive selection: ${optimal.count} results with ${optimal.avgSimilarity.toFixed(3)} avg similarity`
    };
  }

  // Query analysis helpers
  private isSecurityQuery(query: string): boolean {
    const securityTerms = ['security', 'vulnerability', 'exploit', 'injection', 'xss', 'csrf', 'cve-'];
    return securityTerms.some(term => query.includes(term));
  }

  private isUrgentQuery(query: string): boolean {
    const urgentTerms = ['urgent', 'critical', 'emergency', 'fix', 'broken', 'down', 'failure'];
    return urgentTerms.some(term => query.includes(term));
  }

  private isSpecificTechnicalQuery(query: string): boolean {
    const specificTerms = ['function', 'class', 'method', 'variable', 'error', 'exception', 'api endpoint'];
    return specificTerms.some(term => query.includes(term));
  }

  private isExploratoryQuery(query: string): boolean {
    const exploratoryTerms = ['how to', 'what is', 'examples of', 'best practices', 'overview', 'tutorial'];
    return exploratoryTerms.some(term => query.includes(term));
  }

  private isDocumentationQuery(query: string): boolean {
    const docTerms = ['documentation', 'docs', 'readme', 'guide', 'manual'];
    return docTerms.some(term => query.includes(term));
  }

  // Utility methods
  private applyAdditionalFiltering(results: any[]): any[] {
    const filtered = [];
    const seenContent = new Set();

    for (const result of results) {
      const contentHash = this.hashContent(result.content);
      if (!seenContent.has(contentHash)) {
        seenContent.add(contentHash);
        filtered.push(result);
      }
    }

    return filtered;
  }

  private hashContent(content: string): string {
    return content.substring(0, 100).replace(/\s+/g, ' ').toLowerCase();
  }

  private scoreResults(count: number, avgSimilarity: number): number {
    const countScore = count >= 3 && count <= 8 ? 1.0 : Math.max(0, 1 - Math.abs(count - 5) * 0.1);
    const similarityScore = avgSimilarity >= 0.4 && avgSimilarity <= 0.7 ? 1.0 : Math.max(0, avgSimilarity);
    return (countScore + similarityScore) / 2;
  }

  private generateCacheKey(query: string, options: UnifiedSearchOptions): string {
    const optionsStr = JSON.stringify({
      repositoryId: options.repositoryId,
      maxResults: options.maxResults,
      similarityThreshold: options.similarityThreshold,
      enableFiltering: options.enableFiltering,
      filters: options.filters
    });
    
    return `${query}:${optionsStr}`;
  }

  private isCacheValid(cacheKey: string): boolean {
    const cached = this.cache.get(cacheKey);
    if (!cached) return false;

    const ttlMs = this.searchConfig.caching.ttl * 1000;
    return (Date.now() - cached.timestamp) < ttlMs;
  }

  private cacheResults(cacheKey: string, results: any): void {
    this.cache.set(cacheKey, {
      results: results.results,
      timestamp: Date.now()
    });

    // Simple cache size management
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
  }
}