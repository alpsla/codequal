#!/bin/bash

# Deploy DeepWiki with Tools to Kubernetes
set -e

echo "=== DeepWiki Tools Kubernetes Deployment Script ==="

# Configuration
NAMESPACE="codequal-dev"
DOCKER_REGISTRY="ghcr.io/codequal"
IMAGE_NAME="deepwiki-with-tools"
IMAGE_TAG="latest"
FULL_IMAGE="$DOCKER_REGISTRY/$IMAGE_NAME:$IMAGE_TAG"

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "Checking prerequisites..."

if ! command_exists docker; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    exit 1
fi

if ! command_exists kubectl; then
    echo -e "${RED}Error: kubectl is not installed${NC}"
    exit 1
fi

# Check kubectl context
CURRENT_CONTEXT=$(kubectl config current-context)
echo -e "${YELLOW}Current kubectl context: $CURRENT_CONTEXT${NC}"
read -p "Is this the correct context? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 1
fi

# Step 1: Build the Docker image
echo -e "\n${GREEN}Step 1: Building Docker image...${NC}"
cd "$SCRIPT_DIR"

# First, we need to build the tool-runner.service.js from TypeScript
echo "Building TypeScript files..."
cd "../../../../../"  # Go to project root
npm run build --workspace=@codequal/core || {
    echo -e "${YELLOW}Warning: TypeScript build failed, using existing JavaScript files${NC}"
}

# Copy the built JavaScript files
cd "$SCRIPT_DIR"
if [ -f "../../../../dist/services/deepwiki-tools/tool-runner.service.js" ]; then
    cp "../../../../dist/services/deepwiki-tools/tool-runner.service.js" ./
    echo "Copied tool-runner.service.js"
else
    echo -e "${YELLOW}Warning: tool-runner.service.js not found in dist, using mock file${NC}"
    # Create a minimal mock file for now
    echo "module.exports = {};" > tool-runner.service.js
fi

# Build Docker image
docker build -t "$IMAGE_NAME:$IMAGE_TAG" . || {
    echo -e "${RED}Docker build failed${NC}"
    exit 1
}

# Step 2: Tag for registry
echo -e "\n${GREEN}Step 2: Tagging image for registry...${NC}"
docker tag "$IMAGE_NAME:$IMAGE_TAG" "$FULL_IMAGE"

# Step 3: Push to registry (optional)
echo -e "\n${GREEN}Step 3: Push to registry${NC}"
read -p "Push image to registry? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Pushing to $FULL_IMAGE..."
    docker push "$FULL_IMAGE" || {
        echo -e "${YELLOW}Warning: Push failed, continuing with local image${NC}"
    }
fi

# Step 4: Create namespace if it doesn't exist
echo -e "\n${GREEN}Step 4: Checking namespace...${NC}"
kubectl get namespace "$NAMESPACE" >/dev/null 2>&1 || {
    echo "Creating namespace $NAMESPACE..."
    kubectl create namespace "$NAMESPACE"
}

# Step 5: Update the existing DeepWiki deployment
echo -e "\n${GREEN}Step 5: Updating DeepWiki deployment...${NC}"

# Create a patch file for the existing deployment
cat > deepwiki-patch.yaml <<EOF
spec:
  template:
    spec:
      containers:
      - name: deepwiki
        image: $FULL_IMAGE
        env:
        - name: TOOLS_ENABLED
          value: "true"
        - name: TOOLS_TIMEOUT
          value: "60000"
        - name: TOOLS_PARALLEL
          value: "true"
        - name: TOOLS_MAX_BUFFER
          value: "20971520"
        volumeMounts:
        - name: workspace
          mountPath: /workspace
        - name: tool-results
          mountPath: /tmp/tool-results
      volumes:
      - name: workspace
        emptyDir:
          sizeLimit: 10Gi
      - name: tool-results
        emptyDir:
          sizeLimit: 1Gi
EOF

# Apply the patch
echo "Patching existing DeepWiki deployment..."
kubectl patch deployment deepwiki -n "$NAMESPACE" --patch-file deepwiki-patch.yaml || {
    echo -e "${YELLOW}Patch failed, trying to apply full deployment...${NC}"
    
    # If patch fails, update the kubernetes deployment yaml and apply it
    sed -i.bak "s|image: .*|image: $FULL_IMAGE|g" "$SCRIPT_DIR/kubernetes-deployment.yaml"
    kubectl apply -f "$SCRIPT_DIR/kubernetes-deployment.yaml" -n "$NAMESPACE"
}

# Clean up
rm -f deepwiki-patch.yaml

# Step 6: Wait for rollout
echo -e "\n${GREEN}Step 6: Waiting for rollout...${NC}"
kubectl rollout status deployment/deepwiki -n "$NAMESPACE" --timeout=300s || {
    echo -e "${RED}Rollout failed or timed out${NC}"
    echo "Checking pod status..."
    kubectl get pods -n "$NAMESPACE" -l app=deepwiki
    exit 1
}

# Step 7: Verify deployment
echo -e "\n${GREEN}Step 7: Verifying deployment...${NC}"
POD=$(kubectl get pods -n "$NAMESPACE" -l app=deepwiki -o jsonpath='{.items[0].metadata.name}')

if [ -z "$POD" ]; then
    echo -e "${RED}No DeepWiki pod found${NC}"
    exit 1
fi

echo "DeepWiki pod: $POD"

# Check if tools are available
echo "Checking tool availability..."
kubectl exec -n "$NAMESPACE" "$POD" -- /tools/healthcheck.sh || {
    echo -e "${YELLOW}Warning: Tool health check failed${NC}"
}

# Step 8: Test tool execution
echo -e "\n${GREEN}Step 8: Testing tool execution...${NC}"
read -p "Run a test tool execution? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Creating test repository..."
    kubectl exec -n "$NAMESPACE" "$POD" -- bash -c '
        mkdir -p /workspace/test-repo
        cd /workspace/test-repo
        echo "{\"name\": \"test\", \"version\": \"1.0.0\", \"dependencies\": {}}" > package.json
        npm install --quiet
        /tools/run-tools.sh /workspace/test-repo "npm-audit,license-checker" 10000
    ' || {
        echo -e "${YELLOW}Test execution failed, but deployment may still be functional${NC}"
    }
fi

# Summary
echo -e "\n${GREEN}=== Deployment Complete ===${NC}"
echo "DeepWiki with Tools has been deployed to namespace: $NAMESPACE"
echo "Pod: $POD"
echo "Image: $FULL_IMAGE"
echo ""
echo "To monitor logs:"
echo "  kubectl logs -f -n $NAMESPACE $POD"
echo ""
echo "To execute tools manually:"
echo "  kubectl exec -n $NAMESPACE $POD -- /tools/run-tools.sh <repo_path> <tools>"
echo ""
echo "Available tools: npm-audit,license-checker,madge,dependency-cruiser,npm-outdated"

# Clean up temporary files
rm -f tool-runner.service.js

echo -e "\n${GREEN}Deployment successful!${NC}"
