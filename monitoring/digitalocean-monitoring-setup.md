# DigitalOcean Monitoring Setup for DeepWiki

This guide explains how to set up monitoring for the simplified DeepWiki storage system using DigitalOcean's built-in monitoring and alerts.

## 1. Enable DigitalOcean Monitoring

### For Kubernetes Cluster:
```bash
# Enable monitoring on your DOKS cluster
doctl kubernetes cluster update <cluster-id> --enable-monitoring
```

### For Droplets (if using standalone):
```bash
# Install monitoring agent
curl -sSL https://repos.insights.digitalocean.com/install.sh | sudo bash
```

## 2. Create Custom Metrics

DeepWiki exposes metrics at `/api/deepwiki/temp/metrics`. Configure DigitalOcean to scrape these:

### Using DigitalOcean API:
```bash
curl -X POST \
  https://api.digitalocean.com/v2/monitoring/metrics/custom \
  -H "Authorization: Bearer $DO_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "deepwiki_storage_usage",
    "query": "deepwiki_temp_used_gb / deepwiki_temp_total_gb * 100",
    "unit": "percent",
    "tags": ["deepwiki", "storage"]
  }'
```

## 3. Set Up Alerts

### Alert 1: High Storage Usage (Warning)
```json
{
  "alerts": [{
    "email": ["platform@codequal.dev"],
    "slack": [{
      "channel": "platform-alerts",
      "url": "$SLACK_WEBHOOK_URL"
    }],
    "compare": "GreaterThan",
    "value": 80,
    "window": "5m",
    "times": 1,
    "description": "DeepWiki storage above 80%"
  }]
}
```

### Alert 2: Critical Storage (Page)
```json
{
  "alerts": [{
    "email": ["oncall@codequal.dev"],
    "slack": [{
      "channel": "platform-critical",
      "url": "$SLACK_CRITICAL_WEBHOOK"
    }],
    "compare": "GreaterThan",
    "value": 90,
    "window": "2m",
    "times": 1,
    "description": "DeepWiki storage CRITICAL - above 90%"
  }]
}
```

### Alert 3: No Available Space
```json
{
  "alerts": [{
    "email": ["oncall@codequal.dev"],
    "compare": "LessThan",
    "value": 2,
    "window": "1m",
    "times": 1,
    "description": "DeepWiki has less than 2GB available"
  }]
}
```

## 4. Create Dashboard

### Via DigitalOcean UI:

1. Go to Monitoring → Dashboards
2. Click "Create Dashboard"
3. Name: "DeepWiki Temp Storage Monitor"
4. Add widgets:

#### Widget 1: Storage Usage Gauge
```yaml
type: gauge
title: "Storage Usage %"
query: "(deepwiki_temp_used_gb / deepwiki_temp_total_gb) * 100"
thresholds:
  - value: 70
    color: yellow
  - value: 85
    color: red
```

#### Widget 2: Active Analyses
```yaml
type: counter
title: "Active Analyses"
query: "deepwiki_active_analyses_count"
```

#### Widget 3: Available Space
```yaml
type: stat
title: "Available GB"
query: "deepwiki_temp_available_gb"
unit: "GB"
```

#### Widget 4: Usage Timeline
```yaml
type: graph
title: "Storage Usage Over Time"
queries:
  - name: "Used GB"
    query: "deepwiki_temp_used_gb"
  - name: "Total GB"
    query: "deepwiki_temp_total_gb"
period: "24h"
```

## 5. API Integration

### Create API Token for Metrics:
```bash
curl -X POST \
  https://api.digitalocean.com/v2/tokens \
  -H "Authorization: Bearer $DO_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "deepwiki-metrics-writer",
    "scopes": ["monitoring:write"]
  }'
```

### Push Metrics from DeepWiki:
```typescript
// In your DeepWiki metrics exporter
async function pushToDigitalOcean(metrics: TempSpaceMetrics) {
  const payload = {
    metrics: [
      {
        name: "deepwiki_temp_used_gb",
        value: metrics.usedGB,
        timestamp: Date.now()
      },
      {
        name: "deepwiki_temp_total_gb",
        value: metrics.totalGB,
        timestamp: Date.now()
      },
      {
        name: "deepwiki_active_analyses_count",
        value: metrics.activeAnalyses,
        timestamp: Date.now()
      }
    ]
  };

  await fetch('https://api.digitalocean.com/v2/monitoring/metrics', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.DO_METRICS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
}
```

## 6. Mobile App Alerts

1. Download DigitalOcean mobile app
2. Enable push notifications
3. Configure critical alerts to push to mobile

## 7. Runbook URLs

Create these runbook pages in your docs:

- `/runbooks/deepwiki-storage-high` - Steps to handle high storage
- `/runbooks/deepwiki-storage-critical` - Emergency storage procedures
- `/runbooks/deepwiki-autoscale-failed` - Manual scaling steps

## 8. Testing Alerts

### Simulate high usage:
```bash
# Create large test files
kubectl exec -n codequal-prod deepwiki-pod -- \
  dd if=/dev/zero of=/tmp/test-large bs=1G count=8

# Wait for alert (should trigger in 5 minutes)

# Clean up
kubectl exec -n codequal-prod deepwiki-pod -- rm /tmp/test-large
```

## 9. Integration with Existing Monitoring

If you already have Grafana:

### Add DigitalOcean as Data Source:
```yaml
apiVersion: 1
datasources:
  - name: DigitalOcean
    type: digitalocean-metrics-datasource
    access: proxy
    jsonData:
      apiToken: $DO_API_TOKEN
```

### Import Dashboard:
Use the provided `grafana-deepwiki-dashboard.json` or create from DigitalOcean metrics.

## 10. Cost Monitoring

Set up cost alerts for storage scaling:

```json
{
  "alerts": [{
    "email": ["billing@codequal.dev"],
    "compare": "GreaterThan",
    "value": 20,
    "window": "24h",
    "description": "DeepWiki storage cost exceeds $20/month"
  }]
}
```

## Environment Variables Needed

Add to your `.env`:
```bash
DO_API_TOKEN=your-digitalocean-api-token
DO_METRICS_TOKEN=your-metrics-write-token
SLACK_WEBHOOK_URL=your-slack-webhook
SLACK_CRITICAL_WEBHOOK=your-critical-slack-webhook
```

## Verification

1. Check metrics endpoint:
   ```bash
   curl http://localhost:3001/api/deepwiki/temp/metrics
   ```

2. Verify in DigitalOcean UI:
   - Go to Monitoring → Metrics
   - Search for "deepwiki"
   - Should see all custom metrics

3. Test alert:
   - Fill storage to >80%
   - Wait 5 minutes
   - Check email/Slack for alert