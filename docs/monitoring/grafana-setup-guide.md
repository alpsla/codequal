# Grafana DeepWiki Monitoring Setup Guide

## Overview

This guide will help you set up Grafana dashboards and alerts for monitoring DeepWiki disk space usage, including:
- Real-time disk usage visualization
- Repository count tracking
- Historical trends
- Automated alerts at warning (70%) and critical (85%) thresholds

## Prerequisites

- Grafana already installed and connected to Supabase
- Prometheus or similar metrics collector configured
- Access to Grafana admin panel

## Step 1: Access Grafana

1. Open Grafana in your browser (typically `http://localhost:3000`)
2. Login with your admin credentials
3. Navigate to **Dashboards** → **New Dashboard**

## Step 2: Configure Data Source

### Option A: Using Prometheus (Recommended)

1. Go to **Configuration** → **Data Sources**
2. Click **Add data source**
3. Select **Prometheus**
4. Configure:
   ```yaml
   URL: http://localhost:9090
   Access: Server (default)
   ```
5. Click **Save & Test**

### Option B: Using Supabase Direct Query

1. Go to **Configuration** → **Data Sources**
2. Click **Add data source**
3. Select **PostgreSQL**
4. Configure:
   ```yaml
   Host: Your Supabase host
   Database: postgres
   User: Your database user
   Password: Your database password
   SSL Mode: require
   ```

## Step 3: Import Dashboard

1. Go to **Dashboards** → **Import**
2. Upload the JSON file: `/docs/monitoring/grafana-deepwiki-dashboard.json`
3. Select your data source when prompted
4. Click **Import**

## Step 4: Create Custom Queries

### Disk Usage Query (Prometheus)
```promql
# Current disk usage percentage
deepwiki_disk_usage_percent

# Disk usage over time
deepwiki_disk_used_gb[1h]

# Available space
deepwiki_disk_available_gb
```

### Repository Count Query (Prometheus)
```promql
# Active repositories
deepwiki_active_repositories

# Repository count over time
increase(deepwiki_repositories_analyzed_total[1h])
```

### Direct Database Queries (PostgreSQL)
```sql
-- Disk usage metrics (if stored in database)
SELECT 
  created_at as time,
  disk_usage_percent,
  disk_used_gb,
  active_repositories
FROM deepwiki_metrics
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at;

-- Repository analysis history
SELECT 
  DATE_TRUNC('hour', created_at) as time,
  COUNT(*) as repos_analyzed,
  AVG(disk_usage_mb) as avg_repo_size
FROM analysis_history
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY 1
ORDER BY 1;
```

## Step 5: Configure Alerts

### 1. Create Alert Rules

Go to **Alerting** → **Alert Rules** → **New Alert Rule**

#### Warning Alert (70% Disk Usage)
```yaml
Name: DeepWiki Disk Usage Warning
Condition: 
  Query: deepwiki_disk_usage_percent
  Condition: WHEN last() OF query(A, 5m, now) IS ABOVE 70
  For: 5m
Labels:
  severity: warning
  service: deepwiki
Annotations:
  summary: DeepWiki disk usage is at {{ $value }}%
  description: Disk usage has exceeded 70% threshold
```

#### Critical Alert (85% Disk Usage)
```yaml
Name: DeepWiki Disk Usage Critical
Condition:
  Query: deepwiki_disk_usage_percent
  Condition: WHEN last() OF query(A, 5m, now) IS ABOVE 85
  For: 2m
Labels:
  severity: critical
  service: deepwiki
Annotations:
  summary: CRITICAL: DeepWiki disk usage is at {{ $value }}%
  description: Immediate cleanup required!
```

### 2. Configure Notification Channels

Go to **Alerting** → **Contact Points**

#### Email Notification
```yaml
Type: Email
Name: DeepWiki Alerts
Addresses: your-email@example.com
Subject: [{{ .Status }}] DeepWiki Disk Alert
```

#### Slack Notification
```yaml
Type: Slack
Name: DeepWiki Slack
Webhook URL: https://hooks.slack.com/services/YOUR/WEBHOOK/URL
Channel: #deepwiki-alerts
```

## Step 6: Create Visualization Panels

### Panel 1: Disk Usage Gauge
- **Visualization**: Gauge
- **Query**: `deepwiki_disk_usage_percent`
- **Thresholds**: 
  - Green: 0-50%
  - Yellow: 50-70%
  - Red: 70-100%

### Panel 2: Historical Disk Usage
- **Visualization**: Time series
- **Query**: 
  ```promql
  deepwiki_disk_used_gb{job="deepwiki"}
  ```
- **Legend**: Used Space (GB)
- **Y-axis**: GB

### Panel 3: Repository Count
- **Visualization**: Stat
- **Query**: `deepwiki_active_repositories`
- **Display**: Last value
- **Color**: Value-based coloring

### Panel 4: Analysis Rate
- **Visualization**: Graph
- **Query**: 
  ```promql
  rate(deepwiki_repositories_analyzed_total[5m])
  ```
- **Legend**: Repos/minute

## Step 7: Dashboard Variables

Add interactive filters:

1. Click **Dashboard Settings** → **Variables**
2. Add new variable:
   ```yaml
   Name: timeRange
   Type: Interval
   Values: 5m,15m,30m,1h,6h,12h,24h,7d
   ```

## Step 8: Auto-refresh

1. Click the dropdown next to the refresh button
2. Select auto-refresh interval (recommended: 30s for real-time monitoring)

## Step 9: Save and Share

1. Click **Save Dashboard**
2. Name: "DeepWiki Disk Monitoring"
3. Folder: "Infrastructure" or "Monitoring"
4. Click **Save**

## Testing Alerts

To test your alerts:

```bash
# Simulate high disk usage
kubectl exec -n codequal-dev deployment/deepwiki -- \
  dd if=/dev/zero of=/root/.adalflow/test-file bs=1G count=5

# Wait for alert to trigger

# Clean up
kubectl exec -n codequal-dev deployment/deepwiki -- \
  rm -f /root/.adalflow/test-file
```

## Troubleshooting

### No Data Points
- Check if metrics endpoint is accessible
- Verify Prometheus is scraping the endpoint
- Check time range selection

### Alerts Not Firing
- Verify alert rules syntax
- Check notification channel configuration
- Review alert state in Alert Rules page

### Performance Issues
- Reduce query time range
- Add query caching
- Optimize panel refresh rates

## Best Practices

1. **Set appropriate thresholds** based on your disk size:
   - Warning: 70% (time to plan cleanup)
   - Critical: 85% (immediate action required)

2. **Configure alert delays** to avoid false positives:
   - Warning: 5 minutes
   - Critical: 2 minutes

3. **Use meaningful alert messages** with context:
   - Include current value
   - Suggest actions
   - Link to runbooks

4. **Regular maintenance**:
   - Review alert history weekly
   - Adjust thresholds based on patterns
   - Update notification recipients

## Next Steps

1. Create additional dashboards for:
   - API performance metrics
   - Error rates and types
   - Cost tracking per analysis

2. Integrate with:
   - PagerDuty for on-call rotation
   - Jira for automatic ticket creation
   - Runbook automation for cleanup

3. Set up:
   - SLO/SLI tracking
   - Capacity planning dashboards
   - Multi-cluster monitoring