# Swagger/OpenAPI Documentation Updates

## Overview

All monitoring endpoints have been fully documented with Swagger/OpenAPI annotations.

## Updated Components

### 1. OpenAPI Configuration (`/apps/api/src/config/openapi.ts`)

#### New Tags Added
- **Monitoring**: System monitoring, metrics, and alerts
- **DeepWiki**: DeepWiki storage and analysis monitoring

#### New Schemas Added
- **HealthStatus**: System health check response
- **AlertStatus**: Alert status and active alerts
- **DeepWikiMetrics**: DeepWiki storage metrics
- **ActiveAnalyses**: List of active DeepWiki analyses

### 2. Monitoring Routes (`/apps/api/src/routes/monitoring.ts`)

All endpoints now have complete Swagger documentation:

```yaml
/api/monitoring/health:
  get:
    summary: System health check
    tags: [Monitoring]
    responses:
      200:
        schema:
          $ref: '#/components/schemas/HealthStatus'

/api/monitoring/metrics:
  get:
    summary: Prometheus metrics export
    tags: [Monitoring]
    produces:
      - text/plain
    responses:
      200:
        description: Prometheus formatted metrics

/api/monitoring/alerts:
  get:
    summary: Get current alert status
    tags: [Monitoring]
    responses:
      200:
        schema:
          $ref: '#/components/schemas/AlertStatus'
```

### 3. DeepWiki Routes (`/apps/api/src/routes/deepwiki-temp-storage.ts`)

```yaml
/api/deepwiki/temp/metrics:
  get:
    summary: Get current temp storage metrics
    tags: [DeepWiki]
    security:
      - bearerAuth: []
    responses:
      200:
        schema:
          $ref: '#/components/schemas/DeepWikiMetrics'
      401:
        $ref: '#/components/responses/UnauthorizedError'

/api/deepwiki/temp/active-analyses:
  get:
    summary: Get list of active analyses
    tags: [DeepWiki]
    security:
      - bearerAuth: []
    responses:
      200:
        schema:
          $ref: '#/components/schemas/ActiveAnalyses'
      401:
        $ref: '#/components/responses/UnauthorizedError'
```

## Schema Definitions

### HealthStatus
```typescript
{
  status: 'ok' | 'degraded' | 'error',
  timestamp: string, // ISO 8601
  database: {
    status: 'healthy' | 'unhealthy' | 'unknown',
    tables: number
  },
  vectorDB: {
    status: 'healthy' | 'unavailable'
  },
  background: {
    status: 'healthy' | 'unhealthy'
  }
}
```

### AlertStatus
```typescript
{
  healthy: number,
  warning: number,
  critical: number,
  alerts: Array<{
    metric: string,
    value: number,
    threshold: number,
    severity: 'warning' | 'critical',
    message: string
  }>
}
```

### DeepWikiMetrics
```typescript
{
  usedGB: number,
  totalGB: number,
  availableGB: number,
  percentUsed: number,
  activeAnalyses: number,
  maxConcurrentCapacity: number,
  averageAnalysisSize: number,
  recommendations: Array<{
    type: 'scale-up' | 'capacity' | 'cleanup',
    urgency: 'low' | 'medium' | 'high',
    message: string,
    suggestedSize?: number
  }>,
  status: 'healthy' | 'warning' | 'critical'
}
```

### ActiveAnalyses
```typescript
{
  active: number,
  analyses: Array<{
    analysisId: string, // UUID
    repositoryUrl: string, // URI
    type: 'quick' | 'comprehensive' | 'deep',
    sizeMB: number,
    startTime: number, // Timestamp
    duration: number, // Milliseconds
    status: 'active' | 'long-running'
  }>,
  longRunning: number
}
```

## Accessing the Documentation

### Swagger UI
- Development: http://localhost:3001/docs
- Alternative: http://localhost:3001/api/docs

### OpenAPI Specification
- JSON: http://localhost:3001/docs/openapi.json
- YAML: http://localhost:3001/docs/openapi.yaml

## Integration with API Clients

The OpenAPI specification can be used to:
1. Generate client SDKs in various languages
2. Import into Postman/Insomnia
3. Generate API documentation
4. Validate API requests/responses

## Testing the Documentation

1. Start the API server:
   ```bash
   cd apps/api && npm run dev
   ```

2. Open Swagger UI:
   ```bash
   open http://localhost:3001/docs
   ```

3. Navigate to:
   - **Monitoring** tag for system monitoring endpoints
   - **DeepWiki** tag for storage monitoring endpoints

4. Try out the endpoints directly from Swagger UI