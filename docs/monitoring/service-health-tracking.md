# Service Health Tracking

**Last Updated: January 13, 2025**

## Overview

Service Health Tracking monitors the health and availability of CodeQual's critical services, particularly:
- **LSP/SARIF file uploads** to Supabase Storage
- **URL validation** (404 errors, timeouts)
- **Service errors** and unexpected states
- **Upload success rates** and availability metrics

This system provides real-time visibility into service health and enables proactive alerting when issues occur.

## Architecture

### Database Schema

The `service_health_events` table stores all health events:

```sql
CREATE TABLE service_health_events (
  id UUID PRIMARY KEY,
  event_type TEXT NOT NULL,           -- 'url_validation_failure', 'upload_failure', etc.
  service_name TEXT NOT NULL,          -- 'lsp', 'sarif', 'gitlab', 'manifest'
  status_code INTEGER,                 -- HTTP status code (404, 500, etc.)
  url TEXT,                            -- URL that failed or succeeded
  error_message TEXT,                  -- Error description
  error_details JSONB,                 -- Additional error context
  repository_url TEXT,                 -- Repository being analyzed
  pr_number INTEGER,                   -- PR number
  analysis_id TEXT,                    -- Unique analysis identifier
  metadata JSONB,                      -- Additional metadata
  created_at TIMESTAMP WITH TIME ZONE
);
```

### Event Types

1. **`url_validation_failure`** - URL returns 404, timeout, or other error
2. **`url_validation_success`** - URL validates successfully (HTTP 200)
3. **`upload_failure`** - File upload to Supabase Storage fails
4. **`upload_success`** - File upload succeeds
5. **`service_error`** - Unexpected service error or state

### Services Tracked

- **`lsp`** - LSP Code Actions file uploads and validation
- **`sarif`** - SARIF report file uploads and validation
- **`gitlab`** - GitLab Code Quality file uploads
- **`manifest`** - Manifest file uploads
- **`general`** - General service errors

## Implementation

### ServiceHealthTracker Class

Located at: `packages/agents/src/two-branch/monitoring/service-health-tracker.ts`

**Key Methods:**
- `trackUrlValidationFailure()` - Track 404s and validation errors
- `trackUrlValidationSuccess()` - Track successful validations
- `trackUploadFailure()` - Track upload failures
- `trackUploadSuccess()` - Track successful uploads
- `trackServiceError()` - Track general service errors
- `getHealthMetrics()` - Query metrics for dashboards

### Integration Points

1. **V9GroupedReportFormatter** - Tracks LSP/SARIF/GitLab uploads
2. **Test Validation** - Tracks URL validation during E2E tests
3. **Automatic Fallback** - Falls back to `error_logs` table if `service_health_events` doesn't exist

## Grafana Queries

### 1. Recent Failures (Last 24 Hours)

```sql
SELECT
  created_at as time,
  service_name,
  event_type,
  status_code,
  error_message,
  url,
  repository_url
FROM service_health_events
WHERE 
  (event_type LIKE '%failure%' OR event_type LIKE '%error%')
  AND created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

**Use in**: Table panel, Alert list

### 2. Service Availability (Success Rate)

```sql
SELECT
  service_name,
  COUNT(*) as total_events,
  COUNT(CASE WHEN event_type LIKE '%success%' THEN 1 END) as success_count,
  COUNT(CASE WHEN event_type LIKE '%failure%' OR event_type LIKE '%error%' THEN 1 END) as failure_count,
  ROUND(
    (COUNT(CASE WHEN event_type LIKE '%success%' THEN 1 END)::numeric / 
     NULLIF(COUNT(*), 0)::numeric) * 100, 
    2
  ) as success_rate_percent
FROM service_health_events
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY service_name
ORDER BY service_name;
```

**Use in**: Stat panels, Bar chart

### 3. 404 Errors by Service

```sql
SELECT
  service_name,
  COUNT(*) as error_count,
  COUNT(DISTINCT url) as unique_urls,
  COUNT(DISTINCT repository_url) as affected_repos
FROM service_health_events
WHERE 
  status_code = 404
  AND created_at >= NOW() - INTERVAL '24 hours'
GROUP BY service_name
ORDER BY error_count DESC;
```

**Use in**: Bar chart, Pie chart

### 4. Upload Success Rate Over Time

```sql
SELECT
  DATE_TRUNC('hour', created_at) as time,
  service_name,
  COUNT(CASE WHEN event_type = 'upload_success' THEN 1 END) as uploads_success,
  COUNT(CASE WHEN event_type = 'upload_failure' THEN 1 END) as uploads_failed,
  ROUND(
    (COUNT(CASE WHEN event_type = 'upload_success' THEN 1 END)::numeric / 
     NULLIF(COUNT(CASE WHEN event_type IN ('upload_success', 'upload_failure') THEN 1 END), 0)::numeric) * 100,
    2
  ) as success_rate
FROM service_health_events
WHERE 
  event_type IN ('upload_success', 'upload_failure')
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY 1, 2
ORDER BY 1, 2;
```

**Use in**: Time series panel

### 5. Top Failing URLs

```sql
SELECT
  url,
  service_name,
  COUNT(*) as failure_count,
  MAX(created_at) as last_failure,
  MAX(error_message) as latest_error
FROM service_health_events
WHERE 
  event_type LIKE '%failure%'
  AND created_at >= NOW() - INTERVAL '24 hours'
  AND url IS NOT NULL
GROUP BY url, service_name
ORDER BY failure_count DESC
LIMIT 20;
```

**Use in**: Table panel

### 6. Service Health Summary (Using View)

```sql
SELECT * FROM service_health_summary
WHERE first_event >= NOW() - INTERVAL '7 days'
ORDER BY service_name, event_type;
```

**Use in**: Table panel

### 7. Recent Service Failures (Using View)

```sql
SELECT * FROM recent_service_failures
LIMIT 50;
```

**Use in**: Alert list, Table panel

### 8. Service Availability Dashboard (Using View)

```sql
SELECT * FROM service_availability
ORDER BY failure_rate_percent DESC;
```

**Use in**: Stat panels, Gauge panels

## Grafana Dashboard Panels

### Panel 1: Service Availability Gauge

**Query:**
```sql
SELECT 
  success_rate_percent as value,
  service_name as label
FROM service_availability
WHERE service_name = 'lsp';
```

**Visualization**: Gauge
**Thresholds**: 
- Green: >= 95%
- Yellow: >= 90%
- Red: < 90%

### Panel 2: Recent Failures Timeline

**Query:**
```sql
SELECT
  created_at as time,
  service_name,
  COUNT(*) as failures
FROM service_health_events
WHERE 
  (event_type LIKE '%failure%' OR event_type LIKE '%error%')
  AND created_at >= NOW() - INTERVAL '24 hours'
GROUP BY 1, 2
ORDER BY 1;
```

**Visualization**: Time series
**Legend**: `{{service_name}}`

### Panel 3: 404 Errors by Service

**Query:**
```sql
SELECT
  service_name,
  COUNT(*) as error_count
FROM service_health_events
WHERE 
  status_code = 404
  AND created_at >= NOW() - INTERVAL '24 hours'
GROUP BY service_name;
```

**Visualization**: Bar chart
**X-axis**: `service_name`
**Y-axis**: `error_count`

### Panel 4: Upload Success Rate

**Query:**
```sql
SELECT
  service_name,
  ROUND(
    (COUNT(CASE WHEN event_type = 'upload_success' THEN 1 END)::numeric / 
     NULLIF(COUNT(CASE WHEN event_type IN ('upload_success', 'upload_failure') THEN 1 END), 0)::numeric) * 100,
    2
  ) as success_rate
FROM service_health_events
WHERE 
  event_type IN ('upload_success', 'upload_failure')
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY service_name;
```

**Visualization**: Stat panel
**Unit**: Percent (0-100)

## Alerts

### Alert 1: High 404 Error Rate

**Condition:**
```sql
SELECT COUNT(*) as error_count
FROM service_health_events
WHERE 
  status_code = 404
  AND created_at >= NOW() - INTERVAL '1 hour';
```

**Threshold**: `error_count > 10`
**Severity**: Warning
**Notification**: Slack/Email

### Alert 2: Upload Failure Rate > 5%

**Condition:**
```sql
SELECT 
  ROUND(
    (COUNT(CASE WHEN event_type = 'upload_failure' THEN 1 END)::numeric / 
     NULLIF(COUNT(CASE WHEN event_type IN ('upload_success', 'upload_failure') THEN 1 END), 0)::numeric) * 100,
    2
  ) as failure_rate
FROM service_health_events
WHERE 
  event_type IN ('upload_success', 'upload_failure')
  AND created_at >= NOW() - INTERVAL '1 hour';
```

**Threshold**: `failure_rate > 5`
**Severity**: Critical
**Notification**: PagerDuty/Slack

### Alert 3: Service Unavailable

**Condition:**
```sql
SELECT COUNT(*) as error_count
FROM service_health_events
WHERE 
  event_type = 'service_error'
  AND created_at >= NOW() - INTERVAL '15 minutes';
```

**Threshold**: `error_count > 0`
**Severity**: Critical
**Notification**: PagerDuty

## Database Views

The migration creates three helpful views:

### 1. `service_health_summary`
Aggregated metrics by service and event type.

### 2. `recent_service_failures`
All failures in the last 24 hours, sorted by most recent.

### 3. `service_availability`
Success/failure rates and percentages for each service.

## Migration

Run the migration to create the table and views:

```bash
# From project root
psql $DATABASE_URL -f packages/database/migrations/20250113_service_health_events.sql
```

Or via Supabase Dashboard:
1. Go to SQL Editor
2. Copy contents of `20250113_service_health_events.sql`
3. Execute

## Troubleshooting

### ServiceHealthTracker Errors

If you see `[ServiceHealthTracker] ❌ Failed to track event: {}`:

1. **Check if table exists:**
   ```sql
   SELECT EXISTS (
     SELECT FROM information_schema.tables 
     WHERE table_name = 'service_health_events'
   );
   ```

2. **Run migration if missing:**
   ```bash
   psql $DATABASE_URL -f packages/database/migrations/20250113_service_health_events.sql
   ```

3. **Check RLS policies:**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'service_health_events';
   ```

### Fallback to error_logs

If `service_health_events` doesn't exist, the tracker automatically falls back to the `error_logs` table. Check there for events:

```sql
SELECT * FROM error_logs 
WHERE error_code LIKE 'SVC-%'
ORDER BY created_at DESC
LIMIT 20;
```

## Best Practices

1. **Monitor Daily**: Check service availability dashboard daily
2. **Set Alerts**: Configure alerts for failure rates > 5%
3. **Investigate 404s**: Any 404 should be investigated immediately
4. **Track Trends**: Monitor success rates over time to catch degradation
5. **Review Weekly**: Weekly review of top failing URLs and services

## Related Documentation

- [Grafana Setup Guide](./grafana-setup-guide.md)
- [Grafana Supabase Queries](./grafana-supabase-queries.sql)
- [Production Monitoring Plan](./production-monitoring-plan.md)


