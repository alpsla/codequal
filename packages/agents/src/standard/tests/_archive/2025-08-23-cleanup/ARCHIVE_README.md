# Test Files Archive - August 23, 2025

## Archive Reason
These test files were archived as part of a cleanup effort to remove:
- Experimental/temporary test files
- Disabled/broken tests
- Duplicate test suites
- Obsolete regression runners

## Archived Files

### Root Level Test Files (Experimental/Temporary)
- `test-browser-report-simple.ts` - Experimental browser report testing
- `test-complete-analysis-browser.ts` - Browser-based analysis experiments
- `test-complete-real-report.ts` - Temporary real report testing
- `test-deepwiki-prompt-experiments.ts` - DeepWiki prompt experiments
- `test-deepwiki-real-snippets.ts` - Code snippet extraction tests
- `test-deepwiki-with-local-search.ts` - Local search integration tests
- `test-local-search-verification.ts` - Search verification experiments
- `test-monitoring.ts` - Monitoring experiments
- `test-real-deepwiki-optimized.ts` - DeepWiki optimization tests
- `test-real-deepwiki-simple.ts` - Simplified DeepWiki tests
- `test-real-pr-browser.ts` - Browser-based PR testing
- `test-real-pr-deepwiki.ts` - DeepWiki PR integration tests
- `test-report-metadata.ts` - Metadata testing
- `test-report-with-metrics.ts` - Metrics testing
- `test-deepwiki-main-only.js` - JavaScript test file

### Regression Test Files (Obsolete/Duplicate)
- `manual-pr-validator-enhanced.ts` - **DISABLED** - Has type mismatches, marked with TODO for restoration
- `stable-regression-suite.test.ts` - **REPLACED** by unified-regression-suite.test.ts
- `run-comprehensive-regression-suite.ts` - **OBSOLETE** - Standalone runner replaced by Jest suites

## Active Regression Tests (Kept)
The following tests remain active and should be used for regression testing:
- `unified-regression-suite.test.ts` - Main regression suite (handles BUG-068 through BUG-071)
- `core-functionality.test.ts` - Core feature validation
- `report-generation.test.ts` - Report generation validation
- `ai-impact-categorization.test.ts` - AI categorization features
- `real-pr-validation.test.ts` - Real PR testing
- `manual-pr-validator.ts` - Manual PR validation tool (actively maintained)
- `parse-deepwiki-response.ts` - Parser utility
- `setup-deepwiki.ts` - Setup helper

## Restoration
If any of these files need to be restored, they can be moved back from this archive directory.
However, consider whether the functionality should be integrated into the active test suites instead.

## Archive Date
August 23, 2025

## Archived By
Claude (as requested by user)