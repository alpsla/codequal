# Migration Guide: DeepWiki to Simplified Version

## Overview

We're migrating from the complex DeepWiki implementation (with repository storage) to a simplified version that only uses temporary storage during analysis.

## Key Changes

### 1. Import Changes

```typescript
// OLD
import { DeepWikiManager } from './deepwiki-manager';
const deepWikiManager = new DeepWikiManager(authenticatedUser);

// NEW
import { deepWikiManager } from './deepwiki-manager-simplified';
// It's now a singleton, no need to instantiate
```

### 2. Method Changes

The simplified version only has these methods:

```typescript
// Analyze a repository
async analyzeRepository(
  repositoryUrl: string,
  options?: { branch?: string; commit?: string; depth?: number }
): Promise<DeepWikiAnalysisResult>

// Analyze a pull request
async analyzePullRequest(
  repositoryUrl: string,
  prNumber: number,
  baseRef?: string
): Promise<DeepWikiAnalysisResult>

// Check disk usage (monitoring only)
async checkDiskUsage(): Promise<{ usedGB; availableGB; percentUsed }>

// Clean up orphaned temp directories
async cleanupTempDirectories(): Promise<number>
```

### 3. Removed Methods

These methods no longer exist in the simplified version:

- `checkRepositoryExists()` - We don't store repos
- `getCachedRepositoryFiles()` - No caching
- `triggerRepositoryAnalysis()` - Direct analysis only
- `waitForAnalysisCompletion()` - Analysis is synchronous
- `cleanupRepositories()` - Automatic cleanup

### 4. Updated Flow

#### OLD Flow:
```typescript
// Check if cached
const exists = await deepWikiManager.checkRepositoryExists(repoUrl);
if (!exists) {
  // Trigger analysis
  await deepWikiManager.triggerRepositoryAnalysis(repoUrl);
}
// Wait for completion
const results = await deepWikiManager.waitForAnalysisCompletion(repoUrl);
```

#### NEW Flow:
```typescript
// Just analyze - no caching, no waiting
const results = await deepWikiManager.analyzeRepository(repoUrl);
```

### 5. Result Orchestrator Updates

The `ResultOrchestrator` needs these changes:

```typescript
// Remove repository status check
// OLD
const status = await this.checkRepositoryStatus(repositoryUrl);
if (!status.exists) {
  await this.triggerAnalysis(repositoryUrl);
}

// NEW - Just analyze when needed
const results = await deepWikiManager.analyzeRepository(repositoryUrl);
```

### 6. Routes Updates

Remove these routes from `index.ts`:
```typescript
// Remove
app.use('/api/deepwiki/storage', authMiddleware, deepwikiStorageRoutes);
app.use('/api/database/storage', authMiddleware, databaseStorageRoutes);
app.use('/api/supabase/storage', authMiddleware, supabaseStorageRoutes);

// Keep only
app.use('/api/deepwiki/temp', authMiddleware, deepwikiTempStorageRoutes);
```

## Files to Remove

Run the cleanup script:
```bash
./scripts/cleanup-old-deepwiki-code.sh
```

This will remove:
- Old DeepWiki manager implementations
- Storage monitoring services
- Archive services
- Old routes
- Old tests

## Files to Keep

- `deepwiki-manager-simplified.ts` - Main implementation
- `deepwiki-temp-manager.ts` - Temp storage tracking
- `deepwiki-temp-storage.ts` - Monitoring routes
- `manage-deepwiki-temp-storage.sh` - Management script

## Testing After Migration

1. Test repository analysis:
```typescript
const result = await deepWikiManager.analyzeRepository(
  'https://github.com/user/repo'
);
```

2. Test PR analysis:
```typescript
const result = await deepWikiManager.analyzePullRequest(
  'https://github.com/user/repo',
  123
);
```

3. Monitor temp storage:
```bash
curl http://localhost:3001/api/deepwiki/temp/metrics
```

## Benefits

1. **Simpler**: No complex caching logic
2. **Cheaper**: 90% reduction in storage costs
3. **Fresher**: Always analyze latest code
4. **Faster**: No cache checks or updates
5. **Reliable**: No cache invalidation issues