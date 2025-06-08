#!/bin/bash

# Check ESLint errors (not warnings)

cd /Users/alpinro/Code\ Prjects/codequal/packages/mcp-hybrid

echo "🔍 Checking ESLint errors (not warnings)..."
echo "=========================================="

# Run ESLint and filter for errors only
npx eslint src --ext .ts --quiet

echo -e "\n📊 ESLint Summary:"
npx eslint src --ext .ts --format compact | grep -E "Error|error" | head -20
