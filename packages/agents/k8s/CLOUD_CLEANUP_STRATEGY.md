# Cloud Infrastructure Cleanup Strategy

## Automatic Cleanup Policy

All cloud resources created for PR analysis should be automatically cleaned up to prevent resource waste and cost overruns.

### 1. Kubernetes Jobs (Preferred)

**Use Jobs instead of Pods for analysis tasks:**

```yaml
apiVersion: batch/v1
kind: Job
spec:
  ttlSecondsAfterFinished: 300  # Auto-cleanup 5 minutes after completion
```

**Benefits:**
- Automatic cleanup by Kubernetes controller
- No manual intervention needed
- Configurable TTL per job type

### 2. Cleanup Timings

| Resource Type | TTL | Reason |
|--------------|-----|--------|
| Analysis Jobs | 5 minutes | Quick cleanup after results collected |
| Build Jobs | 10 minutes | Allow time for artifact retrieval |
| Cache PVCs | 24 hours | Reuse for multiple PRs |
| Failed Jobs | 1 hour | Keep for debugging |

### 3. Cache Management

**Repository Cache (PVC):**
- Shared across multiple analyses
- LRU eviction when full
- 20GB limit per namespace
- Weekly cleanup of unused repos

**Tool Cache (PVC):**
- Persistent across all jobs
- Pre-populated with common tools
- 10GB limit
- Monthly refresh

### 4. Implementation in CloudRepositoryManager

```typescript
// When creating Kubernetes resources
const jobSpec = {
  apiVersion: 'batch/v1',
  kind: 'Job',
  metadata: {
    name: `analysis-${prNumber}-${Date.now()}`,
    namespace: 'codequal-dev'
  },
  spec: {
    ttlSecondsAfterFinished: 300,  // 5 min auto-cleanup
    backoffLimit: 1,
    template: {
      // Pod spec here
    }
  }
};
```

### 5. Manual Cleanup Commands (Emergency Only)

```bash
# Clean up completed jobs older than 1 hour
kubectl delete jobs -n codequal-dev --field-selector status.successful=1

# Clean up failed jobs older than 24 hours
kubectl delete jobs -n codequal-dev --field-selector status.successful=0

# Clean up all analysis pods (force)
kubectl delete pods -n codequal-dev -l app=codequal-analysis
```

### 6. Monitoring & Alerts

- Alert if > 50 jobs in namespace
- Alert if PVC usage > 80%
- Daily report of resource usage
- Weekly cleanup audit

## Benefits of Automatic Cleanup

1. **Cost Reduction**: No idle resources consuming compute/storage
2. **Security**: No lingering pods with potential secrets
3. **Performance**: Clean namespace = faster scheduling
4. **Compliance**: Automatic PII/code removal after analysis
5. **Simplicity**: No manual cleanup procedures needed

## Cache Strategy

While jobs are cleaned up quickly, caches are maintained longer for efficiency:

1. **Repository Cache**: Keep popular repos (kafka, react, etc.) pre-cloned
2. **Tool Cache**: Keep all language tools pre-installed
3. **Results Cache**: 1-hour TTL for re-runs of same PR
4. **Index Cache**: 24-hour TTL for code search optimization

This strategy ensures:
- ✅ No resource waste
- ✅ Fast analysis startup (cached tools/repos)
- ✅ Automatic compliance
- ✅ Zero manual intervention