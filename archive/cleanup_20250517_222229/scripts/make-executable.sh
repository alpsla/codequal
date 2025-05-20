#!/bin/bash

# Make all test scripts executable
chmod +x /Users/alpinro/Code\ Prjects/codequal/packages/core/src/deepwiki/manual-test.js
chmod +x /Users/alpinro/Code\ Prjects/codequal/packages/core/src/deepwiki/run-manual-test.sh
chmod +x /Users/alpinro/Code\ Prjects/codequal/packages/core/src/deepwiki/run-test-now.sh
chmod +x /Users/alpinro/Code\ Prjects/codequal/packages/core/src/deepwiki/simple-test.js
chmod +x /Users/alpinro/Code\ Prjects/codequal/packages/core/src/deepwiki/run-simple-test.sh
chmod +x /Users/alpinro/Code\ Prjects/codequal/packages/core/src/deepwiki/curl-test.sh

echo "All test scripts are now executable."
echo ""
echo "Available test scripts:"
echo "1. curl-test.sh - Simplest test using only curl (recommended)"
echo "2. run-simple-test.sh - Simple test using Node.js"
echo "3. run-manual-test.sh - More comprehensive test with bash"
echo "4. manual-test.js - More comprehensive test with Node.js"
echo "5. run-test-now.sh - Sets up port forwarding and runs a test"
echo ""
echo "To run the simplest test, use:"
echo "bash /Users/alpinro/Code\\ Prjects/codequal/packages/core/src/deepwiki/curl-test.sh"
echo ""
echo "Remember to set up port forwarding if not already done:"
echo "kubectl port-forward -n codequal-dev \$(kubectl get pods -n codequal-dev -l app=deepwiki -o jsonpath='{.items[0].metadata.name}') 8001:8001"
