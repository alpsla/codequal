# API Documentation

This directory contains API integration guides and specifications for the Standard Framework.

## 📄 Documents

- **[API_INTEGRATION_GUIDE.md](./API_INTEGRATION_GUIDE.md)** - Complete guide for integrating with the CodeQual API

## 🔌 API Endpoints

### Core Analysis APIs
```
POST   /api/v1/analysis/start         - Start new PR analysis
GET    /api/v1/analysis/:id/status    - Get analysis status
GET    /api/v1/analysis/:id/report    - Get full markdown report
GET    /api/v1/analysis/:id/education - Get educational resources
```

### Monitoring APIs (Coming Soon)
```
GET    /api/v1/monitoring/metrics     - Real-time metrics
GET    /api/v1/monitoring/costs       - Cost tracking
GET    /api/v1/monitoring/performance - Performance metrics
POST   /api/v1/monitoring/alerts      - Alert configuration
```

## 🔐 Authentication

All API requests require authentication:

```typescript
headers: {
  'Authorization': 'Bearer YOUR_API_KEY',
  'Content-Type': 'application/json'
}
```

## 📊 Response Format

Standard response structure:
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "metadata": {
    "timestamp": "2025-08-14T10:00:00Z",
    "version": "1.0",
    "requestId": "uuid"
  },
  "error": null
}
```

## 🚀 Quick Start

1. Obtain API key from dashboard
2. Set up authentication headers
3. Make test request to `/api/v1/health`
4. Start analyzing PRs!

## 🔗 Related Documentation
- Implementation: [`../implementation/`](../implementation/)
- Architecture: [`../architecture/`](../architecture/)
- Testing: [`../testing/`](../testing/)