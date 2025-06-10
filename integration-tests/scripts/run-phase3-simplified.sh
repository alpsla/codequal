#!/bin/bash

echo "🧪 Running Phase 3 Simplified Integration Test..."
echo "=================================================="
echo ""

cd "/Users/alpinro/Code Prjects/codequal/integration-tests"

# Run the simplified test that doesn't have import issues
echo "Running agent-integration-simplified.test.ts..."
npm test tests/phase3-agents/agent-integration-simplified.test.ts

echo ""
echo "Now running the fixed agent-tool-results-processing.test.ts..."
npm test tests/phase3-agents/agent-tool-results-processing.test.ts

echo ""
echo "Tests completed!"
