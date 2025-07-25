# DeepWiki Repository Cleanup Solution

## Problem

DeepWiki clones repositories to `/root/.adalflow/repos` inside the Kubernetes pod but never cleans them up, leading to disk space exhaustion. Even with 10GB of storage, the pod eventually runs out of space, preventing new repository analyses.

## Solution Overview

We've implemented an intelligent multi-layered cleanup strategy that preserves repositories needed for PR analysis:

1. **Smart automatic cleanup** - Preserves active repositories while cleaning up old ones
2. **Access-time based cleanup** - Uses last access time instead of modification time
3. **Active repository preservation** - Keeps repositories for active jobs and recent analyses
4. **Kubernetes CronJob** - Runs every 30 minutes with intelligent cleanup
5. **Manual cleanup script** - For immediate cleanup with preservation

## Implementation Details

### 1. Intelligent Automatic Cleanup

Added smart `cleanupDeepWikiRepositories()` method to `apps/api/src/services/deepwiki-manager.ts`:

```typescript
private async cleanupDeepWikiRepositories(currentRepoUrl?: string): Promise<void> {
  // Skip cleanup if disk usage < 40%
  // Preserve repositories that are:
  // - Currently being analyzed
  // - In active jobs (queued or processing)
  // - Recently cached (last 2 hours)
  
  // Clean based on ACCESS TIME (not modification):
  // - >90%: Remove repos not accessed in 30 minutes
  // - >70%: Remove repos not accessed in 2 hours  
  // - >50%: Remove repos not accessed in 6 hours
  // - <50%: Remove repos not accessed in 24 hours
}
```

This preserves repositories that might be needed for PR analysis while cleaning up truly inactive ones.

### 2. Kubernetes CronJob

Created `kubernetes/deepwiki-cleanup-cronjob.yaml`:

- Runs every 30 minutes
- Checks disk usage on DeepWiki pod
- Cleans repositories based on usage thresholds
- Includes RBAC permissions for pod access

Deploy with:
```bash
kubectl apply -f kubernetes/deepwiki-cleanup-cronjob.yaml
```

### 3. Manual Cleanup Scripts

#### Deploy script: `kubernetes/scripts/deploy-deepwiki-cleanup.sh`
- Deploys the CronJob
- Shows deployment status

#### Manual cleanup: `kubernetes/scripts/manual-deepwiki-cleanup.sh`
- Run anytime for immediate cleanup
- Shows before/after disk usage
- Removes repositories based on current usage

Usage:
```bash
# For dev environment
./manual-deepwiki-cleanup.sh codequal-dev

# For prod environment  
./manual-deepwiki-cleanup.sh codequal-prod
```

## Cleanup Strategy

### Access Time vs Modification Time

The cleanup now uses **access time** (`-amin`) instead of modification time (`-mmin`). This ensures that:
- Repositories being actively read for PR analysis are preserved
- Only truly inactive repositories are removed
- Cloned repositories can be reused across multiple analyses

### Cleanup Thresholds

| Disk Usage | Repository Access Time | Action |
|------------|----------------------|---------|
| <40% | - | No cleanup needed |
| >90% | Not accessed in 30 minutes | Critical cleanup |
| >70% | Not accessed in 2 hours | High priority cleanup |
| >50% | Not accessed in 6 hours | Moderate cleanup |
| 40-50% | Not accessed in 24 hours | Light cleanup |

### Preserved Repositories

The following repositories are always preserved during cleanup:
- Currently being analyzed
- In active jobs (queued or processing status)
- Recently cached (accessed within last 2 hours)
- Being used for PR review

## Monitoring

Monitor disk usage with:
```bash
# Check disk usage
kubectl exec -n codequal-dev $(kubectl get pods -n codequal-dev -l app=deepwiki -o jsonpath='{.items[0].metadata.name}') -- df -h /root/.adalflow/repos

# Count repositories
kubectl exec -n codequal-dev $(kubectl get pods -n codequal-dev -l app=deepwiki -o jsonpath='{.items[0].metadata.name}') -- find /root/.adalflow/repos -mindepth 1 -maxdepth 1 -type d | wc -l
```

## Future Improvements

1. **Increase storage** - Consider increasing PVC to 20-30GB for large repositories
2. **Streaming analysis** - Modify DeepWiki to analyze without full clone
3. **Shared cache** - Implement repository cache across analyses
4. **Metrics** - Add Prometheus metrics for disk usage monitoring

## Troubleshooting

### CronJob not running
```bash
# Check CronJob status
kubectl get cronjob deepwiki-cleanup -n codequal-dev

# Check recent jobs
kubectl get jobs -n codequal-dev | grep deepwiki-cleanup

# View logs
kubectl logs -n codequal-dev -l job-name=<job-name>
```

### Manual trigger
```bash
# Create a one-time job from CronJob
kubectl create job --from=cronjob/deepwiki-cleanup manual-cleanup-$(date +%s) -n codequal-dev
```

### Cleanup failures
- Check pod permissions
- Verify DeepWiki pod is running
- Check kubectl access rights