#!/bin/bash

# Make all test scripts executable
chmod +x integration-tests/scripts/*.sh

echo "✅ Made all test scripts executable"
echo ""
echo "Ready to run tests!"
echo ""
echo "1. First, check environment:"
echo "   ./integration-tests/scripts/pre-test-check.sh"
echo ""
echo "2. Then run core flow tests:"
echo "   ./integration-tests/scripts/test-phase3-core-flow.sh"
echo ""
echo "3. Or run a specific test:"
echo "   npx jest integration-tests/tests/phase3-agents/new-implementations-compile.test.ts"
