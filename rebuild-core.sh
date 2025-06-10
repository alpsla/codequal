#!/bin/bash

echo "🔧 Rebuilding Core Package with Type Declarations"
echo "==============================================="
echo ""

cd "/Users/alpinro/Code Prjects/codequal/packages/core"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Clean previous build
echo "1️⃣ Cleaning previous build..."
rm -rf dist
rm -f tsconfig.tsbuildinfo
echo "✅ Clean completed"
echo ""

# Build with explicit declaration generation
echo "2️⃣ Building with TypeScript..."
npx tsc --declaration --declarationMap --skipLibCheck

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

# Check if d.ts files were generated
echo ""
echo "3️⃣ Checking generated files..."
if [ -f "dist/index.d.ts" ]; then
    echo -e "${GREEN}✅ index.d.ts generated${NC}"
else
    echo -e "${RED}❌ index.d.ts not found${NC}"
fi

# List generated declaration files
echo ""
echo "4️⃣ Generated declaration files:"
find dist -name "*.d.ts" -type f | head -20

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Build complete!"
