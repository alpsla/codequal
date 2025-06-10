#!/bin/bash

echo "🔍 CodeQual Integration Test Diagnostics"
echo "======================================"
echo ""

cd "/Users/alpinro/Code Prjects/codequal"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "1️⃣ Environment Check"
echo "-------------------"

# Check for .env file
if [ -f .env ]; then
    echo -e "${GREEN}✅ .env file exists${NC}"
    # Count env vars
    env_count=$(grep -c "=" .env | grep -v "^#" || echo "0")
    echo "   Contains $env_count variables"
else
    echo -e "${RED}❌ .env file missing${NC}"
    echo "   Looking for .env.example..."
    if [ -f .env.example ]; then
        echo -e "${YELLOW}   Found .env.example - copy it to .env${NC}"
    fi
fi

echo ""
echo "2️⃣ Package Build Status"
echo "---------------------"

packages=("core" "agents" "database" "mcp-hybrid")
all_built=true

for pkg in "${packages[@]}"; do
    if [ -d "packages/$pkg/dist" ]; then
        js_count=$(find "packages/$pkg/dist" -name "*.js" | wc -l | tr -d ' ')
        echo -e "${GREEN}✅ $pkg: $js_count JS files${NC}"
    else
        echo -e "${RED}❌ $pkg: no dist directory${NC}"
        all_built=false
    fi
done

echo ""
echo "3️⃣ Dependencies Check"
echo "-------------------"

# Check if node_modules exists
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✅ node_modules exists${NC}"
    
    # Check for key dependencies
    deps=("@supabase/supabase-js" "jest" "ts-jest" "@types/jest")
    for dep in "${deps[@]}"; do
        if [ -d "node_modules/$dep" ]; then
            echo -e "   ${GREEN}✓ $dep${NC}"
        else
            echo -e "   ${RED}✗ $dep missing${NC}"
        fi
    done
else
    echo -e "${RED}❌ node_modules missing - run npm install${NC}"
fi

echo ""
echo "4️⃣ Jest Configuration"
echo "-------------------"

if [ -f "jest.config.js" ]; then
    echo -e "${GREEN}✅ jest.config.js exists${NC}"
fi

if [ -f "jest.config.integration.js" ]; then
    echo -e "${GREEN}✅ jest.config.integration.js exists${NC}"
fi

echo ""
echo "5️⃣ Test Files"
echo "------------"

test_count=$(find integration-tests/tests/phase3-agents -name "*.test.ts" | wc -l | tr -d ' ')
echo "Found $test_count test files in phase3-agents"

echo ""
echo "6️⃣ Quick Import Test"
echo "------------------"

# Try to load modules with Node
node -e "
try {
    require('dotenv').config();
    console.log('✅ dotenv loaded');
    
    const hasSupabaseUrl = !!process.env.SUPABASE_URL;
    const hasSupabaseKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    console.log('✅ SUPABASE_URL:', hasSupabaseUrl ? 'set' : 'missing');
    console.log('✅ SUPABASE_SERVICE_ROLE_KEY:', hasSupabaseKey ? 'set' : 'missing');
    
    require('./packages/core/dist/index.js');
    console.log('✅ Core module loads');
    
    require('./packages/agents/dist/index.js');
    console.log('✅ Agents module loads');
} catch (e) {
    console.error('❌ Error:', e.message);
}
"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Diagnostic Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$all_built" = true ] && [ -f ".env" ] && [ -d "node_modules" ]; then
    echo -e "${GREEN}✅ System appears ready for testing${NC}"
    echo ""
    echo "Try running:"
    echo "  npm test integration-tests/tests/phase3-agents/minimal-test.test.ts"
else
    echo -e "${YELLOW}⚠️  Issues detected${NC}"
    echo ""
    echo "Fix these issues:"
    [ ! -f ".env" ] && echo "  1. Copy .env.example to .env and fill in values"
    [ ! -d "node_modules" ] && echo "  2. Run: npm install"
    [ "$all_built" = false ] && echo "  3. Build packages: npm run build"
fi
