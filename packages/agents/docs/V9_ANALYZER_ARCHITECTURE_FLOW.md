# V9 Analyzer Architecture Flow

## Complete System Architecture

```mermaid
graph TB
    %% Entry Points
    API[API Endpoint/CLI] --> OF[Orchestrator Factory]
    
    %% Orchestrator Layer
    OF --> ORC[V9 Orchestrator]
    ORC --> |1. Setup| RMF[Repository Manager Factory]
    ORC --> |2. Analyze| VAF[V9 Analyzer Factory]
    ORC --> |3. Format| RFF[Report Formatter Factory]
    
    %% Repository Management Layer
    RMF --> RUF[Repository Utils Factory]
    RUF --> ORM[OptimizedRepoManager]
    RUF --> SFS[SmartFileSelector]
    
    ORM --> |Clones| GIT[Git Repository]
    ORM --> |Caches| REDIS[Redis Cache]
    SFS --> |Selects| FILES[Selected Files]
    
    %% Analyzer Layer
    VAF --> |Creates| VBA[V9BaseAnalyzer]
    VBA --> |Extends| LAZ[Language Analyzers]
    
    LAZ --> JAVA[JavaAnalyzer]
    LAZ --> RUST[RustAnalyzer]
    LAZ --> PY[PythonAnalyzer]
    LAZ --> TS[TypeScriptAnalyzer]
    LAZ --> GO[GoAnalyzer]
    
    %% Model Integration
    VBA --> MBA[ModelAwareBaseAgent]
    MBA --> SUP[Supabase Config]
    SUP --> |Fetches| MC[Model Config]
    MC --> |Provides| MODELS[AI Models]
    
    %% DeepWiki Integration
    LAZ --> DW[Code Analyzer]
    DW --> |K8s Pods| PODS[Language Pods]
    PODS --> AST[AST Analysis]
    PODS --> SEC[Security Scan]
    PODS --> PERF[Performance Analysis]
    
    %% Report Generation
    RFF --> VRF[V9ReportFormatter]
    VRF --> |Templates| TPL[Report Templates]
    VRF --> |Generates| PCG[PR Comment Generator]
    
    PCG --> MD[Markdown Report]
    PCG --> JSON[JSON Skills Baseline]
    
    %% Output
    MD --> OUTPUT[Final Output]
    JSON --> OUTPUT
    
    style API fill:#e1f5fe
    style OUTPUT fill:#c8e6c9
    style REDIS fill:#ffccbc
    style SUP fill:#fff9c4
    style DW fill:#f3e5f5
```

## Detailed Component Flow

### 1. Entry Point & Orchestration

```mermaid
sequenceDiagram
    participant User
    participant API
    participant OrchestratorFactory
    participant V9Orchestrator
    participant Config
    
    User->>API: analyzePR(repoUrl, prNumber)
    API->>Config: Load configuration
    API->>OrchestratorFactory: create(config)
    OrchestratorFactory->>V9Orchestrator: new V9Orchestrator()
    V9Orchestrator->>V9Orchestrator: initialize()
    V9Orchestrator-->>API: orchestrator instance
    API->>V9Orchestrator: analyze()
```

### 2. Repository Setup Flow

```mermaid
sequenceDiagram
    participant V9Orchestrator
    participant RepoUtilsFactory
    participant OptimizedRepoManager
    participant SmartFileSelector
    participant Git
    participant Redis
    
    V9Orchestrator->>RepoUtilsFactory: getRepoManager()
    RepoUtilsFactory->>OptimizedRepoManager: singleton instance
    
    V9Orchestrator->>OptimizedRepoManager: setupRepo(config)
    OptimizedRepoManager->>Git: shallow clone
    OptimizedRepoManager->>Redis: cache metadata
    
    V9Orchestrator->>OptimizedRepoManager: createPRWorkspace()
    OptimizedRepoManager->>Git: fetch PR changes
    OptimizedRepoManager->>OptimizedRepoManager: COW with hard links
    
    V9Orchestrator->>RepoUtilsFactory: getFileSelector()
    RepoUtilsFactory->>SmartFileSelector: singleton instance
    
    V9Orchestrator->>SmartFileSelector: selectFiles(config)
    SmartFileSelector->>SmartFileSelector: analyze PR changes
    SmartFileSelector->>SmartFileSelector: identify critical files
    SmartFileSelector-->>V9Orchestrator: SelectedFiles
```

### 3. Analysis Flow

```mermaid
sequenceDiagram
    participant V9Orchestrator
    participant V9AnalyzerFactory
    participant V9BaseAnalyzer
    participant LanguageAnalyzer
    participant ModelAwareAgent
    participant Supabase
    participant DeepWiki
    
    V9Orchestrator->>V9AnalyzerFactory: createAnalyzer(language)
    V9AnalyzerFactory->>V9BaseAnalyzer: new V9BaseAnalyzer()
    V9AnalyzerFactory->>LanguageAnalyzer: extends V9BaseAnalyzer
    
    LanguageAnalyzer->>ModelAwareAgent: initialize()
    ModelAwareAgent->>Supabase: fetchModelConfig()
    Supabase-->>ModelAwareAgent: model settings
    
    LanguageAnalyzer->>DeepWiki: analyzeCode(files)
    DeepWiki->>DeepWiki: AST analysis
    DeepWiki->>DeepWiki: security scan
    DeepWiki->>DeepWiki: performance check
    DeepWiki-->>LanguageAnalyzer: analysis results
    
    LanguageAnalyzer->>LanguageAnalyzer: processResults()
    LanguageAnalyzer-->>V9Orchestrator: AnalysisResult
```

### 4. Report Generation Flow

```mermaid
sequenceDiagram
    participant V9Orchestrator
    participant ReportFormatterFactory
    participant V9ReportFormatter
    participant PRCommentGenerator
    participant Templates
    participant Output
    
    V9Orchestrator->>ReportFormatterFactory: create()
    ReportFormatterFactory->>V9ReportFormatter: new instance
    
    V9Orchestrator->>V9ReportFormatter: format(results)
    V9ReportFormatter->>Templates: load template
    V9ReportFormatter->>V9ReportFormatter: populate sections
    
    V9ReportFormatter->>PRCommentGenerator: generate()
    PRCommentGenerator->>PRCommentGenerator: create summary
    PRCommentGenerator->>PRCommentGenerator: format issues
    PRCommentGenerator->>PRCommentGenerator: add recommendations
    
    PRCommentGenerator-->>V9ReportFormatter: markdown
    V9ReportFormatter-->>V9Orchestrator: formatted report
    
    V9Orchestrator->>Output: save report
    V9Orchestrator->>Output: save skills baseline
```

## Key Components & Responsibilities

### Core Components

| Component | Responsibility | Location |
|-----------|---------------|----------|
| **V9Orchestrator** | Main coordination of analysis flow | `/src/two-branch/orchestrator/` |
| **V9AnalyzerFactory** | Creates language-specific analyzers | `/src/two-branch/analyzers/v9-analyzer-factory.ts` |
| **V9BaseAnalyzer** | Base class for all analyzers | `/src/two-branch/analyzers/v9-base-analyzer.ts` |
| **ModelAwareBaseAgent** | Handles AI model integration | `/src/two-branch/agents/model-aware-base-agent.ts` |
| **RepositoryUtilsFactory** | Manages repo utilities | `/src/two-branch/utils/repository-utils-factory.ts` |

### Repository Management

| Component | Responsibility | Features |
|-----------|---------------|----------|
| **OptimizedRepoManager** | Efficient repo cloning | - Shallow clones<br>- COW workspaces<br>- Redis caching |
| **SmartFileSelector** | Intelligent file selection | - PR change detection<br>- Critical path identification<br>- Size-based strategies |

### Language Analyzers

| Analyzer | Special Features |
|----------|-----------------|
| **JavaAnalyzer** | Spring Boot patterns, JPA detection |
| **RustAnalyzer** | Unsafe block detection, ownership analysis |
| **TypeScriptAnalyzer** | Type safety checks, React patterns |
| **PythonAnalyzer** | Django/Flask patterns, type hints |
| **GoAnalyzer** | Goroutine analysis, interface checks |

### External Services

| Service | Purpose | Integration |
|---------|---------|-------------|
| **Supabase** | Model configuration storage | REST API |
| **Redis** | Repository metadata cache | ioredis client |
| **OpenRouter** | AI model access | API calls |

## Data Flow

### Input Data
```typescript
interface AnalysisRequest {
  repositoryUrl: string;
  prNumber: number;
  branch?: string;
  config?: {
    useSmartSelection: boolean;
    maxFiles: number;
    forceFullAnalysis: boolean;
    models?: string[];
  };
}
```

### Intermediate Data
```typescript
interface AnalysisContext {
  repository: {
    mainPath: string;
    prPath: string;
    changedFiles: string[];
  };
  selectedFiles: SelectedFiles;
  language: string;
  modelConfig: ModelConfig;
  deepWikiResults?: DeepWikiAnalysis;
}
```

### Output Data
```typescript
interface AnalysisResult {
  summary: {
    totalIssues: number;
    criticalIssues: number;
    score: number;
  };
  issues: Issue[];
  recommendations: string[];
  prDecision: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';
  report: {
    markdown: string;
    json: SkillsBaseline;
  };
}
```

## Error Handling & Fallbacks

```mermaid
graph LR
    A[Primary Path] -->|Error| B{Fallback Decision}
    B -->|DeepWiki Down| C[Use Local Analysis]
    B -->|Supabase Down| D[Use Default Models]
    B -->|Redis Down| E[Skip Caching]
    B -->|Git Error| F[Retry with Full Clone]
    
    C --> G[Continue Analysis]
    D --> G
    E --> G
    F --> G
    
    G --> H[Generate Report]
```

## Configuration Hierarchy

1. **Environment Variables** (highest priority)
   - `SUPABASE_URL`, `SUPABASE_KEY`
   - `REDIS_URL`
   - `OPENROUTER_API_KEY`
   - `USE_MOCK_ANALYZER`

2. **Supabase Configuration**
   - Model tiers and capabilities
   - Repository-specific settings
   - Feature flags

3. **Default Configuration** (lowest priority)
   - Built-in analyzer settings
   - Fallback model choices
   - Standard file patterns

## Testing Strategy

### Unit Tests
- Individual analyzer components
- Factory pattern validation
- Utility function testing

### Integration Tests
- End-to-end flow validation
- Service integration checks
- Error handling verification

### Test Files
```
test-v9-minimal-working.ts    # Core functionality
test-v9-baseline.ts           # Skills baseline generation
test-v9-real-pr-analysis.ts   # Real PR testing
test-repository-utils.ts      # Utility validation
```

## Performance Optimizations

1. **Repository Caching**
   - Shallow clones (depth=500)
   - COW workspaces with hard links
   - Redis metadata caching

2. **Smart File Selection**
   - Analyze only changed files for small PRs
   - Priority-based selection for large repos
   - Language-specific critical paths

3. **Parallel Processing**
   - Concurrent analysis execution
   - Parallel file analysis
   - Batch API calls

4. **Resource Management**
   - Singleton pattern for heavy objects
   - Connection pooling
   - Automatic cleanup

## Monitoring & Observability

- **Logging**: Structured logs at each layer
- **Metrics**: Analysis time, cache hits, model usage
- **Tracing**: Request ID propagation
- **Health Checks**: Service availability monitoring

---

*This architecture ensures scalability, maintainability, and efficient resource usage while providing comprehensive code analysis capabilities.*