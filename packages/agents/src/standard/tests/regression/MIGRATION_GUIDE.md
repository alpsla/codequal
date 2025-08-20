# Regression Test Migration Guide

## Overview

This guide explains how to migrate existing regression tests to use the `UnifiedAnalysisWrapper` as the core service.

## Why Migrate?

1. **Consistency**: All tests use the same validated pipeline
2. **Reliability**: Location validation and clarification built-in
3. **Maintainability**: Single source of truth for analysis logic
4. **Performance**: Optimized caching and parallelization
5. **Future-proof**: Easy to add new providers and features

## Migration Strategy

### Phase 1: Keep Critical Tests Running (Week 1)
- ✅ Create new `unified-regression-suite.test.ts` with all critical scenarios
- ✅ Run both old and new tests in parallel to ensure compatibility
- Document any discrepancies

### Phase 2: Migrate Individual Test Files (Week 2)
- Convert each test file to use UnifiedAnalysisWrapper
- Maintain same test scenarios and expectations
- Update assertions to match new data structure

### Phase 3: Deprecate Old Tests (Week 3)
- Archive old test files to `archived/tests/`
- Update CI/CD to use new tests only
- Monitor for any regressions

## Migration Patterns

### Before: Direct DeepWiki Calls
```typescript
// OLD - Direct API calls with manual validation
const deepWiki = new DeepWikiApiWrapper();
const result = await deepWiki.analyzeRepository(repoUrl);
const validator = new LocationValidator(repoUrl);
const validated = await validator.validateLocations(result.issues);
```

### After: Unified Wrapper
```typescript
// NEW - Everything handled by wrapper
const wrapper = new UnifiedAnalysisWrapper();
const result = await wrapper.analyzeRepository(repoUrl, {
  validateLocations: true,
  requireMinConfidence: 70
});
// Locations already validated!
```

### Before: Manual Comparison Logic
```typescript
// OLD - Complex manual comparison
const mainIssues = await analyzeMain();
const prIssues = await analyzePR();
const comparison = compareManually(mainIssues, prIssues);
```

### After: Built-in Comparison
```typescript
// NEW - Comparison handled by wrapper
const mainResult = await wrapper.analyzeRepository(repo, { branch: 'main' });
const prResult = await wrapper.analyzeRepository(repo, { branch: 'pr/123' });
// Use built-in comparison from unified-wrapper-integration
```

## Test File Migration Checklist

### ✅ unified-regression-suite.test.ts (NEW)
- Covers all critical regression scenarios
- Uses UnifiedAnalysisWrapper throughout
- Generates comprehensive reports

### 🔄 core-functionality.test.ts
```typescript
// Migrate from:
const orchestrator = await StandardAgentFactory.createTestOrchestrator();

// To:
const wrapper = new UnifiedAnalysisWrapper();
```

### 🔄 location-accuracy.test.ts
```typescript
// Migrate from:
const clarifier = new LocationClarifier();
const clarified = await clarifier.clarifyLocations(issues);

// To:
const result = await wrapper.analyzeRepository(repo, {
  maxClarificationAttempts: 3
});
// Clarification already done!
```

### 🔄 real-pr-validation.test.ts
```typescript
// Migrate from:
const validator = new ManualPRValidator();

// To:
const e2eWrapper = new EndToEndAnalysisWrapper();
const result = await e2eWrapper.analyzeFromPRUrl(prUrl);
```

### 🔄 report-generation.test.ts
```typescript
// Migrate from:
const generator = new V7ReportGenerator(); // or V8

// To:
// Report generation is built into the wrapper results
const report = result.report;
```

### 🔄 ai-impact-categorization.test.ts
```typescript
// Keep AI-specific tests but use wrapper for data:
const result = await wrapper.analyzeRepository(repo);
const aiCategorization = await categorizeWithAI(result.analysis.issues);
```

## Data Structure Changes

### Old Structure
```typescript
{
  issues: Issue[],
  score: number,
  // Missing validation stats
  // Missing flow metadata
  // Inconsistent format
}
```

### New Structure (UnifiedAnalysisResult)
```typescript
{
  success: boolean,
  analysis: {
    issues: ValidatedIssue[],
    scores: ScoreBreakdown,
    summary: string
  },
  validationStats: {
    totalIssues: number,
    validLocations: number,
    clarifiedLocations: number,
    invalidLocations: number,
    averageConfidence: number
  },
  metadata: {
    flowSteps: FlowStep[],
    totalDuration: number,
    cacheHit: boolean
  }
}
```

## Assertion Updates

### Old Assertions
```typescript
expect(result.issues).toBeDefined();
expect(result.score).toBeGreaterThan(70);
```

### New Assertions
```typescript
expect(result.success).toBe(true);
expect(result.analysis.issues).toBeDefined();
expect(result.analysis.scores.overall).toBeGreaterThan(70);
expect(result.validationStats.validLocations).toBeGreaterThan(0);
```

## Environment Variables

No changes needed! The wrapper respects all existing env vars:
- `USE_DEEPWIKI_MOCK`
- `DEEPWIKI_API_URL`
- `DEEPWIKI_API_KEY`
- `REDIS_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## CI/CD Updates

### Update test scripts in package.json
```json
{
  "scripts": {
    "test:regression": "jest src/standard/tests/regression/unified-regression-suite.test.ts",
    "test:regression:old": "jest src/standard/tests/regression/*.test.ts --ignore=unified-regression-suite.test.ts"
  }
}
```

### Update GitHub Actions
```yaml
- name: Run Regression Tests
  run: npm run test:regression
  env:
    USE_DEEPWIKI_MOCK: true
```

## Gradual Migration Example

```typescript
// Step 1: Add wrapper to existing test
describe('Existing Test', () => {
  const oldService = new OldService();
  const wrapper = new UnifiedAnalysisWrapper(); // ADD
  
  it('should work with old service', async () => {
    const oldResult = await oldService.analyze(repo);
    const newResult = await wrapper.analyzeRepository(repo); // ADD
    
    // Compare results during migration
    console.log('Old issues:', oldResult.issues.length);
    console.log('New issues:', newResult.analysis.issues.length);
    
    // Keep old assertion for now
    expect(oldResult).toBeDefined();
  });
});

// Step 2: Switch to wrapper only
describe('Migrated Test', () => {
  const wrapper = new UnifiedAnalysisWrapper();
  
  it('should work with unified wrapper', async () => {
    const result = await wrapper.analyzeRepository(repo);
    expect(result.success).toBe(true);
    expect(result.validationStats.validLocations).toBeGreaterThan(0);
  });
});
```

## Benefits After Migration

1. **Faster Tests**: Optimized caching and parallel processing
2. **More Reliable**: No fake locations or missing metadata
3. **Better Reports**: Comprehensive test reports with all metrics
4. **Easier Debugging**: Flow tracking shows exactly what happened
5. **Future Ready**: New features automatically available

## Timeline

- **Week 1**: Run new unified suite alongside old tests
- **Week 2**: Migrate individual test files
- **Week 3**: Deprecate old tests, monitor for issues
- **Week 4**: Complete migration, archive old code

## Questions?

If you encounter issues during migration:
1. Check the `unified-regression-suite.test.ts` for examples
2. Review `UnifiedAnalysisWrapper` API documentation
3. Run both old and new tests to compare results
4. File issues with specific migration problems

## Summary

The migration to UnifiedAnalysisWrapper ensures all regression tests use the same validated, reliable pipeline. This provides consistency across the entire test suite and makes future maintenance much easier.