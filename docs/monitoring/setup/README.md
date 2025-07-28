# CodeQual Monitoring Setup Guide

## Overview

CodeQual has a comprehensive monitoring system that tracks performance, security, financial metrics, and critical issues. The system consists of:

1. **DeepWiki Dashboard** - Real-time monitoring of DeepWiki storage and active analyses
2. **Grafana Integration** - Comprehensive alerting system for all metrics
3. **Prometheus Metrics** - Standard metrics export for Grafana consumption

## Components

### 1. DeepWiki Dashboard (Already Implemented)

- **Location**: `/testing/deepwiki-dashboard.html`
- **Features**:
  - Real-time storage usage monitoring
  - Active analyses tracking
  - System status indicators
  - Auto-refresh every 10 seconds
  - JWT authentication

**To Use**:
1. Ensure API server is running on port 3001
2. Open `testing/deepwiki-dashboard.html` in a browser
3. Enter your JWT token when prompted

### 2. Grafana Alert Dashboard

- **Configuration**: `monitoring/codequal-alerts-dashboard.json`
- **Integration Config**: `monitoring/grafana-integration-config.json`

**Alert Categories**:

#### Performance Alerts
- API response time > 5 seconds
- Database query time > 1 second
- High concurrent analyses

#### Security Alerts
- Unauthorized access attempts > 10/hour
- Rate limit violations > 50/5min
- Suspicious activity patterns

#### Financial Alerts
- Daily API cost > $100
- Per-analysis cost > $5
- Token usage approaching limits

#### Critical System Alerts
- Analysis failure rate > 10%
- Storage usage > 85%
- Service availability < 99%

### 3. Monitoring Bridge Service

- **Location**: `apps/api/src/services/monitoring-grafana-bridge.ts`
- **Purpose**: Connects existing metrics with Grafana alerts

## Setup Instructions

### Step 1: Verify Existing Setup

Since Grafana is already connected to Supabase:

1. Confirm Grafana is accessible
2. Verify Supabase data source is configured
3. Check that you can query the database

### Step 2: Import Alert Dashboard

1. In Grafana, go to Dashboards > Import
2. Upload `monitoring/codequal-alerts-dashboard.json`
3. Select your Supabase data source when prompted

### Step 3: Configure Prometheus Endpoint

The monitoring service exposes metrics at:
- **Endpoint**: `http://localhost:3001/api/monitoring/metrics`
- **Format**: Prometheus text format

To add as Grafana data source:
1. Go to Configuration > Data Sources
2. Add new Prometheus data source
3. URL: `http://localhost:3001/api/monitoring/metrics`
4. Access: Server (default)

### Step 4: Set Up Alert Notifications

1. Go to Alerting > Notification channels
2. Add channels for:
   - Slack (for warnings)
   - Email (for critical alerts)
   - PagerDuty (optional, for critical issues)

### Step 5: Start Monitoring Bridge

The monitoring bridge automatically starts with the API server and collects metrics every 10 seconds.

To verify it's working:
```bash
curl http://localhost:3001/api/monitoring/metrics
curl http://localhost:3001/api/monitoring/alerts
```

## Testing the Setup

Run the test script:
```bash
node scripts/test-monitoring-dashboard.js
```

This will verify:
- API endpoints are accessible
- Metrics are being collected
- Dashboard HTML is properly configured

## Monitoring Workflow

1. **DeepWiki Dashboard** - For real-time operational monitoring
2. **Grafana Dashboards** - For historical analysis and trends
3. **Grafana Alerts** - For automated notifications
4. **Alert Status API** - For integration with other systems

## Troubleshooting

### Dashboard Not Loading
- Check API server is running on port 3001
- Verify JWT token is valid
- Check browser console for errors

### Metrics Not Appearing in Grafana
- Verify Prometheus endpoint is accessible
- Check data source configuration
- Look for errors in API logs

### Alerts Not Firing
- Check alert conditions in dashboard JSON
- Verify notification channels are configured
- Test with manual threshold breach

## Next Steps

1. Customize alert thresholds based on your usage patterns
2. Add custom metrics for your specific needs
3. Set up historical data retention policies
4. Configure dashboard variables for filtering

## API Endpoints

### Monitoring Endpoints
- `GET /api/monitoring/health` - System health check
- `GET /api/monitoring/metrics` - Prometheus metrics
- `GET /api/monitoring/alerts` - Current alert status

### DeepWiki Monitoring
- `GET /api/deepwiki/temp/metrics` - Storage metrics
- `GET /api/deepwiki/temp/active-analyses` - Active analyses list

## Metric Reference

### Storage Metrics
- `deepwiki_storage_used_gb` - Used storage in GB
- `deepwiki_storage_total_gb` - Total storage in GB
- `deepwiki_storage_percent_used` - Percentage used
- `deepwiki_active_analyses_count` - Number of active analyses

### Performance Metrics
- `api_response_time_ms` - API response time
- `database_query_time_ms` - Database query duration
- `analysis_execution_time_ms` - Analysis completion time

### Financial Metrics
- `daily_api_cost_usd` - Daily API costs
- `per_analysis_cost_usd` - Cost per analysis
- `token_usage_total` - Total tokens used

### Security Metrics
- `unauthorized_access_attempts` - Failed auth attempts
- `rate_limit_violations` - Rate limit hits
- `security_violations_count` - Security issues detected