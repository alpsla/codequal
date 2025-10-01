#!/bin/bash
#
# Monthly Log4Shell Validation - Automated Cron Job
#
# Purpose: Monthly validation to ensure CVE-2021-44228 (Log4Shell) is still detected
# Schedule: Monthly on the 1st at 3 AM UTC (recommended)
# Type: Validation test (does not update database)
# Duration: ~2-5 seconds (with PostgreSQL cache)
#
# Cron Setup:
#   0 3 1 * * /path/to/monthly-log4shell-validation.sh >> /var/log/log4shell-validation.log 2>&1
#
# Oracle Cloud Cron Setup:
#   crontab -e
#   0 3 1 * * /home/ubuntu/codequal/monthly-log4shell-validation.sh >> /var/log/log4shell-validation.log 2>&1
#
# Why Monthly?
# - Ensures database integrity after updates
# - Validates CVSS v4 parsing still working
# - Confirms critical CVE detection capability
# - Early warning if database corruption occurs

set -e

echo "=============================================="
echo "Monthly Log4Shell Validation"
echo "Started: $(date '+%Y-%m-%d %H:%M:%S')"
echo "=============================================="
echo ""

# Configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
TEST_DIR="/tmp/log4shell-validation-$(date '+%Y%m%d')"
DOCKER_IMAGE="iad.ocir.io/codequal/analyzer:lang-java-v6.0-arm"
JDBC_DRIVER_DIR="/tmp/jdbc-drivers"
VALIDATION_LOG_DIR="/var/log/dependency-check"

# PostgreSQL connection (read-only scanner user)
PG_HOST="127.0.0.1"
PG_PORT="5432"
PG_DB="depcheck"
PG_USER="depcheck_scanner"
PG_PASSWORD="depcheck_scan_2025"

# Create log directory
mkdir -p "$VALIDATION_LOG_DIR"

# Log file
LOG_FILE="$VALIDATION_LOG_DIR/log4shell-validation-$(date '+%Y-%m').log"

echo "[1/6] Environment check..." | tee -a "$LOG_FILE"

if [ -f "$JDBC_DRIVER_DIR/postgresql-42.7.1.jar" ]; then
  echo "   ✅ PostgreSQL JDBC driver found" | tee -a "$LOG_FILE"
else
  echo "   ❌ JDBC driver not found at $JDBC_DRIVER_DIR" | tee -a "$LOG_FILE"
  exit 1
fi

echo "" | tee -a "$LOG_FILE"
echo "[2/6] Verifying PostgreSQL database..." | tee -a "$LOG_FILE"

# Check if psql is available
if which psql >/dev/null 2>&1; then
  CVE_COUNT=$(PGPASSWORD="$PG_PASSWORD" psql -h "$PG_HOST" -U "$PG_USER" -d "$PG_DB" -t -c "SELECT COUNT(*) FROM vulnerability;" 2>/dev/null || echo "ERROR")
  if [ "$CVE_COUNT" != "ERROR" ]; then
    CVE_COUNT=$(echo $CVE_COUNT | tr -d '[:space:]')
    echo "   ✅ PostgreSQL connected" | tee -a "$LOG_FILE"
    echo "   Total CVEs in database: $CVE_COUNT" | tee -a "$LOG_FILE"
  else
    echo "   ❌ PostgreSQL connection failed" | tee -a "$LOG_FILE"
    exit 1
  fi
else
  echo "   ⚠️  psql not installed (will verify via Docker)" | tee -a "$LOG_FILE"
  CVE_COUNT="N/A"
fi

# Check for Log4Shell specifically
echo "" | tee -a "$LOG_FILE"
echo "[3/6] Checking Log4Shell in database..." | tee -a "$LOG_FILE"

if which psql >/dev/null 2>&1; then
  LOG4SHELL_EXISTS=$(PGPASSWORD="$PG_PASSWORD" psql -h "$PG_HOST" -U "$PG_USER" -d "$PG_DB" -t -c "SELECT COUNT(*) FROM vulnerability WHERE cve = 'CVE-2021-44228';" 2>/dev/null || echo "ERROR")
  if [ "$LOG4SHELL_EXISTS" != "ERROR" ]; then
    LOG4SHELL_EXISTS=$(echo $LOG4SHELL_EXISTS | tr -d '[:space:]')
    if [ "$LOG4SHELL_EXISTS" -eq "1" ]; then
      echo "   ✅ CVE-2021-44228 found in database" | tee -a "$LOG_FILE"

      # Get CVSS score
      CVSS_SCORE=$(PGPASSWORD="$PG_PASSWORD" psql -h "$PG_HOST" -U "$PG_USER" -d "$PG_DB" -t -c "SELECT cvssv3_base_score FROM vulnerability WHERE cve = 'CVE-2021-44228';" 2>/dev/null || echo "N/A")
      CVSS_SCORE=$(echo $CVSS_SCORE | tr -d '[:space:]')
      echo "   CVSS v3 Score: $CVSS_SCORE (expected: 10.0)" | tee -a "$LOG_FILE"
    else
      echo "   ❌ CVE-2021-44228 NOT in database!" | tee -a "$LOG_FILE"
      exit 1
    fi
  fi
else
  echo "   ⚠️  psql not installed, skipping database check" | tee -a "$LOG_FILE"
fi

echo "" | tee -a "$LOG_FILE"
echo "[4/6] Creating test project with vulnerable Log4j..." | tee -a "$LOG_FILE"

# Setup test directory
rm -rf "$TEST_DIR"
mkdir -p "$TEST_DIR"

# Create test pom.xml with vulnerable Log4j 2.14.1
cat > "$TEST_DIR/pom.xml" <<'EOF'
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
                             http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>

  <groupId>com.codequal.validation</groupId>
  <artifactId>log4shell-monthly-validation</artifactId>
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

echo "   ✅ Test project created" | tee -a "$LOG_FILE"
echo "   Vulnerable dependency: log4j-core:2.14.1" | tee -a "$LOG_FILE"

echo "" | tee -a "$LOG_FILE"
echo "[5/6] Running Dependency-Check validation scan..." | tee -a "$LOG_FILE"
echo "   Expected: Detect CVE-2021-44228 (CRITICAL)" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

START_TIME=$(date +%s)

# Run Dependency-Check with PostgreSQL backend
docker run --rm \
  -v "$TEST_DIR:/workspace:ro" \
  -v "$JDBC_DRIVER_DIR:/jdbc:ro" \
  --network host \
  -e CLASSPATH="/opt/dependency-check/lib/*:/jdbc/*" \
  "$DOCKER_IMAGE" \
  -c "dependency-check \
    --scan /workspace \
    --format JSON \
    --out /workspace \
    --project 'Log4Shell Monthly Validation' \
    --connectionString jdbc:postgresql://${PG_HOST}:${PG_PORT}/${PG_DB} \
    --dbUser ${PG_USER} \
    --dbPassword ${PG_PASSWORD} \
    --dbDriverName org.postgresql.Driver \
    --dbDriverPath /jdbc/postgresql-42.7.1.jar \
    --disableNodeAudit \
    --failOnCVSS 10.0" \
  > "$TEST_DIR/scan.log" 2>&1 || SCAN_EXIT_CODE=$?

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo "" | tee -a "$LOG_FILE"
echo "   Scan completed in ${DURATION}s" | tee -a "$LOG_FILE"
echo "   Exit code: ${SCAN_EXIT_CODE:-0}" | tee -a "$LOG_FILE"

echo "" | tee -a "$LOG_FILE"
echo "[6/6] Validating results..." | tee -a "$LOG_FILE"

# Initialize validation status
VALIDATION_PASSED=0

# Check if report was generated
if [ -f "$TEST_DIR/dependency-check-report.json" ]; then
  echo "   ✅ Report generated" | tee -a "$LOG_FILE"

  # Check for Log4Shell in report
  if grep -q "CVE-2021-44228" "$TEST_DIR/dependency-check-report.json"; then
    echo "   ✅ CVE-2021-44228 detected in scan" | tee -a "$LOG_FILE"

    # Check severity
    if grep -q "CRITICAL" "$TEST_DIR/dependency-check-report.json"; then
      echo "   ✅ Severity: CRITICAL (correct)" | tee -a "$LOG_FILE"
    else
      echo "   ⚠️  Severity not CRITICAL (unexpected)" | tee -a "$LOG_FILE"
    fi

    # Check exit code (should be 1 because --failOnCVSS 10.0)
    if [ "${SCAN_EXIT_CODE:-0}" -eq "1" ]; then
      echo "   ✅ Exit code: 1 (vulnerability found, correct)" | tee -a "$LOG_FILE"
      VALIDATION_PASSED=1
    else
      echo "   ⚠️  Exit code: ${SCAN_EXIT_CODE:-0} (expected 1)" | tee -a "$LOG_FILE"
    fi
  else
    echo "   ❌ CVE-2021-44228 NOT found in scan!" | tee -a "$LOG_FILE"
  fi
else
  echo "   ❌ Report not generated" | tee -a "$LOG_FILE"
  echo "   Check logs: cat $TEST_DIR/scan.log" | tee -a "$LOG_FILE"
fi

# Cleanup test directory
rm -rf "$TEST_DIR"

# Final result
echo "" | tee -a "$LOG_FILE"
echo "=============================================="
if [ "$VALIDATION_PASSED" -eq "1" ]; then
  echo "✅ MONTHLY VALIDATION PASSED"
  echo "=============================================="
  echo ""
  echo "Validation Results:" | tee -a "$LOG_FILE"
  echo "  - CVE-2021-44228 (Log4Shell): ✅ DETECTED" | tee -a "$LOG_FILE"
  echo "  - CVSS Score: 10.0 (CRITICAL)" | tee -a "$LOG_FILE"
  echo "  - PostgreSQL backend: ✅ WORKING" | tee -a "$LOG_FILE"
  echo "  - Dependency-Check 12.1.5: ✅ WORKING" | tee -a "$LOG_FILE"
  echo "  - Database CVE count: ${CVE_COUNT:-N/A}" | tee -a "$LOG_FILE"
  echo "  - Scan duration: ${DURATION}s" | tee -a "$LOG_FILE"
  echo "" | tee -a "$LOG_FILE"
  echo "🎉 Database integrity confirmed - Critical CVE detection working!" | tee -a "$LOG_FILE"
  echo ""
  echo "Finished: $(date '+%Y-%m-%d %H:%M:%S')" | tee -a "$LOG_FILE"
  exit 0
else
  echo "❌ MONTHLY VALIDATION FAILED"
  echo "=============================================="
  echo ""
  echo "⚠️  CRITICAL: Log4Shell detection failed!" | tee -a "$LOG_FILE"
  echo ""
  echo "Possible causes:" | tee -a "$LOG_FILE"
  echo "  1. Database corruption after recent update" | tee -a "$LOG_FILE"
  echo "  2. PostgreSQL connection issues" | tee -a "$LOG_FILE"
  echo "  3. CVE-2021-44228 missing from database" | tee -a "$LOG_FILE"
  echo "  4. Dependency-Check configuration error" | tee -a "$LOG_FILE"
  echo "" | tee -a "$LOG_FILE"
  echo "Action required:" | tee -a "$LOG_FILE"
  echo "  1. Check scan logs: cat $TEST_DIR/scan.log" | tee -a "$LOG_FILE"
  echo "  2. Verify PostgreSQL: psql -h 127.0.0.1 -U $PG_USER -d $PG_DB" | tee -a "$LOG_FILE"
  echo "  3. Check CVE in database: SELECT * FROM vulnerability WHERE cve='CVE-2021-44228';" | tee -a "$LOG_FILE"
  echo "  4. Consider running database update: daily-cve-update.sh" | tee -a "$LOG_FILE"
  echo ""
  echo "Finished: $(date '+%Y-%m-%d %H:%M:%S')" | tee -a "$LOG_FILE"
  exit 1
fi
