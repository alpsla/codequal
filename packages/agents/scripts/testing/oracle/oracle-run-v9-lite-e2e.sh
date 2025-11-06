#!/bin/bash
#
# Oracle Cloud V9 Lite E2E Test Execution
#
# This script runs the lite V9 E2E test on Oracle Cloud where:
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
echo "║  V9 Lite E2E Test - Oracle Cloud Execution                   ║"
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
  "test-v9-lite-e2e.ts"
  ".env"
  "package.json"
  "tsconfig.json"
)

# Upload files
for file in "${FILES_TO_UPLOAD[@]}"; do
  if [ -f "$file" ]; then
    echo "   Uploading $file..."
    scp -i "$SSH_KEY" -o StrictHostKeyChecking=no "$file" "${ORACLE_USER}@${ORACLE_IP}:${REMOTE_DIR}/packages/agents/" || {
      echo "   ⚠️  Failed to upload $file (may not exist locally)"
    }
  fi
done

# Upload entire src directory (critical for test to run)
echo "   Uploading src/ directory..."
rsync -avz -e "ssh -i \"$SSH_KEY\" -o StrictHostKeyChecking=no" \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'dist' \
  ./src/ \
  "${ORACLE_USER}@${ORACLE_IP}:${REMOTE_DIR}/packages/agents/src/" 2>&1 | grep -v "sending incremental" || true

echo ""
echo "✅ Upload complete"
echo ""

# Step 2: Run test on Oracle Cloud
echo "🚀 Step 2: Running V9 Lite E2E test on Oracle Cloud..."
echo ""

ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "${ORACLE_USER}@${ORACLE_IP}" << 'ENDSSH'
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
  echo "🧪 Starting V9 Lite E2E Test..."
  echo "   Expected runtime: 10-15 minutes (3 test scenarios)"
  echo "   Timeout: 45 minutes"
  echo ""

  # Run test with extended timeout (45 minutes = 2700 seconds)
  timeout 2700 npx ts-node test-v9-lite-e2e.ts 2>&1 || {
    EXIT_CODE=$?
    if [ $EXIT_CODE -eq 124 ]; then
      echo ""
      echo "❌ Test timed out after 45 minutes"
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

  # Check for generated reports
  if ls test-outputs/v9-lite-*.md 1> /dev/null 2>&1; then
    REPORT_COUNT=$(ls test-outputs/v9-lite-*.md | wc -l)
    LATEST_REPORT=$(ls -t test-outputs/v9-lite-*.md | head -1)
    REPORT_SIZE=$(du -h "$LATEST_REPORT" | cut -f1)

    echo "📄 V9 Lite Reports Generated:"
    echo "   Count: $REPORT_COUNT"
    echo "   Latest: $(basename "$LATEST_REPORT")"
    echo "   Size: $REPORT_SIZE"
    echo ""
    
    # Show summary of all reports
    echo "📊 Report Summary:"
    for report in test-outputs/v9-lite-*.md; do
      if [ -f "$report" ]; then
        SIZE=$(du -h "$report" | cut -f1)
        SECTION_COUNT=$(grep -c '^##[^#]' "$report" 2>/dev/null || echo '?')
        echo "   - $(basename "$report"): $SIZE, $SECTION_COUNT sections"
      fi
    done
    echo ""
  else
    echo "⚠️  No V9 Lite reports found in test-outputs/"
    echo ""
  fi
ENDSSH

TEST_EXIT=$?

echo ""
echo "════════════════════════════════════════════════════════════════"
if [ $TEST_EXIT -eq 0 ]; then
  echo "✅ Oracle Cloud V9 Lite E2E Test - SUCCESS"
  echo ""
  echo "📥 Downloading reports from Oracle Cloud..."

  # Create local output directory
  mkdir -p /tmp/v9-lite-reports

  # Download all reports
  scp -i "$SSH_KEY" -o StrictHostKeyChecking=no \
    "${ORACLE_USER}@${ORACLE_IP}:${REMOTE_DIR}/packages/agents/test-outputs/v9-lite-*.md" \
    /tmp/v9-lite-reports/ 2>/dev/null && echo "   ✅ Reports downloaded to /tmp/v9-lite-reports/" || echo "   ⚠️  Report download failed"
  
  # Download IDE fix files if they exist
  scp -i "$SSH_KEY" -o StrictHostKeyChecking=no \
    "${ORACLE_USER}@${ORACLE_IP}:${REMOTE_DIR}/packages/agents/test-outputs/v9-lite-fix-*.json" \
    /tmp/v9-lite-reports/ 2>/dev/null && echo "   ✅ IDE fix files downloaded" || true
else
  echo "❌ Oracle Cloud V9 Lite E2E Test - FAILED"
  echo "   Exit code: $TEST_EXIT"
fi
echo "════════════════════════════════════════════════════════════════"
echo ""

exit $TEST_EXIT



