#!/bin/bash

# Get detailed TypeScript errors for specific lines

cd /Users/alpinro/Code\ Prjects/codequal/packages/mcp-hybrid

echo "🔍 Getting detailed TypeScript errors..."
echo "========================================="

# Run TypeScript and capture output
npx tsc --noEmit 2>&1 | grep -A 2 -B 2 "error TS"
