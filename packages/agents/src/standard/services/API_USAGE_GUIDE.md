# CodeQual API Usage Guide

## Current API Implementation (Use This!)

### Primary API: DirectDeepWikiApiWithLocation
Location: `src/standard/services/direct-deepwiki-api-with-location.ts`

```typescript
import { DirectDeepWikiApiWithLocation } from './src/standard/services/direct-deepwiki-api-with-location';

const api = new DirectDeepWikiApiWithLocation();
const result = await api.analyzeRepository('https://github.com/owner/repo', {
  branch: 'main',
  prId: 123
});
```

Features:
- ✅ Iterative collection (3-10 iterations)
- ✅ Enhanced prompts for consistent data
- ✅ Code snippet to location search
- ✅ Repository cloning and caching
- ✅ Automatic convergence detection

## Supporting Services

### AdaptiveDeepWikiAnalyzer
- Handles iterative collection logic
- Gap analysis and convergence detection
- Enhanced prompt management

### CachedDeepWikiAnalyzer
- Redis caching with memory fallback
- Parallel processing for main/PR branches
- 60-80% performance improvement for cached repos

## Deprecated APIs (Archived)

These have been moved to `_archive/2025-08-25-cleanup/`:
- ❌ DeepWikiApiWrapper - No location search
- ❌ DirectDeepWikiApi - No iterative collection
- ❌ Basic mock-based implementations

## Testing

```bash
# Real DeepWiki testing (requires port forwarding)
USE_DEEPWIKI_MOCK=false npx ts-node src/standard/tests/regression/manual-pr-validator.ts <PR_URL>

# Quick testing with mock
USE_DEEPWIKI_MOCK=true npm test src/standard/tests/regression/
```

## Cost per Analysis
- DeepWiki: ~$0.03-0.05 per complete analysis (5 iterations)
- Includes all agents: Comparator, Educator, Orchestrator
