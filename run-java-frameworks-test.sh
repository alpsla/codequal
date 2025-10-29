#!/usr/bin/env bash
set -euo pipefail

# Configuration
TEST_FILE="test-v9-java-frameworks.ts"
ORACLE_SSH_KEY="/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-10-07.key"
ORACLE_USER_HOST="opc@129.213.49.128"
REMOTE_AGENTS_DIR="~/codequal/packages/agents"
LOCAL_REPORTS_DIR="/Users/alpinro/Code Prjects/codequal/reports/"
TIMEOUT_SECONDS=7200 # 2 hours total (5 frameworks × ~24 minutes each)

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  V9 Multi-Framework Java Test Runner (Oracle Cloud)           ║"
echo "║  Testing: Spring Boot, Quarkus, Micronaut, Kafka, WebGoat     ║"
echo "╚════════════════════════════════════════════════════════════════╝"

# Step 1: Verify test configuration locally
echo -e "\n📋 Step 1: Verifying test configuration..."
if [ ! -f "${LOCAL_REPORTS_DIR}/../packages/agents/${TEST_FILE}" ]; then
  echo "❌ Test file not found: ${TEST_FILE}"
  exit 1
fi
echo "✅ Test file found: ${TEST_FILE}"

# Step 2: Upload test file to Oracle Cloud
echo -e "\n📤 Step 2: Uploading test file to Oracle Cloud..."
scp -i "${ORACLE_SSH_KEY}" \
  "${LOCAL_REPORTS_DIR}/../packages/agents/${TEST_FILE}" \
  "${ORACLE_USER_HOST}:${REMOTE_AGENTS_DIR}/"
echo "✅ Upload complete"

# Step 3: Clean up old test data on Oracle
echo -e "\n🧹 Step 3: Cleaning up old test data on Oracle..."
ssh -i "${ORACLE_SSH_KEY}" "${ORACLE_USER_HOST}" \
  "cd ${REMOTE_AGENTS_DIR} && rm -rf /tmp/v9-test-* /tmp/v9-*.log /tmp/v9-reports"
echo "✅ Cleanup complete"

# Step 4: Run multi-framework test on Oracle Cloud
echo -e "\n🚀 Step 4: Running multi-framework test on Oracle Cloud..."
echo "   This will test 5 Java frameworks (estimated time: ~2 hours)"
echo "   Progress will be logged to: /tmp/v9-multi-framework-test.log"
echo ""

# Run test in background with timeout
ssh -i "${ORACLE_SSH_KEY}" "${ORACLE_USER_HOST}" << 'EOF'
cd ~/codequal/packages/agents

# Load environment variables
export $(grep -v '^#' .env | xargs)

# Ensure strict mode for production testing
export STRICT_NO_FALLBACK=true
export E2E_DISABLE_EMERGENCY_FALLBACK=true

# Run test with timeout
timeout 7200 npx ts-node test-v9-java-frameworks.ts 2>&1 | tee /tmp/v9-multi-framework-test.log

# Check exit status
if [ ${PIPESTATUS[0]} -eq 0 ]; then
  echo -e "\n✅ Multi-framework test completed successfully!"
else
  echo -e "\n❌ Multi-framework test failed or timed out!"
  exit 1
fi
EOF

TEST_EXIT_CODE=$?

if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo -e "\n✅ Test execution completed successfully"
else
  echo -e "\n❌ Test execution failed (exit code: $TEST_EXIT_CODE)"
  echo "   Downloading logs for debugging..."
  scp -i "${ORACLE_SSH_KEY}" \
    "${ORACLE_USER_HOST}:/tmp/v9-multi-framework-test.log" \
    "${LOCAL_REPORTS_DIR}/v9-multi-framework-test-FAILED.log" 2>/dev/null || true
  exit $TEST_EXIT_CODE
fi

# Step 5: Download all reports
echo -e "\n📥 Step 5: Downloading reports from Oracle Cloud..."

# Download JSON summary
echo "   Downloading JSON summary..."
SUMMARY_FILE=$(ssh -i "${ORACLE_SSH_KEY}" "${ORACLE_USER_HOST}" \
  "ls -1t ${REMOTE_AGENTS_DIR}/reports/v9-multi-framework-summary-*.json | head -1" 2>/dev/null || echo "")

if [ -n "$SUMMARY_FILE" ]; then
  scp -i "${ORACLE_SSH_KEY}" \
    "${ORACLE_USER_HOST}:${SUMMARY_FILE}" \
    "${LOCAL_REPORTS_DIR}/"
  echo "   ✅ JSON summary downloaded"
else
  echo "   ⚠️  No JSON summary found"
fi

# Download individual framework reports
echo "   Downloading individual framework reports..."
ssh -i "${ORACLE_SSH_KEY}" "${ORACLE_USER_HOST}" \
  "ls -1 ${REMOTE_AGENTS_DIR}/reports/v9-*-pr*.md 2>/dev/null" | while read -r report; do
  BASENAME=$(basename "$report")
  scp -i "${ORACLE_SSH_KEY}" \
    "${ORACLE_USER_HOST}:${report}" \
    "${LOCAL_REPORTS_DIR}/${BASENAME}"
  echo "   ✅ Downloaded: ${BASENAME}"
done

# Download execution log
echo "   Downloading execution log..."
scp -i "${ORACLE_SSH_KEY}" \
  "${ORACLE_USER_HOST}:/tmp/v9-multi-framework-test.log" \
  "${LOCAL_REPORTS_DIR}/v9-multi-framework-test.log"
echo "   ✅ Log downloaded"

echo -e "\n✅ Download complete"

# Step 6: Display summary
echo -e "\n╔════════════════════════════════════════════════════════════════╗"
echo "║  ✅ Multi-Framework Test Complete!                             ║"
echo "╚════════════════════════════════════════════════════════════════╝"

echo -e "\n📊 Downloaded Reports:"
ls -lh "${LOCAL_REPORTS_DIR}"v9-*-pr*.md "${LOCAL_REPORTS_DIR}"v9-multi-framework-summary-*.json 2>/dev/null || echo "   (No reports found)"

echo -e "\n📋 Execution Log:"
echo "   ${LOCAL_REPORTS_DIR}v9-multi-framework-test.log"

echo -e "\n🔍 Quick Summary (from log):"
tail -n 50 "${LOCAL_REPORTS_DIR}/v9-multi-framework-test.log" | grep -E "✅ Passed|❌ Failed|Duration|Framework" || echo "   (Summary not available)"

echo -e "\n📁 All reports saved to: ${LOCAL_REPORTS_DIR}\n"

echo "🎯 Next Steps:"
echo "   1. Review JSON summary: ${LOCAL_REPORTS_DIR}v9-multi-framework-summary-*.json"
echo "   2. Check individual reports for each framework"
echo "   3. Validate issue categorization (NEW/RESOLVED/EXISTING)"
echo "   4. Compare report quality across frameworks"
echo "   5. Update QUICK_START_NEXT_SESSION.md with findings"
echo ""

