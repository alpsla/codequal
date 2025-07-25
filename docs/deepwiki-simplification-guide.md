# DeepWiki Simplification Guide

## Overview

We're removing all repository storage from DeepWiki since repositories are already stored in GitHub/GitLab. This dramatically simplifies the architecture and reduces costs.

## What Changes

### Before (Complex)
```
User Request → Clone Repo → Store in PVC → Analyze → Keep for reuse → Cleanup later
```

### After (Simple)
```
User Request → Clone to /tmp → Analyze → Delete immediately → Return results
```

## Migration Steps

### 1. Update DeepWiki Manager

Replace the complex `deepwiki-manager.ts` with `deepwiki-manager-simplified.ts`:

```typescript
// Old approach - DON'T DO THIS
async analyzeRepository(repoUrl: string) {
  // Check if repo exists in storage
  const existingPath = await this.findRepository(repoUrl);
  if (existingPath) {
    return this.analyzeExisting(existingPath);
  }
  
  // Clone and store
  const storagePath = await this.cloneToStorage(repoUrl);
  const result = await this.analyze(storagePath);
  
  // Keep for later (BAD!)
  return result;
}

// New approach - DO THIS
async analyzeRepository(repoUrl: string) {
  const tempPath = `/tmp/analysis-${uuid()}`;
  
  try {
    await this.clone(repoUrl, tempPath);
    const result = await this.analyze(tempPath);
    return result;
  } finally {
    await this.cleanup(tempPath); // ALWAYS cleanup
  }
}
```

### 2. Update Kubernetes PVC

Reduce the PVC size since we only need space for temporary analysis:

```yaml
# Old: 100GB for storing repos
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: deepwiki-storage
spec:
  resources:
    requests:
      storage: 100Gi  # TOO MUCH!

# New: 10GB for temporary work
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: deepwiki-temp
spec:
  resources:
    requests:
      storage: 10Gi  # Just for temp files
```

### 3. Update API Routes

```typescript
// routes/analysis.ts
router.post('/analyze', async (req, res) => {
  const { repositoryUrl } = req.body;
  
  // Old: Complex caching logic
  // const cached = await checkCache(repositoryUrl);
  // if (cached) return res.json(cached);
  
  // New: Simple, always fresh
  const result = await deepWikiManager.analyzeRepository(repositoryUrl);
  
  // Store only results in Supabase
  await supabase.from('analysis_results').insert({
    repository_url: repositoryUrl,
    analysis_data: result,
    analyzed_at: new Date()
  });
  
  res.json(result);
});
```

### 4. Remove Unnecessary Code

Delete these files/functions:
- `cleanupDeepWikiRepositories()`
- `findCachedRepository()`
- `archiveRepository()`
- `restoreFromArchive()`
- All repository storage management code

### 5. Update Cron Jobs

```yaml
# Remove these jobs
- name: cleanup-old-repos
- name: optimize-repo-storage
- name: archive-inactive-repos

# Keep only this
- name: cleanup-temp-files
  schedule: "0 * * * *"  # Hourly
  command: |
    find /tmp -name "analysis-*" -type d -mmin +60 -exec rm -rf {} +
```

## Cost Impact

### Storage Costs (Monthly)

**Before:**
- 100GB PVC: $10-50 (depending on provider)
- Repository storage: Complex management overhead
- Archival processes: Additional compute costs

**After:**
- 10GB PVC: $1-5
- No repository storage: $0
- Simple cleanup: Minimal compute

**Savings: 90-95%**

### Performance Impact

**Before:**
- Check if repo cached
- Compare versions
- Update if needed
- Complex decision tree

**After:**
- Always clone fresh
- Always latest code
- No version checks
- Simple and fast

## Benefits

1. **Simplicity**: No complex caching logic
2. **Freshness**: Always analyzing latest code
3. **Cost**: 90%+ reduction in storage costs
4. **Reliability**: No cache invalidation issues
5. **Speed**: No need to check/update cached repos

## Implementation Checklist

- [ ] Update DeepWiki manager to use temporary clones
- [ ] Remove all repository storage code
- [ ] Update API routes to remove caching
- [ ] Reduce PVC size to 10GB
- [ ] Update monitoring to track temp space only
- [ ] Remove repository cleanup cron jobs
- [ ] Test with multiple concurrent analyses
- [ ] Update documentation

## Monitoring

Only monitor temporary space usage:

```typescript
// Simple monitoring
async function monitorTempSpace() {
  const { usedGB, availableGB } = await checkDiskUsage('/tmp');
  
  if (usedGB > 8) {
    // Clean up orphaned directories
    await cleanupTempDirectories();
  }
}
```

## FAQ

**Q: What if we need to analyze the same repo multiple times?**
A: Just clone it again. Git clones are fast, especially with --depth 1.

**Q: What about large repositories?**
A: Use shallow clones (`--depth 1`) to only get latest commit.

**Q: What if multiple PRs need analysis?**
A: Each gets its own temp directory. They run in parallel.

**Q: How do we handle cleanup failures?**
A: Hourly cron job cleans up any orphaned directories.

## Rollback Plan

If needed, the old code is preserved in git history. But this simpler approach should handle all use cases better than the complex caching system.