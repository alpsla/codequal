#!/bin/bash

# Quick rebuild and test script

echo "🔧 Rebuilding core package with fixes..."
echo "======================================="
echo ""

# Change to project root
cd "$(dirname "$0")/../../../../../.."

# Rebuild core
echo "Building @codequal/core..."
npm run build --workspace=@codequal/core

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo ""
    echo "Running direct test again..."
    echo ""
    node packages/core/src/services/deepwiki-tools/tests/direct-test.js
else
    echo "❌ Build failed"
    exit 1
fi
