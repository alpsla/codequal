# Organization Settings Management

## Overview

The CodeQual organization settings system provides comprehensive configuration options for teams to customize their scanning, notification, integration, display, and resource usage preferences. Settings are stored as JSON in the database and can be updated through the API.

## Architecture Decision: Settings Storage

We chose to store settings as a JSON column in the organizations table rather than creating separate tables for each setting category. This provides:

1. **Flexibility** - Easy to add new settings without schema changes
2. **Performance** - Single query to fetch all settings
3. **Simplicity** - No complex joins required
4. **Versioning** - Easy to implement settings versioning later
5. **Defaults** - Simple to merge with default values

## Settings Categories

### 1. Scan Settings (`scan_settings`)

Controls how and when repositories are scanned for code quality issues.

```json
{
  "auto_scan_enabled": true,        // Enable automatic scanning
  "scan_frequency": "daily",        // Options: hourly, daily, weekly, manual
  "scan_schedule": "02:00",         // Time in HH:MM format (24-hour)
  "scan_on_push": true,             // Trigger scan on repository push
  "scan_draft_prs": false,          // Include draft PRs in scans
  "ignored_paths": ["dist/", "build/"], // Paths to exclude from scanning
  "custom_rules_enabled": false     // Enable organization-specific rules
}
```

**Use Cases:**
- **Daily scans at 2 AM** - Default for most organizations to avoid peak hours
- **Scan on push** - Immediate feedback for developers
- **Ignore build folders** - Skip generated/compiled code
- **Manual only** - For organizations wanting full control

### 2. Notification Settings (`notification_settings`)

Manages how teams receive alerts and reports.

```json
{
  "email_notifications": true,      // Master email toggle
  "slack_enabled": false,           // Enable Slack integration
  "slack_webhook_url": null,        // Slack webhook for notifications
  "notify_on_critical": true,       // Alert on critical issues
  "notify_on_high": true,           // Alert on high severity
  "notify_on_medium": false,        // Alert on medium severity
  "notify_on_low": false,           // Alert on low severity
  "daily_summary": true,            // Daily summary email
  "weekly_report": true             // Weekly progress report
}
```

**Use Cases:**
- **Critical only** - Teams that want minimal interruption
- **Slack integration** - Real-time alerts in team channels
- **Daily summaries** - Manager oversight without noise
- **All severities** - Security-focused teams

### 3. Integration Settings (`integration_settings`)

Controls third-party platform integrations.

```json
{
  "github_checks_enabled": true,    // Add checks to GitHub PRs
  "gitlab_pipeline_enabled": true,  // Integrate with GitLab CI/CD
  "auto_comment_on_pr": true,       // Add analysis comments to PRs
  "block_merge_on_critical": true,  // Prevent merging critical issues
  "require_approval_on_high": false // Require review for high issues
}
```

**Use Cases:**
- **Block critical merges** - Enforce quality gates
- **PR comments** - Inline feedback for developers
- **No blocking** - Advisory-only mode
- **Approval workflow** - Additional review for high-risk changes

### 4. Display Settings (`display_settings`)

UI and report presentation preferences.

```json
{
  "default_theme": "light",         // Options: light, dark, system
  "show_code_snippets": true,       // Include code in reports
  "show_learning_resources": true,  // Show educational content
  "compact_view": false,            // Condensed UI layout
  "default_language": "en"          // Interface language
}
```

**Use Cases:**
- **Dark theme** - Developer preference
- **No code snippets** - Privacy/security concerns
- **Compact view** - More data on screen
- **Learning mode** - Junior developer teams

### 5. Resource Limits (`limits`)

Manage resource usage and data retention.

```json
{
  "max_file_size_mb": 10,          // Max file size to scan (1-50)
  "max_files_per_scan": 1000,      // Max files per analysis (10-5000)
  "retention_days": 90,             // Keep data for X days (7-365)
  "concurrent_scans": 3             // Parallel scan limit (1-10)
}
```

**Use Cases:**
- **Large files** - ML models, data files
- **Monorepos** - Thousands of files
- **Compliance** - Long retention for audits
- **Performance** - Limit concurrent scans

## API Usage Examples

### Get Current Settings
```bash
GET /api/organizations/:id/settings
Authorization: Bearer <token>

Response:
{
  "settings": {
    "scan_settings": { ... },
    "notification_settings": { ... },
    "integration_settings": { ... },
    "display_settings": { ... },
    "limits": { ... }
  }
}
```

### Update Specific Settings
```bash
PUT /api/organizations/:id/settings
Authorization: Bearer <token>
Content-Type: application/json

{
  "scan_settings": {
    "scan_frequency": "weekly",
    "scan_schedule": "09:00"
  },
  "notification_settings": {
    "slack_enabled": true,
    "slack_webhook_url": "https://hooks.slack.com/..."
  }
}
```

## Implementation Details

### Default Values
All settings have sensible defaults that work for most organizations. When creating a new organization, only the defaults are stored initially.

### Partial Updates
The API supports partial updates - you only need to send the settings you want to change. The system merges your updates with existing settings.

### Validation
- Database triggers validate settings on insert/update
- API validates input using Zod schemas
- Invalid values are rejected with clear error messages

### Migration Path
For future setting additions:
1. Add to default settings in code
2. Add to validation schemas
3. Existing organizations automatically get defaults
4. No database migration required

## Testing Approach

We created a hybrid testing approach:

1. **Unit Tests** (`src/tests/organizations.test.ts`)
   - Mock Supabase calls
   - Test validation logic
   - Test permission checks
   - Fast, no external dependencies

2. **Integration Tests** (`test-user-org-hybrid.js`)
   - Real API calls
   - Manual Magic Link flow
   - Automated endpoint testing
   - Comprehensive coverage

This approach allows:
- Fast unit tests for CI/CD
- Real-world integration testing
- Manual testing of auth flows
- Flexibility for different scenarios

## Future Enhancements

1. **Settings Templates** - Pre-configured settings for common use cases
2. **Settings History** - Track who changed what and when
3. **Settings Inheritance** - Organization-wide defaults with team overrides
4. **Advanced Scheduling** - Cron expressions for complex schedules
5. **Webhook Integrations** - Generic webhooks beyond Slack
6. **Custom Rules Editor** - UI for creating organization-specific rules