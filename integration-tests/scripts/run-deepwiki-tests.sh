#!/bin/bash

echo "🧪 Running DeepWiki Integration Tests"
echo "===================================="
echo ""

cd /Users/alpinro/Code\ Prjects/codequal

# First, let's check if the test files exist
echo "📁 Checking test files..."
if [ -f "integration-tests/tests/phase3-agents/deepwiki-context-distribution.test.ts" ]; then
    echo "✅ deepwiki-context-distribution.test.ts exists"
else
    echo "❌ deepwiki-context-distribution.test.ts not found"
fi

if [ -f "integration-tests/tests/phase3-agents/orchestrator-deepwiki-integration.test.ts" ]; then
    echo "✅ orchestrator-deepwiki-integration.test.ts exists"
else
    echo "❌ orchestrator-deepwiki-integration.test.ts not found"
fi

echo ""
echo "🏃 Running deepwiki-context-distribution test..."
npx jest integration-tests/tests/phase3-agents/deepwiki-context-distribution.test.ts --verbose --no-coverage

echo ""
echo "🏃 Running orchestrator-deepwiki-integration test..."
npx jest integration-tests/tests/phase3-agents/orchestrator-deepwiki-integration.test.ts --verbose --no-coverage

echo ""
echo "✅ Test run complete!"
