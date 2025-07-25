# CodeQual API Documentation

## Overview

The CodeQual API provides AI-powered code review and analysis for pull requests. This documentation covers all available endpoints, authentication methods, and recent updates.

## Base URL

```
Production: https://api.codequal.com/v1
Staging: https://staging-api.codequal.com/v1
Development: http://localhost:3001/api
```

## Authentication

### API Key Authentication

For public API endpoints (v1), include your API key in the header:

```
X-API-Key: ck_your_api_key_here
```

### Bearer Token Authentication

For internal API endpoints, use JWT bearer tokens:

```
Authorization: Bearer your_jwt_token_here
```

## Recent Updates (January 2025)

### Progress Tracking API

Real-time progress tracking for PR analysis with Server-Sent Events (SSE) support.

#### Endpoints

1. **Get Analysis Progress**
   - `GET /api/progress/:analysisId`
   - Returns detailed progress information for a specific analysis

2. **Get All Active Analyses**
   - `GET /api/progress`
   - Returns list of all active analyses for the current user

3. **Get Progress Updates**
   - `GET /api/progress/:analysisId/updates`
   - Query parameters: `since` (timestamp), `limit` (max 100)
   - Returns recent updates with filtering options

4. **Stream Real-time Updates (SSE)**
   - `GET /api/progress/:analysisId/stream`
   - Server-Sent Events endpoint for real-time progress updates
   - Event types: `initial`, `update`, `phase`, `agent`, `tool`, `complete`

5. **Clean Up Old Analyses (Admin)**
   - `POST /api/progress/cleanup`
   - Body: `{ "maxAgeHours": 24 }`
   - Removes old analysis data

#### Progress Data Structure

```json
{
  "analysisId": "uuid",
  "repositoryUrl": "owner/repo",
  "prNumber": 123,
  "startTime": "2025-01-15T00:00:00Z",
  "endTime": null,
  "overallStatus": "analyzing",
  "overallPercentage": 45,
  "currentPhase": "agentAnalysis",
  "phases": {
    "initialization": { "status": "completed", "percentage": 100 },
    "toolExecution": { "status": "completed", "percentage": 100 },
    "agentAnalysis": { "status": "in_progress", "percentage": 30 },
    "resultProcessing": { "status": "pending", "percentage": 0 },
    "reportGeneration": { "status": "pending", "percentage": 0 }
  },
  "agents": {
    "security": { "name": "security", "status": "completed", "percentage": 100, "findings": 3 },
    "codeQuality": { "name": "codeQuality", "status": "running", "percentage": 60 }
  },
  "tools": {
    "eslint-security": { "name": "eslint", "agentRole": "security", "status": "completed", "percentage": 100, "findingsCount": 2 }
  },
  "metrics": {
    "totalAgents": 6,
    "completedAgents": 2,
    "failedAgents": 0,
    "totalTools": 18,
    "completedTools": 12,
    "failedTools": 0,
    "estimatedTimeRemaining": 120000
  }
}
```

### Tool Results Storage

Automatic storage of MCP tool execution results in Vector DB for learning and retrieval.

#### Features
- Semantic search for similar findings across analyses
- Historical metrics aggregation
- Automatic collection during PR analysis
- Embeddings for each finding and summary

### Vector DB Retention Policy

Prevents exponential growth with intelligent data lifecycle management.

#### Endpoints

1. **Get Retention Statistics (Admin)**
   - `GET /api/vector-retention/stats`
   - Returns: Storage usage, record counts, last cleanup info

2. **View Retention Configuration (Admin)**
   - `GET /api/vector-retention/config`
   - Returns: Current retention settings

3. **Trigger Manual Cleanup (Admin)**
   - `POST /api/vector-retention/cleanup`
   - Body: `{ "aggressive": false }`
   - Manually triggers retention policy execution

4. **Update Schedule (Admin)**
   - `PUT /api/vector-retention/schedule`
   - Body: `{ "schedule": "0 2 * * *" }`
   - Updates automatic cleanup cron schedule

5. **Preview Cleanup Impact (Admin)**
   - `GET /api/vector-retention/preview?aggressive=false`
   - Shows what would be deleted without executing

#### Default Retention Settings
- Tool results: 90 days
- Analysis results: 180 days
- Critical security findings: Preserved
- Per-repository limit: 10,000 records
- Global limit: 1,000,000 records
- Automatic cleanup: Daily at 2 AM

### Enhanced Features

1. **MCP (Model Context Protocol) Integration**
   - Real MCP tool adapters for ESLint, Semgrep, and Context Retrieval
   - Automatic tool execution for each agent role
   - Cross-agent coordination and insight sharing

2. **Debug Logging**
   - Comprehensive execution trace logging
   - Sanitization of sensitive data
   - Export functionality for troubleshooting

3. **Automatic Mode Selection**
   - Risk-based analysis mode selection
   - Configurable thresholds for quick/comprehensive/deep analysis
   - Smart resource allocation based on PR complexity

4. **Data Lifecycle Management**
   - Automatic retention policy enforcement
   - Storage optimization through embedding compaction
   - Aggregated summaries before deletion
   - Emergency cleanup capabilities

## Core API Endpoints

### Analysis

#### Start PR Analysis
- **POST** `/v1/analyze-pr`
- Body: `{ "prUrl": "https://github.com/owner/repo/pull/123" }`
- Returns: Analysis ID and status

#### Get Analysis Status
- **GET** `/v1/analysis/:analysisId`
- Returns: Current status and results (if completed)

### Reports

#### Get Analysis Report
- **GET** `/v1/analysis/:analysisId/report`
- Query params: `format` (json|html|pdf)
- Returns: Formatted analysis report

#### List Analysis History
- **GET** `/v1/reports`
- Query params: `page`, `limit`, `status`
- Returns: Paginated list of analyses

### Usage & Billing

#### Get Usage Statistics
- **GET** `/api/usage/stats`
- Returns: API usage, remaining calls, billing information

#### Get Subscription Info
- **GET** `/api/billing/subscription`
- Returns: Current subscription details and limits

### API Key Management

#### List API Keys
- **GET** `/api/keys`
- Returns: List of API keys (without full key values)

#### Create API Key
- **POST** `/api/keys`
- Body: `{ "name": "Production Key" }`
- Returns: New API key (only shown once)

#### Delete API Key
- **DELETE** `/api/keys/:keyId`
- Returns: Success confirmation

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": { 
    "additional": "context"
  }
}
```

Common error codes:
- `AUTH_REQUIRED` - Authentication required
- `INSUFFICIENT_PERMISSIONS` - User lacks required permissions
- `RESOURCE_NOT_FOUND` - Requested resource not found
- `RATE_LIMIT_EXCEEDED` - Rate limit exceeded
- `INVALID_REQUEST` - Request validation failed

## Rate Limits

- **Free tier**: 100 requests per hour
- **Pro tier**: 1,000 requests per hour
- **Enterprise**: Custom limits

Rate limit headers:
- `X-RateLimit-Limit`: Request limit
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset timestamp

## Webhooks

Configure webhooks to receive analysis completion notifications:

```json
{
  "event": "analysis.completed",
  "analysisId": "uuid",
  "status": "completed",
  "timestamp": "2025-01-15T00:00:00Z",
  "results": { ... }
}
```

## Admin Features

### Vector DB Management

Admin-only endpoints for managing Vector database storage:

- **Storage monitoring**: Track usage and growth trends
- **Retention policy**: Automated cleanup with configurable rules
- **Manual interventions**: Trigger cleanup when needed
- **Preview mode**: See impact before executing changes

### Requirements
- Admin role required for all retention endpoints
- Service credentials for automated cleanup
- Monitoring alerts at 80% and 95% capacity

## SDK Support

Official SDKs available:
- Node.js/TypeScript: `npm install @codequal/sdk`
- Python: `pip install codequal`
- Go: `go get github.com/codequal/go-sdk`

## Support

- Documentation: https://docs.codequal.com
- API Status: https://status.codequal.com
- Support: support@codequal.com
- Vector DB Retention Guide: [See detailed documentation](../docs/VECTOR_DB_RETENTION_POLICY.md)