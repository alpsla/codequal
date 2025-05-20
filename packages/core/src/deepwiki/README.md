# DeepWiki Integration Module

This module provides integration with DeepWiki for repository analysis capabilities.

## Overview

The DeepWiki integration provides a flexible three-tier analysis approach:

1. **Quick PR-Only Analysis**: Fast analysis of PR changes
2. **Comprehensive Repository + PR Analysis**: Deep analysis with repository context
3. **Targeted Architectural Deep Dives**: Focused analysis on specific architectural perspectives

## Components

### DeepWikiClient

Client for interacting with the DeepWiki API. Provides methods for wiki generation and targeted queries.

```typescript
import { DeepWikiClient } from '@codequal/core/deepwiki';

const client = new DeepWikiClient('http://deepwiki-api.example.com', logger);

// Generate wiki
const wiki = await client.generateWiki(
  { owner: 'owner', repo: 'repo', repoType: 'github' }, 
  { format: 'json', language: 'en' }
);

// Get chat completion
const response = await client.getChatCompletion(
  'https://github.com/owner/repo',
  {
    messages: [
      { role: 'user', content: 'What is the architecture of this repository?' }
    ]
  }
);
```

### ThreeTierAnalysisService

Service for performing different levels of repository analysis.

```typescript
import { ThreeTierAnalysisService, AnalysisDepth, TargetedPerspective } from '@codequal/core/deepwiki';

const analysisService = new ThreeTierAnalysisService(client, logger);

// Quick PR analysis
const prAnalysis = await analysisService.analyzePullRequest(
  { owner: 'owner', repo: 'repo', repoType: 'github' },
  { depth: AnalysisDepth.QUICK, prNumber: 123 }
);

// Comprehensive repository analysis
const repoAnalysis = await analysisService.analyzeRepository(
  { owner: 'owner', repo: 'repo', repoType: 'github' },
  { depth: AnalysisDepth.COMPREHENSIVE }
);

// Targeted analysis with specific perspectives
const targetedAnalysis = await analysisService.analyzeRepository(
  { owner: 'owner', repo: 'repo', repoType: 'github' },
  {
    depth: AnalysisDepth.TARGETED,
    perspectives: [
      TargetedPerspective.ARCHITECTURE,
      TargetedPerspective.PERFORMANCE
    ]
  }
);
```

### RepositorySizeDetector

Utility for detecting repository size and characteristics.

```typescript
import { RepositorySizeDetector } from '@codequal/core/deepwiki';

const sizeDetector = new RepositorySizeDetector(logger);

// Detect repository size
const sizeInfo = await sizeDetector.detectRepositorySize(
  { owner: 'owner', repo: 'repo', repoType: 'github' }
);

console.log(`Repository size: ${sizeInfo.sizeBytes} bytes`);
console.log(`Primary language: ${sizeInfo.primaryLanguage}`);
console.log(`Size category: ${sizeInfo.sizeCategory}`);
```

### RepositoryCacheManager

Utility for caching repository analysis results.

```typescript
import { RepositoryCacheManager } from '@codequal/core/deepwiki';

const cacheManager = new RepositoryCacheManager(
  'https://your-supabase-url.supabase.co',
  'your-supabase-key',
  logger
);

// Check cache status
const cacheStatus = await cacheManager.checkCacheStatus(
  { owner: 'owner', repo: 'repo', repoType: 'github' },
  'main'
);

// Get cached analysis
const cachedAnalysis = await cacheManager.getCachedAnalysis(
  { owner: 'owner', repo: 'repo', repoType: 'github' },
  'main'
);

// Store analysis in cache
await cacheManager.storeAnalysis(
  { owner: 'owner', repo: 'repo', repoType: 'github' },
  'main',
  'abc123', // commit hash
  analysisResult,
  'openai',
  'gpt-4o'
);

// Invalidate cache
await cacheManager.invalidateCache(
  { owner: 'owner', repo: 'repo', repoType: 'github' },
  'main',
  'Manual invalidation'
);
```

## Initialization Helper

For convenience, you can use the initialization helper to create all components at once:

```typescript
import { initializeDeepWikiIntegration } from '@codequal/core/deepwiki';

const {
  client,
  sizeDetector,
  cacheManager,
  analysisService
} = initializeDeepWikiIntegration({
  apiUrl: 'http://deepwiki-api.example.com',
  supabaseUrl: 'https://your-supabase-url.supabase.co',
  supabaseKey: 'your-supabase-key',
  logger: logger
});
```

## Testing and Metrics

The module includes tools for testing and collecting performance metrics:

- `deepwiki-test.js`: Manual API testing tool
- `collect-metrics.js`: Tool for collecting performance metrics
- `generate-report.js`: Tool for generating performance reports

See the [DeepWiki Commands](../../../docs/deepwiki-commands.md) documentation for usage instructions.

## Configuration

The DeepWiki integration can be configured through environment variables:

```
DEEPWIKI_API_URL=http://deepwiki-api.example.com
DEEPWIKI_DEFAULT_PROVIDER=openai
DEEPWIKI_DEFAULT_MODEL=gpt-4o
DEEPWIKI_CACHE_EXPIRY_HOURS=72
```

## Database Schema

The integration uses a PostgreSQL schema for storing analysis results and metrics. See the [DeepWiki Schema](../../../packages/database/migrations/20250513_deepwiki_schema.sql) for details.
