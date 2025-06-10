#!/bin/bash
# Install Dependencies - Install or update project dependencies
# Usage: ./install-deps.sh [--clean]

set -e

echo "📦 Installing project dependencies..."

# Get the project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../" && pwd)"
cd "$PROJECT_ROOT"

# Check for clean install flag
CLEAN_INSTALL=false
if [ "$1" = "--clean" ]; then
    CLEAN_INSTALL=true
    echo "🧹 Performing clean install..."
fi

# Clean install if requested
if [ "$CLEAN_INSTALL" = true ]; then
    echo "🗑️ Removing existing node_modules..."
    rm -rf node_modules
    rm -rf packages/*/node_modules
    rm -rf apps/*/node_modules
    rm -rf integration-tests/node_modules
    
    echo "🗑️ Removing lock files..."
    rm -f package-lock.json
    rm -f packages/*/package-lock.json
    rm -f apps/*/package-lock.json
    rm -f integration-tests/package-lock.json
fi

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install package dependencies
echo "📦 Installing package dependencies..."
cd packages/core && npm install && cd ../..
cd packages/database && npm install && cd ../..
cd packages/agents && npm install && cd ../..
cd packages/mcp-hybrid && npm install && cd ../..
cd packages/testing && npm install && cd ../..
cd packages/ui && npm install && cd ../..

# Install app dependencies
echo "📦 Installing app dependencies..."
cd apps/api && npm install && cd ../..
cd apps/web && npm install && cd ../..

# Install integration test dependencies
echo "📦 Installing integration test dependencies..."
cd integration-tests && npm install && cd ..

echo "✅ All dependencies installed successfully!"
echo "📊 Installation summary:"
echo "   - Root dependencies: ✅"
echo "   - Package dependencies: ✅"
echo "   - App dependencies: ✅"
echo "   - Integration test dependencies: ✅"