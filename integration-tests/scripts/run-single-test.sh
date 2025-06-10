#!/bin/bash

echo "🧪 Running specific Phase 3 test: agent-tool-results-processing.test.ts"
echo "=================================================================="
echo ""

cd /Users/alpinro/Code\ Prjects/codequal

# Run the specific test file
npx jest integration-tests/tests/phase3-agents/agent-tool-results-processing.test.ts --verbose

echo ""
echo "Done!"
