# DeepWiki Integration - Complete Documentation

> **Last Updated:** August 9, 2025  
> **Status:** Active  
> **Version:** 2.0

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [API Integration](#api-integration)
4. [Deployment & Configuration](#deployment--configuration)
5. [Testing & Debugging](#testing--debugging)
6. [Common Issues & Solutions](#common-issues--solutions)
7. [API Reference](#api-reference)
8. [Development Guide](#development-guide)

---

## Overview

DeepWiki is CodeQual's core code analysis engine that performs deep repository scanning to identify security vulnerabilities, performance issues, and code quality problems. It integrates with OpenRouter to leverage various AI models for comprehensive code analysis.

### Key Features
- Multi-branch analysis (main vs feature branches)
- Security vulnerability detection
- Performance bottleneck identification
- Code quality assessment
- Dependency vulnerability scanning
- PR-specific analysis with diff comparison
- Redis caching for improved performance

### Current Status
- **Production Endpoint:** `http://localhost:8001/chat/completions/stream`
- **Kubernetes Deployment:** `codequal-dev` namespace
- **Primary Model:** OpenAI GPT-4o via OpenRouter
- **Average Analysis Time:** 15-45 seconds per repository

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────┐
│            CodeQual Frontend                 │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│             CodeQual API                     │
│        (Express + TypeScript)                │
│   /apps/api/src/services/                    │
│     └── deepwiki-api-manager.ts              │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│           DeepWiki Service                   │
│     (Kubernetes Pod in codequal-dev)         │
│         - Repository Cloning                 │
│         - Code Analysis                      │
│         - OpenRouter Integration             │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│              OpenRouter                      │
│    (Model: openai/gpt-4o)                    │
└──────────────────────────────────────────────┘
```

### Data Flow

1. **Request Initiation**
   - User requests PR analysis
   - API receives repository URL and PR number

2. **DeepWiki Processing**
   - Clones repository (main and PR branches)
   - Analyzes code with selected AI model
   - Returns structured vulnerability data

3. **Response Processing**
   - API parses DeepWiki response
   - Converts to standardized format
   - Caches results in Redis

4. **Report Generation**
   - Comparison agent processes results
   - Generates markdown reports
   - Creates PR comments

---

## API Integration

### Request Format

DeepWiki accepts requests in the following format:

```json
{
  "repo_url": "https://github.com/owner/repo",
  "messages": [{
    "role": "user",
    "content": "Analyze this repository and find security vulnerabilities..."
  }],
  "stream": false,
  "provider": "openrouter",
  "model": "openai/gpt-4o",
  "temperature": 0.2,
  "max_tokens": 4000
}
```

### Response Formats

DeepWiki can return responses in two formats:

#### 1. Direct JSON Format (Current)
```json
{
  "vulnerabilities": [
    {
      "severity": "high",
      "category": "security",
      "title": "SQL Injection Vulnerability",
      "location": "api/users.js:45"
    }
  ],
  "scores": {
    "overall": 75,
    "security": 60,
    "performance": 80
  },
  "summary": "Analysis summary..."
}
```

#### 2. OpenAI Format (Legacy)
```json
{
  "choices": [{
    "message": {
      "content": "{\"vulnerabilities\": [...]}"
    }
  }]
}
```

### Response Parsing Fix (August 2025)

The system now automatically detects and handles both formats:

```typescript
// Check if response is in direct format
if (parsed.vulnerabilities || parsed.issues || parsed.scores) {
  // Wrap direct response in OpenAI format for compatibility
  return {
    choices: [{
      message: {
        content: JSON.stringify(parsed)
      }
    }]
  };
}
```

---

## Deployment & Configuration

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: deepwiki
  namespace: codequal-dev
spec:
  replicas: 1
  selector:
    matchLabels:
      app: deepwiki
  template:
    metadata:
      labels:
        app: deepwiki
    spec:
      containers:
      - name: deepwiki
        image: your-registry/deepwiki:latest
        ports:
        - containerPort: 8001
        env:
        - name: GITHUB_TOKEN
          valueFrom:
            secretKeyRef:
              name: deepwiki-api-keys
              key: GITHUB_TOKEN
        - name: OPENROUTER_API_KEY
          valueFrom:
            secretKeyRef:
              name: deepwiki-api-keys
              key: OPENROUTER_API_KEY
```

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DEEPWIKI_API_KEY` | Authentication key for DeepWiki | Yes | - |
| `USE_DEEPWIKI_MOCK` | Use mock data instead of real API | No | false |
| `DEEPWIKI_USE_PORT_FORWARD` | Use port-forward instead of kubectl exec | No | false |
| `DEEPWIKI_POD_NAME` | Override pod name | No | Auto-detect |
| `DEEPWIKI_NAMESPACE` | Kubernetes namespace | No | codequal-dev |

### GitHub Authentication

DeepWiki requires GitHub authentication to clone repositories:

1. **Create GitHub Personal Access Token:**
   - Go to GitHub Settings → Developer settings → Personal access tokens
   - Create token with `repo` scope
   - Copy token immediately

2. **Update Kubernetes Secret:**
```bash
kubectl create secret generic deepwiki-api-keys \
  --from-literal=GITHUB_TOKEN='ghp_YOUR_TOKEN_HERE' \
  --from-literal=OPENROUTER_API_KEY='sk-or-v1-YOUR_KEY' \
  -n codequal-dev
```

3. **Restart DeepWiki:**
```bash
kubectl rollout restart deployment/deepwiki -n codequal-dev
```

---

## Testing & Debugging

### Diagnostic Tool

Use the diagnostic tool to test DeepWiki connectivity:

```bash
cd /packages/agents
npx ts-node test-deepwiki-diagnosis.ts
```

This tool:
- Checks pod status
- Tests API connectivity
- Sends test requests
- Analyzes response format

### Direct API Testing

#### Via kubectl exec (Recommended)
```bash
kubectl exec -n codequal-dev deployment/deepwiki -- \
  curl -s -X POST http://localhost:8001/chat/completions/stream \
  -H "Content-Type: application/json" \
  -d '{
    "repo_url": "https://github.com/sindresorhus/ky",
    "messages": [{"role": "user", "content": "Analyze repository"}],
    "stream": false,
    "provider": "openrouter",
    "model": "openai/gpt-4o"
  }'
```

#### Via Port Forward
```bash
# Terminal 1: Set up port forward
kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001

# Terminal 2: Send request
curl -X POST http://localhost:8001/chat/completions/stream \
  -H "Content-Type: application/json" \
  -d '{"repo_url": "https://github.com/sindresorhus/ky", ...}'
```

### Complete Analysis Test

Run full PR analysis with DeepWiki:

```bash
cd /packages/agents
DEEPWIKI_API_KEY=dw-key-e48329b6c05b4a36a18d65af21ac3c2f \
USE_DEEPWIKI_MOCK=false \
npx ts-node src/standard/scripts/run-complete-analysis.ts \
  --repo https://github.com/sindresorhus/ky \
  --pr 500
```

---

## Common Issues & Solutions

### Issue 1: DeepWiki Returns 0 Issues

**Symptom:** Analysis completes but returns no vulnerabilities

**Root Cause:** Response format mismatch (direct JSON vs OpenAI format)

**Solution:** 
- Update `deepwiki-api-manager.ts` with format detection logic
- Use diagnostic tool to verify response format
- Check logs for parsing errors

### Issue 2: GitHub Authentication Failure

**Symptom:** "Invalid username or token" error when cloning

**Solution:**
1. Create new GitHub PAT with `repo` scope
2. Update Kubernetes secret
3. Restart DeepWiki pod
4. Test with public repository clone

### Issue 3: Timeout Errors

**Symptom:** Analysis times out after 60 seconds

**Solution:**
- Increase timeout in API call
- Use smaller repositories for testing
- Check pod resources and scale if needed

### Issue 4: Pod Not Found

**Symptom:** Cannot find DeepWiki pod

**Solution:**
```bash
# Check pod status
kubectl get pods -n codequal-dev -l app=deepwiki

# If no pods, check deployment
kubectl get deployment -n codequal-dev deepwiki

# View deployment logs
kubectl logs -n codequal-dev deployment/deepwiki
```

---

## API Reference

### DeepWikiApiManager Class

Main service for interacting with DeepWiki:

```typescript
class DeepWikiApiManager {
  async analyzeRepository(
    repositoryUrl: string,
    options?: {
      branch?: string;
      prId?: string;
      skipCache?: boolean;
    }
  ): Promise<DeepWikiAnalysisResult>
  
  async cleanupRepository(repositoryUrl: string): Promise<void>
  
  private async callDeepWikiApi(
    podName: string,
    repositoryUrl: string,
    prompt: string,
    model: string
  ): Promise<DeepWikiApiResponse>
  
  private parseApiResponse(
    response: DeepWikiApiResponse
  ): ParsedAnalysis
}
```

### Types

```typescript
interface DeepWikiAnalysisResult {
  issues: DeepWikiIssue[];
  recommendations: DeepWikiRecommendation[];
  scores: {
    overall: number;
    security: number;
    performance: number;
    maintainability: number;
  };
  metadata: {
    analyzed_at: Date;
    duration_ms: number;
    model_used: string;
  };
}

interface DeepWikiIssue {
  type: 'vulnerability' | 'bug' | 'code-smell' | 'security';
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  message: string;
  file: string;
  line?: number;
  suggestion?: string;
  cwe?: string;
  cvss?: number;
}
```

---

## Development Guide

### Local Development Setup

1. **Install Dependencies:**
```bash
npm install
```

2. **Set Environment Variables:**
```bash
export DEEPWIKI_API_KEY=dw-key-e48329b6c05b4a36a18d65af21ac3c2f
export USE_DEEPWIKI_MOCK=false
export DEEPWIKI_USE_PORT_FORWARD=true
```

3. **Set Up Port Forward:**
```bash
kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001
```

4. **Run Tests:**
```bash
npm test
```

### Adding New Models

To add support for new AI models:

1. Update model configuration in `deepwiki-api-manager.ts`
2. Add model-specific prompt templates
3. Test with diagnostic tool
4. Update model selection logic

### Performance Optimization

- **Redis Caching:** Results are cached for 30 minutes
- **Parallel Analysis:** Main and PR branches analyzed concurrently
- **Model Selection:** Choose appropriate model based on repository size
- **Resource Limits:** Set appropriate CPU/memory limits in Kubernetes

### Monitoring

Monitor DeepWiki performance:

```bash
# View logs
kubectl logs -n codequal-dev deployment/deepwiki -f

# Check resource usage
kubectl top pod -n codequal-dev -l app=deepwiki

# View metrics
kubectl get --raw /metrics | grep deepwiki
```

---

## Appendix

### Cleanup Script

Remove outdated DeepWiki files:

```bash
#!/bin/bash
# cleanup-deepwiki-docs.sh

# Archive old documentation
mkdir -p /docs/archive/deepwiki-legacy
mv /docs/deepwiki-*.md /docs/archive/deepwiki-legacy/

# Remove test files
rm -f /packages/agents/test-deepwiki-*.ts
rm -f /packages/agents/docs-archive/DEEPWIKI_*.md

# Keep only current documentation
echo "DeepWiki documentation consolidated in /docs/architecture/Deepwiki/"
```

### Quick Reference Commands

```bash
# Check DeepWiki status
kubectl get pods -n codequal-dev -l app=deepwiki

# View logs
kubectl logs -n codequal-dev deployment/deepwiki --tail=100

# Restart DeepWiki
kubectl rollout restart deployment/deepwiki -n codequal-dev

# Test with mock data
USE_DEEPWIKI_MOCK=true npm run test

# Run diagnostic
npx ts-node test-deepwiki-diagnosis.ts
```

---

**Note:** This documentation supersedes all previous DeepWiki documentation files. For historical reference, see `/docs/archive/deepwiki-legacy/`.