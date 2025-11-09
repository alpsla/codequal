#!/bin/bash

# Build and Push TypeScript Analyzer to Oracle Container Registry (OCIR)
# This script builds the TypeScript analyzer Docker image and pushes it to OCIR
# for use with V9 multi-language analysis on Oracle Cloud

set -e  # Exit on error

echo "═══════════════════════════════════════════════════════"
echo "🐳 Building TypeScript Analyzer for Oracle Cloud"
echo "═══════════════════════════════════════════════════════"

# Configuration
ORACLE_IP="129.213.49.128"
SSH_KEY="/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-10-07.key"
DOCKERFILE_PATH="docker/languages/Dockerfile.typescript.v4.1"
IMAGE_NAME="codequal/analyzer"
IMAGE_TAG="lang-typescript-v4.1-arm"
OCIR_REPO="iad.ocir.io/idzaw9ddo1h5/codequal/analyzer"
FULL_TAG="${OCIR_REPO}:${IMAGE_TAG}"

echo "📋 Configuration:"
echo "   Oracle IP: ${ORACLE_IP}"
echo "   Dockerfile: ${DOCKERFILE_PATH}"
echo "   Image: ${IMAGE_NAME}:${IMAGE_TAG}"
echo "   OCIR Repo: ${FULL_TAG}"
echo ""

# Step 1: Copy Dockerfile to Oracle
echo "📤 Step 1: Copying Dockerfile to Oracle Cloud..."
scp -i "${SSH_KEY}" "${DOCKERFILE_PATH}" "opc@${ORACLE_IP}:/tmp/Dockerfile.typescript"

if [ $? -eq 0 ]; then
    echo "   ✅ Dockerfile copied successfully"
else
    echo "   ❌ Failed to copy Dockerfile"
    exit 1
fi

# Step 2: Build image on Oracle (ARM architecture)
echo ""
echo "🏗️  Step 2: Building Docker image on Oracle Cloud (ARM64)..."
ssh -i "${SSH_KEY}" "opc@${ORACLE_IP}" << 'EOF'
cd /tmp
echo "   Building image..."
docker build -t codequal/analyzer:lang-typescript-v4.1-arm -f Dockerfile.typescript . 2>&1 | tail -20

if [ $? -eq 0 ]; then
    echo "   ✅ Image built successfully"
    docker images | grep typescript
else
    echo "   ❌ Build failed"
    exit 1
fi
EOF

if [ $? -ne 0 ]; then
    echo "   ❌ Build failed on Oracle"
    exit 1
fi

# Step 3: Tag for OCIR
echo ""
echo "🏷️  Step 3: Tagging image for Oracle Container Registry..."
ssh -i "${SSH_KEY}" "opc@${ORACLE_IP}" "docker tag codequal/analyzer:lang-typescript-v4.1-arm ${FULL_TAG}"

if [ $? -eq 0 ]; then
    echo "   ✅ Image tagged: ${FULL_TAG}"
else
    echo "   ❌ Failed to tag image"
    exit 1
fi

# Step 4: Test the image
echo ""
echo "🧪 Step 4: Testing TypeScript analyzer image..."
ssh -i "${SSH_KEY}" "opc@${ORACLE_IP}" << 'EOF'
echo "   Testing Node.js version:"
docker run --rm codequal/analyzer:lang-typescript-v4.1-arm node --version

echo "   Testing TypeScript:"
docker run --rm codequal/analyzer:lang-typescript-v4.1-arm tsc --version

echo "   Testing ESLint:"
docker run --rm codequal/analyzer:lang-typescript-v4.1-arm eslint --version

echo "   Testing Python (for JSON processing):"
docker run --rm codequal/analyzer:lang-typescript-v4.1-arm python3 --version
EOF

if [ $? -eq 0 ]; then
    echo "   ✅ All tools working in container"
else
    echo "   ⚠️  Some tools may have issues"
fi

# Step 5: Push to OCIR (optional - requires authentication)
echo ""
echo "📦 Step 5: Push to OCIR (optional)"
echo "   To push to OCIR, run on Oracle:"
echo "   docker login iad.ocir.io"
echo "   docker push ${FULL_TAG}"

# Summary
echo ""
echo "═══════════════════════════════════════════════════════"
echo "✅ TypeScript Analyzer Build Complete"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "📊 Summary:"
echo "   Local Image: codequal/analyzer:lang-typescript-v4.1-arm"
echo "   OCIR Image: ${FULL_TAG}"
echo ""
echo "🚀 Next Steps:"
echo "   1. Test with CodeQual repository"
echo "   2. Run V9 E2E test: npx ts-node test-v9-typescript-e2e.ts"
echo "   3. Validate report generation"
echo ""
echo "📝 To use this image in V9 analyzer:"
echo "   Update v9-typescript-analyzer.ts tool commands to use Docker"
echo ""

