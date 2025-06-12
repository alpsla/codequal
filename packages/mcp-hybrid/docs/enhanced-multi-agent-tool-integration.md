# Enhanced Multi-Agent Framework with Tool Integration

## Overview

This design enhances the multi-agent framework by integrating direct tools with DeepWiki's repository analysis. Tools run in parallel using DeepWiki's cloned repository, providing specific, actionable insights to complement DeepWiki's comprehensive analysis.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                            PR Analysis Flow                          │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                        ┌─────────────────────┐
                        │    Orchestrator     │
                        │  - Analyze PR       │
                        │  - Check Vector DB  │
                        └─────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
        ┌─────────────────────┐         ┌─────────────────────┐
        │  Vector DB Exists?  │   NO    │   DeepWiki Service  │
        │                     ├────────►│  - Clone Repository │
        └─────────────────────┘         │  - Run Analysis     │
                    │                   │  - Run Tools ────────┼───┐
                YES │                   └─────────────────────┘   │
                    │                               │              │
                    ▼                               ▼              │
        ┌─────────────────────┐         ┌─────────────────────┐   │
        │  Retrieve Context   │         │  Store in Vector DB │   │
        └─────────────────────┘         └─────────────────────┘   │
                    │                               │              │
                    └───────────────┬───────────────┘              │
                                    │                              │
                                    ▼                              │
                        ┌─────────────────────┐                    │
                        │  Enhanced Context   │◄───────────────────┘
                        │  - DeepWiki Report  │    Tool Results
                        │  - Tool Findings    │
                        └─────────────────────┘
                                    │
                ┌───────────────────┼───────────────────┐
                ▼                   ▼                   ▼
    ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
    │ Security Agent  │ │Code Quality Agent│ │Architecture Agent│
    │ + NPM Audit     │ │ + ESLint        │ │ + Madge         │
    │ + License Check │ │ + Prettier      │ │ + Dep Cruiser   │
    └─────────────────┘ └─────────────────┘ └─────────────────┘
```

## Implementation Design

### 1. Enhanced DeepWiki Service

```typescript
// packages/core/src/services/deepwiki-enhanced.service.ts

export interface EnhancedDeepWikiOptions extends DeepWikiAnalysisOptions {
  /**
   * Tool execution configuration
   */
  tools?: {
    security?: {
      npmAudit?: boolean;
      licenseChecker?: boolean;
    };
    architecture?: {
      madge?: boolean;
      dependencyCruiser?: boolean;
    };
    codeQuality?: {
      eslint?: boolean;
      prettier?: boolean;
      sonarjs?: boolean;
    };
    performance?: {
      bundlephobia?: boolean;
    };
    dependency?: {
      npmOutdated?: boolean;
    };
  };
  
  /**
   * Parallel execution configuration
   */
  execution?: {
    parallel?: boolean;
    timeout?: number;
    maxConcurrent?: number;
  };
}

export interface EnhancedAnalysisResult extends DeepWikiAnalysisResult {
  /**
   * Tool execution results
   */
  toolResults?: {
    security?: {
      npmAudit?: ToolResult;
      licenseChecker?: ToolResult;
    };
    architecture?: {
      madge?: ToolResult;
      dependencyCruiser?: ToolResult;
    };
    codeQuality?: {
      eslint?: ToolResult;
      prettier?: ToolResult;
      sonarjs?: ToolResult;
    };
    performance?: {
      bundlephobia?: ToolResult;
    };
    dependency?: {
      npmOutdated?: ToolResult;
    };
  };
}

export class EnhancedDeepWikiService extends DeepWikiKubernetesService {
  private toolExecutor: ToolExecutor;
  
  constructor(logger: Logger, options?: DeepWikiServiceOptions) {
    super(logger, options);
    this.toolExecutor = new ToolExecutor(logger);
  }
  
  /**
   * Analyze repository with enhanced tool support
   */
  async analyzeRepositoryEnhanced(
    options: EnhancedDeepWikiOptions
  ): Promise<EnhancedAnalysisResult> {
    this.logger.info(`Starting enhanced DeepWiki analysis for ${options.repositoryUrl}`);
    
    // Step 1: Run standard DeepWiki analysis (includes cloning)
    const deepwikiResult = await this.analyzeRepository(options);
    
    // Step 2: Get repository path from DeepWiki
    const repoPath = await this.getRepositoryPath(deepwikiResult.id);
    
    // Step 3: Run tools in parallel using the cloned repository
    const toolResults = await this.runToolsInParallel(repoPath, options);
    
    // Step 4: Combine results
    return {
      ...deepwikiResult,
      toolResults
    };
  }
  
  /**
   * Run selected tools in parallel
   */
  private async runToolsInParallel(
    repoPath: string,
    options: EnhancedDeepWikiOptions
  ): Promise<EnhancedAnalysisResult['toolResults']> {
    const toolJobs: Promise<[string, string, ToolResult]>[] = [];
    
    // Security tools
    if (options.tools?.security?.npmAudit) {
      toolJobs.push(
        this.runToolInRepo('security', 'npmAudit', repoPath)
      );
    }
    if (options.tools?.security?.licenseChecker) {
      toolJobs.push(
        this.runToolInRepo('security', 'licenseChecker', repoPath)
      );
    }
    
    // Architecture tools
    if (options.tools?.architecture?.madge) {
      toolJobs.push(
        this.runToolInRepo('architecture', 'madge', repoPath)
      );
    }
    if (options.tools?.architecture?.dependencyCruiser) {
      toolJobs.push(
        this.runToolInRepo('architecture', 'dependencyCruiser', repoPath)
      );
    }
    
    // Code quality tools
    if (options.tools?.codeQuality?.eslint) {
      toolJobs.push(
        this.runToolInRepo('codeQuality', 'eslint', repoPath)
      );
    }
    
    // Execute all tools in parallel
    const results = await Promise.allSettled(toolJobs);
    
    // Organize results by category
    const toolResults: EnhancedAnalysisResult['toolResults'] = {};
    
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        const [category, tool, toolResult] = result.value;
        if (!toolResults[category]) {
          toolResults[category] = {};
        }
        toolResults[category][tool] = toolResult;
      } else {
        this.logger.error(`Tool execution failed: ${result.reason}`);
      }
    });
    
    return toolResults;
  }
  
  /**
   * Run a specific tool in the repository
   */
  private async runToolInRepo(
    category: string,
    toolName: string,
    repoPath: string
  ): Promise<[string, string, ToolResult]> {
    const command = this.buildToolCommand(toolName, repoPath);
    const result = await this.executeCommandInPod(command, 300); // 5-minute timeout
    const parsedResult = this.parseToolResult(toolName, result);
    return [category, toolName, parsedResult];
  }
}
```

### 2. Tool Executor in DeepWiki Pod

```typescript
// packages/core/src/services/tool-executor.service.ts

export class ToolExecutor {
  private adapters: Map<string, DirectToolAdapter>;
  
  constructor(private logger: Logger) {
    this.initializeAdapters();
  }
  
  private initializeAdapters() {
    this.adapters = new Map([
      ['npmAudit', new NpmAuditDirectAdapter()],
      ['licenseChecker', new LicenseCheckerDirectAdapter()],
      ['madge', new MadgeDirectAdapter()],
      ['eslint', new ESLintDirectAdapter()],
      ['prettier', new PrettierDirectAdapter()],
      ['dependencyCruiser', new DependencyCruiserDirectAdapter()],
      ['npmOutdated', new NpmOutdatedDirectAdapter()],
      ['bundlephobia', new BundlephobiaDirectAdapter()],
      ['sonarjs', new SonarJSDirectAdapter()]
    ]);
  }
  
  /**
   * Execute tool with repository context
   */
  async executeTool(
    toolName: string,
    repoPath: string,
    context: AnalysisContext
  ): Promise<ToolResult> {
    const adapter = this.adapters.get(toolName);
    if (!adapter) {
      throw new Error(`Unknown tool: ${toolName}`);
    }
    
    // Create enhanced context with repository path
    const enhancedContext = {
      ...context,
      sandbox: {
        path: repoPath,
        hasNodeModules: await this.checkNodeModules(repoPath),
        hasLockFile: await this.checkLockFile(repoPath),
        installedDependencies: true
      }
    };
    
    return adapter.analyze(enhancedContext);
  }
}
```

### 3. Enhanced Multi-Agent Executor

```typescript
// packages/agents/src/multi-agent/enhanced-executor.ts

export class EnhancedMultiAgentExecutor {
  /**
   * Execute agents with tool-enhanced context
   */
  async executeWithTools(
    context: AnalysisContext,
    deepwikiResults: EnhancedAnalysisResult
  ): Promise<ConsolidatedResults> {
    // Prepare agent contexts with both DeepWiki and tool results
    const agentContexts = this.prepareAgentContexts(
      context,
      deepwikiResults
    );
    
    // Run agents in parallel with enhanced context
    const agentPromises = [
      this.runSecurityAgent(agentContexts.security),
      this.runCodeQualityAgent(agentContexts.codeQuality),
      this.runArchitectureAgent(agentContexts.architecture),
      this.runPerformanceAgent(agentContexts.performance),
      this.runDependencyAgent(agentContexts.dependency)
    ];
    
    const results = await Promise.allSettled(agentPromises);
    
    return this.consolidateResults(results);
  }
  
  /**
   * Prepare context for each agent with relevant tool results
   */
  private prepareAgentContexts(
    context: AnalysisContext,
    deepwikiResults: EnhancedAnalysisResult
  ): AgentContexts {
    return {
      security: {
        ...context,
        deepwikiAnalysis: this.extractSecurityInsights(deepwikiResults),
        toolResults: {
          npmAudit: deepwikiResults.toolResults?.security?.npmAudit,
          licenseChecker: deepwikiResults.toolResults?.security?.licenseChecker
        }
      },
      codeQuality: {
        ...context,
        deepwikiAnalysis: this.extractCodeQualityInsights(deepwikiResults),
        toolResults: {
          eslint: deepwikiResults.toolResults?.codeQuality?.eslint,
          prettier: deepwikiResults.toolResults?.codeQuality?.prettier,
          sonarjs: deepwikiResults.toolResults?.codeQuality?.sonarjs
        }
      },
      architecture: {
        ...context,
        deepwikiAnalysis: this.extractArchitectureInsights(deepwikiResults),
        toolResults: {
          madge: deepwikiResults.toolResults?.architecture?.madge,
          dependencyCruiser: deepwikiResults.toolResults?.architecture?.dependencyCruiser
        }
      },
      performance: {
        ...context,
        deepwikiAnalysis: this.extractPerformanceInsights(deepwikiResults),
        toolResults: {
          bundlephobia: deepwikiResults.toolResults?.performance?.bundlephobia
        }
      },
      dependency: {
        ...context,
        deepwikiAnalysis: this.extractDependencyInsights(deepwikiResults),
        toolResults: {
          npmOutdated: deepwikiResults.toolResults?.dependency?.npmOutdated,
          licenseChecker: deepwikiResults.toolResults?.security?.licenseChecker
        }
      }
    };
  }
}
```

### 4. Orchestrator Integration

```typescript
// apps/api/src/services/enhanced-orchestrator.ts

export class EnhancedOrchestrator {
  /**
   * Orchestrate enhanced analysis with tools
   */
  async analyzePR(prUrl: string, options: OrchestratorOptions): Promise<AnalysisResult> {
    // Step 1: Extract repository URL from PR
    const repoUrl = this.extractRepoUrl(prUrl);
    
    // Step 2: Check Vector DB for existing analysis
    const existingAnalysis = await this.checkVectorDB(repoUrl);
    
    if (existingAnalysis && !this.isStale(existingAnalysis)) {
      return this.enhanceWithPRContext(existingAnalysis, prUrl);
    }
    
    // Step 3: Trigger enhanced DeepWiki analysis with tools
    const enhancedOptions: EnhancedDeepWikiOptions = {
      repositoryUrl: repoUrl,
      tools: this.selectToolsBasedOnPR(prUrl),
      execution: {
        parallel: true,
        maxConcurrent: 5,
        timeout: 600 // 10 minutes
      }
    };
    
    const deepwikiResults = await this.deepwikiService.analyzeRepositoryEnhanced(
      enhancedOptions
    );
    
    // Step 4: Store in Vector DB
    await this.storeInVectorDB(deepwikiResults);
    
    // Step 5: Run agents with enhanced context
    const agentResults = await this.multiAgentExecutor.executeWithTools(
      this.createContext(prUrl),
      deepwikiResults
    );
    
    // Step 6: Generate final report
    return this.generateReport(agentResults, prUrl);
  }
  
  /**
   * Select tools based on PR characteristics
   */
  private selectToolsBasedOnPR(prUrl: string): EnhancedDeepWikiOptions['tools'] {
    const prFiles = this.analyzePRFiles(prUrl);
    
    return {
      security: {
        // Always run security tools for package.json changes
        npmAudit: prFiles.some(f => f.includes('package.json')),
        licenseChecker: prFiles.some(f => f.includes('package.json'))
      },
      architecture: {
        // Run architecture tools for significant code changes
        madge: prFiles.filter(f => f.endsWith('.js') || f.endsWith('.ts')).length > 5,
        dependencyCruiser: prFiles.some(f => f.includes('src/'))
      },
      codeQuality: {
        // Run quality tools on changed code files
        eslint: prFiles.some(f => f.endsWith('.js') || f.endsWith('.ts')),
        prettier: true, // Always check formatting
        sonarjs: prFiles.filter(f => f.endsWith('.js') || f.endsWith('.ts')).length > 3
      },
      performance: {
        // Check bundle size for dependency changes
        bundlephobia: prFiles.some(f => f.includes('package.json'))
      },
      dependency: {
        // Check for outdated packages periodically
        npmOutdated: prFiles.some(f => f.includes('package.json'))
      }
    };
  }
}
```

### 5. Vector DB Storage Enhancement

```typescript
// packages/agents/src/vector-storage-enhanced.ts

export interface EnhancedAnalysisChunk {
  repository_id: string;
  content: string;
  embedding?: number[];
  metadata: {
    content_type: 'deepwiki_analysis' | 'tool_result' | 'agent_insight';
    section?: string;
    tool?: string;
    agent?: string;
    severity?: string;
    score?: number;
    timestamp: Date;
  };
  storage_type: 'permanent' | 'cached';
}

export class EnhancedVectorStorage {
  /**
   * Store enhanced analysis with tool results
   */
  async storeEnhancedAnalysis(
    repositoryId: string,
    deepwikiAnalysis: DeepWikiAnalysisResult,
    toolResults: EnhancedAnalysisResult['toolResults']
  ): Promise<void> {
    const chunks: EnhancedAnalysisChunk[] = [];
    
    // Store DeepWiki analysis
    chunks.push({
      repository_id: repositoryId,
      content: JSON.stringify(deepwikiAnalysis),
      metadata: {
        content_type: 'deepwiki_analysis',
        timestamp: new Date()
      },
      storage_type: 'permanent'
    });
    
    // Store tool results
    if (toolResults) {
      for (const [category, tools] of Object.entries(toolResults)) {
        for (const [toolName, result] of Object.entries(tools)) {
          if (result) {
            chunks.push({
              repository_id: repositoryId,
              content: JSON.stringify(result),
              metadata: {
                content_type: 'tool_result',
                tool: toolName,
                section: category,
                severity: this.getHighestSeverity(result),
                score: result.metrics?.score,
                timestamp: new Date()
              },
              storage_type: 'permanent'
            });
          }
        }
      }
    }
    
    // Generate embeddings and store
    await this.vectorDB.storeChunks(chunks);
  }
}
```

## Benefits of This Approach

1. **No Duplicate Repository Cloning**
   - DeepWiki clones once, tools reuse the same repository
   - Significant time and resource savings

2. **Parallel Execution**
   - All tools run concurrently
   - Total time ≈ max(tool execution times) instead of sum

3. **Enhanced Agent Context**
   - Agents receive both high-level insights (DeepWiki) and specific findings (tools)
   - Better decision making with comprehensive data

4. **Flexible Tool Selection**
   - Tools selected based on PR characteristics
   - Avoid running unnecessary tools

5. **Unified Storage**
   - All results stored in Vector DB
   - Easy retrieval for future PRs

## Performance Estimates

```
Traditional Approach:
- Clone repository: 30s
- DeepWiki analysis: 45s
- Clone again for tools: 30s
- Run tools sequentially: 60s
Total: ~165s (2.75 minutes)

Enhanced Approach:
- Clone + DeepWiki: 75s
- Run tools in parallel: 20s (max)
Total: ~95s (1.6 minutes)

Savings: ~70s (42% faster)
```

## Next Steps

1. **Implement Enhanced DeepWiki Service**
   - Add tool execution capability to DeepWiki pod
   - Create tool command builders

2. **Update Agent Interfaces**
   - Add tool result handling to agents
   - Enhance prompt templates to utilize tool findings

3. **Test Integration**
   - Verify tool execution in DeepWiki environment
   - Measure actual performance improvements

4. **Deploy and Monitor**
   - Roll out to production
   - Monitor resource usage and timing

This design maintains the elegance of your multi-agent framework while adding powerful tool-based insights exactly where they're needed!
