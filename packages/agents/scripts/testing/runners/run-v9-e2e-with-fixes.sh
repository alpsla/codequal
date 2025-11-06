#!/bin/bash
#
# Run V9 E2E Test with Dependency-Check and PostgreSQL fixes applied
#
# Fixes applied:
# 1. PostgreSQL setup: user=depcheck_scanner, db=depcheck
# 2. JDBC driver downloaded: /tmp/jdbc-drivers/postgresql-42.7.1.jar
# 3. Extended timeout: 20 minutes (was 10)
#
# Expected runtime: 5-8 minutes
#

set -e

cd "/Users/alpinro/Code Prjects/codequal/packages/agents"

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  V9 E2E Test with Dependency-Check PostgreSQL Fixed          ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "Fixes applied:"
echo "  ✅ PostgreSQL database 'depcheck' created"
echo "  ✅ PostgreSQL user 'depcheck_scanner' created"
echo "  ✅ JDBC driver downloaded (postgresql-42.7.1.jar)"
echo "  ✅ Extended timeout to 20 minutes"
echo ""
echo "Starting test (this will take 5-8 minutes)..."
echo ""

# Run with extended timeout (20 minutes = 1200 seconds)
npx ts-node --max-old-space-size=8192 test-v9-e2e-complete.ts &

TEST_PID=$!

# Monitor progress
echo "Test PID: $TEST_PID"
echo "Monitoring progress..."
echo ""

# Wait for completion with timeout
TIMEOUT=1200
ELAPSED=0
while kill -0 $TEST_PID 2>/dev/null; do
  sleep 10
  ELAPSED=$((ELAPSED + 10))

  if [ $ELAPSED -ge $TIMEOUT ]; then
    echo "❌ Test exceeded 20 minute timeout - killing process"
    kill $TEST_PID 2>/dev/null || true
    exit 1
  fi

  echo "⏱️  Elapsed: ${ELAPSED}s / ${TIMEOUT}s"
done

# Check exit code
wait $TEST_PID
EXIT_CODE=$?

echo ""
echo "════════════════════════════════════════════════════════════════"
if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ Test completed successfully!"
  echo ""
  echo "Checking for generated report..."
  LATEST_REPORT=$(ls -t /tmp/v9-reports/v9-complete-e2e-*.md 2>/dev/null | head -1)
  if [ -n "$LATEST_REPORT" ]; then
    echo "📄 Report generated: $LATEST_REPORT"
    echo "   Size: $(du -h "$LATEST_REPORT" | cut -f1)"
    echo "   Sections: $(grep -c '^##[^#]' "$LATEST_REPORT" 2>/dev/null || echo '?')"
  else
    echo "⚠️  No V9 report found (check OUTPUT_DIR)"
  fi
else
  echo "❌ Test failed with exit code: $EXIT_CODE"
fi
echo "════════════════════════════════════════════════════════════════"

exit $EXIT_CODE
