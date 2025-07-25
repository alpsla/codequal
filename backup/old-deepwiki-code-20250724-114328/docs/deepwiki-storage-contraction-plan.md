# DeepWiki Storage Contraction & Cost Optimization Plan

## Challenge

- Storage costs accumulate even when unused
- Seasonal usage patterns (holidays, weekends)
- Over-provisioned storage from peak periods
- Kubernetes PVCs don't support shrinking (only expansion)

## Solution: Intelligent Storage Optimization

### 1. Usage Pattern Detection

```typescript
// storage-usage-analyzer.ts
export class StorageUsageAnalyzer {
  private readonly ANALYSIS_WINDOW_DAYS = 30;
  private readonly CONTRACTION_THRESHOLD = 0.4; // 40% utilization
  
  async analyzeUsagePatterns(): Promise<UsagePattern> {
    const metrics = await this.getHistoricalMetrics(this.ANALYSIS_WINDOW_DAYS);
    
    return {
      averageUsagePercent: this.calculateAverage(metrics),
      peakUsagePercent: this.calculatePeak(metrics),
      troughUsagePercent: this.calculateTrough(metrics),
      weekendFactor: this.calculateWeekendUsage(metrics),
      seasonalPattern: this.detectSeasonalPattern(metrics),
      recommendation: this.generateRecommendation(metrics)
    };
  }
  
  detectSeasonalPattern(metrics: StorageMetrics[]): SeasonalPattern {
    // Analyze patterns
    const weeklyPattern = this.analyzeWeeklyPattern(metrics);
    const monthlyPattern = this.analyzeMonthlyPattern(metrics);
    
    return {
      type: this.classifyPattern(weeklyPattern, monthlyPattern),
      lowPeriods: this.identifyLowPeriods(metrics),
      highPeriods: this.identifyHighPeriods(metrics),
      predictedNextLow: this.predictNextLowPeriod(metrics)
    };
  }
  
  generateRecommendation(metrics: StorageMetrics[]): StorageRecommendation {
    const current = metrics[metrics.length - 1];
    const average = this.calculateAverage(metrics);
    const trend = this.calculateTrend(metrics);
    
    if (current.percentageUsed < this.CONTRACTION_THRESHOLD && 
        trend === 'decreasing' && 
        average < 50) {
      return {
        action: 'contract',
        targetSize: this.calculateOptimalSize(metrics),
        estimatedSavings: this.calculateSavings(current, optimal),
        migrationPlan: this.generateMigrationPlan(current, optimal)
      };
    }
    
    return { action: 'maintain' };
  }
}
```

### 2. PVC Migration Strategy (Since PVCs Can't Shrink)

```yaml
# migration-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: deepwiki-storage-migration
  namespace: codequal-dev
spec:
  template:
    spec:
      containers:
      - name: migrator
        image: codequal/storage-migrator:latest
        env:
        - name: SOURCE_PVC
          value: deepwiki-data-expandable
        - name: TARGET_PVC
          value: deepwiki-data-optimized
        - name: ARCHIVE_OLD_DATA
          value: "true"
        volumeMounts:
        - name: source
          mountPath: /source
        - name: target
          mountPath: /target
        - name: archive
          mountPath: /archive
        command:
        - /bin/bash
        - -c
        - |
          echo "Starting storage migration..."
          
          # 1. Archive old/inactive repositories
          find /source/repos -type d -atime +30 -print0 | \
            tar --null -czf /archive/old-repos-$(date +%Y%m%d).tar.gz --files-from -
          
          # 2. Copy active data to new smaller PVC
          rsync -av --exclude-from=/tmp/archive-list.txt /source/ /target/
          
          # 3. Verify data integrity
          if ! diff -r /source/ /target/ --exclude=archived; then
            echo "ERROR: Data verification failed!"
            exit 1
          fi
          
          echo "Migration completed successfully"
      volumes:
      - name: source
        persistentVolumeClaim:
          claimName: deepwiki-data-expandable
      - name: target
        persistentVolumeClaim:
          claimName: deepwiki-data-optimized
      - name: archive
        persistentVolumeClaim:
          claimName: deepwiki-archive
```

### 3. Automated Cost Optimization Service

```typescript
// storage-cost-optimizer.ts
export class StorageCostOptimizer {
  private readonly STORAGE_COST_PER_GB_MONTH = 0.10; // $0.10/GB/month
  private readonly MINIMUM_FREE_SPACE_PERCENT = 20;
  
  async optimizeStorage(): Promise<OptimizationResult> {
    const currentMetrics = await this.getCurrentMetrics();
    const usagePattern = await this.analyzer.analyzeUsagePatterns();
    
    // Check if we're in a low-usage period
    if (this.isLowUsagePeriod(usagePattern)) {
      return this.planContraction(currentMetrics, usagePattern);
    }
    
    return { action: 'none', reason: 'Not in low-usage period' };
  }
  
  private planContraction(
    metrics: StorageMetrics, 
    pattern: UsagePattern
  ): OptimizationResult {
    // Calculate optimal size based on patterns
    const optimalSizeGB = Math.ceil(
      pattern.peakUsagePercent * metrics.totalGB * 0.01 + 
      (metrics.totalGB * this.MINIMUM_FREE_SPACE_PERCENT * 0.01)
    );
    
    const potentialSavingsGB = metrics.totalGB - optimalSizeGB;
    const monthlySavings = potentialSavingsGB * this.STORAGE_COST_PER_GB_MONTH;
    
    if (monthlySavings < 10) {
      return { 
        action: 'none', 
        reason: 'Savings too small to justify migration' 
      };
    }
    
    return {
      action: 'contract',
      currentSize: metrics.totalGB,
      recommendedSize: optimalSizeGB,
      savingsPerMonth: monthlySavings,
      migrationSteps: this.generateMigrationSteps(metrics.totalGB, optimalSizeGB),
      riskAssessment: this.assessContractionRisk(pattern)
    };
  }
  
  private generateMigrationSteps(currentGB: number, targetGB: number): MigrationStep[] {
    return [
      {
        step: 1,
        action: 'Archive inactive repositories',
        command: 'kubectl apply -f archive-old-repos-job.yaml',
        duration: '30 minutes'
      },
      {
        step: 2,
        action: 'Create new optimized PVC',
        command: `kubectl apply -f deepwiki-pvc-${targetGB}gb.yaml`,
        duration: '5 minutes'
      },
      {
        step: 3,
        action: 'Migrate active data',
        command: 'kubectl apply -f migration-job.yaml',
        duration: '1-2 hours'
      },
      {
        step: 4,
        action: 'Switch to new PVC',
        command: 'kubectl patch deployment deepwiki --patch-file pvc-switch.yaml',
        duration: '10 minutes'
      },
      {
        step: 5,
        action: 'Delete old PVC',
        command: 'kubectl delete pvc deepwiki-data-expandable',
        duration: '5 minutes'
      }
    ];
  }
}
```

### 4. S3 Archive Strategy for Cold Storage

```typescript
// s3-archive-manager.ts
export class S3ArchiveManager {
  private s3Client: AWS.S3;
  private readonly GLACIER_TRANSITION_DAYS = 90;
  
  async archiveInactiveRepos(inactiveDays: number = 30): Promise<ArchiveResult> {
    const repos = await this.findInactiveRepositories(inactiveDays);
    const archived: string[] = [];
    let totalSizeArchived = 0;
    
    for (const repo of repos) {
      // Compress repository
      const tarPath = await this.compressRepository(repo);
      
      // Upload to S3
      const s3Key = `archives/${repo.name}/${Date.now()}.tar.gz`;
      await this.s3Client.upload({
        Bucket: 'deepwiki-archives',
        Key: s3Key,
        Body: fs.createReadStream(tarPath),
        StorageClass: 'STANDARD_IA', // Infrequent Access
        Metadata: {
          'original-path': repo.path,
          'archived-date': new Date().toISOString(),
          'repository-url': repo.url,
          'last-accessed': repo.lastAccessed.toISOString(),
          'size-mb': repo.sizeMB.toString()
        }
      }).promise();
      
      // Create lifecycle rule for Glacier transition
      await this.createLifecycleRule(s3Key);
      
      // Delete local copy
      await fs.rm(repo.path, { recursive: true });
      
      archived.push(repo.name);
      totalSizeArchived += repo.sizeMB;
    }
    
    return {
      archivedCount: archived.length,
      totalSizeMB: totalSizeArchived,
      estimatedMonthlySavings: this.calculateS3Savings(totalSizeArchived),
      archivedRepos: archived
    };
  }
  
  async restoreFromArchive(repoName: string): Promise<void> {
    // Find archive in S3
    const archives = await this.listArchives(repoName);
    if (archives.length === 0) {
      throw new Error(`No archive found for ${repoName}`);
    }
    
    // Get latest archive
    const latest = archives[0];
    
    // Check if in Glacier
    if (latest.StorageClass === 'GLACIER') {
      // Initiate restore
      await this.initiateGlacierRestore(latest.Key);
      throw new Error('Archive is in Glacier. Restore initiated, try again in 1-5 hours.');
    }
    
    // Download and extract
    const tempPath = `/tmp/${repoName}-restore.tar.gz`;
    await this.downloadFromS3(latest.Key, tempPath);
    await this.extractToDeepWiki(tempPath, repoName);
  }
}
```

### 5. Scheduled Contraction Jobs

```yaml
# storage-optimization-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: deepwiki-storage-optimizer
  namespace: codequal-dev
spec:
  schedule: "0 2 * * 0"  # Weekly on Sunday at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: optimizer
            image: codequal/storage-optimizer:latest
            env:
            - name: MODE
              value: "analyze-and-recommend"
            - name: AUTO_EXECUTE
              value: "false"  # Manual approval required
            - name: SLACK_WEBHOOK
              valueFrom:
                secretKeyRef:
                  name: monitoring-secrets
                  key: slack-webhook
            command:
            - /app/optimize-storage
            - --analyze-window=30d
            - --min-savings=$20
            - --safety-margin=25%
```

### 6. Cost Tracking Dashboard

```typescript
// storage-cost-tracker.ts
export interface StorageCostMetrics {
  currentMonthCost: number;
  projectedMonthCost: number;
  lastMonthCost: number;
  yearToDateCost: number;
  costPerAnalysis: number;
  wastedSpaceCost: number;
  optimizationOpportunity: number;
}

export class StorageCostTracker {
  async generateCostReport(): Promise<StorageCostReport> {
    const metrics = await this.getStorageMetrics();
    const usage = await this.getUsageStatistics();
    
    const report: StorageCostReport = {
      summary: {
        totalAllocatedGB: metrics.totalGB,
        averageUsedGB: metrics.averageUsedGB,
        utilizationPercent: (metrics.averageUsedGB / metrics.totalGB) * 100,
        monthlyStorageCost: metrics.totalGB * this.COST_PER_GB,
        wastedCapacityCost: (metrics.totalGB - metrics.averageUsedGB) * this.COST_PER_GB
      },
      
      recommendations: this.generateCostRecommendations(metrics, usage),
      
      historicalTrend: {
        last6Months: await this.getHistoricalCosts(6),
        projection: this.projectFutureCosts(metrics, usage)
      },
      
      optimizationPlan: {
        immediateActions: this.getImmediateOptimizations(metrics),
        scheduledActions: this.getScheduledOptimizations(metrics),
        potentialSavings: this.calculatePotentialSavings(metrics)
      }
    };
    
    return report;
  }
}
```

## Implementation Strategy

### Phase 1: Analysis & Monitoring (Week 1)
1. Deploy usage pattern analyzer
2. Collect 30 days of metrics
3. Identify seasonal patterns
4. Calculate potential savings

### Phase 2: Archive System (Week 2)
1. Set up S3 bucket with lifecycle policies
2. Implement archive/restore functionality
3. Test archive retrieval times
4. Document restoration procedures

### Phase 3: Migration Tools (Week 3)
1. Create PVC migration scripts
2. Test data integrity verification
3. Implement rollback procedures
4. Create automation workflows

### Phase 4: Cost Optimization (Week 4)
1. Deploy cost tracking dashboard
2. Set up automated recommendations
3. Implement approval workflow
4. Schedule regular reviews

## Cost Optimization Strategies

### 1. Tiered Storage
```
Active (0-7 days)     → SSD Storage      → $$$$
Recent (7-30 days)    → Standard Storage → $$$
Archive (30-90 days)  → S3 Standard-IA  → $$
Cold (90+ days)       → S3 Glacier       → $
```

### 2. Predictive Scaling
- Analyze usage patterns
- Pre-shrink before low periods
- Pre-expand before high periods
- Minimize time at peak capacity

### 3. Smart Archiving
- Archive by last access, not age
- Compress before archiving
- Deduplicate common files
- Use intelligent tiering

## Monitoring & Alerts

### Cost Alerts
```yaml
- alert: StorageUnderutilized
  expr: |
    (deepwiki_storage_used_bytes / deepwiki_storage_total_bytes) < 0.4
  for: 7d
  annotations:
    summary: "Storage utilization below 40% for 7 days"
    recommendation: "Consider shrinking storage by {{ $value }}GB"
    monthlySavings: "${{ $value * 0.10 }}"

- alert: StorageCostAnomaly
  expr: |
    deepwiki_storage_monthly_cost > 
    (avg_over_time(deepwiki_storage_monthly_cost[30d]) * 1.5)
  annotations:
    summary: "Storage costs 50% above average"
```

## Decision Matrix

| Current Usage | Trend | Duration | Action |
|--------------|-------|----------|--------|
| <40% | Decreasing | >14 days | Contract storage |
| <40% | Stable | >30 days | Archive & contract |
| 40-60% | Decreasing | >7 days | Plan contraction |
| 60-80% | Any | Any | Maintain |
| >80% | Any | Any | Expand |

## Example Scenarios

### Scenario 1: Holiday Season
- Usage drops from 70% to 30% during December holidays
- System detects pattern after 7 days
- Recommends: Archive repos, shrink from 100GB to 60GB
- Savings: $4/month
- Auto-reverses before January

### Scenario 2: Weekend Pattern
- Usage drops 50% every weekend
- System maintains current size
- But schedules aggressive cleanup on Fridays
- Prevents Monday expansion needs

### Scenario 3: Project Completion
- Large project ends, usage drops permanently
- System detects sustained low usage (30 days)
- Recommends: Archive project repos, shrink by 60%
- Savings: $30/month ongoing