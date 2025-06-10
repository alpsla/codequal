#!/bin/bash

echo "🚀 Running Phase 3 Integration Tests - Agent Integration"
echo "=================================================="
echo ""

# Set environment variables for tests
export NODE_ENV=test

# Change to project root
cd /Users/alpinro/Code\ Prjects/codequal

# List all Phase 3 test files
echo "📋 Phase 3 Test Files:"
ls -la integration-tests/tests/phase3-agents/*.test.ts | awk '{print $9}' | xargs -I {} basename {}
echo ""

# Run specific tests with DeepWiki context
echo "🧪 Running DeepWiki context tests first..."
npm test -- integration-tests/tests/phase3-agents/deepwiki-context-distribution.test.ts
npm test -- integration-tests/tests/phase3-agents/orchestrator-deepwiki-integration.test.ts

echo ""
echo "🧪 Running all other Phase 3 tests..."
npm test -- integration-tests/tests/phase3-agents --passWithNoTests

# Check if tests passed
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Phase 3 tests completed successfully!"
else
    echo ""
    echo "❌ Some Phase 3 tests failed. Please check the output above."
fi
