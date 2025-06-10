#!/bin/bash
# Improved Implementation and Testing Script for DeepWiki OpenRouter Integration

set -e # Exit on any error

echo "=== Starting DeepWiki OpenRouter Integration Fix ==="

# 1. Check pod status
echo "Step 1: Checking pod status..."
POD_NAME=$(kubectl get pods -n codequal-dev | grep deepwiki-fixed | awk '{print $1}')
POD_STATUS=$(kubectl get pod -n codequal-dev $POD_NAME -o jsonpath='{.status.phase}')

if [ "$POD_STATUS" == "Pending" ]; then
  echo "WARNING: Pod $POD_NAME is in Pending state. Checking reason..."
  kubectl describe pod -n codequal-dev $POD_NAME | grep -A5 "Status:"
  
  echo "Do you want to continue with the fix? (y/n)"
  read -r response
  if [[ "$response" != "y" ]]; then
    echo "Aborting the fix process. Please resolve the pod issues first."
    exit 1
  fi
fi

# 2. Copy the patch script to the DeepWiki pod
echo "Step 2: Copying patch script to the DeepWiki pod..."
kubectl cp "/Users/alpinro/Code Prjects/codequal/packages/core/scripts/deepwiki_integration/openrouter_patch.py" codequal-dev/$POD_NAME:/tmp/

# 3. Execute the patch script on the pod
echo "Step 3: Executing the patch script on the pod..."
kubectl exec -it $POD_NAME -n codequal-dev -- python /tmp/openrouter_patch.py || {
  echo "Error executing patch script. Continuing with other steps..."
}

# 4. Copy the improved test script to the pod
echo "Step 4: Copying test script to the pod..."
kubectl cp "/Users/alpinro/Code Prjects/codequal/packages/core/scripts/deepwiki_integration/test_openrouter.py" codequal-dev/$POD_NAME:/tmp/

# 5. Create and apply the Secret for the OpenRouter API key
echo "Step 5: Creating and applying the Secret for the OpenRouter API key..."
ENCODED_KEY=$(echo -n "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" | base64)

cat > deepwiki-api-keys.yaml << EOF
apiVersion: v1
kind: Secret
metadata:
  name: deepwiki-api-keys
  namespace: codequal-dev
type: Opaque
data:
  OPENROUTER_API_KEY: ${ENCODED_KEY}
EOF

kubectl apply -f deepwiki-api-keys.yaml

# 6. Update the deployment to use the Secret
echo "Step 6: Updating the deployment to use the Secret..."
kubectl patch deployment deepwiki-fixed -n codequal-dev --type=json \
  -p='[{"op": "add", "path": "/spec/template/spec/containers/0/env/-", "value": {"name": "OPENROUTER_API_KEY", "valueFrom": {"secretKeyRef": {"name": "deepwiki-api-keys", "key": "OPENROUTER_API_KEY"}}}}]'

# 7. Restart the DeepWiki pod
echo "Step 7: Restarting the DeepWiki pod..."
kubectl delete pod -n codequal-dev $POD_NAME

echo "Waiting for the new pod to be ready..."
sleep 15  # Give it more time to start

# 8. Check the new pod status
NEW_POD_NAME=$(kubectl get pods -n codequal-dev | grep deepwiki-fixed | awk '{print $1}')
NEW_POD_STATUS=$(kubectl get pod -n codequal-dev $NEW_POD_NAME -o jsonpath='{.status.phase}')

echo "New pod $NEW_POD_NAME status: $NEW_POD_STATUS"

if [ "$NEW_POD_STATUS" != "Running" ]; then
  echo "WARNING: The new pod is not in Running state. Checking reason..."
  kubectl describe pod -n codequal-dev $NEW_POD_NAME
  
  echo "The pod isn't running yet. Wait for it to be in Running state before testing."
  echo "You can check the status with:"
  echo "kubectl get pods -n codequal-dev | grep deepwiki-fixed"
  
  echo "Once it's running, you can test the integration with:"
  echo "./test_integration.sh"
  
  exit 1
fi

# 9. Execute the test
echo "Step 9: Testing the integration..."
echo "Setting up port forwarding..."
kubectl port-forward -n codequal-dev svc/deepwiki-api 8001:8001 &
PF_PID=$!

# Give it a moment to establish
echo "Waiting for port forwarding to establish..."
sleep 5

# Run the test in the pod
echo "Running test script in the pod..."
kubectl exec -it $NEW_POD_NAME -n codequal-dev -- python /tmp/test_openrouter.py

# Kill port forwarding
kill $PF_PID 2>/dev/null || true

echo "=== Implementation and testing completed! ==="
echo ""
echo "Remember to rotate your OpenRouter API key after testing is complete."
