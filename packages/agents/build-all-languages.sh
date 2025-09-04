#!/bin/bash

# Build all language containers for AMD64
set -e

echo "🚀 Building ALL Language Containers for AMD64"
echo "============================================="
echo ""

cd "/Users/alpinro/Code Prjects/codequal/packages/agents"

# Registry base
REGISTRY="registry.digitalocean.com/codequal/analyzer"

# Array of languages and their Dockerfiles
declare -A LANGUAGES=(
    ["python"]="docker/Dockerfile.python-quick"
    ["javascript"]="docker/Dockerfile.javascript-quick"
    ["java"]="docker/Dockerfile.java-quick"
    ["go"]="docker/Dockerfile.go-quick"
    ["rust"]="docker/Dockerfile.rust-quick"
    ["ruby"]="docker/Dockerfile.ruby-quick"
    ["php"]="docker/Dockerfile.php-quick"
    ["cpp"]="docker/Dockerfile.cpp-quick"
)

# Build function
build_container() {
    local LANG=$1
    local DOCKERFILE=$2
    local TAG="${REGISTRY}:lang-${LANG}-amd64"
    
    echo ""
    echo "📦 Building ${LANG} container..."
    echo "   Dockerfile: ${DOCKERFILE}"
    echo "   Tag: ${TAG}"
    echo ""
    
    if [ -f "$DOCKERFILE" ]; then
        docker buildx build \
            --platform linux/amd64 \
            -t "${TAG}" \
            -f "${DOCKERFILE}" \
            --push \
            . || {
                echo "   ⚠️  Failed to build ${LANG}, continuing..."
                return 1
            }
        echo "   ✅ ${LANG} container built and pushed"
    else
        echo "   ❌ Dockerfile not found: ${DOCKERFILE}"
        return 1
    fi
}

# Statistics
TOTAL=${#LANGUAGES[@]}
BUILT=0
FAILED=0

echo "📋 Languages to build: ${!LANGUAGES[@]}"
echo "📦 Total containers: $TOTAL"
echo ""
echo "Starting builds..."
echo "================================"

# Build each language container
for LANG in "${!LANGUAGES[@]}"; do
    if build_container "$LANG" "${LANGUAGES[$LANG]}"; then
        ((BUILT++))
    else
        ((FAILED++))
    fi
done

echo ""
echo "================================"
echo "📊 Build Summary:"
echo "   Total: $TOTAL"
echo "   ✅ Built: $BUILT"
echo "   ❌ Failed: $FAILED"
echo ""

# List available images
echo "📋 Available container images:"
doctl registry repository list-tags analyzer | grep -E "lang-.*-amd64" | head -20

echo ""
echo "✨ Build process completed!"
echo ""
echo "Next steps:"
echo "1. Run multi-language integration test"
echo "2. Verify each language with test repositories"