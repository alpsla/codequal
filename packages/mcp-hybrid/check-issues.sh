#!/bin/bash

# Script to check TypeScript and ESLint issues in mcp-hybrid package

echo "🔍 Checking TypeScript compilation..."
cd /Users/alpinro/Code\ Prjects/codequal/packages/mcp-hybrid

# Run TypeScript check
echo "Running tsc --noEmit..."
npx tsc --noEmit 2>&1 | head -50

echo -e "\n🔍 Checking ESLint..."
# Run ESLint
echo "Running eslint..."
npx eslint src --ext .ts 2>&1 | head -50

echo -e "\n✅ Check complete!"
