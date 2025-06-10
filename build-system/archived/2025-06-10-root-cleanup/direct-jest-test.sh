#!/bin/bash

echo "🔍 Direct Jest Test"
echo "=================="
echo ""

cd "/Users/alpinro/Code Prjects/codequal"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "1️⃣ Checking Jest installation directly..."

# Check jest binary
if [ -f "node_modules/.bin/jest" ]; then
    echo -e "${GREEN}✅ Jest binary exists${NC}"
    ls -la node_modules/.bin/jest
else
    echo -e "${RED}❌ Jest binary missing${NC}"
fi

# Check jest-cli
if [ -d "node_modules/jest-cli" ]; then
    echo -e "${GREEN}✅ jest-cli directory exists${NC}"
    
    # Check if build directory exists
    if [ -d "node_modules/jest-cli/build" ]; then
        echo "   ✅ build directory exists"
        if [ -f "node_modules/jest-cli/build/index.js" ]; then
            echo "   ✅ build/index.js exists"
        else
            echo "   ❌ build/index.js missing"
        fi
    else
        echo "   ❌ build directory missing"
    fi
fi

echo ""
echo "2️⃣ Running Jest directly..."

# Try running jest directly
./node_modules/.bin/jest --version

echo ""
echo "3️⃣ Running test with direct path..."

# Run a test directly
./node_modules/.bin/jest integration-tests/tests/phase3-agents/minimal-test.test.ts \
  --config jest.config.integration.js \
  --verbose \
  --no-coverage

echo ""
echo "4️⃣ If that fails, trying Node.js directly..."

# Run Jest via Node
node node_modules/jest/bin/jest.js --version

echo ""
echo "5️⃣ Alternative: Running via npm script..."

# Add a test script temporarily
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.scripts = pkg.scripts || {};
pkg.scripts['test:minimal'] = 'jest integration-tests/tests/phase3-agents/minimal-test.test.ts --verbose';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
console.log('Added test:minimal script');
"

npm run test:minimal
