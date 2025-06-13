#!/bin/bash

# Build script for DeepWiki with Tools Docker image
set -e

echo "Building DeepWiki with Tools Docker image..."

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"

echo "Script directory: $SCRIPT_DIR"
echo "Project root: $PROJECT_ROOT"

# Build the TypeScript project first
echo "Building TypeScript project..."
cd "$PROJECT_ROOT"
npm run build

# Copy built files to Docker context
echo "Preparing Docker build context..."
mkdir -p "$SCRIPT_DIR/build"

# Copy the compiled JavaScript files
cp "$PROJECT_ROOT/dist/services/deepwiki-tools/tool-runner.service.js" "$SCRIPT_DIR/tool-runner.service.js" 2>/dev/null || echo "Warning: tool-runner.service.js not found"
cp "$PROJECT_ROOT/dist/services/deepwiki-tools/tool-executor.js" "$SCRIPT_DIR/tool-executor.js" 2>/dev/null || echo "Warning: tool-executor.js not found"
cp "$SCRIPT_DIR/deepwiki-tool-integration.js" "$SCRIPT_DIR/deepwiki-tool-integration.js" || echo "Using existing integration file"

# Build Docker image
echo "Building Docker image..."
cd "$SCRIPT_DIR"

# Use a different tag to avoid conflicts
IMAGE_NAME="deepwiki-with-tools:latest"

docker build -t "$IMAGE_NAME" .

echo "Docker image built successfully: $IMAGE_NAME"

# Tag for registry if needed
if [ -n "$DOCKER_REGISTRY" ]; then
    REGISTRY_IMAGE="$DOCKER_REGISTRY/$IMAGE_NAME"
    docker tag "$IMAGE_NAME" "$REGISTRY_IMAGE"
    echo "Tagged for registry: $REGISTRY_IMAGE"
    
    if [ "$PUSH_TO_REGISTRY" = "true" ]; then
        echo "Pushing to registry..."
        docker push "$REGISTRY_IMAGE"
        echo "Pushed to registry: $REGISTRY_IMAGE"
    fi
fi

echo "Build complete!"