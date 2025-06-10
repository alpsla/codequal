#!/bin/bash

echo "🚀 Running Phase 2 Integration Tests - Orchestrator Core Functions"
echo "=================================================="
echo ""

# Set environment variables for tests
export NODE_ENV=test

# Change to project root
cd /Users/alpinro/Code\ Prjects/codequal

# Run Phase 2 tests
echo "📋 Phase 2 Test Files:"
echo "1. orchestrator-initialization.test.ts"
echo "2. orchestrator-pr-analysis.test.ts"
echo "3. orchestrator-agent-selection.test.ts"
echo "4. orchestrator-deepwiki-config.test.ts"
echo "5. orchestrator-compilation.test.ts"
echo "6. orchestrator-error-recovery.test.ts"
echo "7. orchestrator-model-loading.test.ts"
echo "8. orchestrator-repository-model-search.test.ts"
echo "9. orchestrator-researcher-model-retrieval.test.ts"
echo "10. orchestrator-deepwiki-researcher-retrieval.test.ts"
echo ""

# Run all Phase 2 tests
echo "🧪 Running all Phase 2 tests..."
npm test -- integration-tests/tests/phase2-orchestrator --passWithNoTests

# Check if tests passed
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Phase 2 tests completed successfully!"
else
    echo ""
    echo "❌ Some Phase 2 tests failed. Please check the output above."
fi
