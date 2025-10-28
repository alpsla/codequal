#!/bin/bash
# Run E2E test with environment variables explicitly loaded

KEY="/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-10-07.key"
HOST="opc@129.213.49.128"

echo "Starting E2E test on Oracle with environment loaded..."
echo ""

ssh -i "$KEY" "$HOST" 'bash -s' << 'ENDSSH'
cd ~/codequal/packages/agents

# Source the .env file to load environment variables
export $(grep -v '^#' .env | xargs)

# Verify variables are loaded
echo "✅ Environment variables loaded:"
echo "   SUPABASE_URL: ${SUPABASE_URL:0:30}..."
echo "   SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY:0:30}..."
echo ""
echo "🚀 Running test..."
echo ""

# Run the test with environment variables
npx ts-node test-v9-e2e-complete.ts 2>&1 | tee /tmp/v9-test-output.log

echo ""
echo "✅ Test completed!"
echo "📄 Full log saved to: /tmp/v9-test-output.log"
echo "📊 Check for report in: ~/codequal/packages/agents/src/two-branch/test-results/reports/"
ENDSSH

echo ""
echo "Done! Now checking for the generated report..."
ssh -i "$KEY" "$HOST" 'ls -lht ~/codequal/packages/agents/src/two-branch/test-results/reports/ | head -3'






