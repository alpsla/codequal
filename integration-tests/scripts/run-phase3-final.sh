#!/bin/bash

echo "🧪 Running Phase 3 Tests - Final Version"
echo "========================================"
echo ""

cd "/Users/alpinro/Code Prjects/codequal/integration-tests"

# Optional: Set up RESEARCHER test data
# echo "Setting up RESEARCHER test data (if needed)..."
# npx ts-node scripts/setup-researcher-test-data.ts

echo "Running Phase 3 tests..."
echo ""

# Run all Phase 3 tests
echo "1. Tool Results Processing Test:"
npm test tests/phase3-agents/agent-tool-results-processing.test.ts
TOOL_TEST=$?

echo ""
echo "2. Simplified Integration Test:"
npm test tests/phase3-agents/agent-integration-simplified.test.ts
INTEGRATION_TEST=$?

echo ""
echo "================================"
echo "Test Results Summary:"
echo "================================"

if [ $TOOL_TEST -eq 0 ]; then
    echo "✅ Tool Results Processing: PASSED"
else
    echo "❌ Tool Results Processing: FAILED"
fi

if [ $INTEGRATION_TEST -eq 0 ]; then
    echo "✅ Simplified Integration: PASSED"
else
    echo "❌ Simplified Integration: FAILED"
fi

echo ""
if [ $TOOL_TEST -eq 0 ] && [ $INTEGRATION_TEST -eq 0 ]; then
    echo "🎉 All Phase 3 tests passed!"
else
    echo "⚠️  Some tests failed. Check the output above for details."
fi
