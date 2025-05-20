#!/bin/bash
# Final testing with improved script

set -e # Exit on any error

echo "=== Running Final DeepWiki OpenRouter Integration Test ==="

# Get the pod name
POD_NAME=$(kubectl get pods -n codequal-dev | grep deepwiki-fixed | grep Running | awk '{print $1}')

if [ -z "$POD_NAME" ]; then
  echo "ERROR: No running DeepWiki pod found"
  kubectl get pods -n codequal-dev | grep deepwiki-fixed
  exit 1
fi

echo "Using pod: $POD_NAME"

# Copy the improved test script to the pod
echo "Copying improved test script to the pod..."
kubectl cp "/Users/alpinro/Code Prjects/codequal/packages/core/scripts/deepwiki_integration/improved_test_openrouter.py" codequal-dev/$POD_NAME:/tmp/

# Set up port forwarding in the background
echo "Setting up port forwarding..."
kubectl port-forward -n codequal-dev svc/deepwiki-api 8001:8001 &
PF_PID=$!

# Give it a moment to establish
echo "Waiting for port forwarding to establish..."
sleep 5

# Test with API key directly in the environment
echo "Running the improved test..."
kubectl exec -it $POD_NAME -n codequal-dev -- /bin/bash -c 'export OPENROUTER_API_KEY="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" && python /tmp/improved_test_openrouter.py'
TEST_RESULT=$?

# Kill port forwarding
kill $PF_PID 2>/dev/null || true

# Summarize test results
if [ $TEST_RESULT -eq 0 ]; then
  echo -e "\n✅ Test completed successfully! The OpenRouter integration is working."
  echo "Some models may not be available or may require different provider prefixes."
  echo "Based on the test, the fix has been applied successfully."
else
  echo -e "\n❌ Test completed with errors. The OpenRouter integration may need additional work."
  echo "Check the specific model compatibility and error messages above."
fi

echo -e "\n=== Final Testing completed! ==="
echo ""
echo "Remember to rotate your OpenRouter API key after testing is complete."
