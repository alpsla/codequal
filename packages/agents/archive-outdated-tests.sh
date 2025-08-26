#!/bin/bash

# Archive Outdated Tests Script
# Archives tests that don't use the updated flow with DirectDeepWikiApiWithLocation
# and iterative collection (3-10 iterations)

ARCHIVE_DIR="src/standard/tests/_archive/2025-08-25-cleanup"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo "🧹 Archiving outdated tests..."
echo "Archive directory: $ARCHIVE_DIR"

# Create archive directory
mkdir -p "$ARCHIVE_DIR"

# Tests to KEEP in regression (using updated flow)
KEEP_TESTS=(
  "regression/manual-pr-validator.ts"
  "regression/manual-pr-validator-enhanced.ts"
  "regression/unified-regression-suite.test.ts"
  "regression/v8-report-validation.test.ts"
  "regression/real-pr-validation.test.ts"
  "regression/setup-deepwiki.ts"
)

# Tests to ARCHIVE (outdated or using old mock approach)
ARCHIVE_TESTS=(
  # Old mock-based tests
  "test-educator-integration.ts"
  "test-educator-integration-simple.ts"
  "test-orchestrator-deduplication.ts"
  "test-deduplication-visual.ts"
  "test-ai-vs-rules-comparison.ts"
  "generate-analysis-reports.ts"
  "comprehensive-validation-suite.ts"
  "quick-validation-test.ts"
  "test-complete-enhancement-system.ts"
  
  # V8 bug reproduction tests (already fixed)
  "test-v8-unknown-location.ts"
  "test-v8-location-bug.ts"
  "test-v8-issue-count.ts"
  
  # Old integration tests not using DirectDeepWikiApiWithLocation
  "integration/test-basic-report-only.ts"
  "integration/orchestrator-flow.test.ts"
  "integration/production-ready-state-test.ts"
  
  # Old DeepWiki tests
  "test-deepwiki-integration.ts"
  "test-ai-parser-integration.ts"
  "test-real-pr-with-locations.ts"
)

# Archive the tests
echo "📦 Archiving outdated tests..."
for test in "${ARCHIVE_TESTS[@]}"; do
  if [ -f "src/standard/tests/$test" ]; then
    echo "  Moving: $test"
    mv "src/standard/tests/$test" "$ARCHIVE_DIR/"
  fi
done

# Keep only updated integration tests
echo "✅ Keeping updated integration tests..."
mkdir -p src/standard/tests/integration/deepwiki-updated
KEEP_INTEGRATION=(
  "integration/deepwiki/comparison-agent-real-flow.test.ts"
  "integration/deepwiki/orchestrator-real-flow.test.ts"
  "integration/deepwiki/orchestrator-real-deepwiki-test.ts"
  "integration/deepwiki/test-comparison-direct.ts"
)

for test in "${KEEP_INTEGRATION[@]}"; do
  if [ -f "src/standard/tests/$test" ]; then
    echo "  Keeping: $test"
  fi
done

# Create a summary file
cat > "$ARCHIVE_DIR/ARCHIVE_SUMMARY.md" << EOF
# Test Archive Summary
Date: $(date)

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
\`\`\`bash
# Run manual PR validation
USE_DEEPWIKI_MOCK=false npx ts-node src/standard/tests/regression/manual-pr-validator.ts <PR_URL>

# Run regression suite
npm test src/standard/tests/regression/

# Run with mock for quick testing
USE_DEEPWIKI_MOCK=true npm test
\`\`\`
EOF

echo "📄 Created archive summary"

# Clean up old analysis functionality
echo "🗑️ Removing duplicate analysis functionality..."

# Archive old services that are replaced
OLD_SERVICES=(
  "src/standard/services/deepwiki-api-wrapper-old.ts"
  "src/standard/services/basic-deepwiki-api.ts"
  "src/standard/comparison/comparison-agent-old.ts"
)

for service in "${OLD_SERVICES[@]}"; do
  if [ -f "$service" ]; then
    echo "  Archiving: $service"
    mv "$service" "$ARCHIVE_DIR/"
  fi
done

echo "✨ Cleanup complete!"
echo ""
echo "Summary:"
echo "  - Archived ${#ARCHIVE_TESTS[@]} outdated test files"
echo "  - Kept ${#KEEP_TESTS[@]} regression tests"
echo "  - Kept ${#KEEP_INTEGRATION[@]} updated integration tests"
echo "  - Archive location: $ARCHIVE_DIR"
echo ""
echo "Next steps:"
echo "  1. Review the archive to ensure nothing critical was moved"
echo "  2. Run regression tests to verify everything still works"
echo "  3. Commit the changes"