#!/bin/bash
# Upload fixed test and run

KEY="/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-10-07.key"
HOST="opc@129.213.49.128"

echo "🔧 TypeScript Errors Fixed!"
echo "=========================="
echo ""
echo "📤 Step 1: Killing any hanging process..."
ssh -i "$KEY" "$HOST" 'pkill -f test-v9-e2e-complete' 2>/dev/null && echo "✅ Process killed" || echo "✅ No process running"

echo ""
echo "📤 Step 2: Uploading fixed test file..."
scp -i "$KEY" test-v9-e2e-complete.ts "$HOST:~/codequal/packages/agents/"
echo "✅ Upload complete!"

echo ""
echo "🚀 Step 3: Running E2E test..."
echo ""

ssh -i "$KEY" "$HOST" 'bash -s' << 'ENDSSH'
cd ~/codequal/packages/agents
export $(grep -v '^#' .env | xargs 2>/dev/null)
npx ts-node test-v9-e2e-complete.ts 2>&1 | tee /tmp/v9-test-final.log
ENDSSH

echo ""
echo "================================"
echo "✅ Test completed!"
echo ""
echo "📊 Checking for generated report..."
ssh -i "$KEY" "$HOST" 'ls -lht ~/codequal/packages/agents/src/two-branch/test-results/reports/ | head -3'






