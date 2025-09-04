#!/bin/bash

# Rebuild all language containers for AMD64 architecture
# This fixes the architecture mismatch issue

echo "🚀 Rebuilding language containers for AMD64 architecture..."
echo "=================================================="

cd /Users/alpinro/Code\ Prjects/codequal/packages/agents

# Ensure buildx is set up
docker buildx create --use --name codequal-multiarch 2>/dev/null || docker buildx use codequal-multiarch

# Define language containers and their Dockerfiles
declare -A CONTAINERS=(
    ["python"]="docker/Dockerfile.python-ml"
    ["javascript"]="docker/Dockerfile.javascript-node"
    ["java"]="docker/Dockerfile.java-enterprise"
)

# Additional containers (need to create Dockerfiles for these)
# ["go"]="docker/Dockerfile.go"
# ["rust"]="docker/Dockerfile.rust"
# ["ruby"]="docker/Dockerfile.ruby"
# ["php"]="docker/Dockerfile.php"
# ["perl"]="docker/Dockerfile.perl"
# ["cpp"]="docker/Dockerfile.cpp"
# ["csharp"]="docker/Dockerfile.csharp"

# Registry base
REGISTRY="registry.digitalocean.com/codequal/analyzer"

# Build each container
for LANG in "${!CONTAINERS[@]}"; do
    DOCKERFILE="${CONTAINERS[$LANG]}"
    TAG="${REGISTRY}:lang-${LANG}-amd64"
    
    echo ""
    echo "📦 Building ${LANG} container..."
    echo "   Dockerfile: ${DOCKERFILE}"
    echo "   Tag: ${TAG}"
    echo "   Platform: linux/amd64"
    
    if [ -f "$DOCKERFILE" ]; then
        docker buildx build \
            --platform linux/amd64 \
            -t "${TAG}" \
            -f "${DOCKERFILE}" \
            --push \
            . || echo "❌ Failed to build ${LANG}"
        
        echo "✅ ${LANG} container built and pushed"
    else
        echo "⚠️  Dockerfile not found: ${DOCKERFILE}"
    fi
done

echo ""
echo "=================================================="
echo "✅ AMD64 rebuild complete!"
echo ""
echo "Next steps:"
echo "1. Update image tags in Kubernetes deployments to use -amd64 suffix"
echo "2. Redeploy to cluster"
echo "3. Run integration tests"