#!/bin/bash

# Run Complete Flow Test
echo "🧪 Running Complete Flow Test"
echo "============================"
echo ""
echo "This test will:"
echo "1. Simulate DeepWiki analysis"
echo "2. Clone a test repository"
echo "3. Extract changed files via git diff"
echo "4. Execute all preprocessing tools"
echo "5. Store results in Vector DB"
echo "6. Verify role-based retrieval"
echo "7. Test Educational agent data flow"
echo ""
echo "Starting in 3 seconds..."
sleep 3

# Set environment variables if needed
export TAVILY_API_KEY=${TAVILY_API_KEY:-"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"}
export NODE_ENV=test

# Run the test
cd "$(dirname "$0")/../.."
npx ts-node src/test/test-complete-flow.ts

echo ""
echo "Test completed!"