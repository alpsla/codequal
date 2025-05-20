# Hybrid Search Framework for Educational Content

**Last Updated: May 11, 2025**

## Overview

The educational knowledge base integrates both traditional framework-based search and RAG vector similarity search for optimal results. This hybrid approach combines the precision of exact matches with the semantic understanding of vector searches.

## Hybrid Search Implementation

```typescript
// Hybrid search combining framework-based and vector-based approaches
class HybridKnowledgeBaseSearch {
  async findRelevantEducationalContent(
    query: string,
    context: CodeContext,
    options: SearchOptions
  ): Promise<EducationalResult[]> {
    // 1. Perform traditional framework-based search
    const frameworkResults = await this.searchByFrameworkAndKeywords({
      language: context.language,
      framework: context.framework,
      keywords: this.extractKeywords(query)
    });
    
    // 2. Perform vector similarity search
    const queryEmbedding = await this.generateEmbedding(query);
    const vectorResults = await this.vectorSearch({
      embedding: queryEmbedding,
      context: context,
      threshold: options.threshold || 0.7,
      maxResults: options.maxResults || 10
    });
    
    // 3. Combine and rank results
    const combinedResults = this.mergeResults(
      frameworkResults,
      vectorResults,
      options.mergeStrategy || 'balanced'
    );
    
    // 4. Add supplementary content
    return this.enrichResults(combinedResults, context);
  }
  
  // Traditional framework and keyword-based search
  private async searchByFrameworkAndKeywords(params: {
    language: string,
    framework?: string,
    keywords: string[]
  }): Promise<EducationalResult[]> {
    // Search in structured knowledge base by exact matches
    const { data } = await this.supabaseClient
      .from('educational_content')
      .select('*')
      .eq('language', params.language)
      .in('keywords', params.keywords);
    
    if (params.framework) {
      return data.filter(item => 
        item.frameworks.includes(params.framework)
      );
    }
    
    return data;
  }
  
  // Vector-based semantic search
  private async vectorSearch(params: {
    embedding: number[],
    context: CodeContext,
    threshold: number,
    maxResults: number
  }): Promise<EducationalResult[]> {
    // Search using vector similarity
    const { data } = await this.supabaseClient.rpc('match_educational_content', {
      query_embedding: params.embedding,
      match_threshold: params.threshold,
      match_count: params.maxResults
    });
    
    return data;
  }
  
  // Intelligent result merging
  private mergeResults(
    frameworkResults: EducationalResult[],
    vectorResults: EducationalResult[],
    strategy: 'framework_priority' | 'vector_priority' | 'balanced'
  ): EducationalResult[] {
    // Deduplicate results by ID
    const uniqueResults = new Map<string, EducationalResult & { score: number }>();
    
    // Add framework results with appropriate scoring
    frameworkResults.forEach((result, index) => {
      uniqueResults.set(result.id, {
        ...result,
        score: strategy === 'vector_priority' ? 
          0.5 - (index * 0.01) : 
          0.8 - (index * 0.01)
      });
    });
    
    // Add or update with vector results
    vectorResults.forEach((result, index) => {
      const existingResult = uniqueResults.get(result.id);
      
      if (existingResult) {
        // Combine scores based on strategy
        switch (strategy) {
          case 'framework_priority':
            existingResult.score = Math.max(existingResult.score, 0.6 - (index * 0.01));
            break;
          case 'vector_priority':
            existingResult.score = Math.max(existingResult.score, 0.8 - (index * 0.01));
            break;
          case 'balanced':
            existingResult.score = Math.max(existingResult.score, 0.7 - (index * 0.01));
            break;
        }
      } else {
        // Add new result with appropriate scoring
        uniqueResults.set(result.id, {
          ...result,
          score: strategy === 'framework_priority' ? 
            0.6 - (index * 0.01) : 
            0.8 - (index * 0.01)
        });
      }
    });
    
    // Sort by score and return
    return Array.from(uniqueResults.values())
      .sort((a, b) => b.score - a.score)
      .map(({score, ...result}) => result);
  }
}
```

## Search Strategy Selection

The system dynamically selects a search strategy based on context:

```typescript
class AdaptiveEducationalContentDelivery {
  async deliverContent(
    query: string,
    codeContext: CodeContext,
    userProfile: UserProfile
  ): Promise<AdaptiveEducationalContent> {
    // 1. Find relevant content using hybrid search
    const baseResults = await this.hybridSearch.findRelevantEducationalContent(
      query,
      codeContext,
      {
        threshold: 0.65,
        maxResults: 20,
        mergeStrategy: this.determineSearchStrategy(
          codeContext,
          userProfile
        )
      }
    );
    
    // 2. Filter and adapt based on user profile
    const adaptedResults = this.adaptToUserProfile(
      baseResults,
      userProfile
    );
    
    // 3. Format based on delivery context
    return this.formatForDelivery(
      adaptedResults,
      userProfile.preferredFormat || 'structured'
    );
  }
  
  private determineSearchStrategy(
    codeContext: CodeContext,
    userProfile: UserProfile
  ): 'framework_priority' | 'vector_priority' | 'balanced' {
    // Prefer framework-based for well-known frameworks
    if (codeContext.framework && this.isWellKnownFramework(codeContext.framework)) {
      return 'framework_priority';
    }
    
    // Prefer vector-based for exploratory learning
    if (userProfile.learningStyle === 'exploratory') {
      return 'vector_priority';
    }
    
    // Default to balanced approach
    return 'balanced';
  }
  
  private adaptToUserProfile(
    results: EducationalResult[],
    userProfile: UserProfile
  ): EducationalResult[] {
    // Filter by appropriate difficulty level
    let adaptedResults = results.filter(result => 
      this.isDifficultyAppropriate(result.difficulty_level, userProfile.skillLevel)
    );
    
    // Prioritize preferred content types
    if (userProfile.preferredContentTypes?.length > 0) {
      adaptedResults = this.prioritizeByContentType(
        adaptedResults,
        userProfile.preferredContentTypes
      );
    }
    
    // Adjust content depth based on user preferences
    return adaptedResults.map(result => ({
      ...result,
      content: this.adjustContentDepth(result.content, userProfile.detailLevel || 'medium')
    }));
  }
}
```

## Content Population Strategy

The knowledge base is populated from multiple sources:

### 1. Framework-Specific Content
- Documentation from official framework sources
- Best practices from framework creators
- Common patterns and anti-patterns
- Framework-specific tutorials and examples

### 2. Language-Specific Content
- Language idioms and best practices
- Common pitfalls and solutions
- Performance optimization techniques
- Language-specific design patterns

### 3. Repository-Derived Content
- Real examples from analyzed repositories
- Common patterns found across similar codebases
- Educational insights derived from PR reviews
- Generated examples based on repository context

### 4. User Feedback-Enhanced Content
- Continuously improved based on user interactions
- Tailored to specific developer needs
- Ranked based on effectiveness
- Optimized based on educational outcomes

## Vector Search Extraction Pipeline

```typescript
class VectorSearchProcessor {
  async performVectorizedCodeSearch(
    query: string,
    codeContext: RepositoryContext
  ): Promise<VectorSearchResult[]> {
    // 1. Generate query embedding
    const queryEmbedding = await this.generateQueryEmbedding(query);
    
    // 2. Perform vector search
    const searchResults = await this.performVectorSearch(
      queryEmbedding,
      codeContext.repositoryId,
      {
        threshold: 0.7,
        maxResults: 20,
        filterByLanguage: codeContext.language
      }
    );
    
    // 3. Extract and format code examples
    const codeExamples = this.extractCodeExamples(searchResults);
    
    // 4. Deduplicate and rank
    return this.rankAndDeduplicate(codeExamples);
  }
  
  private async performVectorSearch(
    embedding: number[],
    repositoryId: string,
    options: VectorSearchOptions
  ): Promise<RawVectorSearchResult[]> {
    // Perform vector search operation
    const { data } = await this.supabaseClient.rpc('search_code_vectors', {
      query_embedding: embedding,
      repository_id: repositoryId,
      match_threshold: options.threshold,
      match_count: options.maxResults,
      language_filter: options.filterByLanguage || null
    });
    
    return data || [];
  }
  
  private extractCodeExamples(
    results: RawVectorSearchResult[]
  ): VectorSearchResult[] {
    return results.map(result => ({
      code: result.content,
      filePath: result.file_path,
      language: result.language,
      similarity: result.similarity,
      lineStart: result.line_start,
      lineEnd: result.line_end,
      context: {
        fileName: this.extractFileName(result.file_path),
        functionName: this.extractFunctionName(result.content),
        module: this.determineModule(result.file_path)
      }
    }));
  }
  
  private rankAndDeduplicate(
    results: VectorSearchResult[]
  ): VectorSearchResult[] {
    // Create signature for each result to check for duplication
    const signatures = new Map<string, VectorSearchResult>();
    
    // Process results in order of similarity
    for (const result of results.sort((a, b) => b.similarity - a.similarity)) {
      const signature = this.generateCodeSignature(result.code);
      
      // If we haven't seen this pattern before, add it
      if (!signatures.has(signature)) {
        signatures.set(signature, result);
      }
    }
    
    // Return deduplicated results, sorted by similarity
    return Array.from(signatures.values())
      .sort((a, b) => b.similarity - a.similarity);
  }
}
```

## Content Enrichment with External Sources

The search results are enriched with additional information to provide comprehensive educational content:

```typescript
class ContentEnrichmentService {
  async enrichSearchResults(
    results: SearchResult[],
    context: CodeContext
  ): Promise<EnrichedSearchResult[]> {
    // Process each result for enrichment
    return await Promise.all(
      results.map(async result => {
        // 1. Get related information from knowledge base
        const relatedInfo = await this.getRelatedInformation(result, context);
        
        // 2. Add educational context
        const educationalContext = await this.createEducationalContext(
          result,
          relatedInfo,
          context
        );
        
        // 3. Extract best practices
        const bestPractices = await this.extractBestPractices(
          result,
          context
        );
        
        // 4. Generate code examples if needed
        const codeExamples = await this.generateRelevantExamples(
          result,
          context
        );
        
        // Return enriched result
        return {
          ...result,
          relatedInformation: relatedInfo,
          educationalContext,
          bestPractices,
          codeExamples
        };
      })
    );
  }
  
  private async createEducationalContext(
    result: SearchResult,
    relatedInfo: RelatedInformation[],
    context: CodeContext
  ): Promise<EducationalContext> {
    // Create difficulty assessment
    const difficulty = this.assessDifficulty(result.content, context);
    
    // Identify key learning concepts
    const learningConcepts = await this.identifyLearningConcepts(
      result.content,
      context
    );
    
    // Generate explanations for each concept
    const conceptExplanations = await this.generateConceptExplanations(
      learningConcepts,
      context
    );
    
    // Create educational context
    return {
      difficulty,
      learningConcepts,
      conceptExplanations,
      prerequisites: this.identifyPrerequisites(learningConcepts, context),
      learningPath: await this.createLearningPath(learningConcepts, context)
    };
  }
}
```

## Search Optimization Techniques

Several techniques are used to optimize the hybrid search process:

### 1. Query Expansion
- Adding related terms to broaden search scope
- Including synonyms for programming concepts
- Including framework-specific terminology

### 2. Result Re-Ranking
- Re-ranking based on document quality
- Boosting results with educational value
- Promoting verified examples

### 3. Contextualization
- Adding repository context to results
- Linking to related code sections
- Including architectural context

### 4. Performance Optimization
- Caching common queries
- Pre-computing embeddings for popular topics
- Using tiered search strategies based on query complexity
