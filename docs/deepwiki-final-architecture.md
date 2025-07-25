# DeepWiki Final Architecture (Simplified)

## Overview

DeepWiki now uses a simplified architecture that:
- **Never stores repositories** (they're already in GitHub/GitLab)
- **Only uses temporary storage** during analysis (~5-10 minutes)
- **Cleans up immediately** after analysis completes
- **Stores only results** in Supabase

## Core Components

### 1. DeepWiki Manager Simplified (`deepwiki-manager-simplified.ts`)

Main service that handles analysis:

```typescript
export class SimplifiedDeepWikiManager {
  // Analyze a repository
  async analyzeRepository(repositoryUrl: string, options?: {
    branch?: string;
    commit?: string;
    depth?: number;
  }): Promise<DeepWikiAnalysisResult>

  // Analyze a pull request  
  async analyzePullRequest(
    repositoryUrl: string,
    prNumber: number,
    baseRef?: string
  ): Promise<DeepWikiAnalysisResult>

  // Monitoring
  async checkDiskUsage(): Promise<DiskMetrics>
  async cleanupTempDirectories(): Promise<number>
}
```

### 2. Temp Manager (`deepwiki-temp-manager.ts`)

Tracks active analyses and ensures cleanup:

```typescript
export class DeepWikiTempManager {
  // Track analysis
  registerAnalysis(id, path, url, type): void
  
  // Clean up when done
  async cleanupAnalysis(id): Promise<boolean>
  
  // Monitor usage
  async getMetrics(): Promise<TempSpaceMetrics>
  
  // Auto-scaling
  async estimateRequiredSpace(queued): Promise<Estimate>
}
```

### 3. API Routes (`deepwiki-temp-storage.ts`)

Monitoring endpoints:
- `GET /api/deepwiki/temp/metrics` - Current usage
- `GET /api/deepwiki/temp/active-analyses` - What's running
- `POST /api/deepwiki/temp/estimate-capacity` - Can handle more?
- `POST /api/deepwiki/temp/cleanup-orphaned` - Manual cleanup

## Data Flow

```mermaid
graph LR
    A[User Request] --> B[Clone to /tmp]
    B --> C[Analyze Code]
    C --> D[Store Results in Supabase]
    D --> E[Delete /tmp Directory]
    E --> F[Return Results]
```

## Storage Strategy

### What We Store:
- **Analysis Results** → Supabase (permanent)
- **Vector Embeddings** → Supabase (for search)
- **Reports** → Supabase (for users)

### What We DON'T Store:
- **Repository code** → Already in GitHub/GitLab
- **Clone history** → Not needed
- **Cached analyses** → Always run fresh

## Cost Analysis

### Before (Complex):
- 100GB persistent storage: $50/month
- Complex management overhead
- Cache invalidation issues

### After (Simple):
- 10-30GB temp storage: $5-15/month
- Simple, predictable costs
- No cache problems

**Savings: 70-90%**

## Kubernetes Configuration

```yaml
# Minimal PVC for temp work
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: deepwiki-temp
spec:
  resources:
    requests:
      storage: 10Gi  # Start small
  storageClassName: expandable-storage
```

## Management Tools

### CLI Script
```bash
# Check current usage
./scripts/manage-deepwiki-temp-storage.sh metrics

# Monitor in real-time
./scripts/manage-deepwiki-temp-storage.sh monitor

# Scale if needed
./scripts/manage-deepwiki-temp-storage.sh scale 20Gi
```

### API Monitoring
```bash
# Get current metrics
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/deepwiki/temp/metrics

# Check active analyses
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/deepwiki/temp/active-analyses
```

## Integration Example

```typescript
// Simple integration
import { deepWikiManager } from './deepwiki-manager-simplified';

// Analyze repository
const repoResult = await deepWikiManager.analyzeRepository(
  'https://github.com/user/repo'
);

// Analyze PR
const prResult = await deepWikiManager.analyzePullRequest(
  'https://github.com/user/repo',
  123
);

// Store results
await supabase.from('analysis_results').insert({
  repository_url: repoResult.repository_url,
  analysis_data: repoResult,
  created_at: new Date()
});
```

## Benefits

1. **Simplicity**: No complex caching or storage logic
2. **Cost**: 90% reduction in storage costs  
3. **Freshness**: Always analyze latest code
4. **Reliability**: No cache invalidation issues
5. **Performance**: No overhead from cache checks

## Files in Final Solution

```
apps/api/src/
├── services/
│   ├── deepwiki-manager-simplified.ts    # Main service
│   ├── deepwiki-temp-manager.ts         # Temp tracking
│   └── deepwiki-integration-simplified.ts # Integration helper
├── routes/
│   └── deepwiki-temp-storage.ts         # API routes
└── index.ts                              # Updated routes

kubernetes/
└── deepwiki-autoscaling.yaml            # K8s config

scripts/
└── manage-deepwiki-temp-storage.sh      # Management CLI

docs/
├── deepwiki-simplification-guide.md     # How we got here
├── deepwiki-pr-analysis-flow.md         # PR flow details
└── deepwiki-final-architecture.md       # This file
```

## Next Steps

1. Run the cleanup script to remove old code
2. Update any remaining imports
3. Test the simplified flow
4. Monitor temp storage usage
5. Enjoy the simplicity!