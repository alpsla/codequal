#!/bin/bash

echo "🔧 Fixing Jest Installation"
echo "=========================="
echo ""

cd "/Users/alpinro/Code Prjects/codequal"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "1️⃣ Checking current Jest installation..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if jest is in package.json
echo "Checking package.json for Jest..."
if [ -f "package.json" ]; then
    grep -E '"jest":|"ts-jest":|"@types/jest":' package.json || echo "No Jest dependencies found in root package.json"
fi

# Check if jest-cli exists
if [ -d "node_modules/jest-cli" ]; then
    echo -e "${YELLOW}⚠️  jest-cli exists but seems corrupted${NC}"
    ls -la node_modules/jest-cli/ | head -5
else
    echo -e "${RED}❌ jest-cli not found${NC}"
fi

echo ""
echo "2️⃣ Reinstalling Jest and related packages..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Remove potentially corrupted Jest packages
echo "Removing old Jest packages..."
rm -rf node_modules/jest*
rm -rf node_modules/@jest
rm -rf node_modules/ts-jest

# Reinstall Jest
echo "Installing Jest packages..."
npm install --save-dev jest@29.7.0 ts-jest@29.1.1 @types/jest@29.5.0

echo ""
echo "3️⃣ Verifying Jest installation..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if jest works
npx jest --version

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Jest installed successfully${NC}"
else
    echo -e "${RED}❌ Jest installation failed${NC}"
    echo ""
    echo "Trying alternative approach..."
    
    # Clear npm cache and try again
    npm cache clean --force
    npm install --save-dev jest ts-jest @types/jest
fi

echo ""
echo "4️⃣ Running a simple Jest test..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Create a simple test
cat > simple-jest-test.test.js << 'EOF'
test('basic math', () => {
  expect(1 + 1).toBe(2);
});

test('jest is working', () => {
  console.log('Jest is running!');
  expect(true).toBe(true);
});
EOF

npx jest simple-jest-test.test.js --no-coverage

# Clean up
rm -f simple-jest-test.test.js

echo ""
echo "5️⃣ If Jest is working, retry Phase 3 tests..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "integration-tests/scripts/test-phase3-skip-build.sh" ]; then
    echo "Running Phase 3 tests..."
    ./integration-tests/scripts/test-phase3-skip-build.sh
else
    echo "Run: npx jest integration-tests/tests/phase3-agents/minimal-test.test.ts"
fi
