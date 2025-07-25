# DeepWiki Documentation

## Overview

DeepWiki is CodeQual's comprehensive repository analysis engine that generates detailed security, performance, architecture, and code quality reports. It uses AI models through OpenRouter to analyze codebases and produce 400+ line reports with 200+ specific findings.

## Quick Start

### 1. Prerequisites
- Kubernetes cluster with DeepWiki pod deployed
- OpenRouter API key
- Port forwarding set up (if accessing remotely)

### 2. Basic Usage

```bash
# Set up environment
export OPENROUTER_API_KEY="your-openrouter-api-key"
export DEEPWIKI_USE_PORT_FORWARD=true

# Start port forwarding (if needed)
kubectl port-forward -n codequal-dev svc/deepwiki-api 8001:8001

# Generate analysis
curl -X POST http://localhost:8001/chat/completions/stream \
  -H "Content-Type: application/json" \
  -d '{
    "repo_url": "https://github.com/owner/repo",
    "messages": [{"role": "user", "content": "Analyze this repository"}],
    "model": "anthropic/claude-3-opus"
  }'
```

## Architecture

### Components

1. **DeepWiki API Service** (Port 8001)
   - Accepts analysis requests
   - Routes to AI models via OpenRouter
   - Returns structured analysis results

2. **OpenRouter Integration**
   - Single API gateway for multiple AI providers
   - Handles authentication and routing
   - Provides model fallback capabilities

3. **Analysis Engine**
   - Processes repository data
   - Generates embeddings for semantic search
   - Produces comprehensive reports

### Data Flow

```
User Request → DeepWiki API → OpenRouter → AI Model → Analysis → Report
                                    ↓
                              Model Fallback
                                    ↓
                            Alternative Model
```

## Report Generation

### Report Structure

DeepWiki generates reports following this structure:

1. **Executive Summary** (Overall score, key metrics, issue distribution)
2. **Security Analysis** (Vulnerabilities, CVEs, remediation)
3. **Performance Analysis** (Bottlenecks, metrics, optimizations)
4. **Code Quality Analysis** (Complexity, maintainability, technical debt)
5. **Architecture Analysis** (Patterns, design issues, recommendations)
6. **Dependencies Analysis** (Vulnerabilities, outdated packages)
7. **Testing Analysis** (Coverage, gaps, recommendations)
8. **Priority Action Plan** (Week-by-week implementation guide)
9. **Educational Recommendations** (Skill gaps, learning paths)
10. **Success Metrics** (Technical and business impact)

### Generating Reports

#### Method 1: Direct API Call

```typescript
import { deepWikiApiManager } from './services/deepwiki-api-manager';

const result = await deepWikiApiManager.analyzeRepository(
  'https://github.com/owner/repo',
  { branch: 'main' }
);
```

#### Method 2: CLI Script

```bash
npx tsx src/test-scripts/test-deepwiki-api.ts
```

#### Method 3: Kubernetes Execution

```bash
kubectl exec -n codequal-dev deployment/deepwiki -- \
  analyze-repository https://github.com/owner/repo
```

### Report Template

See [Report Template](./templates/comprehensive-analysis-report-template.md) for the complete structure.

### Sample Report

See [Sample Analysis Report](./samples/comprehensive-analysis-report.md) for a full example with 234 findings.

## API Reference

### Endpoints

#### POST /chat/completions/stream

Analyze a repository and return results.

**Request:**
```json
{
  "repo_url": "https://github.com/owner/repo",
  "messages": [
    {
      "role": "system",
      "content": "You are a code analyzer. Return JSON only."
    },
    {
      "role": "user",
      "content": "Analyze this repository comprehensively..."
    }
  ],
  "model": "anthropic/claude-3-opus",
  "stream": false,
  "temperature": 0.2
}
```

**Response:**
```json
{
  "choices": [{
    "message": {
      "content": "{\"vulnerabilities\": [...], \"recommendations\": [...]}"
    }
  }]
}
```

#### GET /health

Check API health status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-07-24T20:00:00Z"
}
```

## Model Configuration

### Dynamic Model Selection

DeepWiki uses the same intelligent model selection system as PR analysis:

1. **Vector DB Query**: Checks for context-specific model configurations
2. **Freshness Check**: Ensures models are not older than 3-6 months
3. **Fallback Strategy**: Multiple models from different providers
4. **Quarterly Updates**: Researcher service updates model configurations

### Model Selection Process

```typescript
// DeepWiki automatically selects optimal models
const models = await getOptimalModel(repositoryUrl);
// Returns: {
//   primary: 'anthropic/claude-3.5-sonnet',
//   fallback: ['openai/gpt-4-turbo-2024-04-09', 'google/gemini-1.5-pro']
// }
```

### Current Recommended Models (Auto-Updated)

| Model | Provider | Release Date | Best For |
|-------|----------|--------------|----------|
| claude-3.5-sonnet | Anthropic | 2024 | Comprehensive analysis |
| gpt-4-turbo-2024-04-09 | OpenAI | 2024-04 | Fast, accurate analysis |
| gemini-1.5-pro | Google | 2024 | Cost-effective analysis |
| claude-3-haiku | Anthropic | 2024 | Quick validation |

### Model Fallback Strategy

The system automatically handles model failures:

1. **Primary Model**: Selected based on repository context and freshness
2. **Fallback Models**: Different providers to maximize availability
3. **Emergency Fallback**: Recent models if Vector DB is unavailable

```javascript
// Example of model selection with metadata
{
  role: 'comprehensive-analyzer',
  primaryModel: 'anthropic/claude-3.5-sonnet',
  fallbackModels: [
    'openai/gpt-4-turbo-2024-04-09',
    'google/gemini-1.5-pro',
    'anthropic/claude-3-haiku'
  ],
  metadata: {
    freshness_score: 9.0,  // Model is 2 months old
    capability_score: 9.5,
    cost_efficiency: 7.0
  }
}
```

## Storage Strategy

### Simplified Approach (90% Cost Reduction)

DeepWiki uses a simplified storage strategy:

1. **No Repository Storage** - Repositories are analyzed on-demand
2. **Report Storage Only** - Only final reports are persisted
3. **Embedding Generation** - 384-dimensional embeddings for semantic search
4. **Efficient Compression** - ~70% compression for report storage

### Storage Metrics

- Average report size: 12-15 KB (uncompressed)
- With embeddings: ~20 KB total
- Compressed: ~6 KB
- Analysis time: 30-60 seconds

## Integration Guide

### TypeScript Integration

```typescript
// 1. Import the API manager
import { deepWikiApiManager } from '@codequal/api/services/deepwiki-api-manager';

// 2. Configure environment
process.env.DEEPWIKI_USE_PORT_FORWARD = 'true';
process.env.DEEPWIKI_API_PORT = '8001';

// 3. Analyze repository
try {
  const analysis = await deepWikiApiManager.analyzeRepository(
    'https://github.com/owner/repo',
    { branch: 'main' }
  );
  
  console.log(`Total issues: ${analysis.issues.length}`);
  console.log(`Security score: ${analysis.scores.security}/100`);
} catch (error) {
  console.error('Analysis failed:', error);
}
```

### Data Flow Integration

```typescript
// Store analysis results
const analysisData = {
  repository_url: repoUrl,
  analysis_type: 'comprehensive',
  results: analysis.scores,
  report_markdown: generateMarkdownReport(analysis),
  embeddings: generateEmbeddings(analysis),
  metadata: {
    model_used: 'claude-3-opus',
    duration_seconds: duration,
    timestamp: new Date().toISOString()
  }
};

// Save to database
await database.analyses.insert(analysisData);
```

## Troubleshooting

### Common Issues

1. **401 Authentication Error**
   ```bash
   # Update API key
   kubectl set env -n codequal-dev deployment/deepwiki \
     OPENROUTER_API_KEY=$OPENROUTER_API_KEY
   ```

2. **Connection Refused**
   ```bash
   # Check port forwarding
   kubectl port-forward -n codequal-dev svc/deepwiki-api 8001:8001
   ```

3. **JSON Parse Error**
   - API returns text with JSON embedded
   - Use the parsing logic in deepwiki-api-manager.ts

4. **Model Not Available**
   ```bash
   # List available models
   curl -H "Authorization: Bearer $OPENROUTER_API_KEY" \
     https://openrouter.ai/api/v1/models
   ```

### Debug Commands

```bash
# Check pod status
kubectl get pods -n codequal-dev -l app=deepwiki

# View logs
kubectl logs -n codequal-dev -l app=deepwiki --tail=100

# Test API directly
curl http://localhost:8001/health

# Check environment variables
kubectl exec -n codequal-dev deployment/deepwiki -- env | grep OPENROUTER
```

## Best Practices

1. **Always Use Model Fallback**
   - Configure at least 2-3 fallback models
   - Use models from different providers

2. **Handle Text Responses**
   - API may return text instead of JSON
   - Extract JSON from text responses

3. **Optimize Prompts**
   - Request JSON-only responses
   - Be specific about required fields
   - Set low temperature for consistency

4. **Monitor Usage**
   - Track API costs per model
   - Monitor response times
   - Log failed analyses

5. **Cache Results**
   - Store analysis results
   - Reuse for similar requests
   - Implement TTL for freshness

## Maintenance

### Daily Tasks
- Verify API health: `curl http://localhost:8001/health`
- Check pod status: `kubectl get pods -n codequal-dev`

### Weekly Tasks
- Review API usage and costs
- Update model configurations if needed
- Clean up old analysis results

### Monthly Tasks
- Update OpenRouter API models list
- Review and optimize prompts
- Update documentation with new findings

## Files Structure

```
/docs/Deepwiki/
├── README.md                           # This file
├── integration/
│   ├── openrouter-setup.md            # OpenRouter configuration guide
│   ├── model-fallback-guide.md        # Fallback configuration
│   └── api-integration.md             # API integration examples
├── templates/
│   └── comprehensive-analysis-report-template.md
├── samples/
│   ├── comprehensive-analysis-report.md
│   └── medium-low-priority-issues.md
└── reference/
    ├── api-endpoints.md               # Detailed API reference
    └── troubleshooting.md             # Extended troubleshooting guide
```

---

*Last Updated: July 24, 2025*