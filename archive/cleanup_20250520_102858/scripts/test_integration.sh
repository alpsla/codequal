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
