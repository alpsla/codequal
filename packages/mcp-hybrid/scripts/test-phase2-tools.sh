#!/bin/bash

# Script to run Phase 2 tools tests with real data
# This script sets up the environment and runs the real-data tests

echo "🧪 Running Phase 2 Direct Tools Tests with Real Data"
echo "=================================================="

# Change to mcp-hybrid directory
cd "$(dirname "$0")/.." || exit 1

# Check if node_modules exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build the package first
echo "🔨 Building package..."
npm run build

# Run the specific test file
echo "🧪 Running real data tests..."
echo ""

# Run with verbose output to see the actual analysis results
npx jest src/adapters/direct/__tests__/phase2-real-data.test.ts --verbose --no-coverage

echo ""
echo "✅ Test execution complete!"
echo ""
echo "📊 Summary:"
echo "- NPM Outdated: Analyzes actual CodeQual dependencies for updates"
echo "- Bundlephobia: Checks real bundle sizes (requires internet)"
echo "- SonarJS: Analyzes actual TypeScript files for quality issues"
echo ""
echo "💡 Note: Bundlephobia tests may be slower due to API calls"
