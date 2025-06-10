#!/bin/bash

echo "🔧 Fixing TypeScript Build Issues"
echo "================================="
echo ""

cd "/Users/alpinro/Code Prjects/codequal"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 1. Clean all build artifacts
echo "1️⃣ Cleaning all build artifacts..."
rm -rf packages/*/dist packages/*/build packages/*/.turbo apps/*/dist apps/*/build
find . -name "*.tsbuildinfo" -type f -delete
find . -name "node_modules" -type d -prune -o -name "*.d.ts" -type f -delete 2>/dev/null || true
echo "✅ Clean completed"
echo ""

# 2. Install dependencies to ensure all packages are linked
echo "2️⃣ Installing dependencies..."
npm install
echo "✅ Dependencies installed"
echo ""

# 3. Build core package first (has no dependencies)
echo "3️⃣ Building @codequal/core..."
cd packages/core
npm run build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Core built successfully${NC}"
else
    echo -e "${RED}❌ Core build failed${NC}"
    exit 1
fi
cd ../..
echo ""

# 4. Build database package (depends on core)
echo "4️⃣ Building @codequal/database..."
cd packages/database
npm run build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database built successfully${NC}"
else
    echo -e "${RED}❌ Database build failed${NC}"
    exit 1
fi
cd ../..
echo ""

# 5. Build agents package (depends on core)
echo "5️⃣ Building @codequal/agents..."
cd packages/agents
npm run build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Agents built successfully${NC}"
else
    echo -e "${RED}❌ Agents build failed${NC}"
    exit 1
fi
cd ../..
echo ""

# 6. Build testing package (depends on core)
echo "6️⃣ Building @codequal/testing..."
cd packages/testing
npm run build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Testing built successfully${NC}"
else
    echo -e "${RED}❌ Testing build failed${NC}"
fi
cd ../..
echo ""

# 7. Build UI package (depends on core)
echo "7️⃣ Building @codequal/ui..."
cd packages/ui
npm run build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ UI built successfully${NC}"
else
    echo -e "${RED}❌ UI build failed${NC}"
fi
cd ../..
echo ""

# 8. Build MCP Hybrid package (depends on core and agents)
echo "8️⃣ Building @codequal/mcp-hybrid..."
cd packages/mcp-hybrid
npm run build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ MCP Hybrid built successfully${NC}"
else
    echo -e "${RED}❌ MCP Hybrid build failed${NC}"
fi
cd ../..
echo ""

# 9. Verify builds
echo "9️⃣ Verifying build outputs..."
echo ""

check_build() {
    local package=$1
    if [ -d "$package/dist" ] || [ -d "$package/build" ]; then
        echo -e "${GREEN}✅ $(basename $package) has build output${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  $(basename $package) missing build output${NC}"
        return 1
    fi
}

all_good=true
for package in packages/*; do
    if [ -f "$package/package.json" ]; then
        check_build $package || all_good=false
    fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Build Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$all_good" = true ]; then
    echo -e "${GREEN}✅ All packages built successfully!${NC}"
    echo ""
    echo "You can now run:"
    echo "  ./integration-tests/scripts/test-phase3-core-flow.sh"
else
    echo -e "${YELLOW}⚠️  Some packages may have issues${NC}"
    echo ""
    echo "Check individual package build logs for details"
fi
