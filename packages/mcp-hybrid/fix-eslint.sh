#!/bin/bash

# Fix ESLint issues for MCP Hybrid

cd /Users/alpinro/Code\ Prjects/codequal/packages/mcp-hybrid

echo "🔧 Fixing ESLint issues..."
echo "=========================="

# Step 1: Auto-fix what we can
echo -e "\n1️⃣ Running ESLint auto-fix..."
npx eslint src --ext .ts --fix

# Step 2: Check remaining errors (not warnings)
echo -e "\n2️⃣ Checking remaining errors..."
npx eslint src --ext .ts --quiet > eslint-errors.txt 2>&1

if [ -s eslint-errors.txt ]; then
    echo "❌ ESLint errors found:"
    cat eslint-errors.txt
else
    echo "✅ No ESLint errors! Only warnings remain."
fi

# Step 3: Count issues
echo -e "\n3️⃣ ESLint summary:"
npx eslint src --ext .ts --format compact | tail -5

# Step 4: For CI validation, we can add max-warnings
echo -e "\n4️⃣ Testing with max-warnings for CI..."
npx eslint src --ext .ts --max-warnings 150

if [ $? -eq 0 ]; then
    echo -e "\n✅ ESLint passes with warning threshold!"
else
    echo -e "\n❌ ESLint still has blocking issues"
fi

rm -f eslint-errors.txt
