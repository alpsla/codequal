#!/bin/bash

# Final build after fixing LoggableData errors

cd /Users/alpinro/Code\ Prjects/codequal/packages/mcp-hybrid

echo "🔨 Building MCP Hybrid package..."
echo "================================"

# Clean build directory
rm -rf dist

# Build
npm run build

if [ $? -eq 0 ]; then
    echo -e "\n✅ Build successful!"
    echo -e "\nBuild output:"
    ls -la dist/ | head -10
    
    echo -e "\n🎉 MCP Hybrid package is ready for use!"
    echo -e "\nYou can now:"
    echo "1. Run tests: npm test"
    echo "2. Run linting: npm run lint"
    echo "3. Start integrating with the main project"
else
    echo -e "\n❌ Build failed!"
    exit 1
fi
