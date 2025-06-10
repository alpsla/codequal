#!/bin/bash

echo "🩹 Patching Axios Import Issue"
echo "============================="
echo ""

cd "/Users/alpinro/Code Prjects/codequal"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "1️⃣ Creating axios compatibility patch..."

# Create a patch file that redirects the problematic import
mkdir -p node_modules/axios/dist/node/
cat > node_modules/axios/dist/node/axios.cjs << 'EOF'
// Compatibility patch for axios import
module.exports = require('../../index.js');
EOF

echo -e "${GREEN}✅ Created compatibility patch${NC}"

echo ""
echo "2️⃣ Testing if patch works..."
node -e "
try {
    // Test the specific import that was failing
    const axios = require('axios/dist/node/axios.cjs');
    console.log('✅ Patched import works!');
    
    // Test normal import too
    const axiosNormal = require('axios');
    console.log('✅ Normal import also works!');
} catch (e) {
    console.error('❌ Import still failing:', e.message);
}
"

echo ""
echo "3️⃣ Testing core module with patch..."
node -e "
require('dotenv').config();
try {
    const core = require('./packages/core/dist/index.js');
    console.log('✅ Core module loads with patch!');
} catch (e) {
    console.error('❌ Core still failing:', e.message);
}
"

echo ""
echo "4️⃣ Running minimal test with patch..."
npx jest integration-tests/tests/phase3-agents/minimal-test.test.ts \
  --verbose \
  --no-coverage \
  --runInBand

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "This is a temporary patch. For a permanent fix:"
echo "1. Update axios to a compatible version"
echo "2. Rebuild the TypeScript files"
echo "3. Update import statements in source code"
