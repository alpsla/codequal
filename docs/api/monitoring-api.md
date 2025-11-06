# Enhanced Monitoring Service API Documentation

This document describes the API endpoints that expose the Enhanced Monitoring Service functionality for the CodeQual platform.

## Overview

The Enhanced Monitoring Service provides comprehensive observability, metrics collection, alerting, and AI-tool integration capabilities. The API exposes these features through RESTful endpoints for:

- **Prometheus metrics collection**
- **Loavable widget embedding**
- **Dashboard management**
- **Alert monitoring**
- **Health checks**
- **AI tool integration**

## Base URLs

- **Development**: `http://localhost:3001`
- **Production**: `https://api.codequal.com`

## Authentication

Most endpoints require authentication via Bearer token:

```http
Authorization: Bearer your-auth-token-here
```

**Exception**: The `/metrics` endpoint is public for Prometheus scraping.

## Endpoints

### 1. Prometheus Metrics

#### GET /metrics

Returns metrics in Prometheus format for scraping by monitoring systems.

**Authentication**: None required  
**Content-Type**: `text/plain; version=0.0.4; charset=utf-8`

**Example Response**:
```
# HELP codequal_analysis_started_total Total analyses started
# TYPE codequal_analysis_started_total counter
codequal_analysis_started_total{mode="comprehensive",repository_size="medium",user_tier="pro"} 145

# HELP codequal_analysis_duration_seconds Analysis execution time
# TYPE codequal_analysis_duration_seconds histogram
codequal_analysis_duration_seconds_bucket{mode="comprehensive",le="30"} 12
codequal_analysis_duration_seconds_bucket{mode="comprehensive",le="60"} 45
codequal_analysis_duration_seconds_bucket{mode="comprehensive",le="120"} 89
```

### 2. Widget Management

#### GET /api/monitoring/widgets

Returns list of available embeddable widgets for Loavable integration.

**Authentication**: Required

**Response**:
```json
{
  "success": true,
  "widgets": [
    {
      "id": "success-rate-widget",
      "name": "Success Rate",
      "type": "metric",
      "embeddable": true,
      "refreshInterval": 30000
    }
  ],
  "count": 1
}
```

#### GET /api/monitoring/widgets/:id/data

Returns real-time data for a specific widget.

**Authentication**: Required  
**Parameters**: 
- `id` (path): Widget ID

**Response**:
```json
{
  "success": true,
  "data": {
    "widgetId": "success-rate-widget",
    "type": "metric",
    "data": {
      "value": 0.95,
      "trend": "stable",
      "lastPeriod": 0.94
    },
    "lastUpdated": "2025-06-15T10:30:00.000Z",
    "props": {
      "format": "percentage",
      "precision": 1,
      "thresholds": [
        { "value": 0.95, "color": "green" },
        { "value": 0.90, "color": "yellow" },
        { "value": 0, "color": "red" }
      ]
    }
  },
  "timestamp": "2025-06-15T10:30:00.000Z"
}
```

#### GET /api/monitoring/widgets/:id/component

Returns React component code for embedding in Loavable applications.

**Authentication**: Required  
**Content-Type**: `text/plain`

**Example Response**:
```javascript
import React, { useState, useEffect } from 'react';
import { MetricCard } from '@codequal/monitoring-widgets';

export const SuccessRateWidget = (props) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/monitoring/widgets/success-rate-widget/data');
        const result = await response.json();
        setData(result.data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div>Loading Success Rate...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <MetricCard
      data={data}
      title="Success Rate"
      {...props}
      format="percentage"
      precision={1}
    />
  );
};
```

### 3. Dashboard Management

#### GET /api/monitoring/dashboards

Returns list of available monitoring dashboards.

**Authentication**: Required

**Response**:
```json
{
  "success": true,
  "dashboards": [
    {
      "id": "codequal-overview",
      "title": "CodeQual Overview",
      "description": "Main dashboard showing system health and performance",
      "aiPrompts": [
        "Show me the overall system health",
        "What is the current analysis performance?",
        "Are there any issues with the system?"
      ],
      "embeddable": true
    }
  ],
  "count": 1
}
```

#### GET /api/monitoring/dashboards/:id

Returns data for a specific dashboard.

**Authentication**: Required  
**Parameters**: 
- `id` (path): Dashboard ID

**Response**:
```json
{
  "success": true,
  "data": {
    "panels": [
      {
        "id": "1",
        "data": [
          {
            "timestamp": "2025-06-15T10:25:00.000Z",
            "value": 0.95
          }
        ],
        "lastUpdated": "2025-06-15T10:30:00.000Z"
      }
    ],
    "alerts": [
      {
        "id": "high-failure-rate",
        "name": "High Analysis Failure Rate",
        "status": "ok",
        "message": "Analysis failure rate is within normal limits"
      }
    ],
    "metadata": {
      "refreshedAt": "2025-06-15T10:30:00.000Z",
      "nextRefresh": "2025-06-15T10:35:00.000Z",
      "dataQuality": 1.0
    }
  },
  "dashboardId": "codequal-overview"
}
```

### 4. Alert Management

#### GET /api/monitoring/alerts

Returns current status of all alerts.

**Authentication**: Required

**Response**:
```json
{
  "success": true,
  "alerts": [
    {
      "id": "high-failure-rate",
      "name": "High Analysis Failure Rate",
      "status": "ok",
      "message": "Analysis failure rate is within normal limits",
      "value": 0.02,
      "threshold": 0.1
    }
  ],
  "count": 1,
  "summary": {
    "critical": 0,
    "warning": 0,
    "ok": 1
  }
}
```

#### GET /api/monitoring/alerts/:id

Returns status of a specific alert.

**Authentication**: Required  
**Parameters**: 
- `id` (path): Alert ID

**Response**:
```json
{
  "success": true,
  "alert": {
    "id": "high-failure-rate",
    "name": "High Analysis Failure Rate",
    "status": "ok",
    "message": "Analysis failure rate is within normal limits",
    "value": 0.02,
    "threshold": 0.1
  },
  "alertId": "high-failure-rate"
}
```

### 5. Health Checks

#### GET /api/monitoring/health

Returns enhanced health check with comprehensive monitoring metrics.

**Authentication**: Not required (but can be used)

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-06-15T10:30:00.000Z",
  "service": "CodeQual API Server - Monitoring",
  "version": "1.0.0",
  "monitoring": {
    "metricsCollected": true,
    "alertsActive": false,
    "dashboardsAvailable": true,
    "overallHealth": "healthy"
  },
  "metrics": {
    "totalAnalyses": 1547,
    "successRate": 0.95,
    "averageTime": 89.5,
    "activeAnalyses": 3,
    "errorCount": 12
  },
  "recommendations": [
    "System running optimally"
  ]
}
```

### 6. AI Tool Integration

#### GET /api/monitoring/schema

Returns monitoring schema for AI tool integration.

**Authentication**: Required

**Response**:
```json
{
  "success": true,
  "schema": {
    "service": "codequal-api",
    "version": "1.0.0",
    "capabilities": {
      "metrics": [
        "analysisStarted",
        "analysisCompleted",
        "analysisFailed",
        "analysisTime",
        "activeAnalyses",
        "componentLatency",
        "errorRate",
        "businessMetrics",
        "costMetrics"
      ],
      "dashboards": [
        {
          "id": "codequal-overview",
          "title": "CodeQual Overview",
          "description": "Main dashboard showing system health and performance",
          "aiPrompts": [
            "Show me the overall system health",
            "What is the current analysis performance?"
          ],
          "embeddable": true
        }
      ],
      "widgets": [
        {
          "id": "success-rate-widget",
          "name": "Success Rate",
          "type": "metric",
          "embeddable": true
        }
      ],
      "alerts": [
        {
          "id": "high-failure-rate",
          "name": "High Analysis Failure Rate",
          "severity": "critical",
          "aiContext": "Trigger when more than 10% of analyses are failing"
        }
      ]
    },
    "endpoints": {
      "metrics": "/metrics",
      "health": "/health",
      "dashboards": "/api/monitoring/dashboards",
      "widgets": "/api/monitoring/widgets",
      "alerts": "/api/monitoring/alerts"
    },
    "queryLanguage": "PromQL",
    "aiInstructions": {
      "howToQuery": "Use PromQL syntax for metrics queries. Available metrics: analysisStarted, analysisCompleted, analysisFailed, analysisTime, activeAnalyses, componentLatency, errorRate, businessMetrics, costMetrics",
      "commonQueries": {
        "analysis_success_rate": "rate(codequal_analysis_completed_total[5m]) / rate(codequal_analysis_started_total[5m])",
        "average_analysis_time": "rate(codequal_analysis_duration_seconds_sum[5m]) / rate(codequal_analysis_duration_seconds_count[5m])",
        "error_rate": "rate(codequal_errors_total[5m])",
        "active_analyses": "codequal_active_analyses"
      },
      "alerting": "Create alerts using the condition field with PromQL expressions"
    }
  },
  "timestamp": "2025-06-15T10:30:00.000Z",
  "description": "Monitoring service schema for AI tool integration"
}
```

#### GET /api/monitoring/metrics/ai

Returns AI-formatted metrics data for analysis.

**Authentication**: Required  
**Query Parameters**:
- `timeRange` (optional): Time range for metrics (e.g., "1h", "24h", "7d")

**Response**:
```json
{
  "success": true,
  "data": {
    "timestamp": "2025-06-15T10:30:00.000Z",
    "timeRange": "1h",
    "service": "codequal-api",
    "metrics": {
      "codequal_analysis_started_total": 45,
      "codequal_analysis_completed_total": 43,
      "codequal_analysis_failed_total": 2,
      "codequal_active_analyses": 3
    },
    "summary": {
      "totalAnalyses": 45,
      "successRate": 0.9556,
      "averageTime": 89.5,
      "activeCount": 3,
      "errorCount": 2
    },
    "healthStatus": "healthy",
    "recommendations": [
      "Success rate is above 95% - system performing well",
      "3 active analyses - normal load"
    ]
  },
  "timestamp": "2025-06-15T10:30:00.000Z"
}
```

### 7. Event Recording

#### POST /api/monitoring/record

Manually record monitoring events for testing or custom integrations.

**Authentication**: Required

**Request Body**:
```json
{
  "eventType": "analysis_started",
  "data": {
    "mode": "comprehensive",
    "repository_size": "large",
    "user_tier": "enterprise"
  }
}
```

**Supported Event Types**:
- `analysis_started`
- `analysis_completed`
- `analysis_failed`
- `component_latency`
- `error`
- `business_event`
- `cost`

**Example Requests**:

**Analysis Started**:
```json
{
  "eventType": "analysis_started",
  "data": {
    "mode": "comprehensive",
    "repository_size": "medium",
    "user_tier": "pro"
  }
}
```

**Analysis Completed**:
```json
{
  "eventType": "analysis_completed",
  "data": {
    "labels": {
      "mode": "comprehensive",
      "repository_size": "medium",
      "user_tier": "pro",
      "duration_bucket": "normal"
    },
    "duration": 120
  }
}
```

**Error Event**:
```json
{
  "eventType": "error",
  "data": {
    "error_type": "timeout",
    "component": "api",
    "severity": "warning"
  }
}
```

**Response**:
```json
{
  "success": true,
  "message": "Event analysis_started recorded",
  "timestamp": "2025-06-15T10:30:00.000Z"
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error description",
  "message": "Detailed error message",
  "timestamp": "2025-06-15T10:30:00.000Z"
}
```

**Common HTTP Status Codes**:
- `200`: Success
- `400`: Bad Request (invalid parameters)
- `401`: Unauthorized (missing or invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found (resource not found)
- `500`: Internal Server Error

## Integration Examples

### Grafana Integration

Configure Grafana to scrape metrics:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'codequal-api'
    static_configs:
      - targets: ['api.codequal.com:3001']
    metrics_path: /metrics
    scrape_interval: 15s
```

### Loavable Widget Embedding

```typescript
import { useMonitoringWidget } from '@codequal/monitoring-hooks';

function DashboardPage() {
  const { data, loading, error } = useMonitoringWidget('success-rate-widget');
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div>
      <h2>System Metrics</h2>
      <SuccessRateWidget data={data} />
    </div>
  );
}
```

### AI Tool Query

```python
import requests

# Get AI-formatted metrics
response = requests.get(
    'https://api.codequal.com/api/monitoring/metrics/ai',
    headers={'Authorization': 'Bearer your-token'},
    params={'timeRange': '1h'}
)

metrics = response.json()['data']
health_status = metrics['healthStatus']
success_rate = metrics['summary']['successRate']

print(f"System Health: {health_status}")
print(f"Success Rate: {success_rate * 100:.1f}%")
```

## Rate Limits

- **Metrics endpoint**: No limit (designed for frequent scraping)
- **Widget data**: 1 request per second per widget
- **Dashboard data**: 1 request per 5 seconds per dashboard
- **Other endpoints**: 100 requests per minute per user

## Security Considerations

1. **Authentication**: All sensitive endpoints require valid Bearer tokens
2. **CORS**: Configured for specific origins only
3. **Rate Limiting**: Prevents abuse of API endpoints
4. **Input Validation**: All inputs are validated and sanitized
5. **Error Handling**: Errors don't expose sensitive information

## Support

For questions or issues with the Monitoring API:

- **Documentation**: [docs.codequal.com/monitoring](https://docs.codequal.com/monitoring)
- **Support**: support@codequal.com
- **GitHub Issues**: [github.com/alpsla/codequal/issues](https://github.com/alpsla/codequal/issues)