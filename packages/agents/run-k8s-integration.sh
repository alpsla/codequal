#!/bin/bash

# Run Kubernetes Two-Branch Integration Test
set -e

echo "🚀 Starting Kubernetes Two-Branch Integration Test"
echo "============================================="
echo ""

# Change to agents directory
cd "/Users/alpinro/Code Prjects/codequal/packages/agents"

# Check Kubernetes connectivity first
echo "📡 Checking Kubernetes connectivity..."
kubectl get nodes > /dev/null 2>&1 || {
    echo "❌ Cannot connect to Kubernetes cluster"
    echo "   Please ensure kubectl is configured correctly"
    exit 1
}
echo "✅ Kubernetes cluster accessible"
echo ""

# Check if containers are built
echo "🐳 Checking container images..."
IMAGES_NEEDED=(
    "python-test-amd64"
    "lang-javascript-amd64"
    "lang-java-amd64"
    "lang-go-amd64"
    "lang-rust-amd64"
)

MISSING_IMAGES=()
for IMG in "${IMAGES_NEEDED[@]}"; do
    if ! doctl registry repository list-tags analyzer 2>/dev/null | grep -q "$IMG"; then
        MISSING_IMAGES+=("$IMG")
    fi
done

if [ ${#MISSING_IMAGES[@]} -gt 0 ]; then
    echo "⚠️  Missing container images: ${MISSING_IMAGES[*]}"
    echo ""
    echo "Would you like to build missing images? (y/n)"
    read -r response
    if [[ "$response" == "y" ]]; then
        echo "Building missing images..."
        ./build-all-amd64.sh
    else
        echo "Continuing with available images..."
    fi
else
    echo "✅ All required container images are available"
fi

echo ""
echo "📝 Test Configuration:"
echo "   Repository: https://github.com/pallets/flask"
echo "   PR Number: 4850"
echo "   Language: Python (auto-detected)"
echo "   Namespace: codequal-dev"
echo ""

# Run the test
echo "🧪 Running integration test..."
npx ts-node test-kubernetes-two-branch.ts

echo ""
echo "✅ Integration test completed!"
echo ""
echo "📊 Check test-results/ directory for detailed report"