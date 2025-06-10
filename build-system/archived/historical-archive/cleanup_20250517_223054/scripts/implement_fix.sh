#!/bin/bash
# DeepWiki OpenRouter Integration Fix Implementation Script
# This script automates the process of fixing the OpenRouter integration in DeepWiki

set -e # Exit on any error

echo "=== Starting DeepWiki OpenRouter Integration Fix ==="

# 1. Copy the patch script to the DeepWiki pod
echo "Step 1: Copying patch script to the DeepWiki pod..."
kubectl cp "/Users/alpinro/Code Prjects/codequal/packages/core/scripts/deepwiki_integration/openrouter_patch.py" codequal-dev/deepwiki-fixed-6745d4456b-s25c6:/tmp/

# 2. Execute the patch script on the pod
echo "Step 2: Executing the patch script on the pod..."
kubectl exec -it deepwiki-fixed-6745d4456b-s25c6 -n codequal-dev -- python /tmp/openrouter_patch.py

# 3. Create and apply the Secret for the OpenRouter API key
echo "Step 3: Creating and applying the Secret for the OpenRouter API key..."
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

# 4. Update the deployment to use the Secret
echo "Step 4: Updating the deployment to use the Secret..."
kubectl patch deployment deepwiki-fixed -n codequal-dev --type=json \
  -p='[{"op": "add", "path": "/spec/template/spec/containers/0/env/-", "value": {"name": "OPENROUTER_API_KEY", "valueFrom": {"secretKeyRef": {"name": "deepwiki-api-keys", "key": "OPENROUTER_API_KEY"}}}}]'

# 5. Restart the DeepWiki pod
echo "Step 5: Restarting the DeepWiki pod..."
kubectl delete pod -n codequal-dev deepwiki-fixed-6745d4456b-s25c6

echo "Waiting for the new pod to be ready..."
sleep 10
kubectl get pods -n codequal-dev | grep deepwiki-fixed

# 6. Create a test execution script
echo "Step 6: Creating a test script to verify the integration..."
cat > test_integration.sh << 'EOF'
#!/bin/bash
# Test DeepWiki OpenRouter Integration

# Set up port forwarding in the background
echo "Setting up port forwarding..."
kubectl port-forward -n codequal-dev svc/deepwiki-api 8001:8001 &
PF_PID=$!

# Give it a moment to establish
sleep 5

# Get the new pod name
POD_NAME=$(kubectl get pods -n codequal-dev | grep deepwiki-fixed | awk '{print $1}')

# Run the test in the pod
echo "Running test script in the pod..."
kubectl exec -it ${POD_NAME} -n codequal-dev -- python /tmp/test_openrouter.py

# Kill port forwarding
kill $PF_PID

echo "Test completed."
EOF

chmod +x test_integration.sh

echo "=== Implementation completed! ==="
echo ""
echo "To test the integration, run the test script:"
echo "./test_integration.sh"
echo ""
echo "Remember to rotate your OpenRouter API key after testing is complete."
