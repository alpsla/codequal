#!/bin/bash

echo "🔧 Comprehensive Jest Fix"
echo "======================="
echo ""

cd "/Users/alpinro/Code Prjects/codequal"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "1️⃣ System Information..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"
echo "Current directory: $(pwd)"

# Check packageManager field
if grep -q '"packageManager"' package.json; then
    echo -e "${YELLOW}⚠️  packageManager field found in package.json${NC}"
    grep '"packageManager"' package.json
fi

echo ""
echo "2️⃣ Cleaning up corrupted Jest packages..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Remove Jest packages
rm -rf node_modules/jest* node_modules/@jest node_modules/ts-jest
echo "✅ Removed Jest packages"

echo ""
echo "3️⃣ Installing Jest using npm directly..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Use npm directly with specific flags
npm install jest@29.7.0 --save-dev --no-audit --no-fund

echo ""
echo "4️⃣ Checking Jest installation..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if jest-cli/build exists now
if [ -d "node_modules/jest-cli/build" ]; then
    echo -e "${GREEN}✅ jest-cli/build directory exists!${NC}"
else
    echo -e "${RED}❌ jest-cli/build still missing${NC}"
    
    echo ""
    echo "Trying workaround: Creating missing build directory..."
    
    # Create a minimal jest-cli build structure
    mkdir -p node_modules/jest-cli/build
    
    # Create a minimal index.js that redirects to jest
    cat > node_modules/jest-cli/build/index.js << 'EOF'
// Workaround for missing build directory
module.exports = {
  run: async function(maybeArgv, project) {
    const jest = require('jest');
    return jest.run(maybeArgv);
  }
};
EOF
    
    echo "✅ Created workaround build/index.js"
fi

echo ""
echo "5️⃣ Installing remaining test dependencies..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

npm install ts-jest@29.1.1 @types/jest@29.5.0 --save-dev --no-audit --no-fund

echo ""
echo "6️⃣ Testing Jest installation..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Create a simple test
cat > simple-test.test.js << 'EOF'
test('Jest is working', () => {
  expect(1 + 1).toBe(2);
  console.log('✅ Jest test passed!');
});
EOF

# Try to run it
echo "Running test with npx..."
npx jest simple-test.test.js --no-coverage 2>&1 | head -20

if [ ${PIPESTATUS[0]} -ne 0 ]; then
    echo ""
    echo "Trying with node directly..."
    node node_modules/jest/bin/jest.js simple-test.test.js --no-coverage 2>&1 | head -20
fi

# Clean up
rm -f simple-test.test.js

echo ""
echo "7️⃣ Alternative: Run tests without Jest..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "test-without-jest.sh" ]; then
    echo "You can test functionality without Jest:"
    echo "  chmod +x test-without-jest.sh"
    echo "  ./test-without-jest.sh"
else
    echo "Creating non-Jest test..."
    cat > quick-functionality-test.js << 'EOF'
console.log('Testing CodeQual functionality...\n');

require('dotenv').config();

// Test 1: Environment
console.log('1. Environment Variables:');
console.log('   SUPABASE_URL:', process.env.SUPABASE_URL ? '✅' : '❌');
console.log('   SUPABASE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅' : '❌');

// Test 2: Modules
console.log('\n2. Module Loading:');
try {
  require('./packages/core/dist/index.js');
  console.log('   Core: ✅');
} catch (e) {
  console.log('   Core: ❌', e.message);
}

try {
  require('./packages/agents/dist/index.js');
  console.log('   Agents: ✅');
} catch (e) {
  console.log('   Agents: ❌', e.message);
}

// Test 3: Supabase
console.log('\n3. Testing Supabase connection...');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

supabase.from('repositories').select('count').limit(1)
  .then(({ data, error }) => {
    if (error) {
      console.log('   Supabase: ❌', error.message);
    } else {
      console.log('   Supabase: ✅ Connected');
    }
    console.log('\n✅ Core functionality test complete');
  });
EOF
    
    node quick-functionality-test.js
    rm -f quick-functionality-test.js
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "If Jest is still not working, the issue might be:"
echo "1. The space in 'Code Prjects' causing path issues"
echo "2. Node.js version mismatch (you have v23.11.0)"
echo "3. Corrupted npm cache"
echo ""
echo "Recommendations:"
echo "1. Move project to /Users/alpinro/codequal/"
echo "2. Use Node.js v20 LTS (more stable)"
echo "3. Use alternative test runner (Vitest)"
