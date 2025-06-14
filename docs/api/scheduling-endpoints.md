# Repository Scheduling API Documentation

## Overview

The CodeQual scheduling system automatically creates and manages analysis schedules for repositories after their first PR analysis. Schedules are intelligently determined based on repository activity, finding severity, and other metrics.

## Automatic Schedule Creation

When a PR analysis completes successfully, the system automatically:

1. **Evaluates the repository** based on:
   - Number and severity of findings
   - Repository activity metrics
   - Whether it's a production repository
   
2. **Creates an appropriate schedule**:
   - **Critical (every 6 hours)**: Repositories with critical security issues
   - **Daily**: Active repositories or production systems
   - **Weekly**: Moderately active repositories
   - **Monthly**: Low activity repositories
   - **On-demand**: Inactive repositories

3. **Configures tool selection** based on frequency:
   - Critical schedules run only essential security tools
   - Less frequent schedules run comprehensive tool suites

## API Endpoints

### List All Schedules

```http
GET /api/schedules
Authorization: Bearer <token>
```

**Response:**
```json
{
  "schedules": [
    {
      "id": "uuid",
      "repositoryUrl": "https://github.com/org/repo",
      "frequency": "daily",
      "priority": "high",
      "enabledTools": ["npm-audit", "license-checker", "madge"],
      "isActive": true,
      "lastRunAt": "2025-06-15T02:00:00Z",
      "nextRunAt": "2025-06-16T02:00:00Z"
    }
  ],
  "total": 1
}
```

### Get Repository Schedule

```http
GET /api/repositories/:repoUrl/schedule
Authorization: Bearer <token>
```

**Response:**
```json
{
  "current": {
    "id": "uuid",
    "repositoryUrl": "https://github.com/org/repo",
    "frequency": "daily",
    "cronExpression": "0 2 * * *",
    "priority": "high",
    "reason": "High development activity (85 score) benefits from daily analysis",
    "canBeDisabled": true,
    "isActive": true
  },
  "suggestions": [
    {
      "frequency": "weekly",
      "reason": "Reduce frequency if activity decreases",
      "condition": "if_activity_decreases"
    }
  ],
  "canModify": true
}
```

### Update Repository Schedule

```http
PUT /api/repositories/:repoUrl/schedule
Authorization: Bearer <token>
Content-Type: application/json

{
  "frequency": "weekly",
  "enabledTools": ["npm-audit", "license-checker"],
  "notificationChannels": ["email", "in-app"]
}
```

**Response:**
```json
{
  "id": "uuid",
  "repositoryUrl": "https://github.com/org/repo",
  "frequency": "weekly",
  "updatedAt": "2025-06-15T10:30:00Z"
}
```

### Pause Schedule

```http
POST /api/repositories/:repoUrl/schedule/pause
Authorization: Bearer <token>
```

**Response:**
```json
{
  "status": "paused"
}
```

**Note:** Schedules for repositories with critical issues cannot be paused.

### Resume Schedule

```http
POST /api/repositories/:repoUrl/schedule/resume
Authorization: Bearer <token>
```

**Response:**
```json
{
  "status": "resumed"
}
```

### Manually Trigger Analysis

```http
POST /api/repositories/:repoUrl/schedule/run
Authorization: Bearer <token>
```

**Response:**
```json
{
  "status": "triggered",
  "jobId": "job-uuid",
  "message": "Manual analysis started for repository"
}
```

## Schedule Frequencies

| Frequency | Cron Expression | When it runs | Use case |
|-----------|----------------|--------------|----------|
| every-6-hours | `0 */6 * * *` | 00:00, 06:00, 12:00, 18:00 UTC | Critical security issues |
| daily | `0 2 * * *` | 02:00 UTC | Active development |
| weekly | `0 3 * * 1` | Monday 03:00 UTC | Moderate activity |
| monthly | `0 3 1 * *` | 1st of month 03:00 UTC | Low activity |
| on-demand | (none) | Manual only | Inactive repos |

## Automatic Schedule Adjustments

The system automatically adjusts schedules based on:

1. **Escalation triggers**:
   - New critical findings → Escalate to every-6-hours
   - Significant increase in findings → Increase frequency
   
2. **De-escalation triggers**:
   - All critical issues resolved → Reduce frequency
   - No new issues for multiple runs → Reduce frequency
   - Repository becomes inactive → Switch to on-demand

## Tool Selection by Schedule

Different schedules run different tool sets to optimize for speed vs. comprehensiveness:

### Critical Schedule (every-6-hours)
- `npm-audit` - Security vulnerabilities
- `license-checker` - License compliance

### Daily Schedule
- `npm-audit` - Security vulnerabilities
- `license-checker` - License compliance
- `madge` - Circular dependencies

### Weekly/Monthly Schedule
- All available tools for comprehensive analysis

## Error Handling

- Schedule creation failures don't affect PR analysis completion
- Failed scheduled runs are logged and retried
- Users are notified of persistent failures

## Examples

### Example: First Analysis Creates Schedule

```bash
# 1. Analyze a PR
POST /api/analyze-pr
{
  "repositoryUrl": "https://github.com/myorg/myrepo",
  "prNumber": 123
}

# 2. Schedule is automatically created based on findings
# If 2 critical issues found, creates every-6-hours schedule
# System notifies: "Automatic schedule created: every-6-hours"

# 3. Check the created schedule
GET /api/repositories/https%3A%2F%2Fgithub.com%2Fmyorg%2Fmyrepo/schedule
```

### Example: Manual Schedule Override

```bash
# Change from automatic daily to weekly
PUT /api/repositories/https%3A%2F%2Fgithub.com%2Fmyorg%2Fmyrepo/schedule
{
  "frequency": "weekly",
  "reason": "Low priority project"
}
```

### Example: Pause Non-Critical Schedule

```bash
# Pause schedule (only works if no critical issues)
POST /api/repositories/https%3A%2F%2Fgithub.com%2Fmyorg%2Fmyrepo/schedule/pause

# Resume later
POST /api/repositories/https%3A%2F%2Fgithub.com%2Fmyorg%2Fmyrepo/schedule/resume
```

## Best Practices

1. **Let automatic scheduling work**: The system intelligently determines schedules
2. **Monitor critical repositories**: Don't disable schedules for production systems
3. **Review schedule suggestions**: The API provides recommendations
4. **Use manual triggers sparingly**: For urgent checks between scheduled runs
5. **Configure notifications**: Ensure you're alerted to critical findings

## Implementation Status

✅ **Completed:**
- Automatic schedule creation after first analysis
- Schedule CRUD operations API
- Cron job management
- Tool selection based on frequency
- Schedule adjustment logic

🔲 **Planned Enhancements:**
- Email/Slack notifications
- Schedule analytics dashboard
- Cross-repository scheduling optimization
- Custom cron expression support
- Schedule templates
