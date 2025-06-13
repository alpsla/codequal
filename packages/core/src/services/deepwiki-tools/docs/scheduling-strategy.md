# Scheduled Analysis Configuration

## Overview

DeepWiki and tool analysis run together as a single scheduled job to ensure consistency and efficiency.

## Scheduling Options

### 1. **User-Triggered Schedule**
Users can schedule analysis through the UI/API:

```typescript
interface ScheduledAnalysisRequest {
  repositoryUrl: string;
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string; // "HH:MM" in UTC
    dayOfWeek?: number; // 0-6 for weekly
    dayOfMonth?: number; // 1-31 for monthly
  };
  analysis: {
    deepwikiMode: 'comprehensive' | 'concise';
    runTools: boolean;
    enabledTools?: string[]; // Defaults to all applicable tools
  };
  notifications?: {
    email?: string;
    slack?: string;
    onlyOnChanges?: boolean; // Only notify if findings change
  };
}
```

### 2. **Cron Job Configuration**

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: scheduled-analysis
  namespace: default
spec:
  # Run daily at 2 AM UTC
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: analysis-scheduler
            image: codequal/analysis-scheduler:latest
            env:
            - name: DEEPWIKI_ENABLED
              value: "true"
            - name: TOOLS_ENABLED
              value: "true"
            - name: ANALYSIS_MODE
              value: "scheduled"
            command:
            - node
            - /app/scheduled-analysis.js
          restartPolicy: OnFailure
```

### 3. **Scheduler Implementation**

```typescript
// scheduled-analysis.service.ts
export class ScheduledAnalysisService {
  constructor(
    private deepWikiManager: EnhancedDeepWikiManager,
    private notificationService: NotificationService,
    private scheduleStore: ScheduleStore
  ) {}

  /**
   * Run scheduled analyses for all configured repositories
   */
  async runScheduledAnalyses(): Promise<void> {
    const schedules = await this.scheduleStore.getDueSchedules();
    
    for (const schedule of schedules) {
      try {
        // Run DeepWiki + Tools together
        const jobId = await this.deepWikiManager.triggerRepositoryAnalysisWithTools(
          schedule.repositoryUrl,
          {
            runTools: schedule.analysis.runTools,
            enabledTools: schedule.analysis.enabledTools,
            scheduledRun: true
          }
        );
        
        // Wait for completion
        const results = await this.deepWikiManager.waitForAnalysisCompletion(
          schedule.repositoryUrl
        );
        
        // Check if findings changed
        const hasChanges = await this.compareWithPreviousResults(
          schedule.repositoryUrl,
          results
        );
        
        // Send notifications if configured
        if (schedule.notifications && 
            (!schedule.notifications.onlyOnChanges || hasChanges)) {
          await this.notificationService.sendAnalysisReport(
            schedule.notifications,
            results,
            hasChanges
          );
        }
        
        // Update next run time
        await this.scheduleStore.updateNextRun(schedule.id);
        
      } catch (error) {
        console.error(`Scheduled analysis failed for ${schedule.repositoryUrl}:`, error);
        await this.notificationService.sendErrorNotification(
          schedule.notifications,
          error
        );
      }
    }
  }
  
  /**
   * Compare with previous results to detect changes
   */
  private async compareWithPreviousResults(
    repositoryUrl: string,
    currentResults: AnalysisResults
  ): Promise<boolean> {
    // Simple comparison of key metrics
    const previousSummary = await this.getPreviousSummary(repositoryUrl);
    
    if (!previousSummary) {
      return true; // First run, consider as change
    }
    
    const currentSummary = this.extractSummary(currentResults);
    
    // Check if critical metrics changed
    return (
      currentSummary.vulnerabilities.critical !== previousSummary.vulnerabilities.critical ||
      currentSummary.vulnerabilities.high !== previousSummary.vulnerabilities.high ||
      currentSummary.circularDependencies !== previousSummary.circularDependencies ||
      currentSummary.riskyLicenses !== previousSummary.riskyLicenses
    );
  }
}
```

## Benefits of Combined Scheduling

1. **Consistency**: DeepWiki and tools analyze the same code state
2. **Efficiency**: Single repository clone, one job to manage
3. **Cost Savings**: Reduced compute time and API calls
4. **Better UX**: One schedule, one notification, one report

## Storage Strategy Summary

### What We Store:
- **Latest Results Only**: Current state for each repository
- **Lightweight Audit Log**: Just timestamps and summary metrics
- **No Version History**: Previous results are replaced

### Why This Works:
- Agents need current state, not history
- Reduces storage costs by 90%+
- Faster query performance
- Simpler implementation

### If History Needed Later:
- Add a separate analytics table with aggregated metrics
- Store only trend data (vulnerability count over time)
- Keep raw results for 7-30 days max
- Use time-series database for long-term trends

Does this approach align better with your vision? The key insight is that **analysis results are about current state**, not historical records.
