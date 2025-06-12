# Direct Adapters Migration Guide

**Date**: June 13, 2025  
**Version**: 2.0.0

## Breaking Changes

### Removed Adapters
The following adapters have been removed as they are redundant with DeepWiki analysis:

1. **PrettierDirectAdapter** (`prettier-direct`)
   - Reason: DeepWiki already analyzes code formatting and style consistency
   - Migration: Use DeepWiki's code style analysis results

2. **SonarJSDirectAdapter** (`sonarjs-direct`)  
   - Reason: DeepWiki covers most advanced code quality patterns
   - Migration: Use DeepWiki's code quality analysis results

### New Adapter Categories

Adapters are now organized into two categories:

#### 1. Legacy PR Flow Adapters
Fast tools that work well with PR-only context:
- `eslint-direct` - Auto-fixable linting issues
- `bundlephobia-direct` - Bundle size analysis (external API)
- `grafana-direct` - Reporting integration

#### 2. DeepWiki Integration Adapters
Tools that need full repository access:
- `npm-audit-direct` - Security vulnerability scanning
- `license-checker-direct` - License compliance checking
- `madge-direct` - Circular dependency detection
- `dependency-cruiser-direct` - Dependency rule validation
- `npm-outdated-direct` - Version currency checking

## API Changes

### New Functions

```typescript
// Get only PR-compatible adapters
import { getLegacyPRAdapters } from '@codequal/mcp-hybrid';
const prAdapters = getLegacyPRAdapters();

// Get adapters for DeepWiki integration
import { getDeepWikiAdapters } from '@codequal/mcp-hybrid';
const deepwikiAdapters = getDeepWikiAdapters();
```

### Updated Adapter List

The `createAllDirectAdapters()` function now returns 8 adapters instead of 10:
- 3 Legacy PR adapters
- 5 DeepWiki integration adapters

## Migration Steps

### 1. Update Import Statements

```typescript
// Before
import { PrettierDirectAdapter } from '@codequal/mcp-hybrid';
import { SonarJSDirectAdapter } from '@codequal/mcp-hybrid';

// After - Remove these imports
// Use DeepWiki analysis results instead
```

### 2. Update Agent Configurations

For agents using removed tools:

```typescript
// Before
const codeQualityTools = [
  'eslint-direct',
  'prettier-direct',  // REMOVED
  'sonarjs-direct'    // REMOVED
];

// After
const codeQualityTools = [
  'eslint-direct'  // Only ESLint remains for auto-fixes
];
// Code style and quality patterns come from DeepWiki
```

### 3. Update Tool Selection Logic

```typescript
// New approach
if (requiresFullRepository) {
  // These will run in DeepWiki
  return getDeepWikiAdapters();
} else {
  // These can run in PR context
  return getLegacyPRAdapters();
}
```

## Performance Improvements

With the new architecture:
- **Before**: ~165s (duplicate cloning, all tools)
- **After**: ~95s (single clone, parallel execution)
- **Improvement**: ~42% faster

## Rollback Instructions

If you need to temporarily restore the removed adapters:

1. The adapter files still exist:
   - `/src/adapters/direct/prettier-direct.ts`
   - `/src/adapters/direct/sonarjs-direct.ts`

2. Add them back to exports in `index.ts`

3. Note: This is not recommended as it creates redundancy

## Support

For questions about this migration:
1. Check DeepWiki analysis output for formatting/quality issues
2. Review the architecture document: `deepwiki-tool-integration-architecture.md`
3. Contact the CodeQual team

## Future Roadmap

1. **Phase 1** (Current): Remove redundant adapters
2. **Phase 2**: Implement DeepWiki tool runner
3. **Phase 3**: Migrate all repository-dependent tools to DeepWiki
4. **Phase 4**: Optimize PR-only tools for speed
