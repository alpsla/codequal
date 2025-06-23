#!/bin/bash

# Build core and mcp-hybrid packages
set -e

echo "Building packages..."

# Navigate to project root
cd "/Users/alpinro/Code Prjects/codequal"

# Build core package first
echo "Building core package..."
cd packages/core
npm run build || echo "Core build had errors, continuing..."
cd ../..

# Build mcp-hybrid package
echo "Building mcp-hybrid package..."
cd packages/mcp-hybrid
npm run build

echo "Build complete!"
