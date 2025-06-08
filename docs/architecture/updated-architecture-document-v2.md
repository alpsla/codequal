CodeQual Architecture Document
Last Updated: June 9, 2025
System Overview
CodeQual is a flexible, multi-agent system for comprehensive code analysis, quality assessment, and improvement. The system leverages a combination of specialized AI agents, vector database storage, MCP (Model Context Protocol) tools, and a scoring system to deliver actionable insights for developers and teams.
Core Components
1. Multi-Agent Architecture
The system uses a flexible, configuration-driven multi-agent approach that allows any agent type to fulfill any functional role based on context and capabilities:
Agent Types

LLM Agents: Claude, ChatGPT, DeepSeek, Gemini
Specialized Agents: Architecture Analyzer, Code Quality Assessor, Security Auditor, Performance Optimizer, Dependency Inspector
RESEARCHER Agent: Dynamic model configuration optimizer (see section 10)
Orchestrator Agent: Analyzes PR complexity and coordinates the analysis flow

Agent Roles

Orchestrator: PR analysis, complexity detection, DeepWiki request generation
Analysis Agents: Security, Code Quality, Architecture, Performance, Dependencies
Final Stage Agents: Educational, Reporting
Support Agents: Repository Data Provider, Repository Interaction Provider
Research Agent: Model configuration researcher and optimizer

2. Vector Database Integration
A comprehensive vector storage system for repository analyses:
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
The vector database enables:

Efficient similarity search for relevant code patterns
Contextual PR analysis using repository knowledge
Knowledge retention across analyses
Trend tracking and benchmarking
Model configuration storage for RESEARCHER agent
Repository report storage with agent contexts

Special Repository for RESEARCHER Configuration
Repository ID: 00000000-0000-0000-0000-000000000001
Name: "CodeQual Researcher Configurations"
Type: Internal system repository
Purpose: Stores optimal model configurations discovered by RESEARCHER agent
Incremental Update Strategy
The vector database supports efficient incremental updates:

Change Detection

Track repository changes (commits, PRs)
Generate a delta of changes since last indexing
Only process files that have been changed, added, or removed


Document Processing

For new/modified files: Process and add embeddings to vector DB
For deleted files: Remove corresponding embeddings
For renamed files: Update metadata while preserving embeddings


Versioning System

Maintain version information for each repository's vector index
Track which commit/version is currently indexed
Support potential rollback to previous versions



3. MCP Hybrid Tool Integration (NEW - June 2025)
The system integrates Model Context Protocol (MCP) tools to provide concrete analysis data for all agents:
Core Architecture

Tool Registry: Maps tools to agent roles, not specific models
Tool Manager: Server-side execution with workspace isolation
Context Selector: Intelligent tool selection based on PR context
Parallel Executor: Runs multiple tools simultaneously

Tool Mapping by Agent Role
Orchestrator Agent Tools:

Git MCP Server - Fetches PR and repository data
Web Search MCP - Finds related issues and documentation
Context MCP - Retrieves organizational context from Vector DB

Security Agent:

MCP-Scan - Security verification and tool validation
Semgrep MCP - Code security scanning
SonarQube - General security checks

Code Quality Agent:

ESLint MCP - JavaScript/TypeScript linting (✅ Implemented)
SonarQube - Multi-language quality analysis
Prettier Direct - Code formatting checks (✅ Implemented)

Architecture Agent:

Dependency Cruiser - Dependency analysis (✅ Implemented)
Madge - Circular dependency detection
Git MCP - Repository structure analysis

Performance Agent:

Lighthouse - Web performance metrics
SonarQube - Code complexity analysis
Bundlephobia - Bundle size analysis

Dependency Agent:

NPM Audit - Security vulnerability scanning
License Checker - License compliance
Outdated - Version currency checks

Educational Agent:

Context MCP - Knowledge retrieval from Vector DB (✅ Implemented)
Knowledge Graph MCP - Learning path identification
MCP Memory - Progress tracking
Web Search MCP - External educational resources

Reporting Agent:

Chart.js MCP - Data visualizations (✅ Implemented)
Mermaid MCP - Architecture diagrams
Markdown PDF MCP - Report formatting
Grafana Direct - Dashboard integration (✅ Implemented)

Tool Execution Flow

Tools Run FIRST: Concrete findings drive agent analysis
Agent Context: Each agent receives:

Tool results (findings, metrics)
Agent context from Vector DB (dependencies, scoring)
Role-specific focus areas


Compiled Reports: Agents create reports based on tool analysis, not raw findings

Implementation Status

Tools Implemented: 8/25 (32%)
Core Architecture: 100% complete
Parallel Execution: Implemented
Integration Ready: Yes

4. Scoring and Assessment System
A comprehensive scoring system quantifies repository quality across multiple dimensions:
Specialized Analysis Scoring

Each specialized analysis (architecture, code quality, security, dependencies, performance) includes:

Overall category score (1-10 scale)
Subcategory scoring with specific metrics
Severity-based issue identification (high/medium/low)
Scoring justifications and impact assessments



Repository-Level Scoring

Combined overall repository score based on weighted category scores
Visualization-ready metrics for Grafana dashboards
Trend analysis for score changes over time
Benchmark comparisons with similar repositories

Vector-Ready Metadata
json{
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
5. Orchestrator-Driven Analysis Flow
The system follows a sophisticated orchestration flow:
1. PR Analysis and Complexity Detection
typescript/**
 * Orchestrator determines:
 * - Language and framework detection
 * - PR complexity (file count, lines changed)
 * - Appropriate DeepWiki request generation
 * - Agent requirements and priorities
 */
2. Vector DB and DeepWiki Integration

Check Vector DB: Look for existing repository report
If not found: Generate via DeepWiki with orchestrator's requirements
Store report: Save in Vector DB with agent contexts

3. Agent Context Distribution
typescript{
  "agentContexts": {
    "security": {
      "focus": "authentication",
      "priority": "high",
      "dependencies": ["oauth2", "jwt"],
      "scoring": { "threshold": 8, "weight": 0.3 }
    },
    "codeQuality": {
      "focus": "maintainability",
      "codeStandards": "airbnb",
      "testCoverage": 75,
      "dependencies": ["eslint", "prettier"],
      "scoring": { "threshold": 7, "weight": 0.25 }
    }
    // ... other agents
  }
}
4. Tool-Enhanced Agent Execution

Tools run FIRST for concrete findings
Agents analyze based on tool results + context
Reports compiled by agents (not raw tool output)

5. Final Report Generation

Educational Agent: Creates learning materials from findings
Reporting Agent: Generates visualizations and final output

6. DeepWiki Integration
The system integrates with DeepWiki for comprehensive repository analysis:
Kubernetes-Native Integration

Direct access to DeepWiki pods in Kubernetes cluster
Command execution via kubectl exec
Repository analysis via DeepWiki API

Tiered Analysis Approach

Quick PR-Only Analysis:

1-3 minutes execution time
Focus on changed files only
Immediate developer feedback


Comprehensive Repository Analysis:

5-10 minutes execution time
Full repository context
Cached for future reference


Targeted Deep Dives:

Focused on specific architectural aspects
Leverages DeepWiki Chat API
Explores specific patterns or concerns



7. RAG Framework
The system implements a comprehensive Retrieval-Augmented Generation (RAG) framework that serves both the chat functionality and other services:
Core RAG Components
typescript/**
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
    
    return {
      chunkCount: chunks.length,
      vectorIds,
      totalTokens: chunks.reduce((sum, chunk) => sum + this.estimateTokens(chunk.content), 0)
    };
  }
}
8. DeepWiki Chat Integration
The system includes a specialized chat interface for repository exploration using the Message Control Program (MCP) pattern:
Message Control Program Architecture
typescript/**
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
9. Authentication System
The system implements a comprehensive authentication and authorization framework:
Supabase Authentication Integration
typescript/**
 * Authentication service using Supabase
 */
export class SupabaseAuthService implements AuthenticationService {
  constructor(
    private supabaseClient: SupabaseClient,
    private userService: UserService,
    private organizationService: OrganizationService
  ) {}
  
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
    
    // Get organization repositories
    const orgRepos = await this.supabaseClient
      .from('repositories')
      .select('*, organization_id')
      .in('organization_id', orgIds);
    
    // Combine personal and org repositories with access levels
    return this.combineRepositoryAccess(personalRepos, orgRepos, orgMemberships);
  }
}
10. RESEARCHER Agent Architecture (June 2025)
The RESEARCHER agent is a specialized component that continuously researches and optimizes AI model configurations for all agents in the system:
Core RESEARCHER Capabilities
typescript/**
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
Configuration Management Architecture
1. Current Configuration (June 5, 2025)

Primary Model: OpenAI GPT-4.1-nano (optimal performance/cost for research tasks)

Composite Score: 9.81/10
Cost: $0.10/$0.40 per 1M tokens (input/output)
Monthly Cost: ~$3.73 for 3,000 daily queries
Context Window: 128,000 tokens


Fallback Model: OpenAI GPT-4.1-mini
Storage: Special Vector DB repository
Caching: Persistent template cache (saves 1301 tokens per request)

2. Dynamic Model Discovery

No hardcoded model lists
Searches web for latest AI model announcements
Queries provider APIs for current offerings
Monitors tech news and research papers

3. Token-Efficient Caching System

Base template: ~1301 tokens (cached once)
Context prompts: ~200-300 tokens per request
Token savings: 71% reduction after initial cache
Persistent cache with no expiration

4. Self-Evaluation Process

Quarterly meta-research (every 90 days)
Evaluates own performance
Searches for better research models
Automatic upgrade for high-confidence recommendations

Modular Prompt Generator System
The RESEARCHER uses a sophisticated two-path prompt generation system:
Path 1: System Template Generation (One-Time)

Creates comprehensive base research framework
Includes discovery methodology and output formats
~1301 tokens, cached for session reuse

Path 2: Contextual Prompt Generation (Per-Request)

References cached template ID
Includes specific role, language, framework parameters
Only ~250 tokens per request

Context Matrix Coverage

Agent Roles: 5 (security, performance, architecture, codeQuality, dependency)
Languages: 6 (typescript, python, java, javascript, go, rust)
Repository Sizes: 3 (small, medium, large)
Price Tiers: 4 (budget, standard, premium, enterprise)
Total Contexts: ~3,000 unique combinations

11. Core Processes
Orchestrator-Driven Analysis Process

PR URL Reception

Orchestrator receives PR URL
Analyzes PR complexity (files, languages, frameworks)
Determines analysis requirements


Vector DB Check

Checks for existing repository report
If missing, generates DeepWiki request
Stores report with agent contexts


Tool-First Agent Execution

Tools run FIRST for each agent
Agents analyze based on tool results + context
All 5 specialized agents run in parallel


Final Report Generation

Educational agent creates learning materials
Reporting agent generates visualizations
Combined output for user



Tool Integration Process

Context Creation

Convert PR data to analysis context
Include agent role and user permissions


Tool Selection

Select tools based on agent role
Consider language and framework compatibility


Parallel Execution

Run multiple tools simultaneously
Respect timeout and resource limits


Result Compilation

Aggregate findings from all tools
Calculate metrics and severity counts


Agent Enhancement

Provide tool results to agent
Agent creates compiled report



12. Deployment Architecture
Unified Deployment Approach
To support both cloud and on-premises deployment models:
Core Principles

Container-First Architecture

All components packaged as containers
Configuration injected via environment variables
Stateless design for scalability


Environment Abstraction Layer

Environment-specific adapters for dependencies
Unified API for service access
Feature flags for environment capabilities


Configuration Hierarchy

Base configuration shared across environments
Environment-specific overrides
Customer-specific customizations
Instance-specific settings



13. System Architecture Improvements (May-June 2025)
MCP Hybrid Tool Integration (June 2025)

Implemented 8 core tool adapters (32% complete)
Created parallel execution engine
Built tool-aware agent wrapper
Integrated with existing multi-agent executor
Tools run FIRST, then agents analyze

RESEARCHER Agent Implementation (June 2025)

Created self-improving model configuration system
Implemented persistent cache for 1301 token savings per request
Developed quarterly meta-research for self-evaluation
Built Vector DB integration for configuration persistence
Added dynamic model discovery without hardcoded limits

Previous Improvements (May 2025)

Scoring System Integration
DeepWiki Kubernetes Integration
Vector Database Architecture
RAG Framework Development
DeepWiki Chat System
Authentication Integration

14. Future Enhancements

Complete remaining MCP tool implementations (17 tools)
Grafana dashboard integration for score visualization
PR context enrichment from vector knowledge
Trend analysis for repository quality
Cross-repository pattern recognition
AI-assisted codebase refactoring suggestions
Quarterly auto-upgrade for RESEARCHER model
Real-time tool result streaming
Advanced caching for repeated analyses