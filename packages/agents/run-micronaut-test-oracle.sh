#!/bin/bash
# Run Micronaut E2E Test on Oracle Cloud
# Validates all 3 Session 6 enhancements on Micronaut framework

set -e

echo "🚀 Deploying Micronaut Test to Oracle Cloud..."

# Configuration
SSH_KEY="/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-10-07.key"
ORACLE_IP="129.213.49.128"
ORACLE_USER="opc"
REMOTE_DIR="~/codequal/packages/agents"

# Step 1: Upload test script
echo ""
echo "📤 Step 1: Uploading test script..."
rsync -avz -e "ssh -i \"$SSH_KEY\" -o StrictHostKeyChecking=no" \
  "./test-v9-micronaut-e2e.ts" \
  "$ORACLE_USER@$ORACLE_IP:$REMOTE_DIR/"

echo "   ✅ Test script uploaded"

# Step 2: Upload any updated source files (if needed)
echo ""
echo "📤 Step 2: Syncing source files..."
rsync -avz -e "ssh -i \"$SSH_KEY\" -o StrictHostKeyChecking=no" \
  "./src/two-branch/analyzers/v9-grouped-report-formatter.ts" \
  "./src/two-branch/agents/specialized-agents.ts" \
  "$ORACLE_USER@$ORACLE_IP:$REMOTE_DIR/src/two-branch/analyzers/" 2>/dev/null || echo "   ⚠️  Source files not updated (using existing)"

echo "   ✅ Source files synced"

# Step 3: Run test in background with logging
echo ""
echo "🏃 Step 3: Starting Micronaut test on Oracle..."
echo ""

ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$ORACLE_USER@$ORACLE_IP" << 'ENDSSH'
cd ~/codequal/packages/agents

# Export environment variables
export $(grep -v '^#' .env | xargs) 2>/dev/null || true

# Create output directory
mkdir -p /tmp/v9-reports

# Run test with output logging
echo "▶️  Starting test at $(date)..."
nohup npx ts-node test-v9-micronaut-e2e.ts > /tmp/micronaut-test-$(date +%s).log 2>&1 &
TEST_PID=$!

echo "✅ Test started with PID: $TEST_PID"
echo ""
echo "📊 Monitor progress with:"
echo "   ssh -i \"$SSH_KEY\" $ORACLE_USER@$ORACLE_IP 'tail -f /tmp/micronaut-test-*.log | tail -1'"
echo ""
echo "📝 Or view full log:"
echo "   ssh -i \"$SSH_KEY\" $ORACLE_USER@$ORACLE_IP 'cat /tmp/micronaut-test-*.log | tail -1'"
echo ""

# Wait a few seconds and show initial output
sleep 5
echo "📋 Initial output:"
tail -n 20 $(ls -t /tmp/micronaut-test-*.log | head -1) 2>/dev/null || echo "   ⚠️  Log not ready yet"
ENDSSH

echo ""
echo "✅ Micronaut test deployed and running!"
echo ""
echo "⏱️  Expected duration: ~15-20 minutes"
echo ""
echo "🔍 To check status:"
echo "   ssh -i \"$SSH_KEY\" opc@$ORACLE_IP 'ps aux | grep micronaut'"
echo ""
echo "📊 To monitor live:"
echo "   ssh -i \"$SSH_KEY\" opc@$ORACLE_IP 'tail -f \$(ls -t /tmp/micronaut-test-*.log | head -1)'"
echo ""
echo "📥 To fetch report when complete:"
echo "   scp -i \"$SSH_KEY\" opc@$ORACLE_IP:'/tmp/v9-reports/v9-grouped-report-*.md' ./"
echo ""



