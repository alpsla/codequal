#!/bin/bash

echo "🧪 Running Phase 3 Tests with Integration Config"
echo "=============================================="
echo ""

cd "/Users/alpinro/Code Prjects/codequal"

# Make sure we have environment variables
if [ -f .env ]; then
    echo "Loading environment variables..."
    export $(cat .env | grep -v '^#' | xargs)
fi

# Run a single test first to debug
echo "Running agent-initialization test..."
npx jest integration-tests/tests/phase3-agents/agent-initialization.test.ts \
  --config jest.config.integration.js \
  --verbose \
  --no-coverage \
  --detectOpenHandles

echo ""
echo "If this test passes, run all tests with:"
echo "  npx jest integration-tests/tests/phase3-agents --config jest.config.integration.js"
