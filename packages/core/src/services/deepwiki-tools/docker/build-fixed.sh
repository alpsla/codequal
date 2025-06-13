#!/bin/bash

# Build and deploy DeepWiki with Tools - Fixed version
set -e

echo "=== Building DeepWiki with Tools (Fixed) ==="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IMAGE_NAME="deepwiki-with-tools:fixed"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Step 1: Ensure required files exist in build context
echo -e "${GREEN}Step 1: Preparing build context...${NC}"
cd "$SCRIPT_DIR"

# Check if tool-executor.js exists, if not show error
if [ ! -f "tool-executor.js" ]; then
    echo -e "${RED}Error: tool-executor.js not found in $SCRIPT_DIR${NC}"
    echo "This file should already exist from the previous session"
    exit 1
fi

# Check if deepwiki-tool-integration.js exists
if [ ! -f "deepwiki-tool-integration.js" ]; then
    echo -e "${RED}Error: deepwiki-tool-integration.js not found in $SCRIPT_DIR${NC}"
    echo "This file should already exist from the previous session"
    exit 1
fi

echo "✓ tool-executor.js found"
echo "✓ deepwiki-tool-integration.js found"

# Step 2: Build the Docker image
echo -e "\n${GREEN}Step 2: Building Docker image...${NC}"
docker build -t "$IMAGE_NAME" --no-cache . || {
    echo -e "${RED}Docker build failed${NC}"
    exit 1
}

echo -e "${GREEN}✓ Docker image built successfully: $IMAGE_NAME${NC}"

# Step 3: Test the image locally
echo -e "\n${GREEN}Step 3: Testing the Docker image...${NC}"

# Test health check
echo "Running health check..."
docker run --rm "$IMAGE_NAME" /tools/healthcheck.sh || {
    echo -e "${YELLOW}Warning: Health check reported issues, but continuing...${NC}"
}

# Test tool execution
echo -e "\nTesting tool execution..."
docker run --rm "$IMAGE_NAME" bash -c '
    cd /tmp
    mkdir -p test-repo && cd test-repo
    echo "{\"name\": \"test\", \"version\": \"1.0.0\", \"dependencies\": {}}" > package.json
    npm install --quiet 2>/dev/null
    
    # Test if tool-executor.js exists
    if [ -f /tools/tool-executor.js ]; then
        echo "✓ tool-executor.js found"
        
        # Try to run a simple tool
        node /tools/tool-executor.js /tmp/test-repo "npm-audit" 2>&1 | head -20
    else
        echo "✗ tool-executor.js NOT found"
        ls -la /tools/
    fi
' || {
    echo -e "${YELLOW}Warning: Tool test had issues${NC}"
}

echo -e "\n${GREEN}=== Build Complete ===${NC}"
echo "Image: $IMAGE_NAME"
echo ""
echo "To deploy to Kubernetes:"
echo "1. Tag for your registry: docker tag $IMAGE_NAME ghcr.io/codequal/$IMAGE_NAME"
echo "2. Push to registry: docker push ghcr.io/codequal/$IMAGE_NAME"
echo "3. Update deployment: kubectl set image deployment/deepwiki deepwiki=ghcr.io/codequal/$IMAGE_NAME -n codequal-dev"
echo ""
echo "Or run the full deployment script:"
echo "./deploy-fixed.sh"
