# Agent Roles and Evaluation

**Last Updated: May 11, 2025**

## Agent Roles

In this architecture, any agent type can fulfill any of these functional roles:

### Analysis Agents

**Primary Agent:**
- Comprehensive analysis of assigned area
- Focus on core issues in the domain
- Broad coverage of the codebase

**Secondary Agent:**
- Complementary analysis focusing on gaps
- Specialized analysis in agent's strength areas
- Verification/contradiction of primary agent findings

**Fallback Agent:**
- Activated when primary or secondary agents fail
- May have different strengths/weaknesses
- Prioritized based on effectiveness for the role
- Configured with failure context awareness

### Support Agents

**Repository Data Provider:**
- Connects to source control APIs (GitHub, GitLab, Azure DevOps)
- Fetches code, diffs, PR metadata, commit history
- Processes and structures repository data for analysis
- Manages caching to reduce API calls
- Provides unified data interface for other agents

**Repository Interaction Provider:**
- Adds review comments to code
- Submits approvals/rejections based on analysis results
- Creates follow-up PRs with suggested fixes
- Manages issue creation and tracking
- Handles PR descriptions and summaries

**Documentation Provider:**
- Generates/updates documentation based on code changes
- Creates/updates READMEs for new features
- Maintains API documentation
- Updates changelogs automatically
- Generates architecture documentation

**Educational Provider:**
- Generates tutorials based on code context
- Provides conceptual explanations of code patterns
- Links to relevant learning resources
- Creates custom learning paths based on developer level
- Offers interactive learning experiences

**Test Provider:**
- Generates unit tests for new code
- Updates existing tests to match code changes
- Provides test coverage analysis
- Suggests test improvements
- Creates test plans for new features

**CI/CD Provider:**
- Integrates with build systems
- Monitors deployment processes
- Provides release notes generation
- Updates deployment configurations
- Handles infrastructure as code updates

### Orchestrator Agent

- Categorization of findings across agents
- Deduplication of similar insights
- Prioritization of issues by severity
- Organization of results into meaningful structure
- Resolution of conflicting findings

### Reporting Agent

- Creation of executive summaries
- Detailed explanation of technical issues
- Educational content related to findings
- Actionable recommendations for improvement
- Customized reporting for different audiences

## Context-Adaptive Role Determination

The orchestrator determines which roles are required for a specific PR based on its characteristics:

```typescript
private determineRequiredRoles(
  context: RepositoryContext,
  prContext: PRContext,
  analysisMode: AnalysisMode
): AgentRole[] {
  const roles: AgentRole[] = [];
  
  // Code quality is almost always needed
  roles.push(AgentRole.CODE_QUALITY);
  
  // For quick mode, limit additional roles based on PR characteristics
  if (analysisMode === AnalysisMode.QUICK) {
    // Only add security if obviously needed
    if (this.containsHighRiskSecurityChanges(prContext)) {
      roles.push(AgentRole.SECURITY);
    }
    
    // Only add performance if clearly performance-critical
    if (this.containsHighlyPerformanceCriticalCode(prContext)) {
      roles.push(AgentRole.PERFORMANCE);
    }
    
    return roles; // Return reduced set for quick mode
  }
  
  // For comprehensive mode, add more roles based on deep analysis
  // Security analysis for:
  if (
    this.containsSecuritySensitiveChanges(prContext) ||  // Authentication changes, etc.
    this.containsThirdPartyDependencies(prContext) ||    // New dependencies
    this.containsConfigChanges(prContext) ||             // Configuration changes
    this.affectsSecurityComponents(context, prContext)   // Based on repository context
  ) {
    roles.push(AgentRole.SECURITY);
  }
  
  // Performance analysis for:
  if (
    this.containsPerformanceSensitiveCode(prContext) ||  // Database queries, loops, etc.
    this.containsAlgorithmChanges(prContext) ||          // Algorithm modifications
    this.touchesHighTrafficComponents(context, prContext) || // High-usage components
    this.affectsPerformanceCriticalPaths(context, prContext) // Based on repository context
  ) {
    roles.push(AgentRole.PERFORMANCE);
  }
  
  // Educational content for:
  if (
    this.isComplexChange(prContext) ||                  // Complex changes
    this.isFromJuniorDeveloper(prContext) ||            // Junior developers
    this.touchesUnfamiliarArea(context, prContext) ||   // Unfamiliar code areas
    this.involvesAdvancedPatterns(context, prContext)   // Based on repository context
  ) {
    roles.push(AgentRole.EDUCATIONAL);
  }
  
  // Documentation analysis for:
  if (
    this.containsPublicAPIs(prContext) ||               // Public API changes
    this.containsSignificantNewFeatures(prContext) ||   // New features
    this.affectsDocumentedComponents(context, prContext) // Based on repository context
  ) {
    roles.push(AgentRole.DOCUMENTATION);
  }
  
  return roles;
}
```

## Real-Data Model Calibration

A critical aspect of our system is model calibration using real-world repositories and PRs. This approach ensures our models perform optimally in diverse real-world scenarios.

### Agent Evaluation Data

```typescript
interface AgentRoleEvaluationParameters {
  // Basic agent capabilities
  agent: {
    provider: AgentProvider;
    modelVersion: ModelVersion;
    maxTokens: number;
    costPerToken: number;
    averageLatency: number;
  };
  
  // Role-specific performance metrics
  rolePerformance: {
    [role in AgentRole]: {
      overallScore: number;         // 0-100 performance score
      specialties: string[];        // e.g., "JavaScript", "Security", "API Design"
      weaknesses: string[];         // e.g., "Large Codebase", "C++", "Concurrency"
      bestPerformingLanguages: Record<string, number>; // 0-100 scores by language
      bestFileTypes: Record<string, number>;           // 0-100 scores by file type
      bestScenarios: Record<string, number>;           // 0-100 scores by scenario
    };
  };
  
  // Repository and PR-specific performance
  repoCharacteristics: {
    sizePerformance: Record<string, number>;          // By repo size
    complexityPerformance: Record<string, number>;    // By complexity
    architecturePerformance: Record<string, number>;  // By architecture
  };
  prCharacteristics: {
    sizePerformance: Record<string, number>;          // By PR size
    changeTypePerformance: Record<string, number>;    // By change type
  };
  
  // Additional metrics
  frameworkPerformance: Record<string, number>;       // By framework
  historicalPerformance: {
    totalRuns: number;
    successRate: number;                              // 0-1.0
    averageUserSatisfaction: number;                  // 0-100
    tokenUtilization: number;                         // Efficiency
    averageFindingQuality: number;                    // 0-100
  };
  
  // MCP-specific metrics
  mcpPerformance?: {
    withMCP: {
      qualityScore: number;                           // 0-100
      speedScore: number;                             // 0-100
      costEfficiency: number;                         // 0-100
    };
    withoutMCP: {
      qualityScore: number;                           // 0-100
      speedScore: number;                             // 0-100
      costEfficiency: number;                         // 0-100
    };
    recommendMCP: boolean;                            // Whether MCP is recommended
  };
}
```

### Real-Data Calibration Approach

1. **Production-like Data Collection**:
   - Use actual open-source repositories of varying sizes and complexity
   - Test with real PRs representing different change types
   - Include repositories from diverse domains and technology stacks
   - Ensure representation of different architecture patterns

2. **Authentic Context Diversity**:
   - Test models across multiple programming languages and frameworks
   - Include monorepo, microservice, and serverless architectures
   - Use repositories with different code organization patterns
   - Test with PRs that represent real development workflows

3. **Edge Case Discovery**:
   - Identify natural edge cases from real repositories
   - Test with uniquely structured codebases
   - Analyze PRs with complex cross-file impacts
   - Include PRs with security implications or performance concerns

### Calibration Repository Types

To ensure comprehensive coverage, our calibration suite includes these repository types:

1. **Framework Repositories**:
   - Major frontend frameworks (React, Angular, Vue)
   - Backend frameworks (Django, Express, Spring)
   - Mobile frameworks (React Native, Flutter)

2. **Infrastructure Code**:
   - DevOps automation (Ansible, Terraform)
   - CI/CD configurations (GitHub Actions, Jenkins)
   - Kubernetes and container orchestration

3. **Mixed-Language Applications**:
   - Full-stack applications with frontend/backend
   - Cross-platform mobile applications
   - Data processing pipelines with multiple technologies

4. **Library and Utility Codebases**:
   - Popular open-source libraries
   - Utility packages across languages
   - Standard tooling implementations

### PR Type Diversity

The calibration suite includes these PR types:

1. **Feature Additions**:
   - New functionality implementations
   - API extensions and enhancements
   - UI component additions

2. **Bug Fixes**:
   - Security vulnerability patches
   - Performance bottleneck resolutions
   - Functional correctness fixes

3. **Refactoring Changes**:
   - Code organization improvements
   - Architectural modifications
   - Technical debt reduction

4. **Infrastructure Updates**:
   - Dependency version upgrades
   - Build system modifications
   - Deployment configuration changes

### Calibration Schedule

1. **Initial Calibration** (Before Launch):
   - Comprehensive testing with 100+ real repositories
   - Evaluation of agent performance across all PR types
   - Creation of baseline performance metrics
   - Establishment of initial configuration parameters

2. **Ongoing Recalibration**:
   - Periodic re-evaluation with expanded repository set
   - Continuous performance monitoring with real user data
   - Adjustment based on feedback and changing code patterns
   - Calibration triggered by model updates or user feedback

3. **Context-Specific Tuning**:
   - Custom calibration for industry-specific code patterns
   - Adaptation to enterprise-specific architecture patterns
   - Optimization for different team workflows and development practices

### Calibration Data Storage

Calibration results are stored in a structured format:

```typescript
interface CalibrationRun {
  runId: string;                // Unique identifier for this calibration run
  timestamp: Date;              // When the calibration was performed
  modelVersions: {              // Versions of each model tested
    [provider: string]: string;
  };
  metrics: AgentRoleEvaluationParameters[]; // Performance metrics for each model
  testCases: {                  // Results for individual test cases
    repositoryId: string;
    size: string;               // small, medium, large, enterprise
    languages: string[];
    architecture: string;
    results: {
      [provider: string]: {
        precision: number;
        recall: number;
        f1Score: number;
        executionTime: number;
        tokenUsage: number;
        costMetric: number;
      }
    }
  }[];
  optimizedParameters: {        // Recommended parameters from this calibration
    [provider: string]: {
      [role: string]: {
        temperature: number;
        maxTokens: number;
        expectedLatency: number;
        recommendedPosition: AgentPosition;
      }
    }
  };
}
```

## Multi-Model Architecture

To optimize performance across different languages and contexts, the system implements a multi-model approach for both PR analysis and repository understanding.

### Static Model-Language Mapping

```typescript
// Static mapping based on known performance patterns
const STATIC_MODEL_MAPPINGS = {
  analysisModels: {
    'javascript': 'deepseek-coder',
    'typescript': 'deepseek-coder',
    'python': 'deepseek-coder',
    'rust': 'claude-3.5-sonnet',
    'cpp': 'claude-3.5-sonnet',
    'java': 'gpt-4-turbo',
    'kotlin': 'gpt-4-turbo',
    'swift': 'claude-3.5-sonnet',
    'go': 'deepseek-coder',
    'php': 'deepseek-coder',
    // Default fallback
    'default': 'gpt-4-turbo'
  },
  
  embeddingModels: {
    // These change less frequently based on language
    'text-embedding-3-large': ['javascript', 'typescript', 'python'],
    'cohere-embed-v3': ['rust', 'cpp', 'go'],
    'gemini-embed': ['java', 'kotlin', 'swift'],
    // Default
    'default': 'text-embedding-3-large'
  }
};
```

### Selective Calibration for Edge Cases

```typescript
// Only calibrate when we're unsure
class SelectiveCalibrationSystem {
  async needsCalibration(repository: Repository): Promise<boolean> {
    const characteristics = await this.analyzeRepository(repository);
    
    // Calibrate only for:
    return (
      characteristics.isMultilingual ||           // Multiple languages
      characteristics.hasUnknownFramework ||      // Unknown framework
      characteristics.hasDomainSpecificLanguage   // DSL/special language
    );
  }
  
  async calibrateIfNeeded(repository: Repository): Promise<ModelConfig | null> {
    if (!await this.needsCalibration(repository)) {
      return null; // Use static mapping
    }
    
    // Limited calibration for edge cases
    const embeddingModels = ['text-embedding-3-large', 'cohere-embed-v3'];
    const results = await Promise.all(
      embeddingModels.map(model => 
        this.testEmbeddingQuality(repository, model)
      )
    );
    
    return this.selectBestPerformer(results);
  }
}
```

### Unified Orchestrator with Model Selection

```typescript
class UnifiedOrchestrator {
  async orchestrateFullAnalysis(request: {
    repository: Repository;
    pr?: PullRequest;
  }) {
    // 1. Determine primary language and select models
    const primaryLanguage = this.detectPrimaryLanguage(request.repository);
    const analysisModel = this.selectAnalysisModel(primaryLanguage);
    const embeddingModel = this.selectEmbeddingModel(primaryLanguage);
    
    // 2. Prepare DeepWiki request
    const deepWikiRequest: DeepWikiRequest = {
      repository: {
        url: request.repository.url,
        branch: request.repository.branch,
        languages: request.repository.languages
      },
      analysisConfig: {
        model: analysisModel,
        embeddingModel: embeddingModel
      },
      prContext: request.pr ? {
        changedFiles: request.pr.changedFiles,
        prNumber: request.pr.number,
        description: request.pr.description
      } : undefined
    };
    
    // 3. Get repository context from DeepWiki
    const repoContext = await this.deepWikiClient.analyze(deepWikiRequest);
    
    // 4. Select PR analysis agents based on language and context
    const agentConfigs = this.selectPRAgents(primaryLanguage, repoContext);
    
    // 5. Execute multi-agent PR analysis with repo context
    const prAnalysis = await this.executeAgents(agentConfigs, {
      pr: request.pr,
      repoContext: repoContext,
      selectedModels: {
        analysis: analysisModel,
        embedding: embeddingModel
      }
    });
    
    return {
      repository: repoContext,
      pr: prAnalysis,
      metadata: {
        modelsUsed: { analysisModel, embeddingModel },
        language: primaryLanguage
      }
    };
  }
}
```
