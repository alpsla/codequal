# Dependency-Check Daily Pre-warming Setup

## Overview

To avoid user-facing delays, we pre-warm the Dependency-Check CVE database daily at 2 AM. This ensures all user analyses throughout the day are fast (<30 seconds).

---

## Architecture

```
Daily 2 AM:
┌──────────────────────┐
│ CronJob triggers     │
│ Pre-warm script      │
└──────────────────────┘
           ↓
┌──────────────────────┐
│ Dependency-Check     │
│ --updateonly flag    │
│ Downloads NVD data   │
│ Duration: ~5 minutes │
└──────────────────────┘
           ↓
┌──────────────────────┐
│ Persistent Volume    │
│ /data/depcheck       │
│ Contains H2 database │
└──────────────────────┘
           ↓
User analyses use pre-warmed database
Fast: <30 seconds per repository
```

---

## Setup Options

### Option 1: Kubernetes CronJob (Recommended for Production)

```yaml
# k8s/dependency-check-prewarm-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: dependency-check-prewarm
  namespace: codequal-dev
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: depcheck-update
            image: analyzer:lang-java-v5.3
            command:
            - /bin/sh
            - -c
            - |
              echo "Starting Dependency-Check database update..."
              dependency-check \
                --updateonly \
                --nvdApiKey "$NVD_API_KEY" \
                --data /data/depcheck
              echo "Update complete! Size: $(du -sh /data/depcheck | cut -f1)"
            env:
            - name: NVD_API_KEY
              valueFrom:
                secretKeyRef:
                  name: nvd-api-key
                  key: api-key
            volumeMounts:
            - name: depcheck-data
              mountPath: /data/depcheck
            resources:
              requests:
                memory: "2Gi"
                cpu: "1000m"
              limits:
                memory: "4Gi"
                cpu: "2000m"
          volumes:
          - name: depcheck-data
            persistentVolumeClaim:
              claimName: dependency-check-data-pvc
```

**Deploy:**
```bash
# Create PVC for Dependency-Check data
kubectl apply -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: dependency-check-data-pvc
  namespace: codequal-dev
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 10Gi
  storageClassName: standard
EOF

# Create NVD API key secret
kubectl create secret generic nvd-api-key \
  --from-literal=api-key="$NVD_API_KEY" \
  -n codequal-dev

# Deploy CronJob
kubectl apply -f k8s/dependency-check-prewarm-cronjob.yaml

# Verify
kubectl get cronjob -n codequal-dev
kubectl get pvc -n codequal-dev | grep dependency-check
```

---

### Option 2: System Cron (Development/Testing)

```bash
# Add to crontab
crontab -e

# Add this line:
0 2 * * * /path/to/prewarm-dependency-check.sh >> /var/log/depcheck-prewarm.log 2>&1
```

**Setup:**
```bash
# Make script executable
chmod +x src/two-branch/scripts/prewarm-dependency-check.sh

# Set NVD API key
export NVD_API_KEY="your-key-here"

# Test run
./src/two-branch/scripts/prewarm-dependency-check.sh

# Check logs
tail -f /var/log/depcheck-prewarm.log
```

---

## V9 Tool Integration

With pre-warmed database, V9 analyses are fast:

```typescript
// src/two-branch/tools/java/dependency-check-tool.ts
export async function runDependencyCheck(
  repoPath: string
): Promise<DependencyCheckResult> {

  // Uses pre-warmed database from persistent volume
  // Fast: <30 seconds
  const result = await execDocker({
    image: 'analyzer:lang-java-v5.3',
    command: [
      'dependency-check',
      '--scan', '/workspace',
      '--format', 'JSON',
      '--out', '/workspace/depcheck-report.json',
      '--data', '/data/depcheck'  // Pre-warmed data
    ],
    volumes: [
      `${repoPath}:/workspace:ro`,
      'dependency-check-data:/data/depcheck:ro'  // Read-only, shared
    ]
  });

  return parseDependencyCheckReport(result);
}
```

---

## Monitoring

### Check Pre-warm Success

```bash
# View CronJob history
kubectl get jobs -n codequal-dev | grep dependency-check-prewarm

# Check last run logs
kubectl logs -n codequal-dev \
  $(kubectl get pods -n codequal-dev \
    -l job-name=$(kubectl get jobs -n codequal-dev \
      -l app=dependency-check-prewarm \
      --sort-by=.metadata.creationTimestamp \
      -o jsonpath='{.items[-1].metadata.name}') \
    -o jsonpath='{.items[0].metadata.name}')

# Check data size
kubectl exec -it -n codequal-dev \
  $(kubectl get pods -n codequal-dev -l app=codequal-api -o jsonpath='{.items[0].metadata.name}') \
  -- du -sh /data/depcheck
```

### Update History

Track update performance:
```bash
# View update history
kubectl exec -it -n codequal-dev \
  $(kubectl get pods -n codequal-dev -l app=codequal-api -o jsonpath='{.items[0].metadata.name}') \
  -- cat /data/depcheck/update-history.csv

# Format: timestamp,duration_seconds
# 2025-10-01_02-00-05,312
# 2025-10-02_02-00-04,47   (subsequent days faster)
```

---

## Maintenance

### Manual Update

```bash
# Trigger manual update
kubectl create job --from=cronjob/dependency-check-prewarm \
  dependency-check-prewarm-manual \
  -n codequal-dev

# Watch progress
kubectl logs -f -n codequal-dev \
  $(kubectl get pods -n codequal-dev \
    -l job-name=dependency-check-prewarm-manual \
    -o jsonpath='{.items[0].metadata.name}')
```

### Troubleshooting

**Update fails:**
```bash
# Check NVD API key
kubectl get secret nvd-api-key -n codequal-dev -o yaml

# Check disk space
kubectl exec -it -n codequal-dev \
  $(kubectl get pods -n codequal-dev -l app=codequal-api -o jsonpath='{.items[0].metadata.name}') \
  -- df -h /data/depcheck

# Increase PVC size if needed
kubectl patch pvc dependency-check-data-pvc -n codequal-dev \
  -p '{"spec":{"resources":{"requests":{"storage":"20Gi"}}}}'
```

**First run takes >10 minutes:**
- Normal for initial database download
- Subsequent runs: 1-2 minutes (delta updates only)

---

## Cost Analysis

**Storage:**
- Initial: ~5 GB
- Growth: ~50 MB/month (new CVEs)
- 12 months: ~6 GB

**Compute:**
- First run: ~5 minutes (full download)
- Daily updates: ~1-2 minutes (delta only)
- Cost: ~$0.01/day (negligible)

**User Experience:**
- Without pre-warming: 5 min delay on first analysis of day
- With pre-warming: <30 seconds all day ✅

---

## Comparison: Pre-warming vs On-Demand

| Metric | On-Demand | Pre-warmed |
|--------|-----------|------------|
| First analysis of day | 5 minutes | 30 seconds |
| Subsequent analyses | 30 seconds | 30 seconds |
| User experience | ❌ Poor | ✅ Excellent |
| Daily maintenance | None | 5 min at 2 AM |
| Storage required | Same | Same |
| **Recommendation** | ❌ | ✅ |

---

## Next Steps

1. Deploy Kubernetes CronJob
2. Verify first run completes successfully
3. Check update history for performance baseline
4. Integrate Dependency-Check into V9ToolOrchestrator
5. Test with real repository analysis

**Ready to deploy!** 🚀
