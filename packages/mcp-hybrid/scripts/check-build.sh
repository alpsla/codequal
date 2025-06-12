#!/bin/bash

# Quick build check script
echo "🔨 Checking TypeScript compilation for mcp-hybrid package..."
echo "=================================================="

cd "$(dirname "$0")/.." || exit 1

# Run TypeScript compiler with error details
echo "Running tsc to check for errors..."
npx tsc --noEmit 2>&1 | head -50

echo ""
echo "Showing first 50 lines of errors. Run 'npm run build' for full output."
