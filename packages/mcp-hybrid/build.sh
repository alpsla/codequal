#!/bin/bash

# Final build script for mcp-hybrid package

cd /Users/alpinro/Code\ Prjects/codequal/packages/mcp-hybrid

echo "🔧 MCP Hybrid Build Process"
echo "=========================="

# Step 1: Clean previous build
echo -e "\n1️⃣ Cleaning previous build..."
rm -rf dist

# Step 2: Run ESLint auto-fix
echo -e "\n2️⃣ Running ESLint auto-fix..."
npx eslint src --ext .ts --fix --max-warnings 50

# Step 3: Build the package
echo -e "\n3️⃣ Building package..."
npm run build

if [ $? -eq 0 ]; then
    echo -e "\n✅ Build successful!"
    echo "Package built to: dist/"
    
    # Show build output
    echo -e "\nBuild output:"
    ls -la dist/ | head -10
    
    echo -e "\n🎉 MCP Hybrid package is ready for testing!"
else
    echo -e "\n❌ Build failed!"
    echo "Please check the errors above and fix them."
    exit 1
fi
