# CodeQual API - Getting Started

Welcome to the CodeQual API! This guide will help you get started with integrating CodeQual's AI-powered code review into your development workflow.

## Overview

The CodeQual API provides programmatic access to our comprehensive pull request analysis engine. With our API, you can:

- 🔍 Analyze pull requests for code quality, security, and performance issues
- 📊 Track analysis history and generate reports
- 🔧 Integrate with CI/CD pipelines
- 🌍 Access multi-language support for global teams

## Authentication

CodeQual uses API keys for authentication. Include your API key in the `X-API-Key` header:

```bash
curl -H "X-API-Key: ck_your_api_key_here" \
  https://api.codequal.com/v1/health
```

### Getting Your API Key

1. Sign in to your CodeQual account
2. Navigate to Settings → API Keys
3. Click "Create New Key"
4. Save your key securely - it won't be shown again!

## Quick Start

### 1. Analyze a Pull Request

```bash
curl -X POST https://api.codequal.com/v1/analyze-pr \
  -H "X-API-Key: ck_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "repositoryUrl": "https://github.com/owner/repo",
    "prNumber": 123,
    "analysisMode": "comprehensive"
  }'
```

Response:
```json
{
  "analysisId": "analysis_1234567890_abc123",
  "status": "queued",
  "estimatedTime": 600,
  "checkStatusUrl": "/v1/analysis/analysis_1234567890_abc123/progress"
}
```

### 2. Check Analysis Progress

```bash
curl https://api.codequal.com/v1/analysis/analysis_1234567890_abc123/progress \
  -H "X-API-Key: ck_your_api_key_here"
```

Response (when complete):
```json
{
  "analysisId": "analysis_1234567890_abc123",
  "status": "complete",
  "progress": 100,
  "results": {
    "summary": {
      "overallScore": 85,
      "recommendation": "approve",
      "criticalIssues": 0,
      "warnings": 3
    },
    "details": {
      "codeQuality": { /* ... */ },
      "security": { /* ... */ },
      "performance": { /* ... */ },
      "tests": { /* ... */ }
    }
  }
}
```

## Analysis Modes

Choose the depth of analysis based on your needs:

| Mode | Duration | Description | Best For |
|------|----------|-------------|----------|
| `quick` | 5-10 min | Basic checks, linting, obvious issues | Pre-commit hooks |
| `comprehensive` | 10-20 min | Standard analysis with security & performance | Default PR reviews |
| `deep` | 20-30 min | Full analysis including architecture review | Critical changes |

## Rate Limits

API rate limits depend on your subscription plan:

| Plan | Requests/Hour | Requests/Month |
|------|---------------|----------------|
| Free | 100 | 100 |
| Starter | 1,000 | 1,000 |
| Growth | 5,000 | 5,000 |
| Scale | 20,000 | 20,000 |
| Enterprise | Custom | Unlimited |

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1640995200
```

## Error Handling

The API uses standard HTTP status codes:

- `200` - Success
- `202` - Request accepted (for async operations)
- `400` - Bad request (invalid parameters)
- `401` - Unauthorized (missing/invalid API key)
- `403` - Forbidden (access denied)
- `404` - Not found
- `429` - Rate limit exceeded
- `500` - Server error

Error responses include details:
```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "details": {
    "limit": 1000,
    "remaining": 0,
    "reset": 1640995200
  }
}
```

## SDKs & Libraries

Official SDKs are available for:

- **TypeScript/JavaScript**: `npm install @codequal/api-client`
- **Python**: `pip install codequal-api`
- **Go**: `go get github.com/codequal/go-client`
- **Ruby**: `gem install codequal`
- **Java**: Maven/Gradle (see docs)

## Webhooks

Configure webhooks to receive real-time updates:

1. Set webhook URL in your account settings
2. We'll POST to your URL when analysis completes:

```json
{
  "event": "analysis.completed",
  "analysisId": "analysis_1234567890_abc123",
  "repository": "https://github.com/owner/repo",
  "prNumber": 123,
  "results": { /* ... */ }
}
```

## Best Practices

1. **Cache Results**: Analysis results don't change - cache by analysis ID
2. **Use Webhooks**: Better than polling for long-running analyses
3. **Batch Requests**: Analyze multiple PRs in parallel
4. **Handle Errors**: Implement exponential backoff for retries
5. **Monitor Usage**: Track your API usage to avoid limits

## Support

- 📧 Email: api-support@codequal.com
- 📚 Docs: https://docs.codequal.com/api
- 💬 Discord: https://discord.gg/codequal
- 🐛 Issues: https://github.com/codequal/api-issues

## What's Next?

- [API Reference](./api-reference.md) - Complete endpoint documentation
- [Integration Examples](./examples/) - CI/CD, GitHub Actions, etc.
- [Changelog](./changelog.md) - Latest API updates
- [OpenAPI Spec](https://api.codequal.com/v1/openapi.json) - For code generation



  📚 Key Documentation Created

  - /apps/api/openapi.yaml - Full OpenAPI specification
  - /docs/api/getting-started.md - Developer guide
  - /docs/api/examples/github-actions.yml - CI/CD integration
  - /docs/api/examples/node-example.ts - TypeScript client example
  - /scripts/generate-api-clients.sh - SDK generation script