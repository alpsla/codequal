#!/bin/bash

# Build and push Java Analyzer v5.2 Docker image
# This image includes optimized tools that work on source code without compilation

set -e

REGISTRY="registry.digitalocean.com/codequal-registry"
IMAGE_NAME="analyzer"
TAG="lang-java-v5.2"
FULL_IMAGE="${REGISTRY}/${IMAGE_NAME}:${TAG}"

echo "🔨 Building Java Analyzer v5.2 Docker image..."
echo "Image: ${FULL_IMAGE}"
echo ""

# Build the image
echo "📦 Building Docker image..."
docker build -t ${FULL_IMAGE} .

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
else
    echo "❌ Build failed!"
    exit 1
fi

# Test the image locally
echo ""
echo "🧪 Testing image locally..."
docker run --rm ${FULL_IMAGE} -c "/health-check.sh"

if [ $? -eq 0 ]; then
    echo "✅ Health check passed!"
else
    echo "❌ Health check failed!"
    exit 1
fi

# Push to registry (optional - requires authentication)
read -p "Push to registry? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Pushing to registry..."
    docker push ${FULL_IMAGE}

    if [ $? -eq 0 ]; then
        echo "✅ Push successful!"
        echo ""
        echo "📝 Update kubernetes-repository-manager.ts with new image tag:"
        echo "   'java': 'lang-java-v5.2',"
    else
        echo "❌ Push failed!"
        exit 1
    fi
fi

echo ""
echo "📋 Summary:"
echo "  - PMD: Error-prone and security rules"
echo "  - Checkstyle: Google style checks"
echo "  - Semgrep: Security patterns (JSON output)"
echo "  - Infer: Null pointers, resource leaks (replaces SpotBugs)"
echo "  - Trivy: Vulnerability scanning (replaces Dependency-Check)"
echo ""
echo "🎯 All tools work on source code - no compilation needed!"