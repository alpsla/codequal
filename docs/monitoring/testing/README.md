# Monitoring Testing Guide

## Quick Start Testing

### 1. Test DeepWiki Dashboard

1. **Open the Dashboard**:
   ```bash
   open file:///Users/alpinro/Code%20Prjects/codequal/testing/deepwiki-dashboard.html
   ```

2. **Get a JWT Token** (if needed):
   ```bash
   # Generate test token
   node scripts/generate-test-token.js
   ```

3. **Verify Metrics Are Loading**:
   - Storage usage percentage should show
   - Active analyses count should display
   - System status should be visible

### 2. Test API Endpoints

```bash
# Test health endpoint (no auth required)
curl http://localhost:3001/api/monitoring/health

# Test Prometheus metrics (no auth required)
curl http://localhost:3001/api/monitoring/metrics

# Test alert status (no auth required)
curl http://localhost:3001/api/monitoring/alerts

# Test DeepWiki metrics (requires auth)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/deepwiki/temp/metrics

# Test active analyses (requires auth)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/deepwiki/temp/active-analyses
```

### 3. Verify Grafana Integration

1. **Check Prometheus Format**:
   ```bash
   curl http://localhost:3001/api/monitoring/metrics | grep "^codequal_"
   ```
   Should show metrics like:
   - `codequal_deepwiki_storage_used_gb`
   - `codequal_api_response_time_ms`
   - `codequal_deepwiki_storage_percent_used`

2. **Import Dashboard to Grafana**:
   - Log into Grafana
   - Go to Dashboards > Import
   - Upload `monitoring/codequal-alerts-dashboard.json`
   - Select your Supabase data source

3. **Configure Prometheus Data Source**:
   - Go to Configuration > Data Sources
   - Add Prometheus
   - URL: `http://localhost:3001/api/monitoring/metrics`
   - Save & Test

### 4. Test Alert Conditions

Simulate alert conditions to verify they trigger:

```bash
# Check current alerts
curl http://localhost:3001/api/monitoring/alerts
```

Expected response format:
```json
{
  "healthy": 8,
  "warning": 0,
  "critical": 0,
  "alerts": []
}
```

### 5. Dashboard Features to Test

#### DeepWiki Dashboard
- [ ] Auto-refresh every 10 seconds
- [ ] Storage gauge shows correct percentage
- [ ] Progress bar color changes (green < 70%, yellow 70-85%, red > 85%)
- [ ] Active analyses list updates
- [ ] Error messages display when API is down

#### Grafana Dashboard
- [ ] All panels load data
- [ ] Time range selector works
- [ ] Alerts show correct thresholds
- [ ] Drill-down to details works

### 6. Common Issues

#### Dashboard Not Loading
- Check if API server is running: `lsof -i :3001`
- Verify JWT token is valid
- Check browser console for errors

#### Metrics Not Showing in Grafana
- Ensure monitoring bridge is started
- Check `/api/monitoring/metrics` returns data
- Verify Prometheus data source is configured

#### Alerts Not Triggering
- Check alert thresholds in dashboard JSON
- Verify metrics are above threshold values
- Ensure notification channels are configured

### 7. Performance Testing

Monitor the monitoring system itself:

```bash
# Check metrics endpoint response time
time curl http://localhost:3001/api/monitoring/metrics

# Verify memory usage doesn't grow
while true; do
  curl -s http://localhost:3001/api/monitoring/metrics > /dev/null
  sleep 1
done
```

### 8. Security Testing

Verify authentication is working:

```bash
# Should work without auth
curl http://localhost:3001/api/monitoring/health

# Should require auth
curl http://localhost:3001/api/deepwiki/temp/metrics
# Expected: 401 Unauthorized

# Should work with valid token
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/deepwiki/temp/metrics
```

## Validation Checklist

- [ ] DeepWiki dashboard loads and auto-refreshes
- [ ] All monitoring API endpoints respond correctly
- [ ] Prometheus metrics are exported in correct format
- [ ] Grafana can import the alert dashboard
- [ ] Alerts show correct status based on thresholds
- [ ] Authentication works as expected
- [ ] API documentation includes new endpoints
- [ ] No memory leaks during continuous monitoring