# Analysis Workflows

**Last Updated: May 11, 2025**

## Analysis Flow with Optional Components

The CodeQual analysis flow incorporates optional context components:

```
PR Request → Optional Contexts: { 
    RAG Context (from existing repo analysis)
    + 
    Optional DeepWiki Analysis (on-demand)
} → Multi-Agent Orchestrator
    ↓
Agents with Context → {
    Security Analysis
    Code Quality
    Performance Review  
    Educational Content
} → Combined Report
```

The flexibility of this flow allows for:
- Just RAG context (fastest)
- Just DeepWiki analysis (if no cache available)
- Both together (most comprehensive)
- Neither (basic PR analysis only)

## Quick Analysis Workflow

The Quick Analysis workflow optimizes for speed and focuses on the most critical issues in a pull request.

### Process Flow

1. **Request**: User requests quick analysis of a PR
2. **PR Context**: System extracts basic PR metadata and changed files
3. **Optional Context**: System can retrieve RAG context from cached analysis
4. **Role Determination**: Orchestrator determines minimal required roles
5. **Agent Selection**: Evaluation system selects optimal agents for each role
6. **Configuration**: Multi-Agent Factory creates configurations optimized for speed
7. **Prompt Generation**: Dynamic prompts are created with quick mode instructions
8. **Execution**: Agents are executed with priority on speed
9. **Orchestration**: Results are combined and prioritized by importance
10. **Reporting**: Focused report is generated highlighting critical issues
11. **Feedback Collection**: User feedback is collected for future optimization

### Implementation Details

```typescript
async function performQuickAnalysis(
  prId: string,
  repositoryUrl: string,
  options: QuickAnalysisOptions
): Promise<AnalysisResult> {
  // 1. Extract PR context
  const prContext = await this.repositoryProvider.getPRContext(prId, repositoryUrl);
  
  // 2. Optional: Get cached analysis context
  let ragContext = null;
  if (options.useCache) {
    ragContext = await this.cacheManager.getRepositoryContext(repositoryUrl);
  }
  
  // 3. Determine roles needed for this PR
  const roles = this.orchestrator.determineRequiredRoles(
    ragContext, // May be null
    prContext,
    AnalysisMode.QUICK
  );
  
  // 4. Select optimal agents
  const agentConfigurations = await this.agentEvaluator.selectAgentsForRoles(
    roles,
    prContext.language,
    prContext.fileTypes
  );
  
  // 5. Create optimized agent configurations
  const agentSetup = this.agentFactory.createAgentConfigurations({
    mode: AnalysisMode.QUICK,
    agents: agentConfigurations,
    fallbackEnabled: true,
    fallbackTimeout: 30000, // 30 seconds for quick mode
    combineResults: true
  });
  
  // 6. Generate prompts
  const promptedAgents = await this.promptGenerator.generatePrompts(
    agentSetup, 
    prContext,
    ragContext
  );
  
  // 7. Execute analysis (with priority on speed)
  const results = await this.agentExecutor.executeWithSpeedPriority(promptedAgents);
  
  // 8. Orchestrate results
  const combinedResults = this.resultOrchestrator.combineResults(results, {
    prioritizeHighSeverity: true,
    maxInsightsPerCategory: 5, // Limit to top 5 issues per category for quick mode
    deduplicateAggressively: true
  });
  
  // 9. Generate report
  return this.reportingAgent.generateReport(combinedResults, ReportFormat.QUICK);
}
```

### Optimizations for Speed

- Limited scope focused on changed files only
- Reduced number of agents (only critical roles)
- Smaller token limits for responses
- Parallel execution when possible
- Early termination for low-value analyses
- Prioritization of high-severity issues
- Limited educational content

## Comprehensive Analysis Workflow

The Comprehensive Analysis workflow provides deep insights into both the pull request and its interaction with the broader codebase.

### Process Flow

1. **Request**: User requests comprehensive analysis of a PR
2. **Cache Check**: System checks for recent repository analysis
3. **Repository Analysis**: If needed, DeepWiki analyzes full repository
4. **PR Context**: System extracts detailed PR metadata and changed files
5. **Combined Context**: Repository and PR contexts are combined
6. **Role Determination**: Orchestrator determines all relevant roles
7. **Agent Selection**: Evaluation system selects optimal agents for each role
8. **Configuration**: Multi-Agent Factory creates configurations for depth
9. **Prompt Generation**: Dynamic prompts with comprehensive mode instructions
10. **Execution**: Agents are executed with focus on thoroughness
11. **Orchestration**: Results are combined, categorized, and contextualized
12. **Reporting**: Detailed report is generated with architectural insights
13. **Feedback Collection**: User feedback is collected for future optimization

### Implementation Details

```typescript
async function performComprehensiveAnalysis(
  prId: string,
  repositoryUrl: string,
  options: ComprehensiveAnalysisOptions
): Promise<AnalysisResult> {
  // 1. Extract PR context
  const prContext = await this.repositoryProvider.getDetailedPRContext(prId, repositoryUrl);
  
  // 2. Check for cached repository analysis
  let repoContext = await this.cacheManager.getRepositoryContext(repositoryUrl);
  const needsRepoAnalysis = !repoContext || 
                          this.isContextStale(repoContext, options.maxContextAge) ||
                          options.forceRefresh;
  
  // 3. Perform repository analysis if needed
  if (needsRepoAnalysis) {
    // Show status update to user
    this.notificationManager.updateStatus({
      prId,
      status: 'Analyzing repository context...',
      progress: 10
    });
    
    // Perform deep repository analysis
    repoContext = await this.deepWikiIntegration.analyzeRepository(
      repositoryUrl,
      options.deepWikiOptions
    );
    
    // Cache the results
    await this.cacheManager.storeRepositoryContext(
      repositoryUrl,
      repoContext,
      options.cacheOptions
    );
  }
  
  // 4. Combine contexts
  const combinedContext = this.contextCombiner.combine(repoContext, prContext);
  
  // 5. Determine all relevant roles
  const roles = this.orchestrator.determineRequiredRoles(
    repoContext,
    prContext,
    AnalysisMode.COMPREHENSIVE
  );
  
  // 6. Select optimal agents for all roles
  const agentConfigurations = await this.agentEvaluator.selectAgentsForRoles(
    roles,
    prContext.language,
    prContext.fileTypes,
    { prioritizeAccuracy: true }
  );
  
  // 7. Create comprehensive agent configurations
  const agentSetup = this.agentFactory.createAgentConfigurations({
    mode: AnalysisMode.COMPREHENSIVE,
    agents: agentConfigurations,
    fallbackEnabled: true,
    fallbackTimeout: 60000, // 60 seconds for comprehensive mode
    combineResults: true,
    maxConcurrentAgents: options.maxConcurrentAgents || 3
  });
  
  // 8. Generate detailed prompts
  const promptedAgents = await this.promptGenerator.generatePrompts(
    agentSetup, 
    prContext,
    repoContext,
    { includeArchitecturalContext: true }
  );
  
  // 9. Execute comprehensive analysis
  const results = await this.agentExecutor.executeWithThoroughnessPriority(promptedAgents);
  
  // 10. Orchestrate detailed results
  const combinedResults = this.resultOrchestrator.combineResults(results, {
    prioritizeHighSeverity: true,
    includeAllSeverities: true,
    deduplicateSelectively: true,
    categorizeByImpact: true,
    includeArchitecturalInsights: true
  });
  
  // 11. Generate comprehensive report
  return this.reportingAgent.generateReport(
    combinedResults, 
    options.reportFormat || ReportFormat.COMPREHENSIVE
  );
}
```

### Repository Context Caching

```typescript
class RepositoryCacheManager {
  async getRepositoryContext(repositoryUrl: string): Promise<RepositoryContext | null> {
    const { data, error } = await this.supabaseClient
      .from('repository_analysis')
      .select('*')
      .eq('repository_url', repositoryUrl)
      .single();
      
    if (error || !data) {
      return null;
    }
    
    // Check if context is still valid
    if (new Date(data.expires_at) < new Date()) {
      return null; // Expired cache
    }
    
    return data.analysis_data;
  }
  
  async storeRepositoryContext(
    repositoryUrl: string,
    context: RepositoryContext,
    options: CacheOptions = {}
  ): Promise<void> {
    // Calculate expiration based on repository update frequency
    const repoSettings = await this.getRepositorySettings(repositoryUrl);
    const expiresAt = this.calculateExpirationDate(repoSettings);
    
    const { error } = await this.supabaseClient
      .from('repository_analysis')
      .upsert({
        repository_url: repositoryUrl,
        analysis_data: context,
        cached_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString()
      });
      
    if (error) {
      console.error('Failed to cache repository context:', error);
      throw new Error('Failed to cache repository context');
    }
  }
  
  private calculateExpirationDate(repoSettings: RepositorySettings): Date {
    // Base expiration on repository update frequency plus a buffer
    const baseRetention = repoSettings.autoAnalysisFrequency || '7 days';
    const bufferDays = 1;
    
    // Parse days from string like "7 days"
    const days = parseInt(baseRetention.split(' ')[0]) + bufferDays;
    
    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);
    
    return expiresAt;
  }
}
```

## Custom Analysis Workflows

The system supports custom analysis workflows for specific needs.

### Security-Focused Workflow

```typescript
async function performSecurityFocusedAnalysis(
  prId: string,
  repositoryUrl: string
): Promise<AnalysisResult> {
  // Start with comprehensive analysis base
  const baseSetup = await this.setupComprehensiveAnalysis(prId, repositoryUrl);
  
  // Override to prioritize security roles
  const securityRoles = [
    AgentRole.SECURITY,
    AgentRole.CODE_QUALITY, // Still need basic quality
    AgentRole.PERFORMANCE // Critical for security implications
  ];
  
  // Select specialized security agents
  const securityAgents = await this.agentEvaluator.selectSpecializedAgentsForRoles(
    securityRoles,
    baseSetup.prContext.language,
    { securitySpecialization: true }
  );
  
  // Custom security-focused execution
  const results = await this.executeSecurityAnalysis(
    securityAgents,
    baseSetup.combinedContext
  );
  
  // Generate security-focused report
  return this.reportingAgent.generateReport(
    results,
    ReportFormat.SECURITY_FOCUSED
  );
}
```

### Educational Workflow

```typescript
async function performEducationalAnalysis(
  prId: string,
  repositoryUrl: string,
  developerProfile: DeveloperProfile
): Promise<AnalysisResult> {
  // Start with quick analysis for speed
  const baseSetup = await this.setupQuickAnalysis(prId, repositoryUrl);
  
  // Add educational agents
  const educationalAgents = await this.agentEvaluator.selectAgentsForRoles(
    [AgentRole.EDUCATIONAL],
    baseSetup.prContext.language,
    { developerSkillLevel: developerProfile.skillLevel }
  );
  
  // Combine with basic analysis
  const combinedAgents = [...baseSetup.agents, ...educationalAgents];
  
  // Execute with educational focus
  const results = await this.agentExecutor.executeWithEducationalFocus(
    combinedAgents,
    baseSetup.combinedContext,
    developerProfile
  );
  
  // Generate educational report
  return this.reportingAgent.generateReport(
    results,
    ReportFormat.EDUCATIONAL
  );
}
```

## Integration with Git Providers

The analysis workflows integrate with various Git providers to access repositories and pull requests.

### GitHub Integration

```typescript
class GitHubIntegration implements RepositoryProvider {
  constructor(
    private gitHubClient: Octokit,
    private options: GitHubIntegrationOptions
  ) {}
  
  async getPRContext(prId: string, repositoryUrl: string): Promise<PRContext> {
    // Parse repository owner and name from URL
    const { owner, repo } = this.parseRepositoryUrl(repositoryUrl);
    
    // Fetch PR data
    const { data: pr } = await this.gitHubClient.pulls.get({
      owner,
      repo,
      pull_number: parseInt(prId)
    });
    
    // Fetch PR files
    const { data: files } = await this.gitHubClient.pulls.listFiles({
      owner,
      repo,
      pull_number: parseInt(prId)
    });
    
    // Create PR context
    return {
      id: prId,
      title: pr.title,
      description: pr.body || '',
      author: pr.user.login,
      branch: pr.head.ref,
      baseBranch: pr.base.ref,
      state: pr.state,
      changedFiles: files.map(file => ({
        path: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        changes: file.changes,
        patchUrl: file.raw_url
      })),
      createdAt: pr.created_at,
      updatedAt: pr.updated_at
    };
  }
  
  async getDetailedPRContext(prId: string, repositoryUrl: string): Promise<DetailedPRContext> {
    // Get basic PR context
    const prContext = await this.getPRContext(prId, repositoryUrl);
    
    // Parse repository owner and name
    const { owner, repo } = this.parseRepositoryUrl(repositoryUrl);
    
    // Get PR commits
    const { data: commits } = await this.gitHubClient.pulls.listCommits({
      owner,
      repo,
      pull_number: parseInt(prId)
    });
    
    // Get PR comments
    const { data: comments } = await this.gitHubClient.pulls.listComments({
      owner,
      repo,
      pull_number: parseInt(prId)
    });
    
    // Get PR reviews
    const { data: reviews } = await this.gitHubClient.pulls.listReviews({
      owner,
      repo,
      pull_number: parseInt(prId)
    });
    
    // Fetch file contents
    const fileContents = await Promise.all(
      prContext.changedFiles.map(async file => {
        if (file.status === 'removed') {
          return null; // Skip deleted files
        }
        
        try {
          const { data } = await this.gitHubClient.repos.getContent({
            owner,
            repo,
            path: file.path,
            ref: prContext.branch
          });
          
          return {
            path: file.path,
            content: Buffer.from(data.content, 'base64').toString('utf-8'),
            status: file.status
          };
        } catch (error) {
          console.error(`Failed to fetch content for ${file.path}:`, error);
          return null;
        }
      })
    );
    
    // Create detailed context
    return {
      ...prContext,
      commits: commits.map(commit => ({
        sha: commit.sha,
        message: commit.commit.message,
        author: commit.author?.login || commit.commit.author.name,
        date: commit.commit.author.date
      })),
      comments: comments.map(comment => ({
        id: comment.id.toString(),
        body: comment.body,
        path: comment.path,
        position: comment.position,
        author: comment.user.login,
        createdAt: comment.created_at
      })),
      reviews: reviews.map(review => ({
        id: review.id.toString(),
        state: review.state,
        body: review.body || '',
        author: review.user.login,
        createdAt: review.submitted_at || review.created_at
      })),
      fileContents: fileContents.filter(Boolean)
    };
  }
  
  private parseRepositoryUrl(url: string): { owner: string; repo: string } {
    // Handle GitHub URLs
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      throw new Error(`Invalid GitHub repository URL: ${url}`);
    }
    
    return {
      owner: match[1],
      repo: match[2].replace('.git', '')
    };
  }
}
```

## Performance Considerations

The system implements several optimizations to ensure efficient analysis:

### Parallel Processing

- Multiple agents run simultaneously when appropriate
- Independent analyses are parallelized
- Resource-intensive operations are optimized

### Caching Strategy

- Repository analysis results are cached
- Analysis results are stored for reuse
- Incremental updates reduce processing time

### Resource Management

- Token usage is optimized based on analysis importance
- Computation is allocated based on value
- Models are selected for efficiency in specific contexts

### Latency Optimization

- Quick analysis mode prioritizes speed
- Timeout mechanisms prevent slow analyses
- Progress reporting provides feedback during long-running operations

## User Experience Workflow

The system provides a smooth user experience with clear feedback:

### Analysis Initiation

- User selects analysis mode (quick or comprehensive)
- System provides estimated completion time
- Analysis begins with clear status indicators

### Progress Tracking

- Real-time updates on analysis progress
- Stage completion notifications
- Estimated time remaining

### Results Presentation

- Clear summary of key findings
- Interactive exploration of detailed results
- Code snippets with highlighted issues
- Educational explanations and resources

### Feedback Collection

- User ratings on result quality
- Issue flagging for improvement
- Feature requests and suggestions
