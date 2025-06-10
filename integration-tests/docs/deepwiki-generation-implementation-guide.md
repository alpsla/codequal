# DeepWiki Generation Flow - Implementation Guide

## Current State vs Complete Implementation

### ✅ What We Have:
1. Tests that check if DeepWiki report exists in Vector DB
2. Tests that use existing DeepWiki reports
3. Tests that create request structures
4. Tests for context distribution to agents

### ❌ What's Missing:
1. **DeepWiki API Integration**
2. **Actual Report Generation** 
3. **Asynchronous Processing**
4. **Error Recovery**

## Complete Flow Implementation

### 1. DeepWiki Manager Service
```typescript
class DeepWikiManager {
  async getOrGenerateReport(repositoryUrl: string): Promise<DeepWikiReport> {
    // Step 1: Check cache
    const cached = await this.getCachedReport(repositoryUrl);
    if (cached && this.isCacheValid(cached)) {
      return cached;
    }

    // Step 2: Generate new report
    const request = this.buildRequest(repositoryUrl);
    const response = await this.callDeepWikiAPI(request);
    
    // Step 3: Process and store
    const report = this.processResponse(response);
    await this.storeReport(report);
    
    return report;
  }
}
```

### 2. Orchestrator Integration
```typescript
class ToolEnhancedOrchestrator {
  async analyzePR(prUrl: string) {
    // Extract repository URL
    const repoUrl = this.extractRepoUrl(prUrl);
    
    // Get or generate DeepWiki report
    const deepWikiReport = await this.deepWikiManager.getOrGenerateReport(repoUrl);
    
    // Extract contexts for each agent
    const agentContexts = this.extractAgentContexts(deepWikiReport);
    
    // Run agents with contexts
    const results = await this.runAgents(prData, agentContexts);
    
    return this.generateFinalReport(results, deepWikiReport);
  }
}
```

### 3. DeepWiki API Call Flow

#### Request Structure:
```typescript
interface DeepWikiRequest {
  repositoryUrl: string;
  analysisType: 'comprehensive' | 'focused' | 'quick';
  requestedSections: [
    'architecture',    // Code structure, patterns, design
    'security',        // Vulnerabilities, best practices
    'codeQuality',     // Testing, linting, maintainability
    'performance',     // Speed, optimization, bottlenecks
    'dependencies'     // Package health, vulnerabilities
  ];
  includeAgentContexts: boolean;  // Generate role-specific guidance
  contextDepth: 'detailed' | 'summary';
  priority: 'high' | 'medium' | 'low';
}
```

#### Response Processing:
```typescript
async processDeepWikiResponse(response: any): Promise<DeepWikiReport> {
  return {
    repositoryUrl: response.repository,
    summary: response.executiveSummary,
    overallScore: response.score,
    sections: this.processSections(response.sections),
    agentContexts: this.generateAgentContexts(response),
    metadata: {
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      version: response.version
    }
  };
}
```

### 4. Error Handling & Fallbacks

```typescript
async getDeepWikiReportWithFallback(repoUrl: string) {
  try {
    // Try to get/generate report
    return await this.deepWikiManager.getOrGenerateReport(repoUrl);
  } catch (error) {
    console.error('DeepWiki generation failed:', error);
    
    // Fallback strategies:
    // 1. Use partial cache if available
    const partial = await this.getPartialCache(repoUrl);
    if (partial) return partial;
    
    // 2. Use similar repository analysis
    const similar = await this.findSimilarRepository(repoUrl);
    if (similar) return this.adaptReport(similar, repoUrl);
    
    // 3. Return minimal context
    return this.getMinimalContext(repoUrl);
  }
}
```

### 5. Asynchronous Generation

For large repositories or when DeepWiki is slow:

```typescript
async initiateAsyncGeneration(repoUrl: string): Promise<{jobId: string}> {
  // Start generation job
  const jobId = await this.deepWikiAPI.startAnalysis({
    repositoryUrl: repoUrl,
    webhook: `${this.baseUrl}/deepwiki/callback`
  });
  
  // Store job status
  await this.storeJobStatus(jobId, 'pending');
  
  // Return immediately
  return { jobId };
}

async checkGenerationStatus(jobId: string) {
  const status = await this.deepWikiAPI.getJobStatus(jobId);
  
  if (status.completed) {
    const report = await this.deepWikiAPI.getReport(jobId);
    await this.storeReport(report);
    return { status: 'completed', report };
  }
  
  return { status: status.status, progress: status.progress };
}
```

## Test Coverage Needed

### 1. Happy Path Tests
- ✅ Report exists and is valid → Use cache
- ❌ Report doesn't exist → Generate new
- ❌ Report expired → Regenerate

### 2. Error Scenarios
- ❌ DeepWiki API timeout
- ❌ DeepWiki API error (4xx, 5xx)
- ❌ Invalid repository URL
- ❌ Rate limiting

### 3. Performance Tests
- ❌ Async generation for large repos
- ❌ Parallel requests handling
- ❌ Cache performance

### 4. Integration Tests
- ✅ Context distribution to agents
- ❌ Full orchestrator flow with generation
- ❌ Webhook callback handling

## Implementation Priority

1. **Phase 1**: Basic synchronous generation
   - DeepWikiManager service
   - Simple API integration
   - Basic error handling

2. **Phase 2**: Caching and optimization
   - Cache validity checks
   - Partial cache usage
   - Similar repo fallback

3. **Phase 3**: Async and scaling
   - Job queue for large repos
   - Webhook callbacks
   - Progress tracking

4. **Phase 4**: Advanced features
   - Incremental updates
   - Diff-based analysis
   - Multi-repo patterns

## Key Files to Implement

1. `/packages/core/src/services/deepwiki-manager.ts`
2. `/packages/core/src/services/deepwiki-api-client.ts`
3. `/packages/mcp-hybrid/src/integration/deepwiki-orchestrator.ts`
4. `/apps/api/src/routes/deepwiki-webhook.ts`

## Environment Variables Needed

```env
DEEPWIKI_API_URL=https://api.deepwiki.com
DEEPWIKI_API_KEY=your-api-key
DEEPWIKI_WEBHOOK_SECRET=webhook-secret
DEEPWIKI_TIMEOUT_MS=30000
DEEPWIKI_MAX_RETRIES=3
```

## Summary

The current tests simulate the DeepWiki generation by creating mock request structures, but don't actually:
1. Call the DeepWiki API
2. Wait for analysis completion
3. Process the real response
4. Handle errors and retries

The `deepwiki-generation-flow.test.ts` file I created shows how the complete flow should work, including all the missing pieces.
