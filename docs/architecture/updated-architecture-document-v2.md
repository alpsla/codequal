# CodeQual Architecture Document
**Last Updated: May 19, 2025**

## System Overview

CodeQual is a flexible, multi-agent system for comprehensive code analysis, quality assessment, and improvement. The system leverages a combination of specialized AI agents, vector database storage, and a scoring system to deliver actionable insights for developers and teams.

## Core Components

### 1. Multi-Agent Architecture

The system uses a flexible, configuration-driven multi-agent approach that allows any agent type to fulfill any functional role based on context and capabilities:

#### Agent Types
- **LLM Agents**: Claude, ChatGPT, DeepSeek, Gemini
- **Specialized Agents**: Architecture Analyzer, Code Quality Assessor, Security Auditor, Performance Optimizer, Dependency Inspector

#### Agent Roles
- **Analysis Agents**: Primary, Secondary, Fallback
- **Support Agents**: Repository Data Provider, Repository Interaction Provider, Documentation Provider, Test Provider, CI/CD Provider
- **Orchestration Agents**: Multi-Agent Orchestrator, Result Orchestrator, Reporting Agent

### 2. Vector Database Integration

A comprehensive vector storage system for repository analyses:

```
repositories
  ├── id: uuid
  ├── name: text
  ├── url: text
  ├── default_branch: text
  ├── analysis_date: timestamp
  ├── overall_score: float
  └── category_scores: jsonb

analysis_chunks
  ├── id: uuid
  ├── repository_id: uuid (foreign key)
  ├── content: text
  ├── embedding: vector(1536)
  ├── metadata: jsonb
  │   ├── analysis_type: text
  │   ├── score: float
  │   ├── issues: jsonb[]
  │   ├── file_paths: text[]
  │   └── severity: text
  ├── storage_type: text (permanent/cached)
  ├── ttl: timestamp (null for permanent)
  └── created_at: timestamp
```

The vector database enables:
- Efficient similarity search for relevant code patterns
- Contextual PR analysis using repository knowledge
- Knowledge retention across analyses
- Trend tracking and benchmarking

#### Incremental Update Strategy

The vector database supports efficient incremental updates:

1. **Change Detection**
   - Track repository changes (commits, PRs)
   - Generate a delta of changes since last indexing
   - Only process files that have been changed, added, or removed

2. **Document Processing**
   - For new/modified files: Process and add embeddings to vector DB
   - For deleted files: Remove corresponding embeddings
   - For renamed files: Update metadata while preserving embeddings

3. **Versioning System**
   - Maintain version information for each repository's vector index
   - Track which commit/version is currently indexed
   - Support potential rollback to previous versions

### 3. Scoring and Assessment System

A comprehensive scoring system quantifies repository quality across multiple dimensions:

#### Specialized Analysis Scoring
- Each specialized analysis (architecture, code quality, security, dependencies, performance) includes:
  - Overall category score (1-10 scale)
  - Subcategory scoring with specific metrics
  - Severity-based issue identification (high/medium/low)
  - Scoring justifications and impact assessments

#### Repository-Level Scoring
- Combined overall repository score based on weighted category scores
- Visualization-ready metrics for Grafana dashboards
- Trend analysis for score changes over time
- Benchmark comparisons with similar repositories

#### Vector-Ready Metadata
```json
{
  "repository": "repository_name",
  "analysis_date": "2025-05-17T12:34:56Z",
  "analysis_type": "architecture",
  "scores": {
    "overall": 8,
    "subcategories": [
      {"name": "Modularity", "score": 9, "strengths": ["Clear separation of concerns"], "issues": []},
      {"name": "Dependency Injection", "score": 7, "strengths": [], "issues": ["Circular dependencies in core module"]}
    ],
    "issues": [
      {"name": "Circular dependencies in core module", "severity": "medium", "score_impact": -1, "file_paths": ["/src/core/index.ts", "/src/core/providers.ts"]}
    ]
  }
}
```

### 4. DeepWiki Integration

The system integrates with DeepWiki for comprehensive repository analysis:

#### Kubernetes-Native Integration
- Direct access to DeepWiki pods in Kubernetes cluster
- Command execution via kubectl exec
- Repository analysis via DeepWiki API

#### Tiered Analysis Approach
1. **Quick PR-Only Analysis**:
   - 1-3 minutes execution time
   - Focus on changed files only
   - Immediate developer feedback

2. **Comprehensive Repository Analysis**:
   - 5-10 minutes execution time
   - Full repository context
   - Cached for future reference

3. **Targeted Deep Dives**:
   - Focused on specific architectural aspects
   - Leverages DeepWiki Chat API
   - Explores specific patterns or concerns

### 5. RAG Framework

The system implements a comprehensive Retrieval-Augmented Generation (RAG) framework that serves both the chat functionality and other services:

#### Core RAG Components

```typescript
/**
 * Core RAG Framework
 * Central system for targeted knowledge retrieval and generation
 */
export class RAGFramework {
  constructor(
    private vectorStore: VectorStoreService,
    private embeddingService: EmbeddingService,
    private chunkingService: ChunkingService,
    private modelService: ModelService,
    private metadataService: MetadataService,
    private queryAnalyzer: QueryAnalyzerService
  ) {}
  
  /**
   * Process repository content for storage
   */
  async processRepository(
    repositoryId: string,
    files: RepositoryFile[],
    options: ProcessOptions = {}
  ): Promise<ProcessResult> {
    // Extract content from files
    const contents = files.map(file => ({
      content: file.content,
      metadata: {
        filePath: file.path,
        language: file.language,
        lastModified: file.lastModified,
        componentType: detectComponentType(file.path, file.content),
        dependencies: extractDependencies(file.content, file.language),
        complexity: calculateComplexity(file.content, file.language),
        fileType: getFileType(file.path),
        isTest: isTestFile(file.path, file.content),
        isConfig: isConfigFile(file.path),
        isDocumentation: isDocumentationFile(file.path)
      }
    }));
    
    // Chunk content with appropriate strategy
    const chunks = await this.chunkingService.chunkContents(contents, {
      chunkSize: options.chunkSize || 1000,
      chunkOverlap: options.chunkOverlap || 200,
      chunkingStrategy: options.chunkingStrategy || 'semantic'
    });
    
    // Generate embeddings
    const embeddings = await this.embeddingService.generateEmbeddings(
      chunks.map(chunk => chunk.content)
    );
    
    // Store in vector database
    const vectorIds = await this.vectorStore.storeVectors(
      repositoryId,
      chunks,
      embeddings,
      options.storageType || 'permanent'
    );
    
    // Store additional metadata
    await this.metadataService.storeMetadata(
      repositoryId,
      vectorIds,
      files.map(f => ({
        path: f.path,
        language: f.language,
        size: f.content.length,
        type: f.type
      }))
    );
    
    return {
      chunkCount: chunks.length,
      vectorIds,
      totalTokens: chunks.reduce((sum, chunk) => sum + this.estimateTokens(chunk.content), 0)
    };
  }
  
  /**
   * Process incremental repository updates
   */
  async processIncrementalUpdate(
    repositoryId: string,
    added: RepositoryFile[],
    modified: RepositoryFile[],
    removed: string[],
    options: ProcessOptions = {}
  ): Promise<ProcessResult> {
    // Process added and modified files
    const addedResult = added.length > 0 
      ? await this.processRepository(repositoryId, added, options)
      : { chunkCount: 0, vectorIds: [], totalTokens: 0 };
      
    const modifiedResult = modified.length > 0
      ? await this.processRepository(repositoryId, modified, options)
      : { chunkCount: 0, vectorIds: [], totalTokens: 0 };
    
    // Remove deleted files
    let removedCount = 0;
    if (removed.length > 0) {
      removedCount = await this.vectorStore.removeVectorsByMetadata(
        repositoryId,
        'filePath',
        removed
      );
    }
    
    return {
      chunkCount: addedResult.chunkCount + modifiedResult.chunkCount,
      vectorIds: [...addedResult.vectorIds, ...modifiedResult.vectorIds],
      totalTokens: addedResult.totalTokens + modifiedResult.totalTokens,
      removedCount
    };
  }
  
  /**
   * Retrieve selective relevant context for a query
   */
  async retrieveContext(
    repositoryId: string,
    query: string,
    options: RetrievalOptions = {}
  ): Promise<RetrievalResult> {
    // Analyze query to identify key concepts, components, intentions
    const queryAnalysis = await this.queryAnalyzer.analyzeQuery(query);
    
    // Generate metadata filters based on query analysis
    const metadataFilters = this.generateMetadataFilters(queryAnalysis);
    
    // Generate embedding for the query
    const queryEmbedding = await this.embeddingService.generateEmbeddings([query]);
    
    // Retrieve similar vectors WITH metadata filtering
    // This ensures we only search relevant parts of the repository
    const similarVectors = await this.vectorStore.filteredSimilaritySearch(
      repositoryId,
      queryEmbedding[0],
      metadataFilters,  // Only search in relevant file types/components
      options.limit || 5,
      options.minScore || 0.7
    );
    
    // Enhance with metadata
    const enhancedResults = await this.metadataService.enhanceResults(
      repositoryId,
      similarVectors
    );
    
    // Rerank results based on query specifics
    const results = await this.rerankResults(query, queryAnalysis, enhancedResults);
    
    return {
      results,
      totalResults: results.length,
      repositoryId,
      query,
      queryAnalysis, // Include analysis for transparency
      appliedFilters: metadataFilters // Include what filters were applied
    };
  }
  
  /**
   * Generate metadata filters based on query analysis
   */
  private generateMetadataFilters(queryAnalysis: QueryAnalysis): MetadataFilter[] {
    const filters: MetadataFilter[] = [];
    
    // Example: If query is about tests, focus on test files
    if (queryAnalysis.concepts.includes('testing') || 
        queryAnalysis.concepts.includes('tests')) {
      filters.push({
        field: 'isTest',
        operation: 'equals',
        value: true
      });
    }
    
    // If query is about a specific component
    if (queryAnalysis.components.length > 0) {
      filters.push({
        field: 'componentType',
        operation: 'in',
        value: queryAnalysis.components
      });
    }
    
    // If query is about configuration
    if (queryAnalysis.concepts.includes('configuration') ||
        queryAnalysis.concepts.includes('settings')) {
      filters.push({
        field: 'isConfig',
        operation: 'equals',
        value: true
      });
    }
    
    // If query is about documentation
    if (queryAnalysis.concepts.includes('documentation') ||
        queryAnalysis.concepts.includes('docs')) {
      filters.push({
        field: 'isDocumentation',
        operation: 'equals', 
        value: true
      });
    }
    
    // If query is about specific languages
    if (queryAnalysis.languages.length > 0) {
      filters.push({
        field: 'language',
        operation: 'in',
        value: queryAnalysis.languages
      });
    }
    
    return filters;
  }
  
  /**
   * Generate content with RAG
   */
  async generateWithRAG(
    repositoryId: string,
    query: string,
    options: GenerationOptions = {}
  ): Promise<GenerationResult> {
    // Selectively retrieve only relevant context based on query analysis
    const context = await this.retrieveContext(
      repositoryId,
      query,
      options.retrievalOptions
    );
    
    // Format prompt with context
    const prompt = this.formatPromptWithContext(
      query,
      context.results,
      context.queryAnalysis,
      options.promptTemplate
    );
    
    // Generate completion
    const completion = await this.modelService.generateCompletion(
      options.model || 'default',
      prompt,
      options.modelParameters
    );
    
    return {
      completion,
      context: context.results,
      model: options.model || 'default',
      prompt,
      queryAnalysis: context.queryAnalysis,
      appliedFilters: context.appliedFilters,
      usage: {
        promptTokens: this.estimateTokens(prompt),
        completionTokens: this.estimateTokens(completion),
        contextTokens: context.results.reduce(
          (sum, result) => sum + this.estimateTokens(result.content),
          0
        )
      }
    };
  }
  
  // Helper methods
  private estimateTokens(text: string): number {
    // Simple estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
  
  private async rerankResults(
    query: string,
    queryAnalysis: QueryAnalysis,
    results: RetrievalVector[]
  ): Promise<RetrievalVector[]> {
    // Implement more sophisticated reranking based on query analysis
    // For example, boost results that match specific components in the query
    
    // Apply custom scoring based on query concepts and components
    const scoredResults = results.map(result => {
      let score = result.score;
      
      // Boost score for results that match query components
      if (queryAnalysis.components.some(component => 
          result.metadata.componentType?.includes(component))) {
        score += 0.1;
      }
      
      // Boost score for results that match query concepts
      if (queryAnalysis.concepts.some(concept => 
          result.content.toLowerCase().includes(concept.toLowerCase()))) {
        score += 0.05;
      }
      
      return {
        ...result,
        score
      };
    });
    
    // Sort by adjusted score
    return scoredResults.sort((a, b) => b.score - a.score);
  }
  
  private formatPromptWithContext(
    query: string,
    results: RetrievalVector[],
    queryAnalysis: QueryAnalysis,
    template?: string
  ): string {
    // Use default template if none provided
    const promptTemplate = template || `
You are an assistant that answers questions about code repositories.
Use ONLY the following repository information to answer the question.
If the information provided isn't sufficient, say so rather than making up information.

Repository Information:
{{context}}

Question: {{query}}

Answer:
`;
    
    // Format context
    const formattedContext = results
      .map(result => `[${result.metadata.filePath}]: ${result.content}`)
      .join('\n\n');
    
    // Replace placeholders
    return promptTemplate
      .replace('{{context}}', formattedContext)
      .replace('{{query}}', query);
  }
}
```

#### Support System Integration

The RAG Framework also serves as the foundation for the support system:

```typescript
/**
 * Support knowledge integration for RAG
 */
export class SupportKnowledgeService {
  constructor(
    private ragFramework: RAGFramework,
    private knowledgeBaseService: KnowledgeBaseService
  ) {}
  
  /**
   * Answer support questions using combined knowledge sources
   */
  async answerSupportQuestion(
    query: string,
    userContext: UserContext
  ): Promise<SupportResponse> {
    // Analyze query to classify the support category
    const queryAnalysis = await this.ragFramework.queryAnalyzer.analyzeQuery(query);
    const supportCategory = this.classifySupportCategory(queryAnalysis);
    
    // Retrieve knowledge based on category
    const knowledgeBaseResults = await this.knowledgeBaseService.search(
      supportCategory,
      query,
      { limit: 3 }
    );
    
    // Retrieve similar patterns from repositories if relevant
    let repositoryResults: RetrievalResult | null = null;
    if (queryAnalysis.requiresRepositoryContext && userContext.currentRepository) {
      repositoryResults = await this.ragFramework.retrieveContext(
        userContext.currentRepository.repositoryId,
        query,
        { limit: 3 }
      );
    }
    
    // Retrieve similar issues across repositories if relevant
    let crossRepoResults: CrossRepositoryResult | null = null;
    if (queryAnalysis.concepts.includes('pattern') || 
        queryAnalysis.concepts.includes('common') ||
        queryAnalysis.concepts.includes('best practice')) {
      crossRepoResults = await this.retrieveCrossRepositoryPatterns(
        query,
        userContext.repositories.map(r => r.repositoryId)
      );
    }
    
    // Combine knowledge sources with appropriate weighting
    const combinedContext = this.combineContextSources(
      knowledgeBaseResults,
      repositoryResults,
      crossRepoResults
    );
    
    // Generate response tailored to user's skill level
    const response = await this.generateResponse(
      query,
      combinedContext,
      userContext.skillLevel || 'intermediate'
    );
    
    // Update user's knowledge profile based on query and response
    await this.updateUserKnowledgeProfile(userContext.userId, queryAnalysis, response);
    
    return {
      answer: response.content,
      sources: this.formatSources(knowledgeBaseResults, repositoryResults, crossRepoResults),
      relatedQuestions: this.generateRelatedQuestions(queryAnalysis),
      usage: response.usage
    };
  }
  
  /**
   * Retrieve patterns across multiple repositories
   */
  private async retrieveCrossRepositoryPatterns(
    query: string,
    repositoryIds: string[]
  ): Promise<CrossRepositoryResult> {
    // Implementation for finding common patterns across repos
    // This is particularly useful for best practices and common issues
    
    // For each repository, find relevant information
    const results = await Promise.all(repositoryIds.map(async repoId => {
      return this.ragFramework.retrieveContext(repoId, query, { limit: 2 });
    }));
    
    // Find common patterns across results
    const patterns = this.extractCommonPatterns(results);
    
    return {
      patterns,
      matchCount: patterns.length,
      repositoryCount: repositoryIds.length
    };
  }
}
```

#### User Skill Tracking System

Unlike repository content which uses vector storage, user skill tracking uses traditional relational database tables:

```typescript
/**
 * User knowledge and skill profile stored in SQL database
 */
export interface UserSkillProfile {
  id: string;
  userId: string;
  language: string;           // Programming language
  domain: string;             // Domain knowledge (e.g., "authentication", "API")
  skillLevel: SkillLevel;     // enum: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  confidence: number;         // 0-1 confidence in skill assessment
  lastUpdated: Date;
  interactions: number;       // Count of interactions in this domain
  successfulApplications: number; // Times user successfully applied knowledge
}

/**
 * Service to track and update user skill levels
 */
export class UserSkillTrackingService {
  constructor(
    private sqlDatabase: DatabaseService    // Regular SQL database, not vector DB
  ) {}
  
  /**
   * Get user's current skill profile
   */
  async getUserSkillProfile(userId: string): Promise<UserSkillMap> {
    const query = `
      SELECT language, domain, skill_level, confidence
      FROM user_skill_profiles
      WHERE user_id = $1
    `;
    
    const result = await this.sqlDatabase.query(query, [userId]);
    
    // Format into a map for easy access
    const skillMap: UserSkillMap = {};
    for (const row of result.rows) {
      if (!skillMap[row.language]) {
        skillMap[row.language] = {};
      }
      skillMap[row.language][row.domain] = {
        level: row.skill_level,
        confidence: row.confidence
      };
    }
    
    return skillMap;
  }
  
  /**
   * Update user's skill based on interaction
   */
  async updateSkillLevel(
    userId: string,
    language: string,
    domain: string,
    interactionType: 'query' | 'application' | 'correction' | 'explanation',
    interactionSuccess: boolean
  ): Promise<void> {
    // First get current profile if exists
    const query = `
      SELECT id, skill_level, confidence, interactions, successful_applications
      FROM user_skill_profiles
      WHERE user_id = $1 AND language = $2 AND domain = $3
    `;
    
    const result = await this.sqlDatabase.query(query, [userId, language, domain]);
    
    if (result.rows.length === 0) {
      // Create new profile
      await this.createNewSkillProfile(userId, language, domain, interactionType, interactionSuccess);
    } else {
      // Update existing profile
      const profile = result.rows[0];
      const updates = this.calculateSkillUpdates(
        profile, 
        interactionType, 
        interactionSuccess
      );
      
      await this.sqlDatabase.query(`
        UPDATE user_skill_profiles
        SET skill_level = $1, confidence = $2, interactions = $3, successful_applications = $4, last_updated = NOW()
        WHERE id = $5
      `, [
        updates.skillLevel, 
        updates.confidence, 
        profile.interactions + 1,
        profile.successful_applications + (interactionSuccess ? 1 : 0),
        profile.id
      ]);
    }
  }
  
  /**
   * Adapt response based on user's skill level
   */
  adaptResponseToSkillLevel(
    response: string,
    userSkillProfile: UserSkillMap,
    language: string,
    domain: string
  ): string {
    // Default to intermediate if no profile exists
    const skillLevel = userSkillProfile[language]?.[domain]?.level || 'intermediate';
    
    switch (skillLevel) {
      case 'beginner':
        return this.adaptForBeginner(response, language, domain);
      case 'intermediate':
        return this.adaptForIntermediate(response, language, domain);
      case 'advanced':
        return this.adaptForAdvanced(response, language, domain);
      case 'expert':
        return this.adaptForExpert(response, language, domain);
      default:
        return response;
    }
  }
  
  // Helper methods for skill adaptation
  private adaptForBeginner(response: string, language: string, domain: string): string {
    // Add more explanations, simplify technical terms
    // Include links to educational resources
    return response + '\n\nWould you like me to explain any of these concepts in more detail?';
  }
  
  private adaptForExpert(response: string, language: string, domain: string): string {
    // Remove basic explanations, focus on advanced details
    // Include performance considerations and edge cases
    return response.replace(/As you might know, |Basically, |In simple terms, /g, '');
  }
}
```

#### RAG Service Integration Points

The RAG Framework integrates with multiple system components using targeted, selective context retrieval rather than fetching all repository information:

1. **DeepWiki Chat Service**: Enhances repository Q&A with selectively retrieved contextual information
2. **PR Analysis Service**: Enriches PR reviews with targeted repository knowledge about affected components
3. **Documentation Service**: Improves documentation generation with selective codebase understanding
4. **Support System**: Provides targeted help by combining knowledge base and repository insights
5. **Cross-Repository Learning**: Identifies patterns and best practices across multiple repositories

### 6. DeepWiki Chat Integration

The system includes a specialized chat interface for repository exploration using the Message Control Program (MCP) pattern:

#### Message Control Program Architecture

```typescript
/**
 * Message Control Program (MCP) for DeepWiki Chat
 * 
 * Coordinates the chat workflow including:
 * - Authentication and authorization
 * - Context retrieval from vector database
 * - Model selection and fallback
 * - Response formatting
 */
export class MessageControlProgram {
  constructor(
    private ragFramework: RAGFramework,
    private userService: UserRepositoryService,
    private modelService: DeepWikiApiClient,
    private configService: ConfigurationService
  ) {}
  
  /**
   * Process a chat completion request
   */
  async processRequest(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const { userContext, messages } = request;
    
    // Step 1: Validate user and repository permissions
    this.validateUserAccess(userContext);
    
    // Step 2: Get repository context
    const repoContext = userContext.currentRepository;
    
    // Step 3: Extract query from latest user message
    const latestUserMessage = this.getLatestUserMessage(messages);
    
    // Step 4: Retrieve relevant context from RAG
    const relevantContext = await this.ragFramework.retrieveContext(
      repoContext.repositoryId,
      latestUserMessage.content,
      { limit: 5, minScore: 0.7 }
    );
    
    // Step 5: Format prompt with context
    const formattedMessages = this.formatPromptWithContext(messages, relevantContext.results);
    
    // Step 6: Select appropriate model based on query complexity and cost
    const modelConfig = this.selectModelConfig(latestUserMessage.content, request.modelConfig);
    
    // Step 7: Generate completion with fallback
    const completion = await this.modelService.generateWithFallback(
      formattedMessages,
      modelConfig
    );
    
    // Step 8: Format and return response
    return {
      message: {
        role: 'assistant',
        content: completion.content,
        timestamp: new Date()
      },
      modelUsed: completion.modelUsed,
      contextChunks: relevantContext.results,
      usage: completion.usage
    };
  }
}
```

#### Model Selection Strategy

The DeepWiki Chat service uses a tiered model approach with distinct models for different purposes:

1. **Analysis Models** (selected by orchestrator)
   - Specialized, high-capability models for deep repository analysis
   - Selection based on repository context (size, complexity, language)
   - Optimized for analysis quality and depth
   - Higher cost justified by analysis depth

2. **Chat Models** (cost-optimized)
   - More affordable, general-purpose models for interactive chat
   - Primary: DeepSeek Chat (good performance/cost balance)
   - Fallbacks: Gemini 2.5 Flash, Claude 3 Haiku
   - Focus on response speed and cost-efficiency
   - RAG integration reduces need for expensive models

### 7. Authentication System

The system implements a comprehensive authentication and authorization framework:

#### Supabase Authentication Integration

```typescript
/**
 * Authentication service using Supabase
 */
export class SupabaseAuthService implements AuthenticationService {
  constructor(
    private supabaseClient: SupabaseClient,
    private userService: UserService,
    private organizationService: OrganizationService
  ) {}
  
  /**
   * Authenticate a user
   */
  async authenticateUser(credentials: UserCredentials): Promise<AuthResult> {
    const { data, error } = await this.supabaseClient.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password
    });
    
    if (error) {
      throw new AuthenticationError(error.message);
    }
    
    // Get user details
    const user = await this.userService.getUserByEmail(credentials.email);
    
    // Get user's organizations
    const organizations = await this.organizationService.getUserOrganizations(user.id);
    
    return {
      user,
      organizations,
      session: data.session
    };
  }
  
  /**
   * Get user's repository access
   */
  async getUserRepositoryAccess(userId: string): Promise<RepositoryAccess[]> {
    // Get user's personal repositories
    const personalRepos = await this.supabaseClient
      .from('repositories')
      .select('*')
      .eq('owner_id', userId);
    
    // Get repositories through organizations
    const orgMemberships = await this.supabaseClient
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', userId);
    
    const orgIds = orgMemberships.data?.map(m => m.organization_id) || [];
    
    // No org memberships
    if (orgIds.length === 0) {
      return personalRepos.data?.map(repo => ({
        repository: repo,
        accessLevel: 'owner'
      })) || [];
    }
    
    // Get organization repositories
    const orgRepos = await this.supabaseClient
      .from('repositories')
      .select('*, organization_id')
      .in('organization_id', orgIds);
    
    // Combine personal and org repositories with access levels
    const repos = [
      ...(personalRepos.data || []).map(repo => ({
        repository: repo,
        accessLevel: 'owner' as AccessLevel
      })),
      ...(orgRepos.data || []).map(repo => {
        const membership = orgMemberships.data?.find(m => m.organization_id === repo.organization_id);
        return {
          repository: repo,
          accessLevel: this.mapRoleToAccessLevel(membership?.role || 'member')
        };
      })
    ];
    
    return repos;
  }
  
  /**
   * Verify repository access
   */
  async verifyRepositoryAccess(
    userId: string,
    repositoryId: string,
    requiredAccess: AccessLevel = 'read'
  ): Promise<boolean> {
    const accessList = await this.getUserRepositoryAccess(userId);
    const repoAccess = accessList.find(access => access.repository.id === repositoryId);
    
    if (!repoAccess) {
      return false;
    }
    
    // Check if user has sufficient access level
    return this.hasRequiredAccess(repoAccess.accessLevel, requiredAccess);
  }
  
  /**
   * Map organization role to access level
   */
  private mapRoleToAccessLevel(role: string): AccessLevel {
    switch (role) {
      case 'owner':
      case 'admin':
        return 'admin';
      case 'member':
        return 'write';
      case 'viewer':
        return 'read';
      default:
        return 'read';
    }
  }
  
  /**
   * Check if user has required access level
   */
  private hasRequiredAccess(
    userAccess: AccessLevel,
    requiredAccess: AccessLevel
  ): boolean {
    const accessLevels: AccessLevel[] = ['read', 'write', 'admin', 'owner'];
    const userLevel = accessLevels.indexOf(userAccess);
    const requiredLevel = accessLevels.indexOf(requiredAccess);
    
    return userLevel >= requiredLevel;
  }
}
```

#### Multi-Repository Support

The authentication system enables secure multi-repository support:

1. **User Repository Context**
   - Users can access multiple repositories across personal and organizational scopes
   - Repository access is controlled by permissions
   - Users can select which repository to interact with

2. **Permission Model**
   - Four-tier permission model: read, write, admin, owner
   - Permissions inherited from organization roles
   - Direct repository-specific permissions for fine-grained control

3. **Repository Isolation**
   - Strict isolation between repositories for different users
   - Segmented vector database access
   - Repository-specific API keys and credentials
   - Content-level access control for shared repositories

### 8. Knowledge Storage and Retrieval

The system implements a tiered knowledge storage approach:

```typescript
class TieredStorageService {
  constructor(
    private hotStore: StorageProvider,
    private warmStore: StorageProvider,
    private coldStore: StorageProvider,
    private metricTracker: MetricTrackingService
  ) {}
  
  // Store entity in appropriate tier based on frequency
  async storeEntity(entity: KnowledgeEntity, tier: StorageTier = 'hot'): Promise<void> {
    switch (tier) {
      case 'hot':
        await this.hotStore.store(entity);
        break;
      case 'warm':
        await this.warmStore.store(entity);
        break;
      case 'cold':
        await this.coldStore.store(entity);
        break;
    }
    
    await this.metricTracker.trackStorage(entity.id, tier);
  }
  
  // Migrate entities between tiers based on usage patterns
  async performMigration(): Promise<void> {
    const metrics = await this.metricTracker.getUsageMetrics();
    
    // Identify candidates for migration
    const hotToWarm = metrics.filter(m => 
      m.tier === 'hot' && m.lastAccessedAt < Date.now() - HOT_EXPIRY_MS
    ).map(m => m.entityId);
    
    const warmToCold = metrics.filter(m => 
      m.tier === 'warm' && m.lastAccessedAt < Date.now() - WARM_EXPIRY_MS
    ).map(m => m.entityId);
    
    // Migrate hot to warm
    for (const entity of hotToWarm) {
      await this.warmStore.store(entity);
      await this.hotStore.remove(entity.id);
    }
    
    // Migrate warm to cold
    for (const entity of warmToCold) {
      await this.coldStore.store(entity);
      await this.warmStore.remove(entity.id);
    }
  }
  
  // Retrieve entity from appropriate tier
  async retrieveEntity(id: string): Promise<any> {
    // Try hot store first
    let entity = await this.hotStore.get(id);
    
    if (!entity) {
      // Try warm store
      entity = await this.warmStore.get(id);
      
      if (!entity) {
        // Try cold store
        entity = await this.coldStore.get(id);
        
        if (entity) {
          // Move from cold to warm if found
          await this.warmStore.store(entity);
        }
      }
      
      // Move to hot tier if entity is frequently used
      if (entity && entity.usageCount > 20) {
        await this.hotStore.store(entity);
      }
    }
    
    // Update usage metrics
    if (entity) {
      await this.updateUsageMetrics(entity.id, entity);
    }
    
    return entity;
  }
}
```

### 9. Knowledge Quality Control

The system enforces quality standards for stored knowledge:

```typescript
interface QualityControlConfig {
  minimumConfidenceScore: number;
  minimumRelevanceScore: number;
  deduplicationThreshold: number;
  contentQualityChecks: {
    minContentLength: number;
    requiresCodeExamples: boolean;
    requiresBestPractices: boolean;
    maxAgeForTechnicalContent: number; // in ms
  };
}

class KnowledgeQualityService {
  constructor(
    private config: QualityControlConfig,
    private embeddings: EmbeddingService
  ) {}
  
  // Check content quality before storing
  async validateContent(content: KnowledgeEntity): Promise<ValidationResult> {
    const issues: string[] = [];
    
    // Check basic quality criteria
    if (content.content.length < this.config.contentQualityChecks.minContentLength) {
      issues.push('Content length below minimum threshold');
    }
    
    if (content.type === 'education') {
      const eduContent = content as EducationalEntity;
      
      // Check for required components
      if (this.config.contentQualityChecks.requiresCodeExamples && 
          (!eduContent.codeExamples || eduContent.codeExamples.length === 0)) {
        issues.push('Educational content missing code examples');
      }
      
      if (this.config.contentQualityChecks.requiresBestPractices && 
          (!eduContent.bestPractices || eduContent.bestPractices.length === 0)) {
        issues.push('Educational content missing best practices');
      }
    }
    
    // Check for duplicate content
    const duplicates = await this.findDuplicateContent(content);
    if (duplicates.length > 0) {
      issues.push(`Content similar to existing entries: ${duplicates.map(d => d.id).join(', ')}`);
    }
    
    return {
      isValid: issues.length === 0,
      issues,
      duplicates
    };
  }
  
  // Merge duplicate content
  async mergeContent(
    primary: KnowledgeEntity,
    secondary: KnowledgeEntity
  ): Promise<KnowledgeEntity> {
    // Create merged entity based on content type
    if (primary.type === 'education' && secondary.type === 'education') {
      return this.mergeEducationalContent(
        primary as EducationalEntity,
        secondary as EducationalEntity
      );
    }
    
    // Default merge for other types
    return {
      ...primary,
      metadata: {
        ...primary.metadata,
        mergedFrom: [...(primary.metadata.mergedFrom || []), secondary.id],
        mergedAt: new Date()
      },
      updatedAt: new Date()
    };
  }
}
```

## Deployment Architecture

### Unified Deployment Approach

To support both cloud and on-premises deployment models, we use a unified deployment architecture:

#### Core Principles
1. **Container-First Architecture**
   - All components packaged as containers
   - Configuration injected via environment variables
   - Stateless design for scalability

2. **Environment Abstraction Layer**
   - Environment-specific adapters for dependencies
   - Unified API for service access
   - Feature flags for environment capabilities

3. **Configuration Hierarchy**
   - Base configuration shared across environments
   - Environment-specific overrides
   - Customer-specific customizations
   - Instance-specific settings

#### Deployment Components

```typescript
// Environment abstraction interface
interface EnvironmentAdapter {
  // Environment type
  type: 'cloud' | 'on-premises' | 'development';
  
  // Database connectivity
  getDatabaseConnection(): Promise<DatabaseConnection>;
  
  // Object storage
  getStorageClient(): StorageClient;
  
  // Authentication provider
  getAuthProvider(): AuthProvider;
  
  // Model provider access
  getModelProvider(model: string): ModelProvider;
  
  // Feature availability
  isFeatureAvailable(feature: string): boolean;
  
  // Telemetry and monitoring
  getTelemetryClient(): TelemetryClient;
  
  // License validation
  validateLicense(): Promise<LicenseStatus>;
}
```

#### Environment-Specific Adaptations

**Cloud Environment**
- Managed Supabase instance
- Cloud-native auto-scaling
- Managed authentication
- Cloud monitoring
- Managed vector database

**On-Premises Environment**
- Self-contained PostgreSQL with pgvector
- Local authentication (LDAP/AD)
- Local model serving
- Resource-aware scaling
- Offline license validation

## Core Processes

### Repository Analysis Process

1. **Repository Context Extraction**
   - Metadata extraction (languages, frameworks, size)
   - Structure analysis (modules, dependencies)
   - Quality metric baseline

2. **Analysis Agent Selection**
   - Context-based agent selection
   - Optimal model determination
   - Fallback configuration

3. **Specialized Analysis Execution**
   - Architecture analysis
   - Code quality assessment
   - Security analysis
   - Dependency analysis
   - Performance analysis

4. **Score Calculation and Integration**
   - Individual category scoring
   - Overall repository score calculation
   - Score storage and trend tracking
   - Vector embedding generation

5. **Knowledge Integration**
   - Analysis chunking
   - Metadata attachment
   - Vector storage
   - Cache management

### PR Analysis Process

1. **PR Context Extraction**
   - Changed files analysis
   - Impact assessment
   - Related component identification

2. **Knowledge Retrieval**
   - Repository context retrieval
   - Similar pattern identification
   - Previous issue recognition

3. **Analysis Tier Selection**
   - Quick PR-only analysis (for small changes)
   - Comprehensive analysis (for significant changes)
   - Targeted deep dives (for specific concerns)

4. **Multi-Agent Analysis**
   - Context-specific agent selection
   - Analysis execution
   - Result orchestration
   - Conflict resolution

5. **Report Generation**
   - Severity-based organization
   - Action item identification
   - Educational content integration
   - Visualization preparation

### Chat Interaction Process

1. **User Authentication and Repository Selection**
   - Authenticate user credentials
   - Retrieve available repositories
   - Select working repository context

2. **Query Processing**
   - Extract intent from user query
   - Identify key concepts and entities
   - Determine query complexity
   - Identify relevant metadata filters (file types, components, etc.)

3. **Selective Context Retrieval**
   - Apply metadata filters based on query analysis
   - Search only relevant portions of the repository
   - Retrieve targeted, query-specific information
   - Rank results by enhanced relevance scoring

4. **Model Selection**
   - Choose appropriate model based on query complexity and cost
   - Prefer cost-effective models for chat interactions
   - Prepare fallback chain for reliability
   - Set model parameters (temperature, max tokens)

5. **Adaptive Chat Generation with RAG**
   - Format prompt with selectively retrieved context
   - Adapt response style to user's skill level
   - Generate completion from selected model
   - Fall back to alternative models if needed

6. **Response Processing**
   - Format response for presentation
   - Include attribution for sources
   - Track usage metrics
   - Update user skill profile in SQL database

### Calibration Process

For new repository types or unfamiliar patterns:

```typescript
function shouldInitiateCalibration(repositoryContext: RepositoryContext): CalibrationDecision {
  // Extract key context parameters
  const { languages, frameworks, architecture, size, domainType } = repositoryContext;
  
  // Create context signature
  const contextSignature = createContextSignature(languages, frameworks, architecture);
  
  // Query Supabase for matching configurations
  const matchingConfigs = await queryMatchingConfigurations(contextSignature);
  
  if (matchingConfigs.length === 0) {
    // No matching configuration found
    return {
      requiresCalibration: true,
      calibrationType: 'full',
      estimatedCalibrationTime: estimateCalibrationTime(repositoryContext),
      reason: 'No matching configuration found'
    };
  }
  
  // Find best matching configuration
  const bestMatch = findBestMatch(matchingConfigs, repositoryContext);
  
  // Calculate match confidence (0-1)
  const matchConfidence = calculateMatchConfidence(bestMatch, repositoryContext);
  
  if (matchConfidence < 0.7) {
    // Low confidence match
    return {
      requiresCalibration: true,
      calibrationType: 'partial',
      estimatedCalibrationTime: estimateCalibrationTime(repositoryContext, 'partial'),
      reason: 'Low confidence match',
      temporaryConfig: bestMatch.id
    };
  }
  
  return {
    requiresCalibration: false,
    selectedConfig: bestMatch.id
  };
}
```

## Integration Points

### External System Integration

1. **Git Providers**
   - GitHub API integration
   - GitLab API integration
   - Azure DevOps API integration
   - Bitbucket API integration

2. **CI/CD Integration**
   - GitHub Actions integration
   - GitLab CI integration
   - Jenkins integration
   - CircleCI integration

3. **Issue Tracking**
   - GitHub Issues integration
   - Jira integration
   - Linear integration
   - Azure Boards integration

4. **Authentication**
   - OAuth integration
   - SAML integration
   - LDAP/Active Directory integration

### Model Integration

Support for multiple AI models:

```typescript
interface ModelConfig {
  provider: 'openai' | 'anthropic' | 'google' | 'deepseek' | 'local';
  model: string;
  parameters: {
    temperature: number;
    top_p: number;
    max_tokens: number;
    stop_sequences?: string[];
  };
  apiKey?: string;
  apiEndpoint?: string;
}

class ModelManager {
  private modelConfigs: Map<string, ModelConfig>;
  private modelProviders: Map<string, ModelProvider>;
  
  constructor(configs: ModelConfig[]) {
    this.modelConfigs = new Map();
    this.modelProviders = new Map();
    
    for (const config of configs) {
      this.registerModel(config);
    }
  }
  
  registerModel(config: ModelConfig): void {
    const modelId = `${config.provider}/${config.model}`;
    this.modelConfigs.set(modelId, config);
    
    const provider = this.getOrCreateProvider(config.provider, config);
    this.modelProviders.set(config.provider, provider);
  }
  
  private getOrCreateProvider(
    providerName: string,
    config: ModelConfig
  ): ModelProvider {
    let provider = this.modelProviders.get(providerName);
    
    if (!provider) {
      switch (providerName) {
        case 'openai':
          provider = new OpenAIProvider(config.apiKey, config.apiEndpoint);
          break;
        case 'anthropic':
          provider = new AnthropicProvider(config.apiKey, config.apiEndpoint);
          break;
        case 'google':
          provider = new GoogleProvider(config.apiKey, config.apiEndpoint);
          break;
        case 'deepseek':
          provider = new DeepSeekProvider(config.apiKey, config.apiEndpoint);
          break;
        case 'local':
          provider = new LocalProvider(config.apiEndpoint);
          break;
        default:
          throw new Error(`Unsupported provider: ${providerName}`);
      }
    }
    
    return provider;
  }
  
  async generateCompletion(
    modelId: string,
    prompt: string,
    overrideParams?: Partial<ModelConfig['parameters']>
  ): Promise<string> {
    const config = this.modelConfigs.get(modelId);
    
    if (!config) {
      throw new Error(`Model not found: ${modelId}`);
    }
    
    const provider = this.modelProviders.get(config.provider);
    
    if (!provider) {
      throw new Error(`Provider not found: ${config.provider}`);
    }
    
    const params = {
      ...config.parameters,
      ...overrideParams
    };
    
    return provider.generateCompletion(config.model, prompt, params);
  }
}
```

## System Architecture Improvements (May 2025)

### 1. Scoring System Integration
- Implemented comprehensive scoring system for repository quality assessment
- Added metadata structure for vector database storage
- Created category and subcategory scoring framework
- Integrated severity-based issue tracking

### 2. DeepWiki Kubernetes Integration
- Established Kubernetes-native integration with DeepWiki
- Implemented pod access for repository analysis
- Added support for targeted queries and chat functionality
- Created structured output parsing for analysis results

### 3. Vector Database Architecture
- Designed schema for repository analysis storage
- Created chunking strategy for efficient vector storage
- Implemented similarity search functions
- Added storage classification (permanent/cached/temporary)

### 4. RAG Framework Development (NEW - May 2025)
- Created unified RAG framework for repository knowledge management
- Implemented incremental update strategy for vector database
- Developed process for context retrieval and enhancement
- Added support for multiple repositories per user
- Integrated with Supabase pgvector for efficient vector storage

### 5. DeepWiki Chat System (NEW - May 2025)
- Designed Message Control Program (MCP) architecture for chat workflow
- Implemented model selection strategy with cost optimization
- Created fallback mechanisms for model reliability
- Added authentication and authorization for repository access
- Integrated with vector database for context-aware responses

### 6. Authentication Integration (NEW - May 2025)
- Implemented Supabase authentication for user management
- Created repository permission model with multi-tiered access
- Added support for organization-based access control
- Developed session management and security protocols
- Integrated with existing authorization framework

### 7. Future Enhancements
- Grafana dashboard integration for score visualization
- PR context enrichment from vector knowledge
- Trend analysis for repository quality
- Benchmarking against industry standards
- Cross-repository pattern recognition
- AI-assisted codebase refactoring suggestions
