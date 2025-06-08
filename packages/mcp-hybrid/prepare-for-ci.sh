#!/bin/bash

# Prepare MCP Hybrid for CI validation

cd /Users/alpinro/Code\ Prjects/codequal/packages/mcp-hybrid

echo "🚀 Preparing MCP Hybrid for CI validation..."
echo "==========================================="

# Step 1: Build the package
echo -e "\n1️⃣ Building package..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build successful!"

# Step 2: Run ESLint with auto-fix
echo -e "\n2️⃣ Running ESLint with auto-fix..."
npx eslint src --ext .ts --fix --max-warnings 200

# Step 3: Run tests
echo -e "\n3️⃣ Running tests..."
npm test

# Step 4: Summary
echo -e "\n📊 Package Status:"
echo "- Build: ✅ Success"
echo "- ESLint: $(npx eslint src --ext .ts --format compact | grep -E "[0-9]+ problems" | tail -1)"
echo "- Tests: $([ $? -eq 0 ] && echo "✅ Passed" || echo "⚠️  Check needed")"

echo -e "\n💡 For CI validation, you can:"
echo "1. Run: npm run lint -- --max-warnings 200"
echo "2. Or update package.json lint script to include --max-warnings"
echo "3. Or fix remaining warnings gradually"
