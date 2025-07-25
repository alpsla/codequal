# DeepWiki Documentation - Consolidated Guide

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Architecture](#architecture)
4. [Model Selection Strategy](#model-selection-strategy)
5. [Report Generation](#report-generation)
6. [API Reference](#api-reference)
7. [Integration Guide](#integration-guide)
8. [Storage Strategy](#storage-strategy)
9. [Troubleshooting](#troubleshooting)
10. [Best Practices](#best-practices)
11. [Maintenance](#maintenance)

## Overview

DeepWiki is CodeQual's comprehensive repository analysis engine that generates detailed security, performance, architecture, and code quality reports. It leverages AI models through dynamic selection to analyze codebases and produce comprehensive reports with 200+ specific findings.

### Key Features

- **Dynamic Model Selection**: Automatically selects optimal AI models based on repository characteristics
- **Comprehensive Analysis**: Security vulnerabilities, performance issues, code quality, architecture patterns
- **No Repository Storage**: 90% cost reduction by analyzing on-demand without storing repositories
- **Multi-Provider Support**: Seamless fallback between different AI providers
- **Language-Aware**: Optimized model selection for different programming languages
- **Size-Adaptive**: Adjusts analysis depth based on repository size

## Quick Start

### Prerequisites

- Kubernetes cluster with DeepWiki pod deployed
- OpenRouter API key (set as environment variable)
- Port forwarding configured (if accessing remotely)

### Basic Setup

```bash
# Set environment variables
export OPENROUTER_API_KEY="your-openrouter-api-key"
export DEEPWIKI_USE_PORT_FORWARD=true
export DEEPWIKI_API_PORT=8001

# Check DeepWiki pod status
kubectl get pods -n codequal-dev -l app=deepwiki

# Set up port forwarding
kubectl port-forward -n codequal-dev pod/deepwiki-<pod-id> 8001:8000

# Verify API health
curl http://localhost:8001/health
```

### Generate Your First Report

```typescript
import { deepWikiApiManager } from '@codequal/api/services/deepwiki-api-manager';

const analysis = await deepWikiApiManager.analyzeRepository(
  'https://github.com/vercel/next.js'
);

console.log(`Found ${analysis.issues.length} issues`);
console.log(`Security Score: ${analysis.scores.security}/100`);
```

## Architecture

### System Components

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Client App    │────▶│  DeepWiki API    │────▶│   OpenRouter    │
│                 │     │   (Port 8001)     │     │      API        │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                │                          │
                                ▼                          ▼
                        ┌──────────────────┐     ┌─────────────────┐
                        │ Model Selection  │     │   AI Models     │
                        │     Service      │     │ (GPT-4, Claude) │
                        └──────────────────┘     └─────────────────┘
```

### Key Services

1. **DeepWiki API Manager** (`deepwiki-api-manager.ts`)
   - Handles repository analysis requests
   - Manages model selection and fallback
   - Parses AI responses into structured data

2. **Model Configuration Service** (`deepwiki-model-configurations.ts`)
   - Stores optimal model configurations per language/size
   - Triggers research for missing configurations
   - Tracks performance metrics

3. **PR Context Service** (reused from orchestrator)
   - Detects repository language
   - Determines repository size
   - Provides repository metadata

## Model Selection Strategy

### Dynamic Selection Process

DeepWiki uses intelligent model selection based on:

1. **Repository Language** (TypeScript, Python, Java, Go, Ruby, etc.)
2. **Repository Size** (Small, Medium, Large, Enterprise)
3. **Quality Requirements** (60% quality, 30% cost, 10% speed)

### Weight Distribution by Repository Size

| Size       | Quality | Cost | Speed | Use Case |
|------------|---------|------|-------|----------|
| Small      | 40%     | 40%  | 20%   | Quick analysis, templates |
| Medium     | 50%     | 35%  | 15%   | Standard projects |
| Large      | 60%     | 30%  | 10%   | Production codebases |
| Enterprise | 70%     | 25%  | 5%    | Critical repositories |

### Current Model Recommendations (July 2025)

| Model | Provider | Best For | Context Window |
|-------|----------|----------|----------------|
| claude-opus-4 | Anthropic | Enterprise analysis | 200K+ |
| gpt-4o-2025-07 | OpenAI | General purpose | 128K |
| claude-sonnet-4 | Anthropic | Cost-effective | 200K |
| gemini-2.5-pro | Google | Fast analysis | 1M+ |

### Selection Example

```typescript
// For github.com/vercel/next.js
Language: TypeScript
Size: Enterprise
Selected: {
  primary: 'openai/gpt-4o-2025-07',
  fallback: 'openai/gpt-4.1',
  weights: { quality: 0.7, cost: 0.25, speed: 0.05 }
}
```

## Report Generation

### Report Structure

1. **Executive Summary**
   - Overall scores and grades
   - Key metrics and statistics
   - Issue distribution by severity

2. **Security Analysis**
   - Critical vulnerabilities with CVE/CWE
   - CVSS scores and attack vectors
   - Detailed remediation steps

3. **Code Quality Analysis**
   - Complexity metrics
   - Maintainability issues
   - Technical debt estimation

4. **Performance Analysis**
   - Bottlenecks and inefficiencies
   - Memory leaks and resource usage
   - Optimization recommendations

5. **Architecture Analysis**
   - Design patterns and anti-patterns
   - Coupling and cohesion metrics
   - Scalability considerations

6. **Dependencies Analysis**
   - Vulnerable dependencies
   - Outdated packages
   - License compliance

7. **Testing Coverage**
   - Coverage percentages
   - Missing test scenarios
   - Testing recommendations

8. **Priority Action Plan**
   - Week-by-week implementation
   - Effort estimates
   - Impact assessment

### Generating Reports

#### TypeScript/Node.js

```typescript
import { deepWikiApiManager } from '@codequal/api/services/deepwiki-api-manager';

async function analyzeRepository(repoUrl: string) {
  try {
    // Start analysis
    const result = await deepWikiApiManager.analyzeRepository(repoUrl, {
      branch: 'main'
    });
    
    // Process results
    console.log(`Analysis ID: ${result.analysis_id}`);
    console.log(`Total Issues: ${result.issues.length}`);
    console.log(`Critical: ${result.issues.filter(i => i.severity === 'critical').length}`);
    
    // Generate markdown report
    const report = generateMarkdownReport(result);
    
    // Save report
    await fs.writeFile(`report-${Date.now()}.md`, report);
    
    return result;
  } catch (error) {
    console.error('Analysis failed:', error);
    throw error;
  }
}
```

#### CLI Usage

```bash
# Using test script
npx tsx src/test-scripts/generate-real-deepwiki-report.ts

# Direct API call
curl -X POST http://localhost:8001/chat/completions/stream \
  -H "Content-Type: application/json" \
  -d '{
    "repo_url": "https://github.com/owner/repo",
    "messages": [{"role": "user", "content": "Analyze repository"}],
    "model": "openai/gpt-4o-2025-07",
    "stream": false
  }'
```

### Sample Reports

- [Comprehensive Analysis Sample](./samples/comprehensive-analysis-report.md) - Full report with 287 issues
- [Report Template](./templates/comprehensive-analysis-report-template.md) - Structure template

## API Reference

### POST /chat/completions/stream

Analyzes a repository and returns comprehensive results.

**Request:**
```json
{
  "repo_url": "https://github.com/owner/repo",
  "messages": [
    {
      "role": "user",
      "content": "Provide comprehensive security and code quality analysis"
    }
  ],
  "model": "openai/gpt-4o-2025-07",
  "stream": false,
  "temperature": 0.2,
  "provider": "openrouter"
}
```

**Response:**
```json
{
  "choices": [{
    "message": {
      "content": "{
        \"vulnerabilities\": [...],
        \"recommendations\": [...],
        \"scores\": {...},
        \"statistics\": {...}
      }"
    }
  }]
}
```

### GET /health

Check API health status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-07-25T10:00:00Z",
  "service": "deepwiki-api"
}
```

## Integration Guide

### TypeScript SDK Integration

```typescript
// 1. Import required services
import { deepWikiApiManager } from '@codequal/api/services/deepwiki-api-manager';
import { createLogger } from '@codequal/core/utils';

const logger = createLogger('deepwiki-integration');

// 2. Configure analysis options
interface AnalysisOptions {
  branch?: string;
  includeHistory?: boolean;
  maxIssues?: number;
}

// 3. Create analysis function
async function performDeepWikiAnalysis(
  repositoryUrl: string,
  options: AnalysisOptions = {}
) {
  logger.info('Starting DeepWiki analysis', { repositoryUrl });
  
  try {
    // Perform analysis
    const result = await deepWikiApiManager.analyzeRepository(
      repositoryUrl,
      options
    );
    
    // Process critical issues
    const criticalIssues = result.issues.filter(
      issue => issue.severity === 'critical'
    );
    
    if (criticalIssues.length > 0) {
      logger.warn(`Found ${criticalIssues.length} critical issues`);
      // Trigger alerts or notifications
    }
    
    // Store results
    await storeAnalysisResults(result);
    
    return result;
  } catch (error) {
    logger.error('DeepWiki analysis failed', error);
    throw error;
  }
}

// 4. Store results in database
async function storeAnalysisResults(analysis: DeepWikiAnalysisResult) {
  const record = {
    repository_url: analysis.repository_url,
    analysis_id: analysis.analysis_id,
    scores: analysis.scores,
    issue_count: analysis.issues.length,
    critical_count: analysis.issues.filter(i => i.severity === 'critical').length,
    model_used: analysis.metadata.model_used,
    duration_ms: analysis.metadata.duration_ms,
    created_at: new Date()
  };
  
  await database.deepwiki_analyses.insert(record);
}
```

### GitHub Actions Integration

```yaml
name: DeepWiki Security Analysis

on:
  schedule:
    - cron: '0 0 * * 1' # Weekly on Monday
  workflow_dispatch:

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run DeepWiki Analysis
        env:
          OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
        run: |
          npx tsx scripts/deepwiki-analysis.ts \
            --repo ${{ github.repository }} \
            --output report.md
            
      - name: Upload Report
        uses: actions/upload-artifact@v3
        with:
          name: deepwiki-report
          path: report.md
```

## Storage Strategy

### Simplified Architecture (90% Cost Reduction)

DeepWiki's storage strategy eliminates repository storage:

1. **On-Demand Analysis**: Repositories analyzed without local storage
2. **Report Persistence**: Only final reports and embeddings stored
3. **Efficient Compression**: ~70% reduction in storage size
4. **Vector Embeddings**: 384-dimensional for semantic search

### Storage Metrics

| Metric | Value |
|--------|-------|
| Average Report Size | 12-15 KB |
| With Embeddings | ~20 KB |
| Compressed Size | ~6 KB |
| Analysis Duration | 30-60 seconds |
| Storage Cost/Report | <$0.001 |

### Implementation

```typescript
// Store only results, not repositories
const storageData = {
  analysis_id: result.analysis_id,
  repository_url: result.repository_url,
  report_markdown: generateMarkdown(result),
  report_compressed: compress(result),
  embeddings: generateEmbeddings(result),
  metadata: {
    model_used: result.metadata.model_used,
    duration_ms: result.metadata.duration_ms,
    issue_count: result.issues.length,
    scores: result.scores
  },
  created_at: new Date()
};

await vectorDb.store(storageData);
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Authentication Error (401)

**Problem**: OpenRouter API key not recognized

**Solution**:
```bash
# Update deployment with API key
kubectl set env -n codequal-dev deployment/deepwiki \
  OPENROUTER_API_KEY=$OPENROUTER_API_KEY

# Restart pod
kubectl rollout restart -n codequal-dev deployment/deepwiki
```

#### 2. Connection Refused

**Problem**: Cannot connect to DeepWiki API

**Solution**:
```bash
# Check pod status
kubectl get pods -n codequal-dev -l app=deepwiki

# Restart port forwarding
kubectl port-forward -n codequal-dev pod/deepwiki-<pod-id> 8001:8000
```

#### 3. No Document Embeddings Found

**Problem**: Repository not properly indexed

**Solution**:
- Ensure repository URL is accessible
- Check if repository requires authentication
- Verify OpenRouter API limits not exceeded

#### 4. JSON Parse Errors

**Problem**: API returns text instead of JSON

**Solution**:
```typescript
// Extract JSON from text response
const extractJson = (text: string) => {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  throw new Error('No JSON found in response');
};
```

### Debug Commands

```bash
# View pod logs
kubectl logs -n codequal-dev -l app=deepwiki --tail=100 -f

# Check environment variables
kubectl exec -n codequal-dev deployment/deepwiki -- env | grep -E "(OPENROUTER|DEEPWIKI)"

# Test API directly
curl -v http://localhost:8001/health

# List available models
curl -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  https://openrouter.ai/api/v1/models | jq '.data[].id'
```

## Best Practices

### 1. Model Selection
- Let the system choose models dynamically
- Don't hardcode specific models
- Ensure fallback models are from different providers

### 2. Error Handling
```typescript
try {
  const result = await deepWikiApiManager.analyzeRepository(url);
  return result;
} catch (error) {
  if (error.message.includes('401')) {
    // Handle authentication error
  } else if (error.message.includes('No content')) {
    // Handle empty response
  } else {
    // Handle general error
  }
}
```

### 3. Performance Optimization
- Cache analysis results for 24 hours
- Use repository hash to detect changes
- Implement request queuing for rate limits

### 4. Security
- Never expose API keys in logs
- Validate repository URLs before analysis
- Sanitize report output for XSS

### 5. Monitoring
```typescript
// Track analysis metrics
const metrics = {
  analysis_start: Date.now(),
  repository_url: url,
  model_used: null,
  success: false,
  error: null
};

try {
  const result = await analyze(url);
  metrics.model_used = result.metadata.model_used;
  metrics.success = true;
} catch (error) {
  metrics.error = error.message;
} finally {
  metrics.duration_ms = Date.now() - metrics.analysis_start;
  await logMetrics(metrics);
}
```

## Maintenance

### Daily Checks
- [ ] Verify API health endpoint
- [ ] Check pod resource usage
- [ ] Monitor error rates in logs
- [ ] Review API usage costs

### Weekly Tasks
- [ ] Analyze model performance metrics
- [ ] Update fallback model list if needed
- [ ] Clean up old analysis results (>30 days)
- [ ] Review and optimize slow queries

### Monthly Tasks
- [ ] Update model configurations
- [ ] Review OpenRouter pricing changes
- [ ] Optimize prompts based on results
- [ ] Generate usage reports

### Quarterly Tasks
- [ ] Trigger model research updates
- [ ] Review storage costs and optimize
- [ ] Update documentation
- [ ] Plan capacity for growth

## Appendix

### File Structure
```
/docs/Deepwiki/
├── README-consolidated.md          # This file
├── README.md                       # Original documentation
├── model-selection-strategy.md     # Detailed selection logic
├── integration/
│   └── dynamic-model-selection.md  # Integration details
├── templates/
│   └── comprehensive-analysis-report-template.md
├── samples/
│   ├── comprehensive-analysis-report.md
│   └── comprehensive-analysis-medium-low-issues.md
└── archive/
    └── 2025-07-legacy/            # Historical documentation
```

### Related Documentation
- [Architecture Overview](../architecture/model-version-management.md)
- [API Documentation](../api/getting-started.md)
- [Model Management](../model-management.md)

---

*Last Updated: July 25, 2025*
*Version: 2.0 - Consolidated with Dynamic Model Selection*