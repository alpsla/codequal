# API Integration Guide

## Overview

This guide explains how to integrate the CodeQual Standard Framework into your API service to generate comprehensive PR analysis reports.

## Basic Integration

### 1. Import the Factory

```typescript
import { createProductionOrchestrator } from '@codequal/agents/infrastructure/factory';
```

### 2. Create API Endpoint

```typescript
app.post('/api/analyze', async (req, res) => {
  try {
    // Create orchestrator instance
    const orchestrator = await createProductionOrchestrator();
    
    // Execute comparison
    const result = await orchestrator.executeComparison({
      repository: req.body.repository,
      prNumber: req.body.prNumber,
      mainBranch: req.body.mainBranch || 'main',
      prBranch: req.body.prBranch
    });
    
    // Return the complete report
    res.json({
      success: true,
      report: result.report,
      score: result.overallScore,
      decision: result.decision,
      confidence: result.confidence
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
```

## Report Structure

The orchestrator returns a comprehensive result with:

```typescript
interface ComparisonResult {
  success: boolean;
  repository: string;
  prNumber: string;
  
  // Scoring
  overallScore: number;
  categoryScores: {
    security: number;
    performance: number;
    'code-quality': number;
    architecture: number;
    dependencies: number;
  };
  
  // Decision
  decision: 'APPROVED' | 'DECLINED';
  decisionReason: string;
  confidence: number;
  
  // Issues
  comparison: {
    newIssues: Issue[];
    fixedIssues: Issue[];
    unchangedIssues: Issue[];
  };
  
  // Generated Content
  report: string;  // Full 12-section markdown report
  prComment: string;  // Concise PR comment
  
  // Metadata
  filesChanged: number;
  linesChanged: number;
  scanDuration: string;
  modelUsed: string;
}
```

## Environment Requirements

```env
# Required
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key

# Optional
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
```

## Advanced Usage

### With Authentication

```typescript
app.post('/api/analyze', authenticate, async (req, res) => {
  const orchestrator = await createProductionOrchestrator({
    userId: req.user.id,
    organizationId: req.user.orgId
  });
  
  const result = await orchestrator.executeComparison({
    ...req.body,
    author: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email
    }
  });
  
  res.json(result);
});
```

### With Caching

```typescript
const cacheKey = `analysis:${repository}:${prNumber}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return res.json(JSON.parse(cached));
}

const orchestrator = await createProductionOrchestrator();
const result = await orchestrator.executeComparison(params);

// Cache for 1 hour
await redis.setex(cacheKey, 3600, JSON.stringify(result));
res.json(result);
```

### Webhook Integration

```typescript
app.post('/webhooks/github', async (req, res) => {
  const { action, pull_request } = req.body;
  
  if (action === 'opened' || action === 'synchronize') {
    const orchestrator = await createProductionOrchestrator();
    
    const result = await orchestrator.executeComparison({
      repository: pull_request.base.repo.html_url,
      prNumber: pull_request.number,
      mainBranch: pull_request.base.ref,
      prBranch: pull_request.head.ref
    });
    
    // Post comment to PR
    await github.createComment({
      owner: pull_request.base.repo.owner.login,
      repo: pull_request.base.repo.name,
      issue_number: pull_request.number,
      body: result.prComment
    });
  }
  
  res.json({ success: true });
});
```

## Report Sections

The generated report includes:

1. **Executive Summary** - Overall score and key metrics
2. **Security Analysis** - Vulnerability assessment
3. **Performance Analysis** - Response times, throughput
4. **Code Quality Analysis** - Maintainability, coverage
5. **Architecture Analysis** - Dynamic diagrams
6. **Dependencies Analysis** - Container optimization
7. **PR Issues** - New issues with fixes
8. **Repository Issues** - Pre-existing issues
9. **Educational Insights** - Learning recommendations
10. **Skills Tracking** - Developer progress
11. **Business Impact** - Risk assessment
12. **Action Items** - Prioritized fixes

## Error Handling

```typescript
try {
  const orchestrator = await createProductionOrchestrator();
  const result = await orchestrator.executeComparison(params);
  res.json(result);
} catch (error) {
  if (error.code === 'MODEL_NOT_CONFIGURED') {
    // Use fallback model
    const orchestrator = await createTestOrchestrator();
    const result = await orchestrator.executeComparison(params);
    res.json(result);
  } else if (error.code === 'RATE_LIMIT_EXCEEDED') {
    res.status(429).json({
      error: 'Rate limit exceeded',
      retryAfter: error.retryAfter
    });
  } else {
    res.status(500).json({
      error: 'Analysis failed',
      message: error.message
    });
  }
}
```

## Performance Considerations

1. **Async Processing**: For large repositories, consider async processing
2. **Caching**: Cache results for identical PR states
3. **Rate Limiting**: Implement rate limits per user/organization
4. **Timeouts**: Set appropriate timeouts (recommended: 5 minutes)

## Testing

```typescript
// Unit test example
describe('API Analysis Endpoint', () => {
  it('should analyze PR and return report', async () => {
    const response = await request(app)
      .post('/api/analyze')
      .send({
        repository: 'https://github.com/facebook/react',
        prNumber: '29770',
        mainBranch: 'main',
        prBranch: 'feature/update'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.report).toContain('# Pull Request Analysis Report');
    expect(response.body.score).toBeGreaterThan(0);
  });
});
```

## Monitoring

Track these metrics:
- Analysis duration
- Success/failure rates
- Model usage and costs
- Report generation time
- API response times

## Migration from Legacy

If migrating from an older system:

1. Map old issue formats to new Issue interface
2. Ensure all issues have required fields
3. Update skill tracking to use equal penalties
4. Generate reports with all 12 sections

See `REPORT_GENERATION_GUIDE.md` for detailed requirements.