#!/bin/bash

# Final build attempt after fixes

cd /Users/alpinro/Code\ Prjects/codequal/packages/mcp-hybrid

echo "🔨 Building MCP Hybrid package..."
echo "================================"

# Clean and build
rm -rf dist
npm run build

if [ $? -eq 0 ]; then
    echo -e "\n✅ Build successful!"
    echo "Package is ready at: dist/"
    ls -la dist/ | head -5
else
    echo -e "\n❌ Build failed"
    # Show specific errors
    npx tsc --noEmit 2>&1 | grep "error TS" -A 2
fi
