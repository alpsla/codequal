#!/bin/bash
# Follow-up script to complete testing after pod restart

set -e # Exit on any error

echo "=== Starting DeepWiki OpenRouter Integration Testing ==="

# 1. Wait for pod to be fully running
echo "Step 1: Waiting for pod to be fully running..."
POD_NAME=$(kubectl get pods -n codequal-dev | grep deepwiki-fixed | grep Running | awk '{print $1}')
MAX_RETRIES=10
RETRY_COUNT=0

while [ -z "$POD_NAME" ] && [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  echo "Pod not running yet, waiting..."
  sleep 10
  POD_NAME=$(kubectl get pods -n codequal-dev | grep deepwiki-fixed | grep Running | awk '{print $1}')
  RETRY_COUNT=$((RETRY_COUNT + 1))
done

if [ -z "$POD_NAME" ]; then
  echo "ERROR: Pod is not running after waiting. Checking status..."
  kubectl get pods -n codequal-dev | grep deepwiki-fixed
  kubectl describe pod -n codequal-dev $(kubectl get pods -n codequal-dev | grep deepwiki-fixed | awk '{print $1}')
  exit 1
fi

echo "Pod $POD_NAME is running"

# 2. Copy the test script to the pod
echo "Step 2: Copying test script to the pod..."
kubectl cp "/Users/alpinro/Code Prjects/codequal/packages/core/scripts/deepwiki_integration/test_openrouter.py" codequal-dev/$POD_NAME:/tmp/

# 3. Test with API key directly in the environment
echo "Step 3: Setting API key and running test..."
kubectl exec -it $POD_NAME -n codequal-dev -- /bin/bash -c 'export OPENROUTER_API_KEY="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" && python /tmp/test_openrouter.py'

echo "=== Testing completed! ==="
echo ""
echo "Remember to rotate your OpenRouter API key after testing is complete."
