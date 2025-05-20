#!/bin/bash
# Debug DeepWiki issues

# Get pods
echo "=== DeepWiki Pods ==="
kubectl get pods -n codequal-dev -l app=deepwiki

# Get services
echo -e "\n=== DeepWiki Services ==="
kubectl get svc -n codequal-dev

# Check logs
echo -e "\n=== DeepWiki Frontend Logs ==="
kubectl logs -n codequal-dev deepwiki-5b45c9fbdf-9h4ng --tail=50

# Check if any error logs are present
echo -e "\n=== Checking for API errors ==="
kubectl logs -n codequal-dev deepwiki-5b45c9fbdf-9h4ng --tail=500 | grep -i error

# Run debug commands in the pod
echo -e "\n=== Testing GitHub connectivity ==="
kubectl exec -n codequal-dev deepwiki-5b45c9fbdf-9h4ng -- curl -s -I https://api.github.com/repos/asyncfuncai/deepwiki-open

# Check if the pod can resolve GitHub
echo -e "\n=== Testing DNS resolution ==="
kubectl exec -n codequal-dev deepwiki-5b45c9fbdf-9h4ng -- ping -c 2 github.com || echo "Ping not available or failed"

# Apply the debug ConfigMap
echo -e "\n=== Applying debug ConfigMap ==="
kubectl apply -f /Users/alpinro/Code\ Prjects/codequal/kubernetes/deepwiki-debug-config.yaml

# Create a temporary debugging pod
echo -e "\n=== Creating debug pod ==="
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: deepwiki-debug
  namespace: codequal-dev
  labels:
    app: deepwiki-debug
spec:
  containers:
  - name: debug
    image: curlimages/curl:latest
    command: ["sleep", "3600"]
  restartPolicy: Never
EOF

echo -e "\n=== Debugging information collected ==="
echo "Run the following commands for further debugging:"
echo "1. kubectl exec -it -n codequal-dev deepwiki-debug -- sh (when the pod is ready)"
echo "2. kubectl cp -n codequal-dev /Users/alpinro/Code\\ Prjects/codequal/kubernetes/deepwiki-debug-config.yaml deepwiki-5b45c9fbdf-9h4ng:/tmp/debug.sh"
echo "3. kubectl exec -n codequal-dev deepwiki-5b45c9fbdf-9h4ng -- bash /tmp/debug.sh"
