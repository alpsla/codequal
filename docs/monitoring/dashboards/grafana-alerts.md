# Grafana Alerts Dashboard

## Overview

Comprehensive alerting dashboard for monitoring CodeQual system performance, security, financial metrics, and critical issues.

## Dashboard Configuration

- **File**: `/monitoring/codequal-alerts-dashboard.json`
- **Dashboard UID**: `codequal-alerts`
- **Refresh Rate**: 10 seconds
- **Time Range**: Last 6 hours (default)

## Alert Categories

### 1. Performance Alerts

#### API Response Time
- **Threshold**: > 5000ms (5 seconds)
- **Severity**: Warning
- **Panel**: Time series graph
- **Metric**: `api_response_time_ms`

#### Database Query Time
- **Threshold**: > 1000ms (1 second)
- **Severity**: Critical
- **Panel**: Gauge
- **Metric**: `database_query_time_ms`

### 2. Security Alerts

#### Unauthorized Access Attempts
- **Threshold**: > 10 attempts/hour
- **Severity**: Critical
- **Panel**: Stat panel
- **Query**: Checks auth.audit_log_entries

#### Rate Limit Violations
- **Threshold**: > 50 violations/5min
- **Severity**: Warning
- **Panel**: Time series
- **Metric**: `rate_limit_violations`

### 3. Financial Alerts

#### Daily API Cost
- **Threshold**: > $100
- **Severity**: Warning
- **Panel**: Stat with currency
- **Calculation**: Based on token usage

#### Per-Analysis Cost
- **Threshold**: > $5
- **Severity**: Warning
- **Panel**: Table view
- **Shows**: Repository, cost, models used

### 4. Critical System Alerts

#### Analysis Failure Rate
- **Threshold**: > 10%
- **Severity**: Critical
- **Panel**: Gauge
- **Calculation**: Failed/Total analyses

#### DeepWiki Storage
- **Threshold**: > 85%
- **Severity**: Critical
- **Panel**: Gauge with thresholds
- **Visual**: Red/Yellow/Green zones

#### Token Limit Usage
- **Threshold**: > 80% of daily limit
- **Severity**: Warning (80%), Critical (90%)
- **Panel**: Percentage gauge

## Panel Details

### Critical Issues Alert (Panel 1)
```json
{
  "id": 1,
  "title": "🚨 Critical Issues Alert",
  "type": "stat",
  "gridPos": { "x": 0, "y": 0, "w": 6, "h": 4 }
}
```

### System Health Score (Panel 6)
```json
{
  "id": 6,
  "title": "📊 System Health Score",
  "type": "gauge",
  "gridPos": { "x": 18, "y": 8, "w": 6, "h": 8 }
}
```

## SQL Queries

### Failed Analysis Count
```sql
SELECT COUNT(*) as value 
FROM pr_reviews 
WHERE status = 'failed' 
AND created_at > NOW() - INTERVAL '15 minutes'
```

### Cost Calculation
```sql
SELECT 
  pr.id,
  pr.repository_url,
  SUM((ar.input_tokens * 0.00001) + (ar.output_tokens * 0.00003)) as estimated_cost
FROM pr_reviews pr 
JOIN analysis_results ar ON pr.id = ar.pr_review_id 
WHERE pr.created_at > NOW() - INTERVAL '1 hour'
GROUP BY pr.id, pr.repository_url
HAVING SUM((ar.input_tokens * 0.00001) + (ar.output_tokens * 0.00003)) > 1.0
```

## Import Instructions

1. **Open Grafana**: Navigate to your Grafana instance
2. **Import Dashboard**: 
   - Go to Dashboards → Import
   - Upload `/monitoring/codequal-alerts-dashboard.json`
3. **Configure Data Source**:
   - Select your Supabase PostgreSQL data source
   - Map to `CodeQual-Supabase`
4. **Set Variables**: Configure any dashboard variables if needed

## Alert Configuration

### Setting Up Notifications

1. **Navigate to Alerting** → **Notification channels**
2. **Add channels**:
   - **Slack**: For warning-level alerts
   - **Email**: For critical alerts
   - **PagerDuty**: For system-critical issues

### Alert Rules

Each panel with alerts has conditions defined:
- **Evaluator**: Threshold comparison (gt, lt, eq)
- **Query**: Time range for evaluation
- **Frequency**: How often to check (typically 1-5 minutes)
- **Handler**: Notification channel to use

## Customization

### Modify Thresholds
Edit the dashboard JSON to adjust alert thresholds:
```json
"evaluator": {
  "params": [5000],  // Change this value
  "type": "gt"
}
```

### Add New Panels
1. Edit dashboard in Grafana
2. Add panel with query
3. Configure alert rules
4. Export updated JSON