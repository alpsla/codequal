#!/bin/bash

# Test build script for mcp-hybrid package

echo "🔧 Testing MCP Hybrid build..."
echo "================================"

cd /Users/alpinro/Code\ Prjects/codequal/packages/mcp-hybrid

# Step 1: Clean previous build
echo -e "\n1️⃣ Cleaning previous build..."
rm -rf dist

# Step 2: Run TypeScript compiler with no emit to check for errors
echo -e "\n2️⃣ Checking TypeScript compilation..."
npx tsc --noEmit

if [ $? -eq 0 ]; then
    echo "✅ TypeScript check passed!"
else
    echo "❌ TypeScript errors found. Please fix them before building."
    exit 1
fi

# Step 3: Run ESLint
echo -e "\n3️⃣ Running ESLint..."
npx eslint src --ext .ts --max-warnings 20

if [ $? -eq 0 ]; then
    echo "✅ ESLint check passed!"
else
    echo "⚠️  ESLint warnings/errors found. Consider fixing them."
fi

# Step 4: Build the package
echo -e "\n4️⃣ Building package..."
npm run build

if [ $? -eq 0 ]; then
    echo -e "\n✅ Build successful!"
    echo "Package built to: dist/"
    ls -la dist/ | head -10
else
    echo -e "\n❌ Build failed!"
    exit 1
fi

echo -e "\n================================"
echo "🎉 MCP Hybrid package is ready!"
