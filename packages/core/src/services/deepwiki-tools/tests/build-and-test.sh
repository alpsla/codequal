#!/bin/bash

# Build Script for CodeQual packages

echo "🏗️  Building CodeQual packages..."
echo "================================="
echo ""

# Change to project root
cd "$(dirname "$0")/../../../../../.."

# Step 1: Build database package
echo "1️⃣  Building @codequal/database..."
npm run build --workspace=@codequal/database

if [ $? -eq 0 ]; then
    echo "   ✅ Database package built successfully"
else
    echo "   ❌ Database package build failed"
    exit 1
fi

echo ""

# Step 2: Build core package
echo "2️⃣  Building @codequal/core..."
npm run build --workspace=@codequal/core

if [ $? -eq 0 ]; then
    echo "   ✅ Core package built successfully"
else
    echo "   ❌ Core package build failed"
    exit 1
fi

echo ""
echo "✅ All packages built successfully!"
echo ""

# Now we can run the tests
echo "3️⃣  Ready to run tool tests..."
echo ""
echo "Options:"
echo "  a) Simple test: node packages/core/src/services/deepwiki-tools/tests/simple-tool-test.js"
echo "  b) Standalone: cd packages/core && npx ts-node src/services/deepwiki-tools/tests/standalone-test.ts"
echo "  c) Full phased: cd packages/core/src/services/deepwiki-tools/tests && ./run-phased-tests.sh"
