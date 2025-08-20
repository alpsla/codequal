# End-to-End Analysis Wrapper Documentation

## Overview

The End-to-End Analysis Wrapper provides a complete, automated flow from a GitHub PR URL to a comprehensive analysis report. It handles all aspects of repository analysis including environment setup, branch management, analysis execution, comparison, and report generation - all from a single PR URL input.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture](#architecture)
3. [Complete Flow](#complete-flow)
4. [Configuration](#configuration)
5. [Usage Examples](#usage-examples)
6. [API Reference](#api-reference)
7. [Integration Patterns](#integration-patterns)
8. [Performance](#performance)
9. [Troubleshooting](#troubleshooting)

## Quick Start

### Basic Usage

```typescript
import { EndToEndAnalysisWrapper } from '@codequal/agents/standard/services/end-to-end-analysis-wrapper';

// Simple usage - just provide a PR URL
const wrapper = new EndToEndAnalysisWrapper();
const result = await wrapper.analyzeFromPRUrl('https://github.com/owner/repo/pull/123');

if (result.success) {
  console.log(`Decision: ${result.comparison.decision}`);
  console.log(`Score: ${result.comparison.score}/100`);
  console.log(result.report.prComment);
}
```

### With Configuration

```typescript
const config = {
  workDir: '/tmp/codequal-analysis',
  useCache: true,
  keepClone: false,
  githubToken: process.env.GITHUB_TOKEN,
  deepWikiUrl: 'http://localhost:8001',
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_KEY,
  redisUrl: process.env.REDIS_URL
};

const wrapper = new EndToEndAnalysisWrapper(config);
const result = await wrapper.analyzeFromPRUrl(prUrl);
```

## Architecture

### System Design

```
┌──────────────────────────────────────────────────────────┐
│                   PR URL Input                            │
│            https://github.com/owner/repo/pull/123         │
└────────────────────────┬─────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────┐
│              End-to-End Analysis Wrapper                  │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────────────────────────────────────────┐     │
│  │ 1. Extract PR Context                           │     │
│  │    - Parse URL                                  │     │
│  │    - Get PR metadata via GitHub API             │     │
│  └─────────────────────────────────────────────────┘     │
│                         ▼                                 │
│  ┌─────────────────────────────────────────────────┐     │
│  │ 2. Prepare Environment                          │     │
│  │    - Clone repository                           │     │
│  │    - Fetch PR branch                           │     │
│  │    - Setup working directory                    │     │
│  └─────────────────────────────────────────────────┘     │
│                         ▼                                 │
│  ┌─────────────────────────────────────────────────┐     │
│  │ 3. Enrich PR Context                            │     │
│  │    - Get files changed                          │     │
│  │    - Get additions/deletions                    │     │
│  │    - Get commit count                           │     │
│  └─────────────────────────────────────────────────┘     │
│                         ▼                                 │
│  ┌─────────────────────────────────────────────────┐     │
│  │ 4. Analyze Main Branch                          │     │
│  │    - Run UnifiedAnalysisWrapper                 │     │
│  │    - Validate locations                         │     │
│  │    - Clarify invalid locations                  │     │
│  └─────────────────────────────────────────────────┘     │
│                         ▼                                 │
│  ┌─────────────────────────────────────────────────┐     │
│  │ 5. Analyze PR Branch                            │     │
│  │    - Run UnifiedAnalysisWrapper                 │     │
│  │    - Validate locations                         │     │
│  │    - Clarify invalid locations                  │     │
│  └─────────────────────────────────────────────────┘     │
│                         ▼                                 │
│  ┌─────────────────────────────────────────────────┐     │
│  │ 6. Generate Comparison                          │     │
│  │    - Match issues between branches              │     │
│  │    - Calculate unchanged/resolved/new           │     │
│  │    - Determine approval decision                │     │
│  └─────────────────────────────────────────────────┘     │
│                         ▼                                 │
│  ┌─────────────────────────────────────────────────┐     │
│  │ 7. Generate Reports                             │     │
│  │    - Markdown report                            │     │
│  │    - PR comment                                 │     │
│  │    - HTML report (optional)                     │     │
│  └─────────────────────────────────────────────────┘     │
│                         ▼                                 │
│  ┌─────────────────────────────────────────────────┐     │
│  │ 8. Cleanup Resources                            │     │
│  │    - Remove cloned repository                   │     │
│  │    - Clear temporary files                      │     │
│  └─────────────────────────────────────────────────┘     │
│                                                           │
└──────────────────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────┐
│                    Complete Result                        │
│  - PR Context (metadata)                                  │
│  - Main branch analysis                                   │
│  - PR branch analysis                                     │
│  - Comparison (unchanged/resolved/new)                    │
│  - Reports (markdown/PR comment)                          │
│  - Execution metadata (steps, timing, errors)             │
└──────────────────────────────────────────────────────────┘
```

## Complete Flow

### Step-by-Step Process

#### Step 1: Extract PR Context (1-2s)
```typescript
// Input: https://github.com/sindresorhus/ky/pull/700
// Output: 
{
  owner: 'sindresorhus',
  repo: 'ky',
  prNumber: 700,
  baseBranch: 'main',
  headBranch: 'feature-branch',
  title: 'Add retry logic',
  author: 'contributor'
}
```

#### Step 2: Prepare Environment (5-30s)
- Clone repository with `--depth 50` for efficiency
- Fetch PR branch: `git fetch origin pull/700/head:pr-700`
- Set up working directory structure

#### Step 3: Enrich PR Context (1-2s)
- Query GitHub API for additional metadata
- Get diff statistics
- Extract commit information

#### Step 4: Analyze Main Branch (5-15s)
- Run DeepWiki analysis with enhanced prompt
- Validate all issue locations
- Clarify invalid locations
- Apply confidence filtering

#### Step 5: Analyze PR Branch (5-15s)
- Same process as main branch
- Includes PR-specific context

#### Step 6: Generate Comparison (< 1s)
- Create issue fingerprints for matching
- Calculate unchanged/resolved/new issues
- Determine approval decision

#### Step 7: Generate Reports (1-2s)
- Generate comprehensive markdown report
- Create PR comment for GitHub
- Optional HTML report generation

#### Step 8: Cleanup Resources (< 1s)
- Remove cloned repository
- Clear temporary files
- Preserve results if configured

### Total Time: 20-60 seconds

## Configuration

### Environment Configuration

```typescript
interface EnvironmentConfig {
  // Working directory for cloning repos
  workDir?: string; // Default: '/tmp/codequal-analysis'
  
  // Use cached clones if available
  useCache?: boolean; // Default: false
  
  // Keep cloned repo after analysis
  keepClone?: boolean; // Default: false
  
  // GitHub personal access token for API
  githubToken?: string; // Optional, enables richer metadata
  
  // DeepWiki API endpoint
  deepWikiUrl?: string; // Default: 'http://localhost:8001'
  
  // Supabase configuration
  supabaseUrl?: string;
  supabaseKey?: string;
  
  // Redis cache configuration
  redisUrl?: string;
}
```

### Environment Variables

The wrapper respects these environment variables:

```bash
# GitHub API access
export GITHUB_TOKEN="ghp_xxxxxxxxxxxx"

# DeepWiki configuration
export DEEPWIKI_API_URL="http://localhost:8001"

# Supabase configuration
export SUPABASE_URL="https://xxx.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="xxx"

# Redis cache
export REDIS_URL="redis://localhost:6379"

# Node environment
export NODE_ENV="production"
```

## Usage Examples

### CLI Tool

```typescript
#!/usr/bin/env node

import { EndToEndAnalysisWrapper } from '@codequal/agents';

const prUrl = process.argv[2];
if (!prUrl) {
  console.error('Usage: analyze-pr <PR_URL>');
  process.exit(1);
}

const wrapper = new EndToEndAnalysisWrapper({
  useCache: true,
  githubToken: process.env.GITHUB_TOKEN
});

wrapper.analyzeFromPRUrl(prUrl)
  .then(result => {
    if (result.success) {
      console.log(result.report.prComment);
      process.exit(result.comparison.decision === 'approved' ? 0 : 1);
    } else {
      console.error('Analysis failed:', result.metadata.errors);
      process.exit(2);
    }
  });
```

### GitHub Action

```yaml
name: CodeQual Analysis
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Run CodeQual Analysis
        uses: codequal/analyze-action@v1
        with:
          pr-url: ${{ github.event.pull_request.html_url }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Comment PR
        uses: actions/github-script@v6
        with:
          script: |
            const result = require('./codequal-result.json');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: result.report.prComment
            });
```

### API Endpoint

```typescript
import express from 'express';
import { EndToEndAnalysisWrapper } from '@codequal/agents';

const app = express();
const wrapper = new EndToEndAnalysisWrapper();

app.post('/api/analyze-pr', async (req, res) => {
  const { prUrl } = req.body;
  
  try {
    const result = await wrapper.analyzeFromPRUrl(prUrl);
    
    res.json({
      success: result.success,
      score: result.comparison?.score,
      decision: result.comparison?.decision,
      report: result.report?.prComment,
      details: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
```

### Webhook Integration

```typescript
import { EndToEndAnalysisWrapper } from '@codequal/agents';

// GitHub webhook handler
export async function handlePRWebhook(payload: any) {
  if (payload.action === 'opened' || payload.action === 'synchronize') {
    const prUrl = payload.pull_request.html_url;
    
    const wrapper = new EndToEndAnalysisWrapper({
      githubToken: process.env.GITHUB_TOKEN
    });
    
    const result = await wrapper.analyzeFromPRUrl(prUrl);
    
    // Post comment to PR
    await postPRComment(
      payload.repository.owner.login,
      payload.repository.name,
      payload.number,
      result.report.prComment
    );
    
    // Update commit status
    await updateCommitStatus(
      payload.repository.owner.login,
      payload.repository.name,
      payload.pull_request.head.sha,
      result.comparison.decision === 'approved' ? 'success' : 'failure'
    );
  }
}
```

## API Reference

### Main Class

```typescript
class EndToEndAnalysisWrapper {
  constructor(config?: EnvironmentConfig, logger?: ILogger);
  
  // Main analysis method
  async analyzeFromPRUrl(prUrl: string): Promise<EndToEndResult>;
  
  // Generate execution report
  async generateExecutionReport(result: EndToEndResult): Promise<string>;
}
```

### Result Structure

```typescript
interface EndToEndResult {
  success: boolean;
  prContext: PRContext;
  mainAnalysis?: UnifiedAnalysisResult;
  prAnalysis?: UnifiedAnalysisResult;
  comparison?: {
    unchanged: number;
    resolved: number;
    new: number;
    score: number;
    decision: 'approved' | 'needs_work';
  };
  report?: {
    markdown: string;
    html?: string;
    prComment?: string;
  };
  metadata: {
    totalDuration: number;
    steps: StepResult[];
    repoPath?: string;
    errors: string[];
  };
}
```

### PR Context

```typescript
interface PRContext {
  owner: string;
  repo: string;
  prNumber: number;
  prUrl: string;
  baseBranch: string;
  headBranch: string;
  title?: string;
  description?: string;
  author?: string;
  createdAt?: string;
  filesChanged?: number;
  additions?: number;
  deletions?: number;
  commits?: number;
}
```

## Integration Patterns

### Continuous Integration

```typescript
// CI/CD Pipeline Integration
export class CIPipelineIntegration {
  private wrapper: EndToEndAnalysisWrapper;
  
  async runPRCheck(prUrl: string): Promise<boolean> {
    const result = await this.wrapper.analyzeFromPRUrl(prUrl);
    
    // Fail build if not approved
    if (result.comparison?.decision !== 'approved') {
      console.error('PR quality check failed');
      console.log(result.report?.prComment);
      return false;
    }
    
    return true;
  }
}
```

### Batch Processing

```typescript
// Process multiple PRs
export class BatchProcessor {
  async processMultiplePRs(prUrls: string[]) {
    const wrapper = new EndToEndAnalysisWrapper({
      useCache: true
    });
    
    const results = await Promise.all(
      prUrls.map(url => wrapper.analyzeFromPRUrl(url))
    );
    
    return results.map(r => ({
      pr: r.prContext,
      decision: r.comparison?.decision,
      score: r.comparison?.score
    }));
  }
}
```

### Monitoring Integration

```typescript
// Send metrics to monitoring service
export class MonitoringIntegration {
  async analyzeWithMetrics(prUrl: string) {
    const startTime = Date.now();
    const wrapper = new EndToEndAnalysisWrapper();
    
    try {
      const result = await wrapper.analyzeFromPRUrl(prUrl);
      
      // Send metrics
      await this.sendMetrics({
        duration: Date.now() - startTime,
        success: result.success,
        score: result.comparison?.score,
        issuesFound: result.prAnalysis?.validationStats.totalIssues,
        validLocations: result.prAnalysis?.validationStats.validLocations
      });
      
      return result;
    } catch (error) {
      await this.sendError(error);
      throw error;
    }
  }
}
```

## Performance

### Timing Breakdown

| Phase | Duration | Description |
|-------|----------|-------------|
| PR Context Extraction | 1-2s | Parse URL, get metadata |
| Environment Prep | 5-30s | Clone repo (size dependent) |
| Context Enrichment | 1-2s | Get additional PR info |
| Main Branch Analysis | 5-15s | Full analysis with validation |
| PR Branch Analysis | 5-15s | Full analysis with validation |
| Comparison | <1s | Issue matching and scoring |
| Report Generation | 1-2s | Create all report formats |
| Cleanup | <1s | Remove temporary files |
| **Total** | **20-60s** | Complete end-to-end |

### Optimization Tips

1. **Enable Caching**
   ```typescript
   const wrapper = new EndToEndAnalysisWrapper({
     useCache: true // Reuse cloned repos
   });
   ```

2. **Keep Clones for Debugging**
   ```typescript
   const wrapper = new EndToEndAnalysisWrapper({
     keepClone: true // Don't delete after analysis
   });
   ```

3. **Use GitHub Token**
   ```typescript
   const wrapper = new EndToEndAnalysisWrapper({
     githubToken: process.env.GITHUB_TOKEN // Faster API access
   });
   ```

4. **Parallel Processing**
   ```typescript
   // Process multiple PRs in parallel
   const results = await Promise.all(
     prUrls.map(url => wrapper.analyzeFromPRUrl(url))
   );
   ```

## Troubleshooting

### Common Issues

#### 1. Repository Clone Fails

**Error:** `Failed to clone repository`

**Solutions:**
- Check network connectivity
- Verify repository exists and is public
- For private repos, provide GitHub token
- Check disk space in work directory

#### 2. DeepWiki Timeout

**Error:** `DeepWiki analysis timed out`

**Solutions:**
- Ensure DeepWiki is running: `kubectl get pods -n codequal-dev`
- Check port forwarding: `kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001`
- Increase timeout in configuration

#### 3. Invalid PR URL

**Error:** `Invalid GitHub PR URL`

**Solutions:**
- Ensure URL format: `https://github.com/owner/repo/pull/number`
- Check PR exists and is accessible
- Verify GitHub token has necessary permissions

#### 4. Location Validation Fails

**Error:** `All locations invalid`

**Solutions:**
- Check repository structure matches analysis
- Verify correct branch is checked out
- Ensure LocationClarifier service is running

### Debug Mode

Enable detailed logging:

```typescript
import { createLogger } from 'winston';

const logger = createLogger({
  level: 'debug',
  format: winston.format.simple()
});

const wrapper = new EndToEndAnalysisWrapper(config, logger);
```

### Execution Report

Generate detailed execution report for debugging:

```typescript
const result = await wrapper.analyzeFromPRUrl(prUrl);
const report = await wrapper.generateExecutionReport(result);
console.log(report);
```

## Best Practices

### 1. Always Provide GitHub Token

```typescript
const wrapper = new EndToEndAnalysisWrapper({
  githubToken: process.env.GITHUB_TOKEN
});
```

Benefits:
- Faster API access (5000 req/hour vs 60)
- Access to private repositories
- Richer PR metadata

### 2. Use Caching in Development

```typescript
const wrapper = new EndToEndAnalysisWrapper({
  useCache: true,
  keepClone: true // For debugging
});
```

### 3. Handle Errors Gracefully

```typescript
const result = await wrapper.analyzeFromPRUrl(prUrl);

if (!result.success) {
  // Log errors
  console.error('Analysis failed:', result.metadata.errors);
  
  // Check which steps failed
  const failedSteps = result.metadata.steps
    .filter(s => s.status === 'failed');
  
  // Attempt recovery or notify
}
```

### 4. Monitor Performance

```typescript
const result = await wrapper.analyzeFromPRUrl(prUrl);

// Check performance
if (result.metadata.totalDuration > 60000) {
  console.warn('Analysis took longer than expected');
  
  // Identify slow steps
  const slowSteps = result.metadata.steps
    .filter(s => s.duration > 10000);
}
```

### 5. Validate Results

```typescript
const result = await wrapper.analyzeFromPRUrl(prUrl);

// Ensure location accuracy
if (result.prAnalysis) {
  const accuracy = result.prAnalysis.validationStats.validLocations / 
                  result.prAnalysis.validationStats.totalIssues;
  
  if (accuracy < 0.8) {
    console.warn('Low location accuracy:', accuracy);
  }
}
```

## Summary

The End-to-End Analysis Wrapper provides:

1. **Complete Automation** - From PR URL to final report
2. **Environment Management** - Handles cloning, branches, cleanup
3. **Full Analysis Pipeline** - Includes validation and clarification
4. **Rich Reporting** - Multiple format outputs
5. **Production Ready** - Error handling, caching, monitoring
6. **Easy Integration** - Simple API for any use case

With just a PR URL, you get a complete, validated, production-ready analysis with accurate issue locations and comprehensive reports.