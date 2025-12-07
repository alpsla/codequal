#!/bin/bash
#
# Run React (create-react-app) Local Branch Test on Oracle Cloud
#

set -e

# Oracle Cloud connection details
ORACLE_IP="129.213.49.128"
ORACLE_USER="opc"
SSH_KEY="/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-10-07.key"
REMOTE_DIR="/home/opc/codequal/packages/agents"

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  React Local Branch Test - Oracle Cloud Execution           ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "Oracle Cloud: $ORACLE_IP"
echo "Test: React (create-react-app) - Local Branch Autofix Test"
echo ""

# Step 1: Upload test file
echo "📤 Step 1: Uploading test file..."
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no \
  "tests/integration/test-v9-lite-e2e.ts" \
  "${ORACLE_USER}@${ORACLE_IP}:${REMOTE_DIR}/tests/integration/" || {
  echo "   ⚠️  Failed to upload test file"
  exit 1
}
echo "   ✅ Test file uploaded"

# Step 2: Upload updated source files
echo ""
echo "📤 Step 2: Uploading updated source files..."
rsync -avz -e "ssh -i \"$SSH_KEY\" -o StrictHostKeyChecking=no" \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'dist' \
  ./src/two-branch/analyzers/v9-grouped-report-formatter.ts \
  "${ORACLE_USER}@${ORACLE_IP}:${REMOTE_DIR}/src/two-branch/analyzers/" 2>&1 | grep -v "sending incremental" || true

rsync -avz -e "ssh -i \"$SSH_KEY\" -o StrictHostKeyChecking=no" \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'dist' \
  ./src/two-branch/parsers/typescript-tool-parser.ts \
  "${ORACLE_USER}@${ORACLE_IP}:${REMOTE_DIR}/src/two-branch/parsers/" 2>&1 | grep -v "sending incremental" || true

rsync -avz -e "ssh -i \"$SSH_KEY\" -o StrictHostKeyChecking=no" \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'dist' \
  ./src/two-branch/utils/test-file-filter.ts \
  "${ORACLE_USER}@${ORACLE_IP}:${REMOTE_DIR}/src/two-branch/utils/" 2>&1 | grep -v "sending incremental" || true

echo "   ✅ Source files uploaded"

# Step 3: Run test on Oracle Cloud
echo ""
echo "🚀 Step 3: Running test on Oracle Cloud..."
echo ""

ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$ORACLE_USER@$ORACLE_IP" << 'ENDSSH'
cd ~/codequal/packages/agents

# Export environment variables
export $(grep -v '^#' .env | xargs) 2>/dev/null || true

# Set shared tools path for cloud (use /tmp which is writable)
export SHARED_TOOLS_PATH="/tmp/codequal-shared-tools"

echo "✅ Environment loaded"
echo "✅ Shared tools path: $SHARED_TOOLS_PATH"
echo ""
echo "▶️  Starting React local branch test..."
echo ""

# Run test
npx ts-node tests/integration/test-v9-lite-e2e.ts 2>&1 | tee /tmp/react-test-$(date +%s).log

echo ""
echo "✅ Test completed!"
echo "📄 Log saved to: /tmp/react-test-*.log"
echo "📊 Check for report in: tests/integration/test-outputs/"
ENDSSH

echo ""
echo "✅ Test execution complete!"
echo ""
echo "📥 To download the report:"
echo "   scp -i \"$SSH_KEY\" ${ORACLE_USER}@${ORACLE_IP}:${REMOTE_DIR}/tests/integration/test-outputs/v9-lite-react-*.md ./"
echo ""
echo "📊 To view the log:"
echo "   ssh -i \"$SSH_KEY\" ${ORACLE_USER}@${ORACLE_IP} 'tail -100 /tmp/react-test-*.log'"
