# BUG-019: Enforce ComparisonAgent Usage - Block Direct Report Generation

## Priority: CRITICAL 🚨

## Problem
Tests are bypassing the ComparisonAgent and directly calling `generator.generateReport()`, which:
1. Skips dynamic model selection
2. Uses hardcoded fallback model (gemini-2.5-flash)
3. Misses all agent initialization and context setup
4. Bypasses skill tracking and proper scoring

## Evidence
```typescript
// Current WRONG approach in test-multiple-prs.ts:
const generator = new ReportGeneratorV7EnhancedComplete();
const report = await generator.generateReport(comparisonResult);
```

## Root Cause
- No enforcement mechanism to prevent direct report generation
- Tests taking shortcuts instead of using proper flow
- Missing private/protected access modifiers

## Solution
1. Make `generateReport` private in ReportGeneratorV7EnhancedComplete
2. Only allow access through ComparisonAgent
3. Update all tests to use ComparisonAgent.analyze()
4. Add validation to prevent direct instantiation

## Impact
- All model selections broken
- Missing proper context and metadata
- Inconsistent report generation
- No skill tracking in tests

## Fix Required
```typescript
// Correct approach:
const agent = new ComparisonAgent(config);
const result = await agent.analyze({
  mainBranchAnalysis,
  featureBranchAnalysis,
  prMetadata
});
const report = result.report;
```

## Affected Files
- `/packages/agents/test-multiple-prs.ts`
- `/packages/agents/src/standard/comparison/report-generator-v7-enhanced-complete.ts`
- All test files directly using ReportGenerator

## Acceptance Criteria
- [ ] Direct report generation blocked
- [ ] All tests use ComparisonAgent
- [ ] Dynamic model selection working
- [ ] No hardcoded model fallbacks