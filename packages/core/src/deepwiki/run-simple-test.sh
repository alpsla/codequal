#!/bin/bash

# Make the test scripts executable
chmod +x /Users/alpinro/Code\ Prjects/codequal/packages/core/src/deepwiki/simple-test.js

echo "Running simple DeepWiki API test..."
echo "This test will send a query to the DeepWiki API and display the results."
echo ""

# Check if the API is accessible
echo "Checking DeepWiki API accessibility..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/health; then
    echo "DeepWiki API is accessible at http://localhost:8001"
    echo ""
else
    echo "Cannot access DeepWiki API at http://localhost:8001"
    echo "Please ensure port forwarding is set up with:"
    echo "kubectl port-forward -n codequal-dev \$(kubectl get pods -n codequal-dev -l app=deepwiki -o jsonpath='{.items[0].metadata.name}') 8001:8001"
    echo ""
    exit 1
fi

# Run the test
node /Users/alpinro/Code\ Prjects/codequal/packages/core/src/deepwiki/simple-test.js

echo ""
echo "Test completed. Check the output above and the saved response in the test-results directory."
