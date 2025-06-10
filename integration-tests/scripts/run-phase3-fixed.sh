#!/bin/bash

echo "🧪 Running Phase 3 Tests with Fixed Imports..."
echo "=============================================="
echo ""

cd "/Users/alpinro/Code Prjects/codequal/integration-tests"

# First, let's run just the tool results processing test
echo "1. Running agent-tool-results-processing.test.ts..."
npm test tests/phase3-agents/agent-tool-results-processing.test.ts

if [ $? -eq 0 ]; then
    echo "✅ Tool results processing test passed!"
else
    echo "❌ Tool results processing test failed"
fi

echo ""
echo "2. Running agent-integration-simplified.test.ts..."
npm test tests/phase3-agents/agent-integration-simplified.test.ts

if [ $? -eq 0 ]; then
    echo "✅ Simplified integration test passed!"
else
    echo "❌ Simplified integration test failed"
fi

echo ""
echo "Test execution completed!"
