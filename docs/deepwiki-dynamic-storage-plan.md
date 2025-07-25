# DeepWiki Dynamic Storage Management Plan

## Challenge

- Repository sizes vary greatly (10MB to 10GB+)
- Peak concurrent analyses are unpredictable
- Static storage allocation is either wasteful or insufficient
- Need to balance cost vs availability

## Solution Architecture

### 1. Tiered Storage Strategy

```yaml
# Storage Classes
- name: deepwiki-fast-ssd
  type: SSD
  size: 20Gi  # Hot storage for active repos
  
- name: deepwiki-standard
  type: Standard
  size: 100Gi  # Warm storage for recent repos
  
- name: deepwiki-archive
  type: Cold/S3
  size: Unlimited  # Cold storage for old repos
```

### 2. Dynamic PVC Expansion

Create expandable PVC with monitoring:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: deepwiki-data-expandable
  namespace: codequal-dev
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: do-block-storage-expand  # Must support expansion
  resources:
    requests:
      storage: 20Gi  # Start small
    limits:
      storage: 500Gi  # Max allowed
```

### 3. Storage Monitor & Auto-Scaler

```typescript
// storage-monitor.ts
export class DeepWikiStorageMonitor {
  private readonly EXPANSION_THRESHOLD = 80; // Expand at 80% usage
  private readonly EXPANSION_INCREMENT = 20; // Add 20Gi each time
  private readonly MAX_SIZE = 500; // Maximum PVC size
  
  async monitorAndScale(): Promise<void> {
    const usage = await this.getStorageUsage();
    const currentSize = await this.getCurrentPVCSize();
    
    if (usage.percentage > this.EXPANSION_THRESHOLD) {
      const newSize = Math.min(
        currentSize + this.EXPANSION_INCREMENT,
        this.MAX_SIZE
      );
      
      if (newSize > currentSize) {
        await this.expandPVC(newSize);
        await this.notifyExpansion(currentSize, newSize, usage);
      } else {
        // Hit max size - trigger aggressive cleanup
        await this.triggerEmergencyCleanup();
      }
    }
  }
  
  private async expandPVC(newSizeGi: number): Promise<void> {
    // Patch PVC to request more storage
    const patch = {
      spec: {
        resources: {
          requests: {
            storage: `${newSizeGi}Gi`
          }
        }
      }
    };
    
    await kubectl.patch('pvc', 'deepwiki-data-expandable', patch);
    
    // Wait for expansion to complete
    await this.waitForExpansion(newSizeGi);
  }
}
```

### 4. Repository Size Pre-Check

Before cloning, estimate repository size:

```typescript
// Add to deepwiki-manager.ts
private async estimateRepositorySize(
  repositoryUrl: string
): Promise<{ size: number; decision: 'clone' | 'shallow' | 'reject' }> {
  try {
    // Use GitHub/GitLab API to get repo size
    const repoInfo = await this.getRepositoryInfo(repositoryUrl);
    const sizeMB = repoInfo.size / 1024; // Convert KB to MB
    
    // Decision logic
    if (sizeMB < 500) {
      return { size: sizeMB, decision: 'clone' };
    } else if (sizeMB < 2000) {
      return { size: sizeMB, decision: 'shallow' }; // Shallow clone
    } else {
      return { size: sizeMB, decision: 'reject' };
    }
  } catch (error) {
    // Default to clone if can't determine size
    return { size: 0, decision: 'clone' };
  }
}

private async cloneWithStrategy(
  repositoryUrl: string,
  strategy: 'clone' | 'shallow'
): Promise<void> {
  if (strategy === 'shallow') {
    // Clone only recent history
    await execAsync(`git clone --depth 1 --single-branch ${repositoryUrl}`);
  } else {
    await execAsync(`git clone ${repositoryUrl}`);
  }
}
```

### 5. Kubernetes Storage Monitor CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: deepwiki-storage-monitor
  namespace: codequal-dev
spec:
  schedule: "*/5 * * * *"  # Every 5 minutes
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: monitor
            image: codequal/storage-monitor:latest
            env:
            - name: SLACK_WEBHOOK
              valueFrom:
                secretKeyRef:
                  name: monitoring-secrets
                  key: slack-webhook
            command:
            - /bin/sh
            - -c
            - |
              # Get current usage
              USAGE=$(kubectl exec -n codequal-dev $(kubectl get pods -n codequal-dev -l app=deepwiki -o jsonpath='{.items[0].metadata.name}') -- df -h /root/.adalflow/repos | awk 'NR==2 {print $5}' | sed 's/%//')
              PVC_SIZE=$(kubectl get pvc deepwiki-data-expandable -n codequal-dev -o jsonpath='{.status.capacity.storage}')
              
              echo "Storage usage: $USAGE%, PVC size: $PVC_SIZE"
              
              # Alert if high usage
              if [ "$USAGE" -gt 85 ]; then
                curl -X POST $SLACK_WEBHOOK -d "{\"text\":\"⚠️ DeepWiki storage critical: $USAGE% used of $PVC_SIZE\"}"
              fi
              
              # Auto-expand if needed and possible
              if [ "$USAGE" -gt 80 ]; then
                CURRENT_SIZE_GI=$(echo $PVC_SIZE | sed 's/Gi//')
                if [ "$CURRENT_SIZE_GI" -lt 500 ]; then
                  NEW_SIZE=$((CURRENT_SIZE_GI + 20))
                  kubectl patch pvc deepwiki-data-expandable -n codequal-dev -p '{"spec":{"resources":{"requests":{"storage":"'$NEW_SIZE'Gi"}}}}'
                  curl -X POST $SLACK_WEBHOOK -d "{\"text\":\"📈 DeepWiki PVC expanded: ${CURRENT_SIZE_GI}Gi → ${NEW_SIZE}Gi\"}"
                fi
              fi
```

### 6. Storage Metrics Dashboard

```yaml
# prometheus-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: deepwiki-storage-alerts
spec:
  groups:
  - name: storage
    rules:
    - alert: DeepWikiStorageHigh
      expr: |
        (kubelet_volume_stats_used_bytes{persistentvolumeclaim="deepwiki-data-expandable"} 
        / kubelet_volume_stats_capacity_bytes{persistentvolumeclaim="deepwiki-data-expandable"}) > 0.8
      for: 5m
      annotations:
        summary: "DeepWiki storage usage above 80%"
        
    - alert: DeepWikiStorageCritical
      expr: |
        (kubelet_volume_stats_used_bytes{persistentvolumeclaim="deepwiki-data-expandable"} 
        / kubelet_volume_stats_capacity_bytes{persistentvolumeclaim="deepwiki-data-expandable"}) > 0.9
      for: 2m
      annotations:
        summary: "DeepWiki storage usage above 90% - immediate action needed"
```

### 7. Repository Queue Management

```typescript
// Priority queue for repository analysis
export class RepositoryAnalysisQueue {
  private queue: PriorityQueue<AnalysisRequest>;
  private activeAnalyses: Map<string, AnalysisJob>;
  private readonly MAX_CONCURRENT = 5;
  
  async enqueue(request: AnalysisRequest): Promise<void> {
    // Check if we have space
    const availableSpace = await this.getAvailableSpace();
    const estimatedSize = await this.estimateRepositorySize(request.repositoryUrl);
    
    if (estimatedSize > availableSpace * 0.5) {
      // Not enough space - trigger cleanup first
      await this.requestCleanup();
    }
    
    // Add to queue with priority
    this.queue.enqueue(request, this.calculatePriority(request));
    
    // Process queue
    await this.processQueue();
  }
  
  private calculatePriority(request: AnalysisRequest): number {
    // Higher priority for:
    // - Paid users: +100
    // - Small repos: +50
    // - PR analysis: +25
    // - Recent activity: +10
    
    let priority = 0;
    if (request.user.subscription?.tier === 'paid') priority += 100;
    if (request.estimatedSize < 100) priority += 50;
    if (request.type === 'pr') priority += 25;
    if (request.lastActivity < 3600000) priority += 10; // Last hour
    
    return priority;
  }
}
```

### 8. Cost Optimization

```typescript
// Intelligent caching based on usage patterns
export class RepositoryCacheOptimizer {
  async optimizeStorage(): Promise<void> {
    const repos = await this.getAllRepositories();
    
    for (const repo of repos) {
      const accessPattern = await this.analyzeAccessPattern(repo);
      
      if (accessPattern.frequency === 'rare' && accessPattern.lastAccess > 7 * 24 * 3600000) {
        // Move to cold storage or delete
        if (repo.size > 1000) { // 1GB+
          await this.moveToArchive(repo);
        } else {
          await this.scheduleForDeletion(repo);
        }
      }
    }
  }
  
  private async moveToArchive(repo: Repository): Promise<void> {
    // Compress and move to S3
    await execAsync(`tar -czf ${repo.name}.tar.gz ${repo.path}`);
    await s3.upload(`${repo.name}.tar.gz`, 'deepwiki-archive');
    await fs.rm(repo.path, { recursive: true });
    
    // Store metadata for quick retrieval
    await this.storeArchiveMetadata(repo);
  }
}
```

## Implementation Phases

### Phase 1: Monitoring & Alerts (Week 1)
- Deploy storage monitor CronJob
- Set up Prometheus alerts
- Create Grafana dashboard
- Implement Slack notifications

### Phase 2: Dynamic Expansion (Week 2)
- Implement expandable PVC
- Create auto-scaling logic
- Test expansion scenarios
- Set up expansion alerts

### Phase 3: Intelligent Cleanup (Week 3)
- Repository size pre-check
- Priority-based queue
- Access pattern analysis
- Tiered cleanup strategy

### Phase 4: Archive System (Week 4)
- S3 integration for cold storage
- Compression pipeline
- Restore mechanism
- Cost tracking

## Capacity Planning

### Storage Estimation Formula

```
Required Storage = (
  Average Repo Size × Max Concurrent Analyses × Safety Factor
) + (
  Cache Duration Hours × Analyses Per Hour × Average Repo Size × Cache Ratio
)

Example:
- Average repo: 500MB
- Max concurrent: 10
- Safety factor: 2x
- Cache duration: 24 hours
- Analyses/hour: 5
- Cache ratio: 0.3 (30% kept)

Required = (500MB × 10 × 2) + (24 × 5 × 500MB × 0.3)
        = 10GB + 18GB
        = 28GB minimum
```

### Recommended Starting Configuration

```yaml
Development:
  initial: 20Gi
  max: 100Gi
  expansion: 20Gi increments

Production:
  initial: 50Gi
  max: 500Gi
  expansion: 50Gi increments
  
Enterprise:
  initial: 100Gi
  max: 1Ti
  expansion: 100Gi increments
  archive: S3 unlimited
```

## Monitoring Metrics

1. **Storage Metrics**
   - Current usage percentage
   - Growth rate (GB/day)
   - Cleanup effectiveness
   - Expansion frequency

2. **Performance Metrics**
   - Clone time by repo size
   - Queue wait time
   - Analysis completion rate
   - Storage-related failures

3. **Cost Metrics**
   - Storage cost/month
   - Expansion cost
   - Archive storage cost
   - Cost per analysis

## Emergency Procedures

### Storage Full Scenario
1. Immediate: Delete all repos > 24h old
2. Alert: Page on-call engineer
3. Expand: Increase PVC by 50Gi
4. Analyze: Why cleanup failed

### Runaway Growth
1. Pause: Stop accepting new analyses
2. Clean: Aggressive cleanup < 1h
3. Investigate: Large repo or leak?
4. Mitigate: Add size limits

## Future Enhancements

1. **Distributed Storage**
   - Multiple DeepWiki pods with shared storage
   - Repository sharding by hash
   - Load balancing

2. **Smart Pre-fetching**
   - Predict which repos will be analyzed
   - Pre-clone during quiet hours
   - Keep hot repos always ready

3. **Deduplication**
   - Share common files between repos
   - Git object deduplication
   - Binary file optimization