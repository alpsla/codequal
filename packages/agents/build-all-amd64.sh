#!/bin/bash

# Build all language containers for AMD64
set -e

echo "🚀 Building all language containers for AMD64..."
echo "============================================="

cd /Users/alpinro/Code\ Prjects/codequal/packages/agents

# Registry base
REGISTRY="registry.digitalocean.com/codequal/analyzer"

# Build function
build_container() {
    local LANG=$1
    local DOCKERFILE=$2
    local TAG="${REGISTRY}:lang-${LANG}-amd64"
    
    echo ""
    echo "📦 Building ${LANG} container..."
    echo "   Dockerfile: ${DOCKERFILE}"
    echo "   Tag: ${TAG}"
    
    if [ -f "$DOCKERFILE" ]; then
        docker buildx build \
            --platform linux/amd64 \
            -t "${TAG}" \
            -f "${DOCKERFILE}" \
            --push \
            . &
        echo "   ⏳ Building in background..."
    else
        echo "   ❌ Dockerfile not found: ${DOCKERFILE}"
    fi
}

# Build essential containers
build_container "python" "docker/Dockerfile.python-quick"
build_container "javascript" "docker/Dockerfile.javascript-node"
build_container "java" "docker/Dockerfile.java-quick"
build_container "go" "docker/Dockerfile.go-quick"
build_container "rust" "docker/Dockerfile.rust-quick"

# Wait for all background jobs
echo ""
echo "⏳ Waiting for all builds to complete..."
wait

echo ""
echo "✅ All builds completed!"
echo ""
echo "Available images:"
doctl registry repository list-tags analyzer | grep amd64 | head -10