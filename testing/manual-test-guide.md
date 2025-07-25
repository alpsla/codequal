# Manual Testing Guide for DeepWiki Simplified Implementation

## Prerequisites

1. Ensure API server is running
2. Have your environment variables set:
   ```bash
   export DEEPWIKI_POD_NAME=deepwiki-pod
   export DEEPWIKI_NAMESPACE=codequal-dev
   export DO_API_TOKEN=your-digitalocean-token
   export DO_METRICS_TOKEN=your-metrics-token
   export SLACK_WEBHOOK_URL=your-slack-webhook
   export PROMETHEUS_BEARER_TOKEN=your-prometheus-token
   ```

## 1. Test DeepWiki Basic Functionality

### Start the API Server
```bash
cd "/Users/alpinro/Code Prjects/codequal/apps/api"
npm run dev
```

### Test Health Check
```bash
curl http://localhost:3001/health
```

### Test Metrics Endpoint
```bash
curl http://localhost:3001/api/metrics
```

### Test DeepWiki Temp Storage Metrics
```bash
# Get metrics (requires auth)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3001/api/deepwiki/temp/metrics
```

## 2. Generate Fresh DeepWiki Report

### Option A: Using the API Endpoint
```bash
# Analyze a repository
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "repositoryUrl": "https://github.com/anthropics/claude-code",
    "branch": "main"
  }' \
  http://localhost:3001/api/repository/analyze
```

### Option B: Using Test Script
```bash
cd "/Users/alpinro/Code Prjects/codequal"
npx tsx apps/api/src/test-scripts/test-deepwiki-report-generation.ts
```

## 3. Test Grafana Dashboard

### Import Dashboard
1. Open Grafana (http://localhost:3000)
2. Go to Dashboards → Import
3. Upload `/monitoring/grafana-deepwiki-dashboard.json`
4. Select Prometheus data source
5. Click Import

### Verify Metrics
- Storage Usage gauge should show current %
- Active Analyses should show count
- Available Space should show GB
- Historical graphs should start populating

## 4. Test DigitalOcean Monitoring

### Setup Monitoring
```bash
cd "/Users/alpinro/Code Prjects/codequal/monitoring"
./setup-alerts.sh
```

### Verify in DigitalOcean
1. Go to https://cloud.digitalocean.com/monitoring
2. Check Metrics → Custom Metrics
3. Look for `deepwiki_*` metrics
4. Verify dashboard is created

## 5. Test Alert System

### Test Storage Alert
```bash
cd "/Users/alpinro/Code Prjects/codequal/monitoring"
./test-alerts.sh
# Choose option 1 to test storage alerts
```

### Verify Alerts
1. Check Slack channel for alert
2. Check email for notification
3. Check DigitalOcean alerts page

## 6. Monitor Real-Time Metrics

### Watch Metrics Update
```bash
# In one terminal, watch metrics
watch -n 5 'curl -s http://localhost:3001/api/deepwiki/temp/metrics | jq'

# In another terminal, run an analysis
curl -X POST ... (analysis command from above)
```

## 7. Test Cleanup

### Check Active Analyses
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3001/api/deepwiki/temp/active-analyses
```

### Test Manual Cleanup (Admin only)
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3001/api/deepwiki/temp/cleanup-orphaned
```

## Expected Results

### DeepWiki Report Should Include:
- ✅ Repository URL and metadata
- ✅ Issues by category (Critical, High, Medium, Low)
- ✅ Recommendations with priorities
- ✅ Scores (Overall, Security, Performance, Maintainability)
- ✅ Analysis timestamp and duration

### Metrics Should Show:
- ✅ Storage usage percentage
- ✅ Active analysis count
- ✅ Available space in GB
- ✅ Cleanup success rate

### Alerts Should Trigger:
- ✅ At 80% storage usage (warning)
- ✅ At 90% storage usage (critical)
- ✅ When less than 2GB available
- ✅ For analyses running >30 minutes

## Troubleshooting

### No Metrics Showing
```bash
# Check if metrics exporter is running
curl http://localhost:3001/api/metrics/json

# Check logs
tail -f apps/api/logs/api.log | grep metrics
```

### Alerts Not Firing
```bash
# Test webhook manually
curl -X POST -H 'Content-Type: application/json' \
  -d '{"text":"Test alert from DeepWiki"}' \
  $SLACK_WEBHOOK_URL
```

### DeepWiki Pod Issues
```bash
# Check if pod is running (if using K8s)
kubectl get pods -n codequal-dev | grep deepwiki

# For local testing, use mock mode
export DEEPWIKI_MOCK_MODE=true
```

## Pre-Commit Checklist

Before committing, ensure:
- [ ] All API endpoints return expected data
- [ ] Metrics are being collected and exported
- [ ] Grafana dashboard displays data correctly
- [ ] DigitalOcean receives custom metrics
- [ ] Alerts fire at correct thresholds
- [ ] DeepWiki report generates successfully
- [ ] No errors in API logs
- [ ] Build passes without errors
- [ ] All tests pass