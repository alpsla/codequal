#!/bin/bash

echo "🔍 Debugging Test Failures"
echo "========================"
echo ""

cd "/Users/alpinro/Code Prjects/codequal"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. Run the minimal test with maximum verbosity
echo "1️⃣ Running minimal test with full output..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

npx jest integration-tests/tests/phase3-agents/minimal-test.test.ts \
  --verbose \
  --no-coverage \
  --runInBand \
  --detectOpenHandles 2>&1 | tee minimal-test-output.log

echo ""
echo "2️⃣ Checking for common issues in output..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check for specific errors
if grep -q "Cannot find module" minimal-test-output.log; then
    echo -e "${RED}❌ Module resolution errors found${NC}"
    grep "Cannot find module" minimal-test-output.log | head -5
fi

if grep -q "SyntaxError" minimal-test-output.log; then
    echo -e "${RED}❌ Syntax errors found${NC}"
    grep -A2 "SyntaxError" minimal-test-output.log | head -10
fi

if grep -q "TypeError" minimal-test-output.log; then
    echo -e "${RED}❌ Type errors found${NC}"
    grep -A2 "TypeError" minimal-test-output.log | head -10
fi

if grep -q "SUPABASE" minimal-test-output.log; then
    echo -e "${YELLOW}⚠️  Supabase-related messages${NC}"
    grep -i "supabase" minimal-test-output.log | head -5
fi

echo ""
echo "3️⃣ Running a different simple test..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Create an even simpler test
cat > integration-tests/tests/phase3-agents/super-simple.test.ts << 'EOF'
describe('Super Simple Test', () => {
  it('should pass basic assertions', () => {
    expect(1 + 1).toBe(2);
    expect(true).toBe(true);
  });
  
  it('should have environment variables', () => {
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('Has SUPABASE_URL:', !!process.env.SUPABASE_URL);
    expect(process.env.NODE_ENV).toBe('test');
  });
  
  it('should load dotenv', () => {
    require('dotenv').config();
    const hasUrl = !!process.env.SUPABASE_URL;
    const hasKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    console.log('After dotenv - URL:', hasUrl, 'KEY:', hasKey);
    expect(hasUrl || hasKey).toBeTruthy();
  });
});
EOF

npx jest integration-tests/tests/phase3-agents/super-simple.test.ts \
  --verbose \
  --no-coverage

echo ""
echo "4️⃣ Checking Jest configuration..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test with no config
echo "Testing with no Jest config..."
npx jest integration-tests/tests/phase3-agents/super-simple.test.ts \
  --no-config \
  --verbose

# Clean up
rm -f integration-tests/tests/phase3-agents/super-simple.test.ts
rm -f minimal-test-output.log

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Based on the output above, the issue is likely:"
echo "1. Jest configuration problem"
echo "2. TypeScript compilation in tests"
echo "3. Module resolution in test environment"
echo "4. Environment variable loading"
