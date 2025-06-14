# Repository Analysis Scheduling Strategy

## Overview

This document provides comprehensive scheduling recommendations for CodeQual's automated repository analysis after the initial PR report completion.

## Scheduling Decision Framework

### 1. Activity-Based Scheduling

```typescript
interface RepositoryActivityMetrics {
  commitsPerWeek: number;
  activeDevelopers: number;
  openPRs: number;
  lastCommitDate: Date;
  releaseFrequency: 'frequent' | 'regular' | 'rare';
}

function determineSchedule(metrics: RepositoryActivityMetrics): ScheduleConfig {
  // High activity: > 20 commits/week or > 5 active developers
  if (metrics.commitsPerWeek > 20 || metrics.activeDevelopers > 5) {
    return {
      frequency: 'daily',
      cronExpression: '0 2 * * *', // 2 AM daily
      rationale: 'High development activity requires daily security and quality checks'
    };
  }
  
  // Medium activity: 5-20 commits/week or 2-5 developers
  if (metrics.commitsPerWeek > 5 || metrics.activeDevelopers >= 2) {
    return {
      frequency: 'weekly',
      cronExpression: '0 2 * * 1', // Monday 2 AM
      rationale: 'Regular development pace benefits from weekly analysis'
    };
  }
  
  // Low activity: < 5 commits/week
  return {
    frequency: 'monthly',
    cronExpression: '0 2 1 * *', // 1st of month at 2 AM
    rationale: 'Stable repository with minimal changes'
  };
}
```

### 2. Risk-Based Scheduling

Adjust frequency based on security and quality findings:

```typescript
interface RiskProfile {
  criticalVulnerabilities: number;
  highSeverityIssues: number;
  outdatedDependencies: number;
  securityScore: number; // 0-100
}

function adjustScheduleForRisk(
  baseSchedule: ScheduleConfig, 
  riskProfile: RiskProfile
): ScheduleConfig {
  // Critical security issues: force daily scans
  if (riskProfile.criticalVulnerabilities > 0) {
    return {
      frequency: 'daily',
      cronExpression: '0 */6 * * *', // Every 6 hours
      rationale: 'Critical vulnerabilities require immediate attention',
      alerts: {
        immediate: true,
        channels: ['email', 'slack', 'github-issue']
      }
    };
  }
  
  // High-risk profile: increase frequency
  if (riskProfile.securityScore < 70 || riskProfile.highSeverityIssues > 3) {
    const increased = increaseFrequency(baseSchedule);
    return {
      ...increased,
      rationale: 'Elevated risk profile requires more frequent monitoring'
    };
  }
  
  // Clean profile: can decrease frequency
  if (riskProfile.securityScore > 95 && 
      riskProfile.outdatedDependencies < 5) {
    const decreased = decreaseFrequency(baseSchedule);
    return {
      ...decreased,
      rationale: 'Excellent security posture allows for less frequent checks'
    };
  }
  
  return baseSchedule;
}
```

### 3. Repository Type Scheduling

Different repository types require different strategies:

```typescript
const REPOSITORY_TYPE_SCHEDULES = {
  'production-api': {
    frequency: 'daily',
    tools: ['npm-audit', 'license-checker'],
    deepAnalysis: 'weekly',
    rationale: 'Production APIs need constant security monitoring'
  },
  
  'frontend-app': {
    frequency: 'weekly',
    tools: ['npm-audit', 'dependency-cruiser', 'bundlephobia'],
    deepAnalysis: 'monthly',
    rationale: 'Frontend apps focus on bundle size and dependencies'
  },
  
  'library': {
    frequency: 'monthly',
    tools: ['license-checker', 'npm-outdated'],
    deepAnalysis: 'quarterly',
    rationale: 'Libraries need compatibility and license compliance checks'
  },
  
  'internal-tool': {
    frequency: 'monthly',
    tools: ['npm-audit', 'madge'],
    deepAnalysis: 'quarterly',
    rationale: 'Internal tools have lower security requirements'
  },
  
  'monorepo': {
    frequency: 'weekly',
    tools: ['madge', 'dependency-cruiser', 'npm-audit'],
    deepAnalysis: 'bi-weekly',
    rationale: 'Monorepos need architectural integrity monitoring'
  }
};
```

## Implementation Guide

### 1. Post-Analysis Scheduling Setup

```typescript
class SchedulingService {
  async setupPostAnalysisSchedule(
    repositoryUrl: string,
    analysisResult: AnalysisResult,
    userPreferences?: UserSchedulingPreferences
  ): Promise<ScheduleConfig> {
    // Step 1: Analyze repository characteristics
    const repoMetrics = await this.analyzeRepositoryActivity(repositoryUrl);
    const repoType = await this.detectRepositoryType(repositoryUrl);
    
    // Step 2: Determine base schedule
    let schedule = determineSchedule(repoMetrics);
    
    // Step 3: Adjust for risk profile
    const riskProfile = this.extractRiskProfile(analysisResult);
    schedule = adjustScheduleForRisk(schedule, riskProfile);
    
    // Step 4: Apply repository type overrides
    if (REPOSITORY_TYPE_SCHEDULES[repoType]) {
      schedule = this.mergeSchedules(schedule, REPOSITORY_TYPE_SCHEDULES[repoType]);
    }
    
    // Step 5: Apply user preferences
    if (userPreferences) {
      schedule = this.applyUserPreferences(schedule, userPreferences);
    }
    
    // Step 6: Register the schedule
    await this.registerSchedule(repositoryUrl, schedule);
    
    // Step 7: Set up notifications
    await this.configureNotifications(repositoryUrl, schedule);
    
    return schedule;
  }
}
```

### 2. Kubernetes CronJob Configuration

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: codequal-repository-scanner
  namespace: codequal-dev
spec:
  schedule: "0 2 * * *"  # Default daily schedule
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: scanner
            image: codequal/scanner:latest
            env:
            - name: SCAN_MODE
              value: "scheduled"
            - name: ENABLE_TOOLS
              value: "npm-audit,license-checker,madge,dependency-cruiser,npm-outdated"
            command:
            - node
            - /app/scheduled-scanner.js
          restartPolicy: OnFailure
```

### 3. Dynamic Schedule Management

```typescript
class DynamicScheduler {
  private schedules: Map<string, NodeJS.Timer> = new Map();
  
  async startDynamicScheduling() {
    // Load all active repository schedules
    const repositories = await this.loadActiveRepositories();
    
    for (const repo of repositories) {
      const schedule = await this.getRepositorySchedule(repo.url);
      this.scheduleRepository(repo, schedule);
    }
    
    // Monitor for schedule adjustments
    this.startScheduleMonitor();
  }
  
  private scheduleRepository(repo: Repository, schedule: ScheduleConfig) {
    // Convert cron to interval for Node.js
    const interval = this.cronToInterval(schedule.cronExpression);
    
    const timer = setInterval(async () => {
      try {
        console.log(`Running scheduled analysis for ${repo.url}`);
        
        // Trigger analysis
        const result = await this.webhookHandler.handleScheduledScan(repo.url, {
          enabledTools: schedule.tools || DEFAULT_TOOLS,
          branch: repo.defaultBranch
        });
        
        // Check if schedule needs adjustment
        if (result.toolResults) {
          const newRiskProfile = this.analyzeResults(result.toolResults);
          const currentSchedule = await this.getRepositorySchedule(repo.url);
          const adjustedSchedule = adjustScheduleForRisk(currentSchedule, newRiskProfile);
          
          if (adjustedSchedule.frequency !== currentSchedule.frequency) {
            console.log(`Adjusting schedule for ${repo.url}: ${currentSchedule.frequency} → ${adjustedSchedule.frequency}`);
            await this.updateSchedule(repo.url, adjustedSchedule);
            this.rescheduleRepository(repo, adjustedSchedule);
          }
        }
      } catch (error) {
        console.error(`Scheduled scan failed for ${repo.url}:`, error);
      }
    }, interval);
    
    this.schedules.set(repo.url, timer);
  }
}
```

### 4. Notification Configuration

```typescript
interface NotificationConfig {
  channels: ('email' | 'slack' | 'github' | 'webhook')[];
  conditions: {
    onNewVulnerabilities: boolean;
    onScoreDecrease: boolean;
    onCriticalFindings: boolean;
    weeklyDigest: boolean;
  };
  recipients: {
    email?: string[];
    slack?: { channel: string; webhook: string };
    github?: { createIssue: boolean; addComment: boolean };
    webhook?: { url: string; secret: string };
  };
}

class NotificationService {
  async sendAnalysisNotification(
    repository: string,
    previousResult: AnalysisResult,
    currentResult: AnalysisResult,
    config: NotificationConfig
  ) {
    const changes = this.detectSignificantChanges(previousResult, currentResult);
    
    if (!changes.hasSignificantChanges && !config.conditions.weeklyDigest) {
      return; // No notification needed
    }
    
    const notification = this.buildNotification(repository, changes, currentResult);
    
    // Send to configured channels
    for (const channel of config.channels) {
      await this.sendToChannel(channel, notification, config.recipients);
    }
  }
}
```

## Recommended Schedule Configurations

### 1. For Active Development Teams

```json
{
  "schedule": {
    "development": {
      "frequency": "on-commit",
      "tools": ["npm-audit", "eslint"],
      "timeout": 60000
    },
    "staging": {
      "frequency": "daily",
      "tools": ["npm-audit", "license-checker", "madge"],
      "timeout": 180000
    },
    "production": {
      "frequency": "twice-daily",
      "tools": ["npm-audit", "license-checker"],
      "deepWiki": "weekly",
      "timeout": 300000
    }
  }
}
```

### 2. For Open Source Projects

```json
{
  "schedule": {
    "main": {
      "frequency": "weekly",
      "tools": "all",
      "publicDashboard": true
    },
    "pull_requests": {
      "frequency": "on-pr",
      "tools": ["npm-audit", "license-checker"],
      "autoComment": true
    },
    "releases": {
      "frequency": "on-release",
      "tools": "all",
      "generateReport": true
    }
  }
}
```

### 3. For Enterprise Monorepos

```json
{
  "schedule": {
    "packages/*": {
      "frequency": "daily",
      "tools": ["madge", "dependency-cruiser"],
      "aggregateResults": true
    },
    "apps/*": {
      "frequency": "twice-weekly",
      "tools": "all",
      "separateReports": true
    },
    "libs/*": {
      "frequency": "weekly",
      "tools": ["license-checker", "npm-outdated"],
      "notifyMaintainers": true
    }
  }
}
```

## Best Practices

1. **Start Conservative**: Begin with weekly scans and adjust based on findings
2. **Monitor Resource Usage**: Ensure scheduling doesn't overload systems
3. **Batch Similar Repos**: Run analyses for similar repositories together
4. **Use Off-Peak Hours**: Schedule intensive analyses during low-traffic periods
5. **Implement Backoff**: Reduce frequency for consistently clean repositories
6. **Alert Smartly**: Only notify on significant changes to avoid alert fatigue

## Metrics to Track

- Analysis completion rate
- Average execution time per repository size
- False positive rate
- Time to remediation after finding
- Schedule adjustment frequency
- Resource utilization patterns

## Conclusion

The scheduling system should be:
- **Adaptive**: Adjusts based on findings and activity
- **Efficient**: Minimizes unnecessary analyses
- **Timely**: Catches issues quickly without overwhelming
- **Configurable**: Respects user preferences and constraints

Start with activity-based scheduling, then layer on risk-based adjustments and user preferences for an optimal balance of security and efficiency.
