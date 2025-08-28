#!/bin/bash

# Script to copy reusable components from DeepWiki implementation
# Run this from packages/agents/src/two-branch directory

echo "📦 Copying reusable components from DeepWiki..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Base paths
DEEPWIKI_BASE="../standard"
TWO_BRANCH_BASE="."

# 1. Copy Cache Service
echo -e "${YELLOW}Copying cache services...${NC}"
cp "${DEEPWIKI_BASE}/services/deepwiki-cache-service.ts" "${TWO_BRANCH_BASE}/cache/AnalysisCacheService.ts.template" 2>/dev/null && \
  echo -e "${GREEN}✅ Cache service copied${NC}" || \
  echo "⚠️  Cache service not found"

# 2. Copy Cache Manager if exists
if [ -f "${DEEPWIKI_BASE}/deepwiki/services/deepwiki-cache-manager.ts" ]; then
  cp "${DEEPWIKI_BASE}/deepwiki/services/deepwiki-cache-manager.ts" "${TWO_BRANCH_BASE}/cache/CacheManager.ts.template"
  echo -e "${GREEN}✅ Cache manager copied${NC}"
fi

# 3. Copy Redis infrastructure
echo -e "${YELLOW}Copying Redis infrastructure...${NC}"
if [ -d "../infrastructure/redis" ]; then
  mkdir -p "${TWO_BRANCH_BASE}/infrastructure"
  cp -r "../infrastructure/redis" "${TWO_BRANCH_BASE}/infrastructure/"
  echo -e "${GREEN}✅ Redis infrastructure copied${NC}"
fi

# 4. Create adapter file for modifications
echo -e "${YELLOW}Creating adaptation guide...${NC}"
cat > "${TWO_BRANCH_BASE}/ADAPT_COMPONENTS.md" << 'EOF'
# Component Adaptation Guide

## Files Copied (as .template files)
- `cache/AnalysisCacheService.ts.template` - From DeepWiki cache service
- `cache/CacheManager.ts.template` - From DeepWiki cache manager

## Required Modifications

### 1. AnalysisCacheService.ts
```typescript
// Change from:
export class DeepWikiCacheService {
  private readonly config: Required<CacheConfig>;
  
// To:
export class AnalysisCacheService {
  private readonly config: Required<CacheConfig>;

// Update cache key generation:
generateCacheKey(repo: string, branch: string, tool: string): string {
  const content = `${repo}:${branch}:${tool}`;
  return `two-branch:${this.hashContent(content)}`;
}

// Add branch-specific methods:
async getCachedAnalysis(repo: string, branch: string): Promise<BranchAnalysisResult | null> {
  const key = this.generateCacheKey(repo, branch, 'analysis');
  return await this.get(key);
}

async setCachedAnalysis(
  repo: string, 
  branch: string, 
  result: BranchAnalysisResult
): Promise<void> {
  const key = this.generateCacheKey(repo, branch, 'analysis');
  await this.set(key, result, 3600); // 1 hour TTL
}
```

### 2. CacheManager.ts
```typescript
// Update imports and types
import { BranchAnalysisResult, ToolResult } from '../types';

// Add tool-specific caching
async cacheToolResult(
  repo: string,
  branch: string,
  tool: string,
  result: ToolResult
): Promise<void> {
  const key = `${repo}:${branch}:tool:${tool}`;
  await this.set(key, result, 86400); // 24 hour TTL for tool results
}
```

### 3. Remove DeepWiki-specific logic
- Remove any references to DeepWiki API
- Remove hallucination detection code
- Keep all caching, Redis, and memory fallback logic

## Next Steps
1. Rename .template files to .ts
2. Apply modifications above
3. Update imports
4. Add types from ../types
5. Test with: npm test cache/
EOF

echo -e "${GREEN}✅ Adaptation guide created${NC}"

# 5. Create a simple test to verify cache works
echo -e "${YELLOW}Creating cache test...${NC}"
cat > "${TWO_BRANCH_BASE}/cache/test-cache.ts" << 'EOF'
import { AnalysisCacheService } from './AnalysisCacheService';

async function testCache() {
  const cache = new AnalysisCacheService({
    keyPrefix: 'test:',
    ttl: 60
  });
  
  // Test basic operations
  await cache.set('test-key', { data: 'test' });
  const result = await cache.get('test-key');
  
  console.log('Cache test result:', result);
  console.log('✅ Cache is working!');
}

testCache().catch(console.error);
EOF

echo -e "${GREEN}✅ Test file created${NC}"

echo ""
echo "📋 Summary:"
echo "1. Components copied as .template files"
echo "2. Read ADAPT_COMPONENTS.md for required changes"
echo "3. Rename .template to .ts after modifications"
echo "4. Run test with: npx ts-node cache/test-cache.ts"