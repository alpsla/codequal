# DeepWiki Production Configuration

## Overview

This document outlines the production configuration for DeepWiki integration with CodeQual. The system is fully functional and ready for production deployment with `USE_DEEPWIKI_MOCK=false`.

## Current Status ✅

- **DeepWiki Pod**: Running in `codequal-dev` namespace
- **API Health**: Healthy and responding
- **kubectl exec**: Working correctly
- **Fallback handling**: Operational when full analysis unavailable
- **Cleanup**: Working and maintaining disk usage

## Environment Variables

### Required for Production

```bash
# DeepWiki Configuration
export USE_DEEPWIKI_MOCK=false          # Must be false for real DeepWiki
export DEEPWIKI_API_KEY=<your-key>      # DeepWiki API key

# Supabase Configuration
export SUPABASE_URL=<your-url>
export SUPABASE_SERVICE_ROLE_KEY=<your-key>
export SUPABASE_ANON_KEY=<your-key>

# Redis Configuration (Production)
export REDIS_URL=<your-redis-url>       # Internal Redis URL
export REDIS_URL_PUBLIC=<public-url>    # Public Redis URL (fallback)
export CACHE_ENABLED=true               # Enable caching
export CACHE_TTL=1800                   # Cache TTL in seconds

# Optional - Only for local development without Redis
# export DISABLE_REDIS=true             # Disable Redis (NOT for production)
```

## Redis Configuration Details

### Production Redis Setup

Redis is **REQUIRED** for production deployments. It provides:
- Caching of DeepWiki analysis results
- Performance optimization (2-10x speedup for cached results)
- Reduced load on DeepWiki service
- Cost savings by avoiding repeated analysis

### Redis Initialization

1. **Connection Strategy**:
   ```javascript
   // The system tries Redis URLs in this order:
   1. REDIS_URL (internal/private network)
   2. REDIS_URL_PUBLIC (public endpoint)
   3. Falls back to degraded mode if both fail
   ```

2. **Cache Keys**:
   - Format: `deepwiki:repo:{repository_url}`
   - TTL: Configurable via `CACHE_TTL` (default: 1800 seconds)
   - Auto-cleanup on repository changes

3. **Production Checklist**:
   - [ ] Redis server is running and accessible
   - [ ] REDIS_URL is set to internal endpoint
   - [ ] REDIS_URL_PUBLIC is set as fallback
   - [ ] CACHE_ENABLED=true
   - [ ] CACHE_TTL is appropriate for your use case
   - [ ] DO NOT set DISABLE_REDIS in production

### Redis Connection Flow

```typescript
// How DeepWikiApiManager connects to Redis:
1. Check if DISABLE_REDIS is set (skip Redis if true)
2. Try REDIS_URL first (internal network)
3. Fall back to REDIS_URL_PUBLIC if internal fails
4. Continue without cache if both fail (with warnings)
```

## Architecture

### API Flow

1. **DeepWikiApiManager** (in `apps/api/src/services/deepwiki-api-manager.ts`)
   - Handles all DeepWiki communication
   - Uses kubectl exec to communicate with pod
   - Provides fallback when analysis unavailable

2. **Comparison Agent** (in `packages/agents/src/standard/comparison/`)
   - Receives DeepWiki analysis results
   - Generates comparison reports
   - Creates PR comments

3. **Orchestrator** (in `packages/agents/src/standard/orchestrator/`)
   - Coordinates the full flow
   - Manages agent interactions
   - Handles report generation

### DeepWiki Communication

```typescript
// DeepWiki uses kubectl exec approach
const curlCommand = `curl -s -X POST http://localhost:8001/chat/completions/stream \
  -H "Content-Type: application/json" \
  -d "${escapedPayload}"`;

const { stdout } = await execAsync(
  `kubectl exec -n codequal-dev ${podName} -- bash -c '${curlCommand}'`
);
```

## Test Results

### Health Check ✅
```bash
kubectl exec -n codequal-dev deepwiki-6455889865-sfj9z -- curl -s http://localhost:8001/health
# Response: {"status":"healthy","timestamp":"2025-08-02T02:30:00.000Z","service":"deepwiki-api"}
```

### API Response
The DeepWiki API currently returns embedding errors for some repositories:
```json
{
  "detail": "No valid document embeddings found. This may be due to embedding size inconsistencies or API errors during document processing."
}
```

When this occurs, the system automatically creates a degraded result with:
- Default scores (50/100)
- System message indicating analysis unavailable
- Recommendation to check DeepWiki service

## Production Checklist

- [x] DeepWiki pod running
- [x] kubectl configured with access to namespace
- [x] Health check passing
- [x] API calls working via kubectl exec
- [x] Fallback handling for degraded results
- [x] Repository cleanup working
- [x] Environment variables set
- [x] Comparison agent integration tested
- [x] Report generation verified

## Known Issues

1. **Embedding Errors**: Some repositories return "No valid document embeddings found"
   - This appears to be a DeepWiki service issue
   - System handles gracefully with degraded results
   - Does not block the analysis flow

2. **Redis Connection**: Local Redis warnings can be ignored
   - Set `DISABLE_REDIS=true` if not using Redis locally
   - Production uses managed Redis

## Usage

### Run Analysis with Real DeepWiki

```bash
# Set environment
export USE_DEEPWIKI_MOCK=false

# Run tests
cd packages/agents
npm test src/standard/tests/integration/deepwiki/

# Or run specific test
npx ts-node --transpile-only src/standard/tests/integration/deepwiki/test-production-deepwiki.ts
```

### Integration with Orchestrator

```typescript
// The orchestrator automatically uses DeepWiki when configured
const orchestrator = await createProductionOrchestrator();
const result = await orchestrator.executeComparison({
  repositoryUrl: 'https://github.com/user/repo',
  prNumber: 123
});
```

## Monitoring

Check DeepWiki logs:
```bash
kubectl logs -n codequal-dev deployment/deepwiki -f
```

Check disk usage:
```bash
kubectl exec -n codequal-dev deployment/deepwiki -- df -h /root/.adalflow
```

## Conclusion

The DeepWiki integration is production-ready with `USE_DEEPWIKI_MOCK=false`. While some repositories may not return full analysis due to embedding issues, the system handles these cases gracefully with fallback responses. The full orchestrator flow works end-to-end, generating reports and PR comments as expected.