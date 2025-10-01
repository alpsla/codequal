#!/bin/bash
#
# Log4Shell (CVE-2021-44228) Validation Test - v6.0 with PostgreSQL
#
# Purpose: Verify Dependency-Check 12.1.5 correctly detects Log4Shell with PostgreSQL backend
# Expected: MUST detect CVE-2021-44228 (CVSS 10.0) in log4j 2.14.1
# Duration: ~10-15 seconds (with PostgreSQL cache)
#
# Usage: ./validate-log4shell-v6-postgresql.sh

set -e

echo "========================================"
echo "Log4Shell Validation - v6.0 PostgreSQL"
echo "========================================"
echo ""

# Configuration
TEST_DIR="/tmp/log4shell-test-v6"
DOCKER_IMAGE="iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-java-v6.0-arm"
JDBC_DRIVER_DIR="/tmp/jdbc-drivers"

# PostgreSQL connection (read-only scanner user)
PG_HOST="host.docker.internal"
PG_PORT="5432"
PG_DB="depcheck"
PG_USER="depcheck_scanner"
PG_PASSWORD="depcheck_scan_2025"

echo "[1/6] Setup test environment..."
rm -rf "$TEST_DIR"
mkdir -p "$TEST_DIR"
echo "   Test directory: $TEST_DIR"
echo "   Docker image: $DOCKER_IMAGE"
echo "   PostgreSQL: $PG_HOST:$PG_PORT/$PG_DB"

# Step 2: Verify PostgreSQL connection
echo ""
echo "[2/6] Verifying PostgreSQL database..."
CVE_COUNT=$(PGPASSWORD="$PG_PASSWORD" psql -h 127.0.0.1 -U "$PG_USER" -d "$PG_DB" -t -c "SELECT COUNT(*) FROM vulnerability;")
CVE_COUNT=$(echo $CVE_COUNT | tr -d '[:space:]')
echo "   ✅ PostgreSQL connected"
echo "   Total CVEs in database: $CVE_COUNT"

# Check for Log4Shell specifically
LOG4SHELL_EXISTS=$(PGPASSWORD="$PG_PASSWORD" psql -h 127.0.0.1 -U "$PG_USER" -d "$PG_DB" -t -c "SELECT COUNT(*) FROM vulnerability WHERE cve = 'CVE-2021-44228';")
LOG4SHELL_EXISTS=$(echo $LOG4SHELL_EXISTS | tr -d '[:space:]')

if [ "$LOG4SHELL_EXISTS" -eq "1" ]; then
  echo "   ✅ Log4Shell (CVE-2021-44228) found in database"
else
  echo "   ❌ Log4Shell NOT in database!"
  exit 1
fi

# Step 3: Create test pom.xml with vulnerable Log4j
echo ""
echo "[3/6] Creating test pom.xml with vulnerable Log4j 2.14.1..."
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
  </dependencies>
</project>
EOF

echo "   ✅ Test project created"
echo "   Vulnerable dependency: log4j-core:2.14.1"

# Step 4: Verify JDBC driver
echo ""
echo "[4/6] Checking JDBC driver..."
if [ -f "$JDBC_DRIVER_DIR/postgresql-42.7.1.jar" ]; then
  echo "   ✅ PostgreSQL JDBC driver found"
else
  echo "   ❌ JDBC driver not found at $JDBC_DRIVER_DIR"
  exit 1
fi

# Step 5: Run Dependency-Check with PostgreSQL
echo ""
echo "[5/6] Running Dependency-Check 12.1.5 with PostgreSQL backend..."
echo "   Command: dependency-check --scan /workspace"
echo "   Database: PostgreSQL (read-only)"
echo "   Expected: Log4Shell detection (exit code 1)"
echo ""

START_TIME=$(date +%s)

# Run with PostgreSQL backend
docker run --rm \
  -v "$TEST_DIR:/workspace:ro" \
  -v "$JDBC_DRIVER_DIR:/jdbc:ro" \
  --network host \
  --add-host=host.docker.internal:127.0.0.1 \
  -e CLASSPATH="/opt/dependency-check/lib/*:/jdbc/*" \
  "$DOCKER_IMAGE" \
  -c "dependency-check \
    --scan /workspace \
    --format JSON \
    --out /workspace \
    --connectionString jdbc:postgresql://${PG_HOST}:${PG_PORT}/${PG_DB} \
    --dbUser ${PG_USER} \
    --dbPassword ${PG_PASSWORD} \
    --dbDriverName org.postgresql.Driver \
    --dbDriverPath /jdbc/postgresql-42.7.1.jar \
    --disableNodeAudit \
    --failOnCVSS 10.0" \
  > "$TEST_DIR/scan.log" 2>&1 || EXIT_CODE=$?

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "   Analysis completed in ${DURATION}s"

# Step 6: Validate results
echo ""
echo "[6/6] Validating results..."

# Check if report was generated
if [ -f "$TEST_DIR/dependency-check-report.json" ]; then
  echo "   ✅ Report generated"

  # Check for Log4Shell in report
  if grep -q "CVE-2021-44228" "$TEST_DIR/dependency-check-report.json"; then
    echo "   ✅ Log4Shell (CVE-2021-44228) detected in report"

    # Check severity
    if grep -q "CRITICAL" "$TEST_DIR/dependency-check-report.json"; then
      echo "   ✅ Severity: CRITICAL (expected)"
    fi

    # Check exit code
    if [ "${EXIT_CODE:-0}" -eq "1" ]; then
      echo "   ✅ Exit code: 1 (vulnerability found, expected)"
    else
      echo "   ⚠️  Exit code: ${EXIT_CODE:-0} (expected 1)"
    fi
  else
    echo "   ❌ Log4Shell NOT found in report"
    EXIT_CODE=1
  fi
else
  echo "   ❌ Report not generated"
  echo "   Check logs: cat $TEST_DIR/scan.log"
  EXIT_CODE=1
fi

# Final result
echo ""
echo "========================================"

# Check all conditions separately for better readability
VALIDATION_PASSED=0
if [ "${EXIT_CODE:-0}" -eq "1" ]; then
  if [ -f "$TEST_DIR/dependency-check-report.json" ]; then
    if grep -q "CVE-2021-44228" "$TEST_DIR/dependency-check-report.json"; then
      VALIDATION_PASSED=1
    fi
  fi
fi

if [ "$VALIDATION_PASSED" -eq "1" ]; then
  echo "✅ VALIDATION PASSED"
  echo "========================================"
  echo ""
  echo "Results:"
  echo "  - Log4Shell (CVE-2021-44228) detected: ✅"
  echo "  - PostgreSQL backend working: ✅"
  echo "  - Dependency-Check 12.1.5: ✅"
  echo "  - Analysis time: ${DURATION}s"
  echo "  - Exit code: 1 (expected)"
  echo ""
  echo "🎉 Dependency-Check v6.0 with PostgreSQL is production ready!"
  exit 0
else
  echo "❌ VALIDATION FAILED"
  echo "========================================"
  echo ""
  echo "Troubleshooting:"
  echo "  1. Check scan logs: cat $TEST_DIR/scan.log"
  echo "  2. Check report: cat $TEST_DIR/dependency-check-report.json"
  echo "  3. Verify PostgreSQL: psql -h 127.0.0.1 -U $PG_USER -d $PG_DB"
  echo "  4. Check Docker image: docker images | grep v6.0"
  exit 1
fi
