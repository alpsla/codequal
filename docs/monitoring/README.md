# CodeQual Monitoring Documentation

## Overview

Comprehensive monitoring system for CodeQual, tracking performance, security, financial metrics, and critical system issues.

## Documentation Structure

### 📁 [Setup](./setup/)
- [Complete Setup Guide](./setup/README.md) - Full monitoring system setup
- [Grafana Setup](./setup/grafana-setup.md) - Grafana-specific configuration
- [Grafana Dashboard Setup](./setup/grafana-dashboard-setup-guide.md) - Dashboard import guide
- [Grafana Security Monitoring](./setup/grafana-security-monitoring.md) - Security alerts setup

### 📁 [Testing](./testing/)
- [Testing Guide](./testing/README.md) - How to test the monitoring system
- Test scripts and validation procedures

### 📁 [Dashboards](./dashboards/)
- [DeepWiki Dashboard](./dashboards/deepwiki-dashboard.md) - Real-time storage monitoring
- [Grafana Alerts Dashboard](./dashboards/grafana-alerts.md) - Comprehensive alert system

### 📁 [API](./api/)
- [API Endpoints](./api/endpoints.md) - All monitoring API endpoints documentation

## Quick Start

### 1. View DeepWiki Dashboard
```bash
open file:///Users/alpinro/Code%20Prjects/codequal/testing/deepwiki-dashboard.html
```

### 2. Test API Endpoints
```bash
# Health check
curl http://localhost:3001/api/monitoring/health

# Prometheus metrics
curl http://localhost:3001/api/monitoring/metrics
```

### 3. Import Grafana Dashboard
1. Open Grafana
2. Go to Dashboards → Import
3. Upload `/monitoring/codequal-alerts-dashboard.json`

## System Components

### 1. DeepWiki Monitoring
- Real-time storage tracking
- Active analyses monitoring
- Auto-refresh dashboard
- JWT authentication

### 2. Grafana Integration
- Prometheus metrics export
- Alert thresholds for all categories
- Automated notifications
- Historical data analysis

### 3. Alert Categories
- **Performance**: API response time, DB queries
- **Security**: Unauthorized access, rate limits
- **Financial**: Daily costs, per-analysis costs
- **Critical**: Failure rates, storage limits

## Configuration Files

### Dashboard Configurations
- `/testing/deepwiki-dashboard.html` - DeepWiki monitoring UI
- `/monitoring/codequal-alerts-dashboard.json` - Grafana dashboard
- `/monitoring/grafana-integration-config.json` - Integration settings

### Service Files
- `/apps/api/src/services/monitoring-grafana-bridge.ts` - Monitoring bridge
- `/apps/api/src/routes/monitoring.ts` - API endpoints
- `/apps/api/src/routes/deepwiki-temp-storage.ts` - DeepWiki endpoints

## Key Features

### Real-time Monitoring
- 10-second auto-refresh
- Live metrics updates
- Active process tracking

### Alert System
- Configurable thresholds
- Multiple severity levels
- Automated notifications
- Slack/Email/PagerDuty integration

### Metrics Collection
- Prometheus format export
- Historical data retention
- Trend analysis
- Cost tracking

## Troubleshooting

### Common Issues
1. **Dashboard not loading**: Check API server (port 3001)
2. **Auth failures**: Verify JWT token
3. **Missing metrics**: Check monitoring bridge service
4. **Alerts not firing**: Verify thresholds and notification channels

### Debug Commands
```bash
# Check if API is running
lsof -i :3001

# Test metrics endpoint
curl http://localhost:3001/api/monitoring/metrics

# Generate test token
node scripts/generate-test-token.js
```

## Next Steps

1. [Set up the monitoring system](./setup/README.md)
2. [Test all components](./testing/README.md)
3. [Configure alerts](./dashboards/grafana-alerts.md)
4. [Review API documentation](./api/endpoints.md)