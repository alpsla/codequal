#!/bin/bash

echo "🧪 Running Minimal Test"
echo "====================="
echo ""

cd "/Users/alpinro/Code Prjects/codequal"

# Check environment
echo "1️⃣ Checking environment..."
if [ -f .env ]; then
    echo "✅ .env file found"
    # Load env vars
    set -a
    source .env
    set +a
else
    echo "❌ .env file not found"
fi

# Check if we have Supabase credentials
if [ -n "$SUPABASE_URL" ]; then
    echo "✅ SUPABASE_URL is set"
else
    echo "❌ SUPABASE_URL is not set"
fi

if [ -n "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "✅ SUPABASE_SERVICE_ROLE_KEY is set"
else
    echo "❌ SUPABASE_SERVICE_ROLE_KEY is not set"
fi

echo ""
echo "2️⃣ Running minimal test..."
npx jest integration-tests/tests/phase3-agents/minimal-test.test.ts \
  --config jest.config.integration.js \
  --verbose \
  --no-coverage

echo ""
echo "3️⃣ If test failed, trying with default Jest config..."
npx jest integration-tests/tests/phase3-agents/minimal-test.test.ts \
  --verbose \
  --no-coverage
