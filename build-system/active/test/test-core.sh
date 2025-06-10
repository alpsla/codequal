#!/bin/bash
# Test Core - Run core package tests only
# Usage: ./test-core.sh

set -e

echo "🔬 Running core package tests..."

# Get the project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../" && pwd)"
cd "$PROJECT_ROOT"

# Test individual packages
echo "📦 Testing core packages..."

# Test core package
if [ -d "packages/core" ]; then
    echo "🧮 Testing core package..."
    cd packages/core && npm test && cd ../..
fi

# Test database package
if [ -d "packages/database" ]; then
    echo "🗄️ Testing database package..."
    cd packages/database && npm test && cd ../..
fi

# Test agents package
if [ -d "packages/agents" ]; then
    echo "🤖 Testing agents package..."
    cd packages/agents && npm test && cd ../..
fi

# Test MCP hybrid package
if [ -d "packages/mcp-hybrid" ]; then
    echo "🔗 Testing MCP hybrid package..."
    cd packages/mcp-hybrid && npm test && cd ../..
fi

echo "✅ Core package tests completed!"