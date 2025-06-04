# CodeQual Architecture Document
**Last Updated: June 3, 2025**

## System Overview

CodeQual is a flexible, multi-agent system for comprehensive code analysis, quality assessment, and improvement. The system leverages a combination of specialized AI agents, vector database storage, and a scoring system to deliver actionable insights for developers and teams.

## Core Components

### 1. Multi-Agent Architecture

The system uses a flexible, configuration-driven multi-agent approach that allows any agent type to fulfill any functional role based on context and capabilities:

#### Agent Types
- **LLM Agents**: Claude, ChatGPT, DeepSeek, Gemini
- **Specialized Agents**: Architecture Analyzer, Code Quality Assessor, Security Auditor, Performance Optimizer, Dependency Inspector
- **RESEARCHER Agent**: Dynamic model configuration optimizer (see section 10)

#### Agent Roles
- **Analysis Agents**: Primary, Secondary, Fallback
- **Support Agents**: Repository Data Provider, Repository Interaction Provider, Documentation Provider, Test Provider, CI/CD Provider
- **Orchestration Agents**: Multi-Agent Orchestrator, Result Orchestrator, Reporting Agent
- **Research Agent**: Model configuration researcher and optimizer

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
- Model configuration storage for RESEARCHER agent

#### Special Repository for RESEARCHER Configuration

```
Repository ID: 00000000-0000-0000-0000-000000000001
Name: "CodeQual Researcher Configurations"
Type: Internal system repository
Purpose: Stores optimal model configurations discovered by RESEARCHER agent
```

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

### 10. RESEARCHER Agent Architecture (NEW - June 2025)

The RESEARCHER agent is a specialized component that continuously researches and optimizes AI model configurations for all agents in the system:

#### Core RESEARCHER Capabilities

```typescript
/**
 * RESEARCHER Agent - Continuously researches and updates optimal AI model configurations
 * 
 * This agent:
 * 1. Researches current AI models from all major providers
 * 2. Analyzes pricing, performance, and capabilities
 * 3. Generates optimal configurations for all agent roles, languages, and repository sizes
 * 4. Updates the CANONICAL_MODEL_VERSIONS collection dynamically
 * 5. Runs on scheduled intervals to keep configurations current
 * 6. Can evaluate and upgrade itself based on meta-research
 */
```

#### Configuration Management Architecture

##### 1. **Initial Configuration**
- **Default Model**: Google Gemini 2.5 Flash (cost-optimized for research tasks)
- **Storage**: Special Vector DB repository (UUID: `00000000-0000-0000-0000-000000000001`)
- **Caching**: Persistent template cache to save tokens on repeated requests

##### 2. **Dynamic Model Discovery**
The RESEARCHER uses dynamic discovery to find new models without hardcoded limitations:

```typescript
/**
 * Dynamic Model Discovery Process
 * - No hardcoded model lists
 * - Searches web for latest AI model announcements
 * - Queries provider APIs for current offerings
 * - Scans GitHub for new open-source models
 * - Monitors tech news and research papers
 */
private async dynamicModelDiscovery(researcherModel: ModelVersionInfo): Promise<ModelResearchResult[]> {
  // Uses RESEARCH_PROMPTS.DYNAMIC_MODEL_DISCOVERY
  // Instructs researcher to find ALL available models
  // Not limited to predefined lists
}
```

##### 3. **Role-Specific Research**
The RESEARCHER finds the optimal model for each agent role across ALL providers:

```typescript
/**
 * Cross-Market Role Research
 * For each agent role (security, performance, architecture, etc.):
 * 1. Research ALL available models across ALL providers
 * 2. Find the SINGLE BEST model for that specific role
 * 3. Apply to all language/size combinations
 */
private async generateRoleSpecificRecommendations(
  agentRole: string,
  languages: string[],
  sizeCategories: RepositorySizeCategory[]
): Promise<ConfigurationUpdate[]>
```

#### Persistent Cache Architecture

##### 1. **Cache Structure**
```typescript
export interface ResearcherCache {
  currentModel: ModelVersionInfo;      // Current researcher model
  templateCachedAt: Date;              // When template was cached
  templateId: string;                  // Reference for cached template
  sessionId: string;                   // Session continuity
  requestCount: number;                // Usage tracking
  isActive: boolean;                   // Cache validity
  expiresAt: null;                     // No expiration!
  dbConfigId?: string;                 // DB sync tracking
}
```

##### 2. **Token Savings Mechanism**
- Base template: ~1301 tokens
- Each request only sends context parameters (~200-300 tokens)
- Savings: 1301 tokens per request after initial caching
- Cache persists until explicit upgrade

##### 3. **Cache-DB Synchronization**
```typescript
/**
 * Automatic Cache-DB Sync
 * Before each use:
 * 1. Check if cache matches DB configuration
 * 2. If out of sync, rebuild cache with new model
 * 3. Re-cache template with new researcher
 */
async isCacheSyncWithDB(): Promise<boolean>
async syncCacheWithDB(): Promise<void>
```

#### Self-Evaluation and Upgrade Process

##### 1. **Quarterly Meta-Research**
```typescript
/**
 * Meta-Research Process (Every 90 days)
 * 1. Researcher evaluates its own performance
 * 2. Searches for better models for research tasks
 * 3. Different criteria than repository analysis:
 *    - Research Capability (30%)
 *    - Market Knowledge (25%)
 *    - Analysis Quality (20%)
 *    - Cost Efficiency (15%)
 *    - Currency (10%)
 */
async conductMetaResearch(): Promise<MetaResearchResult>
```

##### 2. **Upgrade Decision Logic**
- **High Urgency + High Confidence (≥0.9)**: Automatic upgrade
- **Medium/Low Urgency**: Manual review required
- **All upgrades**: Invalidate cache and update Vector DB

##### 3. **Upgrade Process**
```typescript
async upgradeResearcher(
  newProvider: string,
  newModel: string,
  newVersion: string,
  reason: string
): Promise<{
  success: boolean;
  oldModel: string;
  newModel: string;
  requiresRecaching: boolean;
  dbConfigId?: string;
  vectorDbStored?: boolean;
}>
```

#### Vector DB Integration

##### 1. **Configuration Storage**
All model configurations are stored as analysis results in the special repository:

```typescript
/**
 * Storage Format
 * - type: 'model_configuration'
 * - severity: 'high' (model configs are high priority)
 * - finding.type: '{language}/{sizeCategory}/{agentRole}'
 * - description: JSON with full model config
 * - categories: ['model_configuration', language, size, role, provider]
 */
```

##### 2. **Configuration Retrieval**
On startup, the system loads the latest researcher configuration:

```typescript
/**
 * Startup Process
 * 1. Load latest researcher config from Vector DB
 * 2. Update CANONICAL_MODEL_VERSIONS
 * 3. Initialize cache with loaded configuration
 * 4. Ready for research operations
 */
async initializeFromVectorDB(): Promise<boolean>
```

##### 3. **Configuration Updates**
When better models are found:

```typescript
/**
 * Update Process
 * 1. Store new configuration in Vector DB
 * 2. Include reference to previous model
 * 3. Update CANONICAL_MODEL_VERSIONS
 * 4. Invalidate researcher cache if self-upgrade
 */
```

#### Research Scheduling

##### 1. **Regular Repository Research** (Daily)
- Researches optimal models for all repository contexts
- Updates configurations for all agent roles
- Stores results in Vector DB

##### 2. **Quarterly Meta-Research** (90 days)
- Evaluates researcher's own performance
- Searches for better research models
- Logs recommendations for review

#### Key Benefits

1. **Self-Improving System**: The researcher can upgrade itself when better models emerge
2. **Cost Optimization**: Persistent caching saves ~1301 tokens per research request
3. **Always Current**: Quarterly evaluations ensure the researcher stays up-to-date
4. **No Hardcoded Limits**: Dynamic discovery finds new models as they're released
5. **Persistent Configurations**: All discoveries stored in Vector DB, survive restarts

#### Modular Prompt Generator System (June 2025)

The RESEARCHER agent uses a sophisticated modular prompt generation system for flexible and efficient research operations:

##### 1. **Architecture Components**

```typescript
/**
 * Modular Prompt Generator Architecture
 * 
 * Core Components:
 * 1. ResearcherPromptGenerator - Core prompt generation with caching
 * 2. LoopPromptGenerator - Batch processing for multiple contexts  
 * 3. Cached Template System - Token-efficient base template reuse
 * 4. Context Matrix Generation - Comprehensive scenario coverage
 */
```

##### 2. **Token-Efficient Caching System**

```typescript
/**
 * Template Caching Strategy
 * 
 * Base Template: ~1301 tokens (cached once)
 * - System instructions and role definitions
 * - Provider discovery guidelines  
 * - Output format specifications
 * - CSV/JSON formatting rules
 * 
 * Context Prompts: ~200-300 tokens (per request)
 * - Specific role, language, framework combination
 * - Repository size and complexity parameters
 * - Price tier constraints
 * 
 * Token Savings: 71% reduction in token usage
 * - Without caching: 1301 + 250 = 1551 tokens per request
 * - With caching: 250 tokens per request (after first)
 * - Savings: 1301 tokens × number of requests
 */
```

##### 3. **Enhanced Context Matrix (3,000+ Contexts)**

The system generates comprehensive test scenarios across multiple dimensions:

```typescript
/**
 * Context Matrix Dimensions
 * 
 * Agent Roles: 5 (security, performance, architecture, codeQuality, dependency)
 * Languages: 6 (typescript, python, java, javascript, go, rust)
 * Repository Sizes: 3 (small, medium, large)
 * Price Tiers: 4 (budget, standard, premium, enterprise)
 * Framework Combinations: Variable per language/size
 * 
 * Total Contexts: ~3,000 unique combinations
 * Previous Matrix: 90 contexts
 * Improvement: +3,233% increase in coverage
 */
```

##### 4. **Role-Specific Evaluation Criteria**

Each agent role uses specialized evaluation criteria for model selection:

```typescript
/**
 * Role-Specific Weights
 * 
 * Security Agent:
 * - Threat Detection Accuracy (30%)
 * - False Positive Rate (20%) 
 * - Security Reasoning Quality (25%)
 * - Compliance Knowledge (15%)
 * - Performance Speed (10%)
 * 
 * Performance Agent:
 * - Optimization Quality (35%)
 * - Technical Accuracy (25%)
 * - Analysis Breadth (20%)
 * - Implementation Feasibility (15%)
 * - Cost Effectiveness (5%)
 * 
 * Architecture Agent:
 * - System Understanding (40%)
 * - Pattern Recognition (25%)
 * - Strategic Thinking (20%)
 * - Design Principles (10%)
 * - Innovation Factor (5%)
 */
```

##### 5. **Price Tier Integration**

The prompt generator includes cost-conscious model selection:

```typescript
/**
 * Price Tier Constraints
 * 
 * Budget ($0-2/1M tokens):
 * - Focus on cost-effective models
 * - Acceptable performance trade-offs
 * - Suitable for startups/small teams
 * 
 * Standard ($2-10/1M tokens):
 * - Balanced cost and performance
 * - Good for most development teams
 * - Reliable quality without premium cost
 * 
 * Premium ($10-30/1M tokens):
 * - High-quality models for critical projects
 * - Advanced capabilities and accuracy
 * - Enterprise-grade performance
 * 
 * Enterprise (Cost no object):
 * - Best-in-class models regardless of cost
 * - Maximum capability and reliability
 * - Mission-critical applications
 */
```

##### 6. **CSV Output Optimization**

The system uses strict CSV formatting for efficient parsing:

```typescript
/**
 * CSV Output Format
 * 
 * Required Format:
 * provider,model,cost_input,cost_output,tier,context_tokens
 * 
 * Example Output:
 * xai,grok-3,5.0,15.0,PREMIUM,100000
 * anthropic,claude-3.5-sonnet,3.0,15.0,PREMIUM,200000
 * 
 * Benefits:
 * - Deterministic parsing
 * - Reduced token usage (vs JSON)
 * - Primary + Fallback model format
 * - Consistent structure across all requests
 */
```

##### 7. **Implementation Files**

```typescript
/**
 * File Structure
 * 
 * packages/agents/src/prompts/generators/
 * ├── researcher-prompt-generator.ts    // Core generator with caching
 * ├── loop-prompt-generator.ts         // Batch processing
 * └── index.ts                         // Exports and factory functions
 * 
 * Key Classes:
 * - ResearcherPromptGenerator: Main prompt generation
 * - LoopPromptGenerator: Multi-context batch processing
 * - ResearchContext: Interface for research parameters
 * - LoopContext: Interface for batch scenarios
 */
```

##### 8. **Two-Path Template Generator Architecture**

The modular prompt generator implements a dual-path architecture for maximum efficiency:

```typescript
/**
 * Path 1: System Template Generation (One-Time Setup)
 * 
 * Method: generateSystemTemplate()
 * Purpose: Create and cache the base research framework
 * Frequency: Once per session or cache invalidation
 * Token Cost: ~1301 tokens (cached for reuse)
 */

class ResearcherPromptGenerator {
  generateSystemTemplate(): GeneratedPrompt {
    const templateId = 'RESEARCH_TEMPLATE_V1';
    
    // Builds comprehensive base template including:
    // - Discovery mission and methodology
    // - Market research instructions
    // - Output format specifications (JSON/CSV)
    // - Provider discovery guidelines
    // - Emerging provider inclusion (xAI/Grok, etc.)
    
    const content = `
    **BASE RESEARCH TEMPLATE [ID: ${templateId}]:**
    
    Find the SINGLE BEST AI model across ALL providers for {AGENT_ROLE} analysis.
    
    **DISCOVERY MISSION:**
    - Major providers (OpenAI, Anthropic, Google, Meta, etc.)
    - Emerging providers (xAI/Grok, Inflection/Pi, Character.AI, etc.)
    - Open-source releases and ANY NEW providers
    
    **OUTPUT FORMAT OPTIONS:**
    Option 1 - JSON: Detailed analysis with reasoning
    Option 2 - CSV: Concise 2-row format (primary + fallback)
    
    Please confirm you have cached this template as [${templateId}].
    `;
    
    // Cache template for reuse
    this.cachedTemplates.set(templateId, content);
    
    return {
      type: 'system',
      templateId,
      content,
      metadata: { tokenEstimate: 1301, cacheReference: templateId }
    };
  }
}
```

```typescript
/**
 * Path 2: Contextual Prompt Generation (High-Frequency Use)
 * 
 * Method: generateContextualPrompt(context)
 * Purpose: Generate specific research requests referencing cached template
 * Frequency: Multiple times per session (high volume)
 * Token Cost: ~200-300 tokens per request
 */

generateContextualPrompt(context: ResearchContext): GeneratedPrompt {
  const templateId = 'RESEARCH_TEMPLATE_V1';
  
  // Generates compact, context-specific request including:
  // - Reference to cached template ID
  // - Role-specific evaluation criteria with weights
  // - Language/framework/repository size parameters
  // - Price tier constraints
  // - Output format instructions
  
  const content = `
  **RESEARCH REQUEST [Session: ${sessionId}]**
  Reference Template: [${templateId}]  // << References cached template
  
  **CONTEXT PARAMETERS:**
  - Language: ${context.language}
  - Frameworks: ${context.frameworks.join(', ')}
  - Repository Size: ${context.repoSize}
  - Agent Role: ${context.agentRole}
  - Price Tier: ${context.priceTier}
  
  **ROLE-SPECIFIC REQUIREMENTS:**
  ${this.generateRoleRequirements(context.agentRole, context.language)}
  
  **EVALUATION CRITERIA:**
  ${this.generateEvaluationCriteria(context.agentRole)}
  // e.g., Security: Threat Detection (30%), False Positives (20%), etc.
  
  Apply the cached [${templateId}] with these parameters.
  `;
  
  return {
    type: 'contextual',
    content,
    metadata: { 
      tokenEstimate: 250, 
      cacheReference: templateId,
      context
    }
  };
}
```

##### 9. **Token Efficiency Analysis**

```typescript
/**
 * Token Usage Comparison
 * 
 * WITHOUT Caching (Traditional Approach):
 * - Every request: 1301 (base) + 250 (context) = 1551 tokens
 * - 20 requests: 20 × 1551 = 31,020 tokens
 * 
 * WITH Two-Path Caching Architecture:
 * - First request: 1301 (cache setup) + 250 (context) = 1551 tokens
 * - Subsequent 19 requests: 19 × 250 = 4,750 tokens
 * - Total: 1551 + 4750 = 6,301 tokens
 * 
 * SAVINGS: 31,020 - 6,301 = 24,719 tokens (79.7% reduction)
 * 
 * Cost Impact (at $0.50/1M tokens):
 * - Traditional: $0.0155
 * - Two-Path: $0.0032
 * - Savings: $0.0123 per 20-request session
 */
```

##### 10. **Implementation Integration Points**

```typescript
/**
 * Integration with RESEARCHER Agent
 * 
 * The researcher agent uses both paths in sequence:
 */

class ResearcherAgent {
  private async initializeResearchSession(): Promise<void> {
    // PATH 1: Cache system template (once per session)
    const systemPrompt = this.promptGenerator.generateSystemTemplate();
    
    // Send to AI model for caching
    await this.sendToResearcher(systemPrompt.content);
    
    this.logger.info('✅ System template cached', {
      templateId: systemPrompt.templateId,
      tokens: systemPrompt.metadata.tokenEstimate
    });
  }
  
  private async makeContextualResearchRequest(context: RepositoryContext): Promise<ModelResearchResult> {
    // PATH 2: Generate contextual prompt (many times per session)
    const researchContext: ResearchContext = {
      agentRole: context.agentRole,
      language: context.language,
      frameworks: context.frameworks,
      repoSize: context.repoSize,
      complexity: context.complexity,
      priceTier: context.priceTier
    };
    
    const prompt = this.promptGenerator.generateContextualPrompt(researchContext);
    
    // Send compact request referencing cached template
    const result = await this.sendToResearcher(prompt.content);
    
    this.logger.info('📤 Contextual request sent', {
      tokens: prompt.metadata.tokenEstimate,
      cacheReference: prompt.metadata.cacheReference
    });
    
    return this.parseResearchResult(result);
  }
}
```

##### 11. **Usage Patterns**

```typescript
/**
 * Production Usage Flow
 * 
 * 1. Initialize Generator:
 *    const generator = new ResearcherPromptGenerator(logger, config);
 * 
 * 2. PATH 1 - Cache System Template (once per session):
 *    const systemTemplate = generator.generateSystemTemplate();
 *    await sendToAI(systemTemplate.content);  // ~1301 tokens
 *    // Template cached with ID: RESEARCH_TEMPLATE_V1
 * 
 * 3. PATH 2 - Generate Context Prompts (many times):
 *    const contexts = [
 *      { agentRole: 'security', language: 'typescript', frameworks: ['react'] },
 *      { agentRole: 'performance', language: 'python', frameworks: ['django'] },
 *      // ... hundreds more contexts
 *    ];
 *    
 *    for (const context of contexts) {
 *      const prompt = generator.generateContextualPrompt(context);
 *      await sendToAI(prompt.content);  // Only ~250 tokens each
 *    }
 * 
 * 4. Batch Processing with LoopPromptGenerator:
 *    const loopGenerator = new LoopPromptGenerator(logger);
 *    const allContexts = loopGenerator.generateContextMatrix(); // 3,000 contexts
 *    const batches = loopGenerator.generateBatches(allContexts, 20);
 *    // Each batch leverages the cached template for maximum efficiency
 */
```

#### Implementation Status

✅ **Fully Implemented**:
- ResearcherAgent with all research capabilities
- Persistent cache system with token savings
- Meta-research and self-evaluation logic
- Vector DB storage and retrieval
- Cache-DB synchronization
- Upgrade mechanism with cache invalidation
- **Modular prompt generator system with 71% token savings**
- **Context matrix generation with 3,000+ scenarios**
- **Price tier integration for cost-conscious selection**
- **Role-specific evaluation criteria**

✅ **Ready for Production**:
- Default configuration (Gemini 2.5 Flash) in place
- Special repository created for configuration storage
- All integration points connected
- Comprehensive error handling and logging
- **Token-efficient prompt templates cached and ready**
- **CSV output format optimized for parsing**
- **Batch processing system for calibration scenarios**

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
   - Optimal model determination (via RESEARCHER configurations)
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

### RESEARCHER Process

1. **Research Initialization**
   - Load latest configuration from Vector DB
   - Initialize persistent cache for token savings
   - Set up research and meta-research schedules

2. **Model Research Execution**
   - Dynamic discovery of new models
   - Cross-market analysis for each agent role
   - Cost-effectiveness scoring
   - Performance benchmarking

3. **Configuration Generation**
   - Role-specific optimal model selection
   - Language and size category mapping
   - Priority-based update recommendations
   - Expected improvement calculations

4. **Storage and Distribution**
   - Store configurations in Vector DB
   - Update CANONICAL_MODEL_VERSIONS
   - Trigger cache synchronization across agents
   - Log changes for audit trail

5. **Self-Evaluation Cycle**
   - Quarterly meta-research execution
   - Performance comparison with newer models
   - Upgrade recommendations with confidence scores
   - Automatic upgrades for high-urgency changes

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

Support for multiple AI models with dynamic configuration via RESEARCHER:

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

## System Architecture Improvements (May-June 2025)

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
- Created special repository for RESEARCHER configurations

### 4. RAG Framework Development (May 2025)
- Created unified RAG framework for repository knowledge management
- Implemented incremental update strategy for vector database
- Developed process for context retrieval and enhancement
- Added support for multiple repositories per user
- Integrated with Supabase pgvector for efficient vector storage

### 5. DeepWiki Chat System (May 2025)
- Designed Message Control Program (MCP) architecture for chat workflow
- Implemented model selection strategy with cost optimization
- Created fallback mechanisms for model reliability
- Added authentication and authorization for repository access
- Integrated with vector database for context-aware responses

### 6. Authentication Integration (May 2025)
- Implemented Supabase authentication for user management
- Created repository permission model with multi-tiered access
- Added support for organization-based access control
- Developed session management and security protocols
- Integrated with existing authorization framework

### 7. RESEARCHER Agent Implementation (June 2025)
- Created self-improving model configuration system
- Implemented persistent cache for 1301 token savings per request
- Developed quarterly meta-research for self-evaluation
- Built Vector DB integration for configuration persistence
- Added dynamic model discovery without hardcoded limits
- Implemented automatic cache-DB synchronization
- Created upgrade mechanism with proper cache invalidation

### 8. Future Enhancements
- Grafana dashboard integration for score visualization
- PR context enrichment from vector knowledge
- Trend analysis for repository quality
- Benchmarking against industry standards
- Cross-repository pattern recognition
- AI-assisted codebase refactoring suggestions
