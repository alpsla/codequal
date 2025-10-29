#!/bin/bash
# Kill hanging test and restart with timeout protection

KEY="/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-10-07.key"
HOST="opc@129.213.49.128"

echo "🔧 Step 1: Killing hanging test process..."
ssh -i "$KEY" "$HOST" 'pkill -f "test-v9-e2e-complete" && echo "✅ Process killed" || echo "⚠️  No process found"'

echo ""
echo "📤 Step 2: Uploading fixed test with timeout protection..."
scp -i "$KEY" test-v9-e2e-complete.ts "$HOST:~/codequal/packages/agents/"

echo ""
echo "✅ Fixed test uploaded!"
echo ""
echo "🚀 Step 3: Running test with timeout protection..."
echo ""

ssh -i "$KEY" "$HOST" 'bash -s' << 'ENDSSH'
cd ~/codequal/packages/agents

# Load environment variables
export $(grep -v '^#' .env | xargs)

# Run test with timeout
npx ts-node test-v9-e2e-complete.ts 2>&1 | tee /tmp/v9-test-output-fixed.log
ENDSSH

echo ""
echo "✅ Test completed!"
echo ""
echo "📊 Checking for generated report..."
ssh -i "$KEY" "$HOST" 'ls -lht ~/codequal/packages/agents/src/two-branch/test-results/reports/ | head -3'






