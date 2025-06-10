#!/bin/bash

echo "🧪 Running Updated Agent Tests with DeepWiki Context"
echo "=================================================="
echo ""

cd /Users/alpinro/Code\ Prjects/codequal

# Run the updated tests one by one to see specific failures
echo "1️⃣ Running agent-tool-results-processing test..."
npx jest integration-tests/tests/phase3-agents/agent-tool-results-processing.test.ts --verbose --no-coverage

echo ""
echo "2️⃣ Running agent-execution-without-tools test..."
npx jest integration-tests/tests/phase3-agents/agent-execution-without-tools.test.ts --verbose --no-coverage

echo ""
echo "✅ Test run complete!"
