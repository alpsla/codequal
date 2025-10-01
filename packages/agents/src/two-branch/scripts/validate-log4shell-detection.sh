#!/bin/bash
#
# Log4Shell (CVE-2021-44228) Validation Test
#
# Purpose: Verify Dependency-Check correctly detects Log4Shell vulnerability
# Expected: MUST detect CVE-2021-44228 (CVSS 10.0) in log4j 2.14.1
# Duration: ~30 seconds (with pre-warmed database)
#
# Usage: ./validate-log4shell-detection.sh

set -e

echo "========================================"
echo "Log4Shell Detection Validation Test"
echo "========================================"
echo ""

# Configuration
TEST_DIR="/tmp/log4shell-test"
DOCKER_IMAGE="${DOCKER_IMAGE:-owasp/dependency-check:11.1.0}"
DATA_DIR="${DEPCHECK_DATA_DIR:-/tmp/dependency-check-data}"

echo "[1/5] Setup test environment..."
rm -rf "$TEST_DIR"
mkdir -p "$TEST_DIR"
echo "   Test directory: $TEST_DIR"
echo "   Docker image: $DOCKER_IMAGE"
echo "   Data directory: $DATA_DIR"

# Step 2: Create test pom.xml with vulnerable Log4j
echo ""
echo "[2/5] Creating test pom.xml with vulnerable Log4j 2.14.1..."
cat > "$TEST_DIR/pom.xml" <<'EOF'
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
                             http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>

  <groupId>com.codequal.test</groupId>
  <artifactId>log4shell-test</artifactId>
  <version>1.0.0</version>

  <dependencies>
    <!-- Vulnerable Log4j version (CVE-2021-44228) -->
    <dependency>
      <groupId>org.apache.logging.log4j</groupId>
      <artifactId>log4j-core</artifactId>
      <version>2.14.1</version>
    </dependency>

    <dependency>
      <groupId>org.apache.logging.log4j</groupId>
      <artifactId>log4j-api</artifactId>
      <version>2.14.1</version>
    </dependency>
  </dependencies>
</project>
EOF

echo "   ✅ Test project created"
echo "   Vulnerable dependency: log4j-core:2.14.1"

# Step 3: Check if data directory exists (pre-warmed)
echo ""
echo "[3/5] Checking CVE database status..."
if [ -d "$DATA_DIR" ] && [ "$(ls -A $DATA_DIR 2>/dev/null)" ]; then
  DB_SIZE=$(du -sh "$DATA_DIR" 2>/dev/null | cut -f1)
  echo "   ✅ Database found: $DB_SIZE"
  echo "   Expected scan time: ~30 seconds"
else
  echo "   ⚠️  No pre-warmed database found"
  echo "   Creating data directory: $DATA_DIR"
  mkdir -p "$DATA_DIR"
  echo "   Expected scan time: ~5-10 minutes (first run)"
fi

# Step 4: Run Dependency-Check
echo ""
echo "[4/5] Running Dependency-Check analysis..."
echo "   Command: dependency-check --scan /workspace --failOnCVSS 10.0"
echo "   Expected result: EXIT CODE 1 (vulnerability found)"
echo ""

START_TIME=$(date +%s)

# Run with --failOnCVSS 10.0 so it exits with code 1 if Log4Shell (CVSS 10.0) is found
docker run --rm \
  -v "$TEST_DIR:/workspace:ro" \
  -v "$DATA_DIR:/usr/share/dependency-check/data:rw" \
  "$DOCKER_IMAGE" \
  --scan /workspace \
  --format JSON \
  --out /workspace/depcheck-report.json \
  --data /usr/share/dependency-check/data \
  --failOnCVSS 10.0 \
  --nvdApiKey "${NVD_API_KEY:-}" \
  --nodeAuditSkipDevDependencies \
  --enableRetired \
  || EXIT_CODE=$?

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "   Analysis completed in ${DURATION}s"

# Step 5: Validate results
echo ""
echo "[5/5] Validating results..."

if [ -f "$TEST_DIR/depcheck-report.json" ]; then
  echo "   ✅ Report generated"

  # Check for Log4Shell CVE
  if grep -q "CVE-2021-44228" "$TEST_DIR/depcheck-report.json"; then
    echo "   ✅ CVE-2021-44228 (Log4Shell) DETECTED"

    # Extract details
    CVSS_SCORE=$(grep -A 5 "CVE-2021-44228" "$TEST_DIR/depcheck-report.json" | grep -o '"cvssv3":[^,}]*' | head -1 | cut -d':' -f2 | tr -d ' "')
    SEVERITY=$(grep -A 5 "CVE-2021-44228" "$TEST_DIR/depcheck-report.json" | grep -o '"severity":"[^"]*"' | head -1 | cut -d'"' -f4)

    echo "   CVSS Score: ${CVSS_SCORE:-10.0}"
    echo "   Severity: ${SEVERITY:-CRITICAL}"
  else
    echo "   ❌ CVE-2021-44228 NOT FOUND in report"
    echo "   This is a CRITICAL FAILURE - Log4Shell should always be detected"
    EXIT_CODE=1
  fi

  # Count total vulnerabilities
  VULN_COUNT=$(grep -c "CVE-" "$TEST_DIR/depcheck-report.json" || echo "0")
  echo "   Total CVEs found: $VULN_COUNT"

else
  echo "   ❌ Report not generated"
  EXIT_CODE=1
fi

# Summary
echo ""
echo "========================================"
if [ "${EXIT_CODE:-0}" -eq "1" ] && grep -q "CVE-2021-44228" "$TEST_DIR/depcheck-report.json" 2>/dev/null; then
  echo "✅ VALIDATION PASSED"
  echo "========================================"
  echo ""
  echo "Summary:"
  echo "- Log4Shell (CVE-2021-44228) detected: ✅"
  echo "- Exit code: 1 (expected, vulnerability found)"
  echo "- Duration: ${DURATION}s"
  echo "- Database status: $([ -d "$DATA_DIR" ] && echo "Pre-warmed" || echo "Downloaded during test")"
  echo ""
  echo "Dependency-Check is working correctly!"
  echo "Ready for production deployment."
  exit 0
else
  echo "❌ VALIDATION FAILED"
  echo "========================================"
  echo ""
  echo "Possible causes:"
  echo "1. CVE database not downloaded/corrupted"
  echo "2. Dependency-Check configuration error"
  echo "3. Database too corrupted (>500 errors)"
  echo ""
  echo "Troubleshooting:"
  echo "1. Check report: cat $TEST_DIR/depcheck-report.json"
  echo "2. Re-run with fresh database: rm -rf $DATA_DIR"
  echo "3. Check Docker image: docker pull $DOCKER_IMAGE"
  exit 1
fi
