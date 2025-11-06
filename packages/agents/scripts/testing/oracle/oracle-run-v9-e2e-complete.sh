#!/bin/bash
#
# Oracle Cloud V9 E2E Test Execution
#
# This script runs the complete V9 E2E test on Oracle Cloud where:
# - All 5 Java tools work (PMD, Semgrep, Checkstyle, Dependency-Check, SpotBugs)
# - PostgreSQL is configured for Dependency-Check
# - Redis is available for caching
# - Full infrastructure is ready
#

set -e

# Oracle Cloud connection details
ORACLE_IP="129.213.49.128"
ORACLE_USER="opc"
SSH_KEY="/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-10-07.key"
REMOTE_DIR="/home/opc/codequal"

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  V9 E2E Test - Oracle Cloud Execution                        ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "Oracle Cloud: $ORACLE_IP"
echo "Remote Directory: $REMOTE_DIR"
echo ""

# Step 1: Upload test files
echo "📤 Step 1: Uploading test files to Oracle Cloud..."
echo ""

# Create list of files to upload
FILES_TO_UPLOAD=(
  "test-v9-e2e-complete.ts"
  ".env"
  "package.json"
  "tsconfig.json"
)

# Upload files
for file in "${FILES_TO_UPLOAD[@]}"; do
  if [ -f "$file" ]; then
    echo "   Uploading $file..."
    scp -i "$SSH_KEY" "$file" "${ORACLE_USER}@${ORACLE_IP}:${REMOTE_DIR}/packages/agents/" || {
      echo "   ⚠️  Failed to upload $file (may not exist locally)"
    }
  fi
done

# Upload entire src directory (critical for test to run)
echo "   Uploading src/ directory..."
rsync -avz -e "ssh -i \"$SSH_KEY\"" \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'dist' \
  ./src/ \
  "${ORACLE_USER}@${ORACLE_IP}:${REMOTE_DIR}/packages/agents/src/" 2>&1 | grep -v "sending incremental" || true

echo ""
echo "✅ Upload complete"
echo ""

# Step 2: Run test on Oracle Cloud
echo "🚀 Step 2: Running V9 E2E test on Oracle Cloud..."
echo ""

ssh -i "$SSH_KEY" "${ORACLE_USER}@${ORACLE_IP}" << 'ENDSSH'
  set -e

  cd /home/opc/codequal/packages/agents

  echo "📋 Environment check:"
  echo "   Node version: $(node --version)"
  echo "   NPM version: $(npm --version)"
  echo "   TypeScript: $(npx tsc --version)"
  echo ""

  echo "🔧 Checking Oracle infrastructure..."

  # Check PostgreSQL
  if PGPASSWORD=postgres123 psql -h 129.213.49.128 -p 5432 -U nvd_user -d nvd -c "SELECT 1" > /dev/null 2>&1; then
    echo "   ✅ PostgreSQL connected (nvd database)"
  else
    echo "   ⚠️  PostgreSQL not accessible"
  fi

  # Check Redis
  if redis-cli -h 10.116.0.7 -p 6379 ping > /dev/null 2>&1; then
    echo "   ✅ Redis connected"
  else
    echo "   ⚠️  Redis not accessible"
  fi

  # Check Docker
  if docker ps > /dev/null 2>&1; then
    echo "   ✅ Docker running"
  else
    echo "   ⚠️  Docker not accessible"
  fi

  echo ""
  echo "🧪 Starting V9 E2E Test..."
  echo "   Expected runtime: 5-8 minutes"
  echo "   Timeout: 30 minutes"
  echo ""

  # Run test with extended timeout (30 minutes = 1800 seconds)
  timeout 1800 npx ts-node test-v9-e2e-complete.ts 2>&1 || {
    EXIT_CODE=$?
    if [ $EXIT_CODE -eq 124 ]; then
      echo ""
      echo "❌ Test timed out after 30 minutes"
      exit 1
    else
      echo ""
      echo "❌ Test failed with exit code: $EXIT_CODE"
      exit $EXIT_CODE
    fi
  }

  echo ""
  echo "✅ Test completed successfully!"
  echo ""

  # Check for generated report
  if ls /tmp/v9-reports/v9-complete-e2e-*.md 1> /dev/null 2>&1; then
    LATEST_REPORT=$(ls -t /tmp/v9-reports/v9-complete-e2e-*.md | head -1)
    REPORT_SIZE=$(du -h "$LATEST_REPORT" | cut -f1)
    SECTION_COUNT=$(grep -c '^##[^#]' "$LATEST_REPORT" 2>/dev/null || echo '?')

    echo "📄 V9 Report Generated:"
    echo "   File: $(basename "$LATEST_REPORT")"
    echo "   Size: $REPORT_SIZE"
    echo "   Sections: $SECTION_COUNT"
    echo ""
  else
    echo "⚠️  No V9 report found in /tmp/v9-reports/"
    echo ""
  fi
ENDSSH

TEST_EXIT=$?

echo ""
echo "════════════════════════════════════════════════════════════════"
if [ $TEST_EXIT -eq 0 ]; then
  echo "✅ Oracle Cloud V9 E2E Test - SUCCESS"
  echo ""
  echo "📥 Downloading report from Oracle Cloud..."

  # Download the latest report
  scp -i "$SSH_KEY" \
    "${ORACLE_USER}@${ORACLE_IP}:/tmp/v9-reports/v9-complete-e2e-*.md" \
    /tmp/v9-reports/ 2>/dev/null && echo "   ✅ Report downloaded to /tmp/v9-reports/" || echo "   ⚠️  Report download failed"
else
  echo "❌ Oracle Cloud V9 E2E Test - FAILED"
  echo "   Exit code: $TEST_EXIT"
fi
echo "════════════════════════════════════════════════════════════════"
echo ""

exit $TEST_EXIT
