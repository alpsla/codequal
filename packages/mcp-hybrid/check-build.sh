#!/bin/bash

# Quick build check for mcp-hybrid

cd /Users/alpinro/Code\ Prjects/codequal/packages/mcp-hybrid

echo "🔍 Running TypeScript compilation check..."
npx tsc --noEmit

if [ $? -eq 0 ]; then
    echo "✅ TypeScript compilation successful!"
else
    echo "❌ TypeScript compilation failed"
    exit 1
fi

echo -e "\n🔍 Running ESLint check..."
npx eslint src --ext .ts --max-warnings 30

if [ $? -eq 0 ]; then
    echo "✅ ESLint check passed!"
else
    echo "⚠️  ESLint has warnings/errors"
fi

echo -e "\n🎉 Build check complete!"
