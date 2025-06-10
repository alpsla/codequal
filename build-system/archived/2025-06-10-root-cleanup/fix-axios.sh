#!/bin/bash

echo "🔧 Fixing Axios Import Issue"
echo "==========================="
echo ""

cd "/Users/alpinro/Code Prjects/codequal"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. Check if axios is installed
echo "1️⃣ Checking axios installation..."
if [ -d "node_modules/axios" ]; then
    echo -e "${GREEN}✅ axios is installed${NC}"
    
    # Check the actual structure
    echo "   Checking axios structure..."
    if [ -f "node_modules/axios/dist/axios.js" ]; then
        echo "   ✅ Found axios.js"
    fi
    if [ -f "node_modules/axios/index.js" ]; then
        echo "   ✅ Found index.js"
    fi
    
    # List what's actually in the dist directory
    echo "   Contents of axios/dist:"
    ls -la node_modules/axios/dist/ 2>/dev/null | head -5
else
    echo -e "${YELLOW}⚠️ axios not found, installing...${NC}"
    npm install axios
fi

echo ""
echo "2️⃣ Reinstalling axios to fix any issues..."
npm install axios@latest --save

echo ""
echo "3️⃣ Checking which file is trying to import axios incorrectly..."

# Search for the problematic import
echo "   Searching for axios imports in built files..."
grep -r "axios/dist/node/axios.cjs" packages/*/dist 2>/dev/null | head -5

echo ""
echo "4️⃣ Quick test after fix..."
node -e "
try {
    const axios = require('axios');
    console.log('✅ axios loads correctly');
    console.log('   Version:', axios.VERSION || 'unknown');
} catch (e) {
    console.error('❌ axios still failing:', e.message);
}
"

echo ""
echo "5️⃣ Testing core module again..."
node -e "
try {
    require('dotenv').config();
    const core = require('./packages/core/dist/index.js');
    console.log('✅ Core module loads successfully');
} catch (e) {
    console.error('❌ Core module error:', e.message);
    console.error('   Stack:', e.stack.split('\\n')[1]);
}
"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "If axios is still failing, try:"
echo "  1. rm -rf node_modules package-lock.json"
echo "  2. npm install"
echo "  3. npm dedupe"
