#!/bin/bash

echo "🔍 Pre-Test Environment Check"
echo "============================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Not in project root. Please run from /Users/alpinro/Code Prjects/codequal"
    exit 1
fi

# Check environment variables
echo "1️⃣ Checking environment variables..."
if [ -z "$SUPABASE_URL" ]; then
    echo "❌ SUPABASE_URL not set"
    echo "   Run: export SUPABASE_URL='your-supabase-url'"
    exit 1
else
    echo "✅ SUPABASE_URL is set"
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ SUPABASE_SERVICE_ROLE_KEY not set"
    echo "   Run: export SUPABASE_SERVICE_ROLE_KEY='your-service-role-key'"
    exit 1
else
    echo "✅ SUPABASE_SERVICE_ROLE_KEY is set"
fi

# Check Node.js
echo ""
echo "2️⃣ Checking Node.js..."
node_version=$(node -v)
echo "✅ Node.js version: $node_version"

# Check npm
echo ""
echo "3️⃣ Checking npm..."
npm_version=$(npm -v)
echo "✅ npm version: $npm_version"

# Check if packages are installed
echo ""
echo "4️⃣ Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "⚠️  node_modules not found. Installing dependencies..."
    npm install
else
    echo "✅ Dependencies installed"
fi

# Check if test files exist
echo ""
echo "5️⃣ Checking test files..."
test_count=$(ls integration-tests/tests/phase3-agents/*.test.ts 2>/dev/null | wc -l)
echo "✅ Found $test_count test files"

# Check TypeScript compilation
echo ""
echo "6️⃣ Quick TypeScript check..."
# Check only packages that are relevant for integration tests, exclude web app
(cd packages/core && npx tsc --noEmit --skipLibCheck) 2>/dev/null && \
(cd packages/agents && npx tsc --noEmit --skipLibCheck) 2>/dev/null && \
(cd packages/database && npx tsc --noEmit --skipLibCheck) 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ TypeScript compilation OK (core packages)"
else
    echo "⚠️  TypeScript has some errors (may not affect tests)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Environment ready for testing!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Run tests with:"
echo "  ./integration-tests/scripts/test-phase3-core-flow.sh"
