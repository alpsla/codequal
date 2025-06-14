# Scheduling Implementation Quick Reference

## Scheduling Logic (To Be Implemented)

```typescript
// packages/core/src/services/scheduling/repository-scheduler.service.ts

import { CronJob } from 'cron';
import { WebhookHandlerService } from '../deepwiki-tools/webhook-handler.service';

interface ScheduleConfig {
  repositoryUrl: string;
  cronExpression: string;
  frequency: 'every-6-hours' | 'daily' | 'weekly' | 'monthly';
  enabledTools: string[];
  notificationChannels: string[];
}

export class RepositorySchedulerService {
  private schedules: Map<string, CronJob> = new Map();
  
  /**
   * Setup scheduling after first analysis completes
   */
  async scheduleRepositoryAnalysis(
    repositoryUrl: string,
    analysisResult: any
  ): Promise<ScheduleConfig> {
    // 1. Calculate schedule based on findings
    const schedule = this.calculateOptimalSchedule(analysisResult);
    
    // 2. Create cron job
    const job = new CronJob(
      schedule.cronExpression,
      async () => {
        await this.runScheduledAnalysis(repositoryUrl, schedule);
      },
      null,
      true, // Start immediately
      'UTC'
    );
    
    // 3. Store schedule
    this.schedules.set(repositoryUrl, job);
    await this.persistSchedule(schedule);
    
    return schedule;
  }
  
  /**
   * Calculate optimal schedule based on analysis results
   */
  private calculateOptimalSchedule(analysisResult: any): ScheduleConfig {
    const findings = analysisResult.findings;
    const metrics = analysisResult.metrics;
    
    // Count critical issues
    const criticalCount = Object.values(findings)
      .flat()
      .filter((f: any) => f.severity === 'critical')
      .length;
    
    // Determine frequency
    let frequency: ScheduleConfig['frequency'];
    let cronExpression: string;
    
    if (criticalCount > 0) {
      // Critical issues: analyze every 6 hours
      frequency = 'every-6-hours';
      cronExpression = '0 */6 * * *';
    } else if (metrics.totalFindings > 20) {
      // Many issues: daily analysis
      frequency = 'daily';
      cronExpression = '0 2 * * *'; // 2 AM UTC
    } else if (metrics.totalFindings > 5) {
      // Some issues: weekly analysis
      frequency = 'weekly';
      cronExpression = '0 2 * * 1'; // Monday 2 AM UTC
    } else {
      // Few issues: monthly analysis
      frequency = 'monthly';
      cronExpression = '0 2 1 * *'; // 1st of month 2 AM UTC
    }
    
    return {
      repositoryUrl: analysisResult.repository.url,
      cronExpression,
      frequency,
      enabledTools: this.selectToolsForSchedule(frequency),
      notificationChannels: this.selectNotificationChannels(criticalCount)
    };
  }
  
  /**
   * Select which tools to run based on schedule frequency
   */
  private selectToolsForSchedule(frequency: string): string[] {
    switch (frequency) {
      case 'every-6-hours':
        // Critical: only security tools
        return ['npm-audit', 'license-checker'];
      
      case 'daily':
        // Frequent: security + architecture
        return ['npm-audit', 'license-checker', 'madge'];
      
      case 'weekly':
      case 'monthly':
        // Regular: all tools
        return [
          'npm-audit',
          'license-checker',
          'madge',
          'dependency-cruiser',
          'npm-outdated'
        ];
      
      default:
        return ['npm-audit', 'license-checker'];
    }
  }
  
  /**
   * Run scheduled analysis
   */
  private async runScheduledAnalysis(
    repositoryUrl: string,
    schedule: ScheduleConfig
  ): Promise<void> {
    try {
      console.log(`Running scheduled analysis for ${repositoryUrl}`);
      
      // Trigger analysis via webhook handler
      const result = await this.webhookHandler.handleScheduledScan(
        repositoryUrl,
        {
          enabledTools: schedule.enabledTools,
          branch: 'main' // Or get default branch
        }
      );
      
      if (result.success) {
        console.log(`Scheduled analysis completed for ${repositoryUrl}`);
        
        // Check if schedule needs adjustment
        await this.evaluateScheduleAdjustment(repositoryUrl, result);
      }
    } catch (error) {
      console.error(`Scheduled analysis failed for ${repositoryUrl}:`, error);
    }
  }
}
```

## Integration Points

### 1. After First Analysis

```typescript
// In ResultOrchestrator.analyzePR() method
async analyzePR(request: PRAnalysisRequest): Promise<AnalysisResult> {
  // ... existing analysis code ...
  
  // After successful analysis
  if (analysisResult.status === 'complete') {
    // Schedule future analyses
    const scheduler = new RepositorySchedulerService();
    const schedule = await scheduler.scheduleRepositoryAnalysis(
      request.repositoryUrl,
      analysisResult
    );
    
    console.log(`Scheduled ${schedule.frequency} analysis for ${request.repositoryUrl}`);
  }
  
  return analysisResult;
}
```

### 2. Schedule Management API

```typescript
// apps/api/src/routes/schedules.ts
export const scheduleRoutes = Router();

// Get repository schedule
scheduleRoutes.get('/repositories/:repoUrl/schedule', async (req, res) => {
  const schedule = await schedulerService.getSchedule(req.params.repoUrl);
  res.json(schedule);
});

// Update repository schedule
scheduleRoutes.put('/repositories/:repoUrl/schedule', async (req, res) => {
  const updated = await schedulerService.updateSchedule(
    req.params.repoUrl,
    req.body
  );
  res.json(updated);
});

// Pause/resume schedule
scheduleRoutes.post('/repositories/:repoUrl/schedule/pause', async (req, res) => {
  await schedulerService.pauseSchedule(req.params.repoUrl);
  res.json({ status: 'paused' });
});
```

### 3. Database Schema

```sql
-- Schedule storage
CREATE TABLE repository_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_url TEXT NOT NULL UNIQUE,
  cron_expression TEXT NOT NULL,
  frequency TEXT NOT NULL,
  enabled_tools TEXT[] NOT NULL,
  notification_channels TEXT[],
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMP,
  next_run_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Schedule history
CREATE TABLE schedule_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES repository_schedules(id),
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  status TEXT NOT NULL,
  findings_count INTEGER,
  critical_findings INTEGER,
  execution_time_ms INTEGER
);
```

## Testing Schedule Implementation

```bash
# 1. Trigger initial analysis
curl -X POST http://localhost:3000/api/analyze-pr \
  -H "Content-Type: application/json" \
  -d '{"repositoryUrl": "...", "prNumber": 123}'

# 2. Check if schedule was created
curl http://localhost:3000/api/repositories/ENCODED_URL/schedule

# 3. View scheduled jobs
curl http://localhost:3000/api/schedules

# 4. Manually trigger scheduled run
curl -X POST http://localhost:3000/api/repositories/ENCODED_URL/schedule/run
```

## Notification Templates

```typescript
// Critical findings notification
const criticalNotification = {
  subject: `🚨 Critical security issues found in ${repository}`,
  body: `
    CodeQual detected ${criticalCount} critical security issues:
    
    ${findings.map(f => `- ${f.title}: ${f.description}`).join('\n')}
    
    View full report: ${reportUrl}
    
    Next scheduled scan: ${nextRunTime}
  `,
  priority: 'high'
};

// Regular update notification
const regularNotification = {
  subject: `CodeQual weekly report for ${repository}`,
  body: `
    This week's analysis summary:
    - Total findings: ${totalFindings}
    - New issues: ${newIssues}
    - Resolved issues: ${resolvedIssues}
    
    View full report: ${reportUrl}
  `,
  priority: 'normal'
};
```

## Remember

1. Start with conservative schedules (weekly)
2. Auto-adjust based on findings
3. Respect rate limits and resource constraints
4. Only notify on significant changes
5. Allow users to customize schedules
