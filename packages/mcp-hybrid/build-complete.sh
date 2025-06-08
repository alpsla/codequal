#!/bin/bash

# Comprehensive build script for MCP Hybrid

cd /Users/alpinro/Code\ Prjects/codequal/packages/mcp-hybrid

echo "🏗️  MCP Hybrid Build Process"
echo "============================"

# Clean build directory
echo -e "\n🧹 Cleaning build directory..."
rm -rf dist

# Run TypeScript compilation
echo -e "\n🔨 Building TypeScript..."
npm run build

if [ $? -eq 0 ]; then
    echo -e "\n✅ Build successful!"
    echo -e "\nBuild output:"
    ls -la dist/
    
    # Count files
    echo -e "\nBuild statistics:"
    echo "- JavaScript files: $(find dist -name "*.js" | wc -l)"
    echo "- Type definition files: $(find dist -name "*.d.ts" | wc -l)"
    echo "- Source map files: $(find dist -name "*.map" | wc -l)"
    
    echo -e "\n🎉 MCP Hybrid package is ready!"
    echo "Next steps:"
    echo "1. Run tests: npm test"
    echo "2. Run ESLint: npm run lint"
    echo "3. Integrate with main project"
else
    echo -e "\n❌ Build failed!"
    echo -e "\nShowing TypeScript errors:"
    npx tsc --noEmit 2>&1 | grep -E "error TS|\.ts\(" | head -20
fi
