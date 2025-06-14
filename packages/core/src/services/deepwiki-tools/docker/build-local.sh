#!/bin/bash

# Build and test DeepWiki with Tools Docker image locally
set -e

echo "=== Building DeepWiki with Tools Docker Image ==="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IMAGE_NAME="deepwiki-with-tools:latest"

# Step 1: Build the Docker image
echo "Building Docker image..."
cd "$SCRIPT_DIR"

docker build -t "$IMAGE_NAME" . || {
    echo "Docker build failed"
    exit 1
}

echo "Docker image built successfully: $IMAGE_NAME"

# Step 2: Test the image locally
echo ""
echo "Testing the Docker image..."

# Run a test container
docker run --rm -it \
    -e TOOLS_ENABLED=true \
    -e TOOLS_TIMEOUT=10000 \
    "$IMAGE_NAME" \
    /tools/healthcheck.sh || {
    echo "Health check failed"
    exit 1
}

echo ""
echo "=== Build Successful ==="
echo "Image: $IMAGE_NAME"
echo ""
echo "To test tool execution:"
echo "docker run --rm -it $IMAGE_NAME bash"
echo ""
echo "To deploy to Kubernetes, run:"
echo "./deploy-to-k8s.sh"
