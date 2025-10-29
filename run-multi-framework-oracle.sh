#!/usr/bin/env bash
set -euo pipefail

# Oracle Cloud Multi-Framework Test Runner
ORACLE_SSH_KEY="/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-10-07.key"
ORACLE_HOST="opc@129.213.49.128"
TEST_SCRIPT="test-v9-multi-framework.ts"
AGENTS_DIR="packages/agents"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  V9 Multi-Framework Test - Oracle Cloud Runner                ║"
echo "╚════════════════════════════════════════════════════════════════╝"

echo -e "\n📤 Step 1: Uploading test script to Oracle Cloud..."
scp -i "$ORACLE_SSH_KEY" \
  "$AGENTS_DIR/$TEST_SCRIPT" \
  "$ORACLE_HOST:~/codequal/$AGENTS_DIR/"
echo "✅ Upload complete"

echo -e "\n🧹 Step 2: Cleaning up old test data..."
ssh -i "$ORACLE_SSH_KEY" "$ORACLE_HOST" \
  "rm -rf /tmp/*-repo /tmp/v9-reports"
echo "✅ Cleanup complete"

echo -e "\n🚀 Step 3: Running multi-framework test (~2 hours)..."
echo "   Progress will be logged on Oracle Cloud"
echo ""

ssh -i "$ORACLE_SSH_KEY" "$ORACLE_HOST" << 'EOF'
cd ~/codequal/packages/agents

# Load environment
export $(grep -v '^#' .env 2>/dev/null | xargs)

# Run test
npx ts-node test-v9-multi-framework.ts 2>&1 | tee /tmp/v9-multi-framework.log

echo ""
echo "✅ Test execution complete!"
EOF

TEST_EXIT=$?

if [ $TEST_EXIT -ne 0 ]; then
  echo -e "\n❌ Test failed on Oracle Cloud"
  exit 1
fi

echo -e "\n📥 Step 4: Downloading reports..."
mkdir -p reports

# Download JSON summary
SUMMARY=$(ssh -i "$ORACLE_SSH_KEY" "$ORACLE_HOST" \
  "ls -t ~/codequal/reports/v9-multi-framework-summary-*.json 2>/dev/null | head -1" || echo "")

if [ -n "$SUMMARY" ]; then
  scp -i "$ORACLE_SSH_KEY" \
    "$ORACLE_HOST:$SUMMARY" \
    reports/
  echo "✅ Downloaded: $(basename $SUMMARY)"
fi

# Download individual reports
ssh -i "$ORACLE_SSH_KEY" "$ORACLE_HOST" \
  "ls ~/codequal/reports/v9-*-pr*.md 2>/dev/null" | while read report; do
  scp -i "$ORACLE_SSH_KEY" \
    "$ORACLE_HOST:$report" \
    reports/
  echo "✅ Downloaded: $(basename $report)"
done

echo -e "\n╔════════════════════════════════════════════════════════════════╗"
echo "║  ✅ Multi-Framework Test Complete!                             ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo -e "\n📁 Reports saved to: reports/\n"

