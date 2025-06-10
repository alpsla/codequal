#!/bin/bash

echo "🔧 Fixing Axios Module Resolution"
echo "================================"
echo ""

cd "/Users/alpinro/Code Prjects/codequal"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "1️⃣ Current axios version..."
npm list axios 2>/dev/null | grep axios | head -1

echo ""
echo "2️⃣ Reinstalling axios with a known working version..."
# Install a specific version that's known to work
npm install axios@1.6.0 --save

echo ""
echo "3️⃣ Verifying axios installation..."
if [ -f "node_modules/axios/package.json" ]; then
    echo -e "${GREEN}✅ axios installed${NC}"
    
    # Check version
    node -e "
    const pkg = require('./node_modules/axios/package.json');
    console.log('   Version:', pkg.version);
    "
    
    # Test import
    node -e "
    try {
        const axios = require('axios');
        console.log('✅ axios imports correctly');
    } catch (e) {
        console.error('❌ Import failed:', e.message);
    }
    "
else
    echo -e "${RED}❌ axios not found${NC}"
fi

echo ""
echo "4️⃣ Testing core module with axios fix..."
node -e "
require('dotenv').config();
try {
    const core = require('./packages/core/dist/index.js');
    console.log('✅ Core module loads successfully!');
    
    // Try to load DeepWiki module specifically
    const deepwiki = require('./packages/core/dist/deepwiki/index.js');
    console.log('✅ DeepWiki module loads successfully!');
} catch (e) {
    console.error('❌ Error:', e.message);
    if (e.stack) {
        const lines = e.stack.split('\\n');
        console.error('   Location:', lines[1].trim());
    }
}
"

echo ""
echo "5️⃣ Testing minimal integration test..."
npx jest integration-tests/tests/phase3-agents/minimal-test.test.ts \
  --config jest.config.integration.js \
  --verbose \
  --no-coverage \
  --runInBand

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "If tests are still failing:"
echo "1. Check if there are other axios imports"
echo "2. Try clearing Jest cache: npx jest --clearCache"
echo "3. Check if TypeScript is recompiling files"
