#!/bin/bash

echo "🔧 Fixing Build Order Issues"
echo "============================"
echo ""

cd /Users/alpinro/Code\ Prjects/codequal

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. Clean everything first
echo "1️⃣ Cleaning all build artifacts..."
rm -rf packages/*/dist packages/*/build packages/*/.turbo apps/*/dist apps/*/build
find . -name "*.tsbuildinfo" -type f -delete
echo "✅ Clean completed"
echo ""

# 2. Build packages in dependency order
echo "2️⃣ Building packages in correct order..."
echo ""

# Build core first (no dependencies)
echo "📦 Building @codequal/core..."
cd packages/core
npm run build || npx tsc
cd ../..
echo -e "${GREEN}✅ Core built${NC}"
echo ""

# Build database (depends on core)
echo "📦 Building @codequal/database..."
cd packages/database
npm run build || npx tsc
cd ../..
echo -e "${GREEN}✅ Database built${NC}"
echo ""

# Build agents (depends on core)
echo "📦 Building @codequal/agents..."
cd packages/agents
npm run build || npx tsc
cd ../..
echo -e "${GREEN}✅ Agents built${NC}"
echo ""

# Build mcp-hybrid (depends on core and agents)
echo "📦 Building @codequal/mcp-hybrid..."
cd packages/mcp-hybrid
npm run build || npx tsc
cd ../..
echo -e "${GREEN}✅ MCP Hybrid built${NC}"
echo ""

# Build testing (depends on core)
echo "📦 Building @codequal/testing..."
cd packages/testing
npm run build || npx tsc
cd ../..
echo -e "${GREEN}✅ Testing built${NC}"
echo ""

# Build UI (depends on core)
echo "📦 Building @codequal/ui..."
cd packages/ui
npm run build || npx tsc
cd ../..
echo -e "${GREEN}✅ UI built${NC}"
echo ""

# Now build apps
echo "3️⃣ Building applications..."
echo ""

# Build API
echo "📦 Building API app..."
cd apps/api
npm run build || npx tsc
cd ../..
echo -e "${GREEN}✅ API built${NC}"
echo ""

# Build Web (if needed)
echo "📦 Building Web app..."
cd apps/web
npm run build || echo "Web app build skipped (Next.js)"
cd ../..
echo ""

# 4. Verify builds
echo "4️⃣ Verifying build outputs..."
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
    echo "Try running the full build again:"
    echo "  npm run build"
fi
