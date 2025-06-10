#!/bin/bash

echo "🔍 Running Single Test for Debugging"
echo "==================================="
echo ""

cd "/Users/alpinro/Code Prjects/codequal"

# Run the first test with full output
echo "Running agent-initialization.test.ts..."
npx jest integration-tests/tests/phase3-agents/agent-initialization.test.ts --verbose --no-coverage

# Check exit code
if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Test failed. Common issues:"
    echo "1. Jest configuration missing"
    echo "2. Test file not found"
    echo "3. Import errors in test"
    echo "4. Missing dependencies"
fi
