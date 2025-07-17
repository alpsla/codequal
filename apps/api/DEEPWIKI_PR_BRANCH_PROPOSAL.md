# DeepWiki PR Branch Analysis Proposal

## Current Architecture Problem

```
Current Flow:
1. DeepWiki clones main branch
2. PR analysis needs feature branch
3. We fetch PR files separately OR apply patches
4. Potential inconsistency between DeepWiki analysis and MCP tools
```

## Proposed Solution: DeepWiki PR Branch Analysis

### Architecture Changes

```
Improved Flow:
1. PR request includes branch name
2. DeepWiki clones the PR branch directly
3. DeepWiki analyzes actual PR code
4. MCP tools use same PR branch files
5. Complete consistency across all components
```

### Implementation Approach

#### 1. Update DeepWiki API Request

```typescript
// Current
const deepWikiRequest = {
  repositoryUrl: "https://github.com/owner/repo",
  analysisType: "comprehensive"
};

// Proposed
const deepWikiRequest = {
  repositoryUrl: "https://github.com/owner/repo",
  branch: "feature/new-feature", // PR branch
  baseBranch: "main", // For comparison
  analysisType: "comprehensive",
  includeDiff: true // Generate diff analysis
};
```

#### 2. DeepWiki Service Updates

```typescript
class DeepWikiManager {
  async triggerRepositoryAnalysis(
    repositoryUrl: string,
    options?: {
      branch?: string;
      baseBranch?: string;
      includeDiff?: boolean;
    }
  ): Promise<string> {
    const request = {
      repositoryUrl,
      branch: options?.branch || 'main',
      baseBranch: options?.baseBranch || 'main',
      includeDiff: options?.includeDiff || false
    };
    
    // DeepWiki clones specified branch
    // Analyzes branch code
    // Optionally generates diff insights
    return jobId;
  }
}
```

#### 3. Enhanced DeepWiki Analysis

DeepWiki can provide:
1. **Branch-specific analysis** - Analyze PR branch code
2. **Diff insights** - What changed from base branch
3. **Impact analysis** - How changes affect overall quality
4. **Cached PR files** - Direct access to PR branch content

### Benefits

1. **Consistency**: All tools analyze same code version
2. **Accuracy**: DeepWiki insights match actual PR changes
3. **Performance**: No need for separate PR file fetching
4. **Completeness**: Full repository context with PR changes

### Implementation Steps

#### Step 1: Update Result Orchestrator

```typescript
// Extract PR branch info
const prBranch = prDetails.headBranch;
const baseBranch = prDetails.baseBranch;

// Trigger DeepWiki with PR branch
const jobId = await this.deepWikiManager.triggerRepositoryAnalysis(
  repositoryUrl,
  {
    branch: prBranch,
    baseBranch: baseBranch,
    includeDiff: true
  }
);
```

#### Step 2: Update DeepWiki Cache

```typescript
// Cache becomes branch-aware
private repositoryCache = new Map<string, {
  branch: string;
  files: any[];
  cachedAt: Date;
}>();

async getCachedRepositoryFiles(
  repositoryUrl: string,
  branch?: string
): Promise<any[]> {
  const cacheKey = `${repositoryUrl}:${branch || 'main'}`;
  const cached = this.repositoryCache.get(cacheKey);
  // Return branch-specific cached files
}
```

#### Step 3: MCP Tools Use PR Branch Files

```typescript
// No changes needed! Tools already use DeepWiki cache
// Now they automatically get PR branch files
const cachedFiles = await deepWikiManager.getCachedRepositoryFiles(
  repositoryUrl,
  prBranch
);
```

### Diff Integration

DeepWiki can provide rich diff analysis:

```typescript
interface DeepWikiDiffAnalysis {
  // File-level changes
  modifiedFiles: Array<{
    path: string;
    changeType: 'added' | 'modified' | 'deleted';
    impact: 'low' | 'medium' | 'high';
    riskFactors: string[];
  }>;
  
  // Code quality impact
  qualityImpact: {
    before: number;
    after: number;
    delta: number;
    improvements: string[];
    regressions: string[];
  };
  
  // Security impact
  securityImpact: {
    newVulnerabilities: any[];
    fixedVulnerabilities: any[];
    riskScore: number;
  };
}
```

### Fallback Strategy

```
1. Primary: DeepWiki with PR branch
2. Fallback 1: DeepWiki with main + GitHub diff
3. Fallback 2: Direct PR file fetch + patches
```

### Configuration

```typescript
// Environment variable to control behavior
DEEPWIKI_USE_PR_BRANCH=true // Enable PR branch analysis
DEEPWIKI_CACHE_PR_BRANCHES=true // Cache PR analyses
DEEPWIKI_PR_CACHE_TTL=3600 // 1 hour cache for PR branches
```

## Migration Path

### Phase 1: Optional PR Branch
- Add branch parameter to DeepWiki API
- Default to main branch for backward compatibility
- Test with select repositories

### Phase 2: PR Branch First
- Make PR branch primary strategy
- Fall back to main only if PR branch fails
- Monitor performance and accuracy

### Phase 3: Full Integration
- Always use PR branch for PR analysis
- Remove patch-based fallbacks
- Optimize caching strategy

## Summary

By having DeepWiki analyze the PR branch directly:
1. **Unified Analysis**: Everything analyzes same code
2. **Better Insights**: DeepWiki understands actual changes
3. **Simpler Architecture**: No complex patching logic
4. **Improved Accuracy**: Tools see real PR code
5. **Performance**: Single repository clone operation

This is the ideal architecture for PR analysis!