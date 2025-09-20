# V9 Analysis API Documentation

## Overview
The V9 Analysis API provides comprehensive PR analysis using cloud-deployed tools and AI-powered hybrid agents. It integrates 65+ specialized tools with intelligent deduplication, fix generation, and business impact assessment.

## Base URL
```
Production: https://api.codequal.com
Development: http://localhost:3000
```

## Authentication
All endpoints require API key authentication:
```
Authorization: Bearer YOUR_API_KEY
```

---

## 📍 POST `/api/v9/analyze`

Analyze a GitHub pull request using the V9 unified framework.

### Request

#### Headers
```
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY
```

#### Body
```json
{
  "repositoryUrl": "https://github.com/apache/kafka",
  "prNumber": 17620,
  "language": "java",  // optional, auto-detected if not provided
  "options": {
    "skipCache": false,
    "generateFixes": true,
    "includeEducational": true,
    "timeout": 300000,  // 5 minutes
    "models": {
      "primary": "anthropic/claude-3-haiku-20240307",
      "fallback": "openai/gpt-3.5-turbo"
    }
  }
}
```

#### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `repositoryUrl` | string | ✅ | GitHub repository URL |
| `prNumber` | integer | ✅ | Pull request number |
| `language` | string | ❌ | Programming language (auto-detected) |
| `options` | object | ❌ | Analysis configuration |

#### Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `skipCache` | boolean | false | Force fresh analysis |
| `generateFixes` | boolean | true | Generate AI-powered fixes |
| `includeEducational` | boolean | true | Include learning resources |
| `timeout` | number | 300000 | Analysis timeout (ms) |
| `models.primary` | string | claude-3-haiku | Primary AI model |
| `models.fallback` | string | gpt-3.5-turbo | Fallback AI model |

### Response

#### Success Response (200)
```json
{
  "success": true,
  "analysisId": "analysis-1234567890",
  "repository": "https://github.com/apache/kafka",
  "prNumber": 17620,
  "language": "java",

  "summary": {
    "totalIssues": 156,
    "critical": 3,
    "high": 12,
    "medium": 45,
    "low": 96,
    "fixed": 8,
    "cached": 42
  },

  "score": {
    "overall": 72,
    "security": 65,
    "quality": 78,
    "performance": 82,
    "architecture": 70,
    "dependencies": 68
  },

  "issues": [
    {
      "id": "sec-001",
      "tool": "semgrep",
      "type": "security",
      "severity": "critical",
      "category": "SQL Injection",
      "message": "Potential SQL injection vulnerability",
      "file": "src/main/java/kafka/server/KafkaServer.java",
      "line": 145,
      "fix": "Use parameterized queries:\n```java\nPreparedStatement ps = conn.prepareStatement(\"SELECT * FROM users WHERE id = ?\");\nps.setInt(1, userId);\n```",
      "fixConfidence": "high",
      "fixCached": false,
      "educationalContent": "SQL injection occurs when user input is concatenated directly into SQL queries..."
    }
  ],

  "metrics": {
    "analysisTime": 225000,  // 3.75 minutes
    "toolsExecutionTime": 180000,
    "fixGenerationTime": 35000,
    "cacheHitRate": "26.9%",
    "costEstimate": 1.64  // USD
  },

  "report": {
    "markdown": "# CodeQual Analysis Report\n\n## Summary\n...",
    "html": "<html><body><h1>CodeQual Analysis Report</h1>...</body></html>",
    "recommendations": [
      "Fix 3 critical security vulnerabilities before deployment",
      "Address SQL injection vulnerability in KafkaServer.java:145",
      "Update dependencies with known vulnerabilities"
    ],
    "businessImpact": {
      "riskScore": 78,
      "technicalDebt": "12 hours",
      "estimatedFixTime": "4 hours",
      "priorityActions": [
        "Fix critical security issues (30 mins)",
        "Update vulnerable dependencies (1 hour)",
        "Refactor complex methods (2 hours)"
      ]
    }
  },

  "cloudServices": {
    "hybridAgent": "http://129.212.136.24",
    "toolsPods": [
      "pod-pmd-java-1234",
      "pod-checkstyle-java-5678",
      "pod-semgrep-security-9012"
    ],
    "cacheStatus": "healthy"
  }
}
```

#### Async Response (202)
```json
{
  "success": true,
  "analysisId": "analysis-1234567890",
  "status": "processing",
  "message": "Analysis started. Check status at /api/v9/status/{analysisId}",
  "estimatedTime": 300
}
```

#### Error Response (400/500)
```json
{
  "success": false,
  "error": "Invalid repository URL",
  "details": "Repository must be a valid GitHub URL",
  "timestamp": "2025-09-19T12:00:00Z"
}
```

---

## 📍 GET `/api/v9/status/{analysisId}`

Check the status of an ongoing analysis.

### Request
```
GET /api/v9/status/analysis-1234567890
Authorization: Bearer YOUR_API_KEY
```

### Response
```json
{
  "analysisId": "analysis-1234567890",
  "status": "processing",  // pending | processing | completed | failed
  "progress": 65,
  "currentStep": "Running security analysis",
  "stepsCompleted": [
    "Repository cloned",
    "Files indexed",
    "Quality tools executed"
  ],
  "estimatedTimeRemaining": 120
}
```

---

## 📍 GET `/api/v9/report/{analysisId}`

Retrieve the full analysis report.

### Request
```
GET /api/v9/report/analysis-1234567890?format=markdown
Authorization: Bearer YOUR_API_KEY
```

### Query Parameters
| Parameter | Type | Default | Options |
|-----------|------|---------|---------|
| `format` | string | json | json, markdown, html, pdf |

### Response
Varies based on format:
- **JSON**: Full analysis response (same as POST response)
- **Markdown**: Raw markdown report
- **HTML**: Formatted HTML report
- **PDF**: Binary PDF download

---

## 📍 POST `/api/v9/fix`

Generate AI-powered fixes for specific issues.

### Request
```json
{
  "analysisId": "analysis-1234567890",
  "issueIds": ["sec-001", "qual-045"],
  "model": "anthropic/claude-3-opus-20240229",
  "context": {
    "includeFileContext": true,
    "maxContextLines": 50
  }
}
```

### Response
```json
{
  "fixes": [
    {
      "issueId": "sec-001",
      "fix": "// Complete fix code here",
      "explanation": "This fix addresses the SQL injection by...",
      "confidence": "high",
      "alternativeFixes": [...],
      "testCode": "// Unit test for the fix"
    }
  ],
  "cost": 0.12
}
```

---

## 📍 GET `/api/v9/metrics`

Get aggregated metrics across all analyses.

### Request
```
GET /api/v9/metrics?period=7d
Authorization: Bearer YOUR_API_KEY
```

### Response
```json
{
  "period": "7d",
  "totalAnalyses": 342,
  "averageScore": 74,
  "topIssueTypes": [
    { "type": "security", "count": 892 },
    { "type": "quality", "count": 2341 }
  ],
  "performanceMetrics": {
    "averageAnalysisTime": 185000,
    "p50": 170000,
    "p95": 320000,
    "p99": 450000
  },
  "costMetrics": {
    "totalCost": 234.56,
    "averageCostPerAnalysis": 0.69
  }
}
```

---

## Response Codes

| Code | Status | Description |
|------|--------|-------------|
| 200 | OK | Analysis completed successfully |
| 202 | Accepted | Analysis started (async) |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Invalid or missing API key |
| 404 | Not Found | Analysis or resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Service temporarily unavailable |

---

## Rate Limiting

- **Free tier**: 10 requests/hour
- **Pro tier**: 100 requests/hour
- **Enterprise**: Unlimited

Headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1758292800
```

---

## Webhooks

Configure webhooks to receive analysis completion notifications:

### Webhook Payload
```json
{
  "event": "analysis.completed",
  "analysisId": "analysis-1234567890",
  "repository": "https://github.com/apache/kafka",
  "prNumber": 17620,
  "score": 72,
  "summary": {
    "critical": 3,
    "high": 12
  },
  "reportUrl": "https://app.codequal.com/report/analysis-1234567890",
  "timestamp": "2025-09-19T12:00:00Z"
}
```

---

## SDKs

### JavaScript/TypeScript
```typescript
import { CodeQualClient } from '@codequal/sdk';

const client = new CodeQualClient({
  apiKey: process.env.CODEQUAL_API_KEY
});

const analysis = await client.v9.analyze({
  repositoryUrl: 'https://github.com/apache/kafka',
  prNumber: 17620
});
```

### Python
```python
from codequal import CodeQualClient

client = CodeQualClient(api_key=os.environ['CODEQUAL_API_KEY'])

analysis = client.v9.analyze(
    repository_url='https://github.com/apache/kafka',
    pr_number=17620
)
```

### CLI
```bash
# Install
npm install -g @codequal/cli

# Analyze
codequal analyze \
  --repo https://github.com/apache/kafka \
  --pr 17620 \
  --format markdown
```

---

## Example Workflows

### 1. Basic PR Analysis
```bash
curl -X POST https://api.codequal.com/api/v9/analyze \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "repositoryUrl": "https://github.com/apache/kafka",
    "prNumber": 17620
  }'
```

### 2. Analysis with Custom Options
```javascript
const response = await fetch('https://api.codequal.com/api/v9/analyze', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    repositoryUrl: 'https://github.com/apache/kafka',
    prNumber: 17620,
    options: {
      generateFixes: true,
      includeEducational: true,
      models: {
        primary: 'anthropic/claude-3-opus-20240229'
      }
    }
  })
});

const result = await response.json();
```

### 3. GitHub Actions Integration
```yaml
name: CodeQual Analysis
on: [pull_request]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: codequal/analyze-action@v9
        with:
          api-key: ${{ secrets.CODEQUAL_API_KEY }}
          generate-fixes: true
          fail-on-critical: true
```

---

## Support

- **Documentation**: https://docs.codequal.com
- **Status Page**: https://status.codequal.com
- **Support Email**: support@codequal.com
- **Discord**: https://discord.gg/codequal

---

*Last updated: 2025-09-19*