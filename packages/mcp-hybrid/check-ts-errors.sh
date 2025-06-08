#!/bin/bash

# Detailed TypeScript error check

cd /Users/alpinro/Code\ Prjects/codequal/packages/mcp-hybrid

echo "🔍 Running TypeScript with detailed errors..."
echo "============================================"

npx tsc --noEmit --pretty
