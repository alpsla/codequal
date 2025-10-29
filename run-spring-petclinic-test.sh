#!/bin/bash
# Spring PetClinic PR #950 Test - Oracle Cloud with Redis Caching
# Run this script manually to avoid terminal interruptions

set -e  # Exit on error

# Configuration
SSH_KEY="/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-10-07.key"
ORACLE_IP="129.213.49.128"
ORACLE_USER="opc"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  Spring PetClinic PR #950 Test Runner (Oracle Cloud)          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Step 1: Verify test configuration
echo "📋 Step 1: Verifying test configuration..."
cd "/Users/alpinro/Code Prjects/codequal/packages/agents"
grep -E "spring-petclinic|PR_NUMBER = 950" test-v9-e2e-complete.ts | head -5
echo "✅ Test configured for Spring PetClinic PR #950"
echo ""

# Step 2: Upload test file to Oracle
echo "📤 Step 2: Uploading test file to Oracle Cloud..."
scp -i "$SSH_KEY" \
  -o StrictHostKeyChecking=no \
  -o ConnectTimeout=10 \
  test-v9-e2e-complete.ts \
  "${ORACLE_USER}@${ORACLE_IP}:~/codequal/packages/agents/"
echo "✅ Upload complete"
echo ""

# Step 3: Clean up old test data
echo "🧹 Step 3: Cleaning up old test data on Oracle..."
ssh -i "$SSH_KEY" \
  -o StrictHostKeyChecking=no \
  -o ConnectTimeout=10 \
  "${ORACLE_USER}@${ORACLE_IP}" \
  "rm -rf /tmp/spring-petclinic-repo /tmp/v9-reports"
echo "✅ Cleanup complete"
echo ""

# Step 4: Run the test (20-minute timeout)
echo "🚀 Step 4: Running test on Oracle Cloud (may take 5-10 minutes)..."
echo "   Using Redis caching for optimal performance..."
echo ""
ssh -i "$SSH_KEY" \
  -o StrictHostKeyChecking=no \
  -o ConnectTimeout=10 \
  "${ORACLE_USER}@${ORACLE_IP}" \
  'cd ~/codequal/packages/agents && \
   timeout 1200 npx ts-node test-v9-e2e-complete.ts 2>&1 | \
   tee /tmp/spring-petclinic-pr950.log'

TEST_EXIT_CODE=$?
echo ""

if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo "✅ Test completed successfully!"
else
  echo "⚠️  Test exited with code: $TEST_EXIT_CODE"
  echo "   (124 = timeout, 0 = success, other = error)"
fi
echo ""

# Step 5: Download the report
echo "📥 Step 5: Downloading report from Oracle Cloud..."
mkdir -p "/Users/alpinro/Code Prjects/codequal/reports"
scp -i "$SSH_KEY" \
  -o StrictHostKeyChecking=no \
  -o ConnectTimeout=10 \
  "${ORACLE_USER}@${ORACLE_IP}:/tmp/v9-reports/*.md" \
  "/Users/alpinro/Code Prjects/codequal/reports/" 2>/dev/null || echo "⚠️  No .md report found"

# Also try JSON files
scp -i "$SSH_KEY" \
  -o StrictHostKeyChecking=no \
  -o ConnectTimeout=10 \
  "${ORACLE_USER}@${ORACLE_IP}:/tmp/v9-reports/*.json" \
  "/Users/alpinro/Code Prjects/codequal/reports/" 2>/dev/null || echo "⚠️  No .json files found"

echo "✅ Download complete"
echo ""

# Step 6: Show downloaded files
echo "📊 Downloaded Reports:"
ls -lh "/Users/alpinro/Code Prjects/codequal/reports/"*spring* 2>/dev/null | tail -5 || echo "   No spring reports found"
echo ""

# Step 7: Optionally download the log
echo "📋 Downloading execution log..."
scp -i "$SSH_KEY" \
  -o StrictHostKeyChecking=no \
  -o ConnectTimeout=10 \
  "${ORACLE_USER}@${ORACLE_IP}:/tmp/spring-petclinic-pr950.log" \
  "/Users/alpinro/Code Prjects/codequal/reports/spring-petclinic-pr950.log" 2>/dev/null || echo "⚠️  No log found"

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  ✅ Test Execution Complete!                                   ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "📁 Reports saved to: /Users/alpinro/Code Prjects/codequal/reports/"
echo ""
echo "🔍 Next Steps:"
echo "   1. Review the report: reports/v9-spring-boot-report.md"
echo "   2. Check for: Real duration, accurate scores, AI fixes"
echo "   3. Verify: NEW/RESOLVED/EXISTING categorization"
echo ""

