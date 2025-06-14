#!/bin/bash

# Deploy fixed DeepWiki with Tools to Kubernetes
set -e

echo "=== Deploying Fixed DeepWiki Tools to Kubernetes ==="

# Configuration
NAMESPACE="codequal-dev"
IMAGE_NAME="deepwiki-with-tools:fixed"
DEPLOYMENT_NAME="deepwiki"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Check if the fixed image exists
echo "Checking for Docker image..."
if ! docker images | grep -q "deepwiki-with-tools.*fixed"; then
    echo -e "${RED}Error: Image $IMAGE_NAME not found${NC}"
    echo "Please run ./build-fixed.sh first"
    exit 1
fi

# Get current deployment info
echo -e "\n${GREEN}Current deployment status:${NC}"
kubectl get deployment $DEPLOYMENT_NAME -n $NAMESPACE

# Create a backup of current deployment
echo -e "\n${GREEN}Creating backup of current deployment...${NC}"
kubectl get deployment $DEPLOYMENT_NAME -n $NAMESPACE -o yaml > deepwiki-deployment-backup-$(date +%Y%m%d-%H%M%S).yaml
echo "✓ Backup saved"

# Update the deployment with the fixed image
echo -e "\n${GREEN}Updating deployment with fixed image...${NC}"

# For local testing, we'll use kubectl set image with a local image
# In production, you'd push to a registry first
read -p "Deploy using local image? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # For local image, we need to ensure imagePullPolicy is Never or IfNotPresent
    kubectl patch deployment $DEPLOYMENT_NAME -n $NAMESPACE -p '
    {
      "spec": {
        "template": {
          "spec": {
            "containers": [
              {
                "name": "deepwiki",
                "image": "deepwiki-with-tools:fixed",
                "imagePullPolicy": "Never",
                "env": [
                  {"name": "TOOLS_ENABLED", "value": "true"},
                  {"name": "TOOLS_TIMEOUT", "value": "60000"},
                  {"name": "TOOLS_PARALLEL", "value": "true"},
                  {"name": "TOOLS_MAX_BUFFER", "value": "20971520"}
                ]
              }
            ]
          }
        }
      }
    }'
else
    echo "Please push the image to a registry first:"
    echo "  docker tag $IMAGE_NAME <your-registry>/$IMAGE_NAME"
    echo "  docker push <your-registry>/$IMAGE_NAME"
    echo "Then update the deployment"
    exit 0
fi

# Wait for rollout
echo -e "\n${GREEN}Waiting for rollout to complete...${NC}"
kubectl rollout status deployment/$DEPLOYMENT_NAME -n $NAMESPACE --timeout=300s || {
    echo -e "${RED}Rollout failed or timed out${NC}"
    echo "Rolling back..."
    kubectl rollout undo deployment/$DEPLOYMENT_NAME -n $NAMESPACE
    exit 1
}

# Get the new pod
POD=$(kubectl get pods -n $NAMESPACE -l app=deepwiki -o jsonpath='{.items[0].metadata.name}')
echo -e "\n${GREEN}New pod: $POD${NC}"

# Wait for pod to be ready
echo "Waiting for pod to be ready..."
kubectl wait --for=condition=ready pod/$POD -n $NAMESPACE --timeout=120s

# Run verification tests
echo -e "\n${GREEN}Running verification tests...${NC}"

# Test 1: Check tools installation
echo -e "\n${YELLOW}Test 1: Checking tool installation${NC}"
kubectl exec -n $NAMESPACE $POD -- /tools/healthcheck.sh || {
    echo -e "${RED}Health check failed${NC}"
}

# Test 2: Verify tool-executor.js exists
echo -e "\n${YELLOW}Test 2: Checking tool-executor.js${NC}"
kubectl exec -n $NAMESPACE $POD -- ls -la /tools/tool-executor.js || {
    echo -e "${RED}tool-executor.js not found${NC}"
}

# Test 3: Run a simple tool test
echo -e "\n${YELLOW}Test 3: Running npm-audit test${NC}"
kubectl exec -n $NAMESPACE $POD -- bash -c '
    cd /tmp
    rm -rf test-repo
    mkdir test-repo && cd test-repo
    echo "{\"name\": \"test\", \"version\": \"1.0.0\", \"dependencies\": {\"express\": \"^4.0.0\"}}" > package.json
    npm install --quiet 2>/dev/null
    node /tools/tool-executor.js /tmp/test-repo "npm-audit" | jq -r ".results[\"npm-audit\"].success // false"
' || {
    echo -e "${YELLOW}Tool execution test failed${NC}"
}

# Summary
echo -e "\n${GREEN}=== Deployment Complete ===${NC}"
echo "Pod: $POD"
echo "Image: $IMAGE_NAME"
echo ""
echo "To check logs:"
echo "  kubectl logs -n $NAMESPACE $POD"
echo ""
echo "To test tools manually:"
echo "  kubectl exec -n $NAMESPACE $POD -- bash"
echo ""
echo "If there are issues, rollback with:"
echo "  kubectl rollout undo deployment/$DEPLOYMENT_NAME -n $NAMESPACE"
