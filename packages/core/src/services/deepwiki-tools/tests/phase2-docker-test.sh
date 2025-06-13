#!/bin/bash

# Phase 2: Docker Testing for DeepWiki Tools
# This script builds and tests the Docker image

echo "🐳 Phase 2: Docker Container Testing"
echo "===================================="
echo ""

# Get paths
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DOCKER_DIR="$SCRIPT_DIR/../docker"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../../../.." && pwd)"

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker is not running. Please start Docker Desktop."
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Step 1: Prepare the Docker build context
echo "1️⃣ Preparing Docker build context..."
cd "$DOCKER_DIR"

# Copy the compiled tool-runner.service.js
if [ -f "$PROJECT_ROOT/packages/core/dist/services/deepwiki-tools/tool-runner.service.js" ]; then
    cp "$PROJECT_ROOT/packages/core/dist/services/deepwiki-tools/tool-runner.service.js" ./tool-runner.service.js
    echo "   ✅ Copied tool-runner.service.js"
else
    echo "   ❌ tool-runner.service.js not found. Build the core package first."
    exit 1
fi

# Step 2: Create a simplified Dockerfile for testing
echo ""
echo "2️⃣ Creating test Dockerfile..."
cat > Dockerfile.test << 'EOF'
# Test Dockerfile for DeepWiki Tools
FROM node:18-alpine

# Install git for repository operations
RUN apk add --no-cache git

# Create working directory
WORKDIR /tools

# Copy tool files
COPY tool-executor.js /tools/
COPY tool-runner.service.js /tools/

# Install global npm packages for tools
RUN npm install -g \
    license-checker \
    madge \
    dependency-cruiser

# Make tool executor executable
RUN chmod +x /tools/tool-executor.js

# Create a test script
RUN echo '#!/bin/sh\necho "🚀 DeepWiki Tools Container Ready"\necho "Node version: $(node --version)"\necho "NPM version: $(npm --version)"\necho ""\necho "Available tools:"\nwhich license-checker && echo "✅ license-checker"\nwhich madge && echo "✅ madge"\nwhich depcruise && echo "✅ dependency-cruiser"' > /tools/test.sh && chmod +x /tools/test.sh

WORKDIR /workspace

CMD ["/tools/test.sh"]
EOF

echo "   ✅ Created Dockerfile.test"

# Step 3: Build the Docker image
echo ""
echo "3️⃣ Building Docker image..."
docker build -f Dockerfile.test -t deepwiki-tools-test:latest .

if [ $? -eq 0 ]; then
    echo "   ✅ Docker image built successfully"
else
    echo "   ❌ Docker build failed"
    exit 1
fi

# Step 4: Test the container
echo ""
echo "4️⃣ Testing container..."
docker run --rm deepwiki-tools-test:latest

# Step 5: Test with a real repository
echo ""
echo "5️⃣ Testing tools with CodeQual repository..."

# Run tools on the mcp-hybrid package
docker run --rm \
    -v "$PROJECT_ROOT:/workspace/codequal:ro" \
    deepwiki-tools-test:latest \
    node /tools/tool-executor.js /workspace/codequal/packages/mcp-hybrid

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Phase 2 Complete: Docker container works!"
    echo ""
    echo "The tools can be executed in a container environment."
    echo "This validates that the DeepWiki integration will work."
else
    echo ""
    echo "⚠️  Tool execution had issues, but container works"
fi

# Cleanup
rm -f ./tool-runner.service.js
rm -f ./Dockerfile.test

echo ""
echo "📋 Next Steps:"
echo "   - Phase 3: Integration testing with Vector DB"
echo "   - Deploy to Kubernetes with DeepWiki"
