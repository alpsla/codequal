# DeepWiki Enhancement Implementation Plan

## Priority 1: Test DeepWiki Context Mechanism (Critical)

### Objective
Understand how DeepWiki's chat API manages repository context to determine integration approach.

### Implementation Steps

1. **Create Testing Script** (`test-deepwiki-context-mechanism.ts`)
   - Test immediate chat after analysis
   - Test with time delays (1min, 5min, 30min, 1hr)
   - Test with unanalyzed repositories
   - Record all responses and error patterns

2. **Context Persistence Testing**
   - Check if context expires
   - Test context refresh mechanisms
   - Identify context availability indicators

3. **Custom Context Testing**
   - Test if we can provide our own context
   - Test supplementing native context
   - Check for context source parameters

### Success Criteria
- Clear understanding of context lifetime
- Documentation of context management API
- Identification of integration points

## Priority 2: Implement Enhanced Prompts with JSON Forcing (High)

### Current Issue
DeepWiki returns generic architectural recommendations instead of specific code issues with file locations.

### Solution
Add `response_format: { type: "json_object" }` parameter and use structured prompts.

### Implementation Steps

1. **Update DeepWikiRepositoryAnalyzer**
   ```typescript
   // In callDeepWikiAPI method
   {
     repo_url: repositoryUrl,
     messages: [{
       role: 'user',
       content: STRUCTURED_PROMPT
     }],
     stream: false,
     provider: 'openrouter',
     model: 'openai/gpt-4o',
     temperature: 0.1,
     max_tokens: 4000,
     response_format: { type: "json_object" } // ADD THIS
   }
   ```

2. **Create Structured Prompts**
   ```typescript
   const STRUCTURED_PROMPT = `
   Analyze this repository and return a JSON object with the following structure:
   {
     "issues": [
       {
         "id": "unique-id",
         "severity": "critical|high|medium|low",
         "category": "security|performance|code-quality",
         "title": "Short title",
         "description": "Detailed description",
         "location": {
           "file": "exact/path/to/file.ts",
           "line": 123,
           "column": 45
         },
         "codeSnippet": "problematic code",
         "recommendation": "How to fix"
       }
     ],
     "scores": {
       "overall": 85,
       "security": 90,
       "performance": 80,
       "maintainability": 85
     }
   }
   
   Focus on finding actual code issues with specific file locations.
   `;
   ```

### Files to Modify
- `/packages/agents/src/standard/services/deepwiki-repository-analyzer.ts`
- `/packages/agents/src/standard/services/deepwiki-service.ts`

## Priority 3: Integrate Model Selection Service (High)

### Current Issue
DeepWiki calls are hardcoded to use 'openrouter' and 'openai/gpt-4o', not leveraging the sophisticated RepositoryModelSelectionService.

### Solution
Inject and use RepositoryModelSelectionService for dynamic model selection.

### Implementation Steps

1. **Update DeepWikiRepositoryAnalyzer Constructor**
   ```typescript
   constructor(
     private modelSelector?: RepositoryModelSelectionService
   ) {
     // ... existing initialization
   }
   ```

2. **Implement Dynamic Model Selection**
   ```typescript
   private async selectModelForRepository(
     repositoryUrl: string
   ): Promise<{ provider: string; model: string }> {
     if (!this.modelSelector) {
       return { provider: 'openrouter', model: 'openai/gpt-4o' };
     }
     
     const repoContext = await this.getRepositoryContext(repositoryUrl);
     const config = this.modelSelector.getModelForRepository(
       repoContext,
       AnalysisTier.COMPREHENSIVE
     );
     
     return {
       provider: config.provider,
       model: config.model
     };
   }
   ```

3. **Update API Calls**
   ```typescript
   const modelConfig = await this.selectModelForRepository(repositoryUrl);
   
   const response = await axios.post(
     `${this.deepwikiUrl}/chat/completions/stream`,
     {
       // ... other params
       provider: modelConfig.provider,
       model: modelConfig.model,
       // ... rest
     }
   );
   ```

### Files to Modify
- `/packages/agents/src/standard/services/deepwiki-repository-analyzer.ts`
- `/packages/core/src/services/model-selection/RepositoryModelSelectionService.ts`

## Priority 4: Implement Two-Pass Analysis (Medium)

### Rationale
When initial response lacks specific locations, follow up with targeted questions.

### Implementation Steps

1. **Create Follow-up Query Logic**
   ```typescript
   private async enhanceWithSecondPass(
     initialIssues: CodeIssue[],
     repositoryUrl: string
   ): Promise<CodeIssue[]> {
     const issuesNeedingLocation = initialIssues.filter(
       issue => !issue.location || issue.location.file === 'unknown'
     );
     
     if (issuesNeedingLocation.length === 0) {
       return initialIssues;
     }
     
     // Query for specific locations
     const locationQuery = `
       For the following issues, provide specific file paths and line numbers:
       ${issuesNeedingLocation.map(i => `- ${i.title}: ${i.description}`).join('\n')}
     `;
     
     const locationResponse = await this.callDeepWikiAPI(
       repositoryUrl,
       locationQuery
     );
     
     // Merge location data
     return this.mergeLocationData(initialIssues, locationResponse);
   }
   ```

2. **Integrate into Main Analysis Flow**
   ```typescript
   const initialResult = await this.callDeepWikiAPI(repositoryUrl, branch);
   const enhancedResult = await this.enhanceWithSecondPass(
     initialResult.issues,
     repositoryUrl
   );
   ```

### Files to Modify
- `/packages/agents/src/standard/services/deepwiki-repository-analyzer.ts`

## Priority 5: Build Context Manager Service (Medium)

### Based on Production Model
Reference: `/docs/research/deepwiki-chat-production-model.md`

### Implementation Steps

1. **Create ContextManagerService**
   ```typescript
   export class DeepWikiContextManager {
     async checkContextAvailable(repositoryUrl: string): Promise<boolean>;
     async createContext(repositoryUrl: string): Promise<void>;
     async refreshContext(repositoryUrl: string): Promise<void>;
     async getContextMetadata(repositoryUrl: string): Promise<ContextMetadata>;
   }
   ```

2. **Implement Context Registry**
   - Track which repositories have active context
   - Monitor context expiration
   - Handle context refresh

3. **Integrate with Vector Database**
   - Store analysis results for long-term retrieval
   - Convert vector data to DeepWiki context format
   - Support incremental updates

### Files to Create
- `/packages/agents/src/standard/services/deepwiki-context-manager.ts`
- `/packages/agents/src/standard/services/vector-retrieval-service.ts`

## Testing Strategy

### Unit Tests
- Test each enhancement in isolation
- Mock DeepWiki API responses
- Validate response parsing

### Integration Tests
- Test full flow with real DeepWiki instance
- Validate model selection integration
- Test context persistence

### Regression Tests
- Ensure existing functionality remains intact
- Compare results before/after enhancements
- Track performance metrics

## Rollout Plan

### Phase 1 (Immediate)
- Complete context mechanism testing
- Implement JSON forcing
- Deploy to staging

### Phase 2 (Next Session)
- Integrate model selection
- Implement two-pass analysis
- Performance testing

### Phase 3 (Future)
- Build context manager
- Vector database integration
- Production deployment

## Success Metrics

1. **Location Accuracy**
   - Target: 95% of issues have specific file locations
   - Current: ~20% have locations

2. **Issue Detection**
   - Target: Capture all 13+ issues DeepWiki finds
   - Current: Only showing 1-3 issues

3. **Performance**
   - Target: < 30s for small repos, < 2min for large repos
   - Current: Variable based on API response

4. **Model Optimization**
   - Target: Dynamic selection based on repo characteristics
   - Current: Hardcoded model selection

## Risk Mitigation

1. **API Changes**
   - Monitor DeepWiki API for breaking changes
   - Maintain fallback mechanisms
   - Version lock critical dependencies

2. **Performance Degradation**
   - Implement caching at multiple levels
   - Use Redis for hot data
   - Batch API requests where possible

3. **Context Expiration**
   - Proactive context refresh
   - Fallback to re-analysis
   - User notification of delays

## Documentation Requirements

1. Update API documentation with new parameters
2. Create integration guide for context manager
3. Document model selection criteria
4. Provide troubleshooting guide

## Timeline

- **Session 1 (Completed)**: Module reorganization, basic enhancements
- **Session 2**: Test with real DeepWiki, debug issue detection
- **Session 3**: Implement two-pass analysis and model selection
- **Session 4**: Context manager and production deployment

## Implementation Status

### ✅ Completed (Session 1)
- Module structure created
- Services reorganized
- Basic prompt enhancements
- Response format parameter added

### 🔄 In Progress
- Testing with real DeepWiki
- Debugging issue count
- Location detection improvements

### 📋 Pending
- Two-pass analysis
- Model selection integration
- Context manager implementation
- Vector database integration