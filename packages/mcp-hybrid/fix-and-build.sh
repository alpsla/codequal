#!/bin/bash

# Run the logger import fix and then build

cd /Users/alpinro/Code\ Prjects/codequal/packages/mcp-hybrid

echo "🔧 Fixing logger imports..."
node fix-logger-imports.js

echo -e "\n🔍 Checking TypeScript compilation..."
npx tsc --noEmit

if [ $? -eq 0 ]; then
    echo -e "\n✅ TypeScript check passed!"
    
    echo -e "\n🔨 Building package..."
    npm run build
    
    if [ $? -eq 0 ]; then
        echo -e "\n🎉 Build successful!"
    else
        echo -e "\n❌ Build failed"
    fi
else
    echo -e "\n❌ TypeScript errors remain"
fi
