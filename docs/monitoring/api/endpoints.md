# Monitoring API Endpoints

## Overview

The monitoring API provides endpoints for system health checks, metrics export, and alert status.

## Base URL

```
Development: http://localhost:3001/api/monitoring
Production: https://api.codequal.com/api/monitoring
```

## Endpoints

### 1. Health Check

#### `GET /api/monitoring/health`

Returns the current health status of all system components.

**Authentication**: None required

**Response**: `200 OK`
```json
{
  "status": "ok",
  "timestamp": "2025-01-26T10:00:00Z",
  "database": {
    "status": "healthy",
    "tables": 72
  },
  "vectorDB": {
    "status": "healthy"
  },
  "background": {
    "status": "healthy"
  }
}
```

**Status Values**:
- `ok`: All systems operational
- `degraded`: Some components experiencing issues
- `error`: Critical system failure

### 2. Prometheus Metrics

#### `GET /api/monitoring/metrics`

Exports system metrics in Prometheus text format for Grafana integration.

**Authentication**: None required

**Response**: `200 OK`
```
# HELP codequal_deepwiki_storage_used_gb DeepWiki storage used in GB
# TYPE codequal_deepwiki_storage_used_gb gauge
codequal_deepwiki_storage_used_gb{source="deepwiki"} 45.2 1706264400000

# HELP codequal_api_response_time_ms API response time in milliseconds
# TYPE codequal_api_response_time_ms gauge
codequal_api_response_time_ms{source="api"} 234 1706264400000

# HELP codequal_deepwiki_active_analyses_count Active analyses count
# TYPE codequal_deepwiki_active_analyses_count gauge
codequal_deepwiki_active_analyses_count{source="deepwiki"} 3 1706264400000
```

**Available Metrics**:
- `codequal_deepwiki_storage_used_gb` - Storage usage in GB
- `codequal_deepwiki_storage_total_gb` - Total storage capacity
- `codequal_deepwiki_storage_percent_used` - Usage percentage
- `codequal_deepwiki_active_analyses_count` - Active analyses
- `codequal_api_response_time_ms` - API latency
- `codequal_daily_api_cost_usd` - Daily costs
- `codequal_analysis_failure_rate_percent` - Failure rate

### 3. Alert Status

#### `GET /api/monitoring/alerts`

Returns the current status of all monitoring alerts.

**Authentication**: None required

**Response**: `200 OK`
```json
{
  "healthy": 8,
  "warning": 2,
  "critical": 0,
  "alerts": [
    {
      "metric": "deepwiki_storage_percent_used",
      "value": 72.5,
      "threshold": 70,
      "severity": "warning",
      "message": "DeepWiki storage usage high"
    },
    {
      "metric": "api_response_time_ms",
      "value": 5234,
      "threshold": 5000,
      "severity": "warning",
      "message": "API response time exceeds 5 seconds"
    }
  ]
}
```

**Alert Severities**:
- `warning`: Non-critical issues requiring attention
- `critical`: Immediate action required

## DeepWiki Specific Endpoints

### 4. DeepWiki Storage Metrics

#### `GET /api/deepwiki/temp/metrics`

Returns detailed DeepWiki temporary storage metrics.

**Authentication**: Bearer token required

**Headers**:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response**: `200 OK`
```json
{
  "usedGB": 45.2,
  "totalGB": 100,
  "availableGB": 54.8,
  "percentUsed": 45.2,
  "activeAnalyses": 3,
  "maxConcurrentCapacity": 5,
  "averageAnalysisSize": 2.5,
  "recommendations": [
    {
      "type": "scale-up",
      "urgency": "medium",
      "message": "Usage approaching 50%, consider monitoring",
      "suggestedSize": 120
    }
  ],
  "status": "healthy"
}
```

**Status Values**:
- `healthy`: < 70% usage
- `warning`: 70-85% usage
- `critical`: > 85% usage

### 5. Active Analyses

#### `GET /api/deepwiki/temp/active-analyses`

Returns list of currently running DeepWiki analyses.

**Authentication**: Bearer token required

**Response**: `200 OK`
```json
{
  "active": 3,
  "analyses": [
    {
      "analysisId": "550e8400-e29b-41d4-a716-446655440000",
      "repositoryUrl": "https://github.com/org/repo",
      "type": "comprehensive",
      "sizeMB": 2500,
      "startTime": 1706264100000,
      "duration": 300000,
      "status": "active"
    }
  ],
  "longRunning": 1
}
```

**Analysis Status**:
- `active`: Running normally (< 30 minutes)
- `long-running`: Running > 30 minutes

## Error Responses

### 401 Unauthorized
```json
{
  "error": "Invalid or expired token"
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to retrieve metrics",
  "message": "Database connection failed"
}
```

## Usage Examples

### cURL Examples

```bash
# Health check
curl http://localhost:3001/api/monitoring/health

# Prometheus metrics
curl http://localhost:3001/api/monitoring/metrics

# Alert status
curl http://localhost:3001/api/monitoring/alerts

# DeepWiki metrics (with auth)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/deepwiki/temp/metrics
```

### JavaScript Example

```javascript
// Fetch monitoring metrics
async function getMonitoringStatus() {
  const health = await fetch('/api/monitoring/health');
  const alerts = await fetch('/api/monitoring/alerts');
  
  return {
    health: await health.json(),
    alerts: await alerts.json()
  };
}

// Fetch DeepWiki metrics with auth
async function getDeepWikiMetrics(token) {
  const response = await fetch('/api/deepwiki/temp/metrics', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return response.json();
}
```

## Integration with Grafana

### Prometheus Configuration

Add as Prometheus data source in Grafana:
```yaml
scrape_configs:
  - job_name: 'codequal'
    scrape_interval: 10s
    static_configs:
      - targets: ['localhost:3001']
    metrics_path: '/api/monitoring/metrics'
```

### Query Examples

```promql
# Storage usage percentage
codequal_deepwiki_storage_percent_used{source="deepwiki"}

# API response time average over 5 minutes
rate(codequal_api_response_time_ms[5m])

# Active analyses trend
codequal_deepwiki_active_analyses_count{source="deepwiki"}
```