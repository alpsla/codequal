# Test Archive Summary
Date: Mon Aug 25 12:16:00 EDT 2025

## Reason for Archive
These tests were archived because they:
1. Use the old mock-based DeepWiki approach
2. Don't use DirectDeepWikiApiWithLocation
3. Don't implement iterative collection (3-10 iterations)
4. Test outdated functionality that has been replaced

## Current Testing Approach
The updated flow uses:
- DirectDeepWikiApiWithLocation for real DeepWiki integration
- AdaptiveDeepWikiAnalyzer for iterative collection
- Enhanced prompts for consistent data structure
- Location search using code snippets
- 3-10 iterations with convergence detection

## Active Test Files
### Regression Tests (Keep using these)
- regression/manual-pr-validator.ts - Main test for PR validation
- regression/manual-pr-validator-enhanced.ts - Enhanced version with location search
- regression/unified-regression-suite.test.ts - Full regression suite
- regression/v8-report-validation.test.ts - V8 report format validation
- regression/real-pr-validation.test.ts - Real PR testing

### Integration Tests (Updated flow)
- integration/deepwiki/comparison-agent-real-flow.test.ts
- integration/deepwiki/orchestrator-real-flow.test.ts

## Usage
To run updated tests:
```bash
# Run manual PR validation
USE_DEEPWIKI_MOCK=false npx ts-node src/standard/tests/regression/manual-pr-validator.ts <PR_URL>

# Run regression suite
npm test src/standard/tests/regression/

# Run with mock for quick testing
USE_DEEPWIKI_MOCK=true npm test
```
