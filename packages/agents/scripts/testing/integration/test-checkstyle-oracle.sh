#!/bin/bash
################################################################################
# Test Script: Validate Checkstyle Fix #2 on Oracle Cloud
#
# Purpose: Verify that Checkstyle correctly scans files with "Test" in their
#          class names after fixing the exclusion pattern
#
# Fix #2: Changed from ! -name '*Test*.java' to ! -path '*/src/test/*'
#
# Expected Results:
#   - Checkstyle should scan StyleViolationsExample.java even though it has
#     "TestStyleViolations" class name
#   - Should detect 10+ intentional style violations
#
# Oracle Configuration:
#   - IP: 129.213.49.128
#   - SSH Key: /Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-05-08.key
################################################################################

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Checkstyle Fix #2 Validation - Oracle Cloud Testing      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Configuration
ORACLE_IP="${ORACLE_IP:-129.213.49.128}"
SSH_KEY="${SSH_KEY:-/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-05-08.key}"
SSH_USER="opc"

# Validate SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}❌ ERROR: SSH key not found at: $SSH_KEY${NC}"
    exit 1
fi

echo -e "${GREEN}✓ SSH Key: $SSH_KEY${NC}"
echo -e "${GREEN}✓ Oracle IP: $ORACLE_IP${NC}"
echo -e "${GREEN}✓ SSH User: $SSH_USER${NC}"
echo ""

# Test SSH connectivity
echo -e "${YELLOW}→ Testing SSH connectivity...${NC}"
if ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no -o ConnectTimeout=10 "$SSH_USER@$ORACLE_IP" "echo 'SSH connection successful'" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ SSH connection successful${NC}"
else
    echo -e "${RED}❌ ERROR: Cannot connect to Oracle via SSH${NC}"
    exit 1
fi
echo ""

# Create test script to run on Oracle
echo -e "${YELLOW}→ Creating remote test script...${NC}"

TEST_SCRIPT=$(cat <<'REMOTE_SCRIPT'
#!/bin/bash

set -e

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  CHECKSTYLE FIX #2 VALIDATION - Oracle Cloud"
echo "════════════════════════════════════════════════════════════════"
echo ""

# 1. Create test file with intentional violations
echo "→ Creating test file with intentional violations..."
mkdir -p /tmp/test-checkstyle-fix2/src/main/java/com/example

cat > /tmp/test-checkstyle-fix2/src/main/java/com/example/StyleViolationsExample.java <<'JAVA_CODE'
package com.example;

import java.util.*;  // ❌ Wildcard import

// ❌ Missing Javadoc
public class TestStyleViolations {  // ✅ Has "Test" in name - should NOT be excluded!

    private String foo;  // ❌ Missing Javadoc

    // ❌ Line too long ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

    public void bar(){  // ❌ Missing space before {
        int x=5;  // ❌ Missing spaces around =
        if(x>3){  // ❌ Missing spaces
            System.out.println("test");
        }
    }

    public void baz(  ) { }  // ❌ Whitespace issues
}
JAVA_CODE

echo "✓ Created test file: StyleViolationsExample.java"
echo "  Class name: TestStyleViolations (contains 'Test')"
echo "  Expected violations: 10+"
echo ""

# 2. Test with OLD pattern (should exclude file)
echo "→ Testing OLD exclusion pattern (BROKEN)..."
echo "  Pattern: ! -name '*Test*.java'"

docker run --rm \
  -v /tmp/test-checkstyle-fix2:/workspace \
  iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-java-v6.0-arm \
  -c "find /workspace -name '*.java' -type f ! -name '*Test*.java' ! -name '*Tests*.java'" > /tmp/old-pattern-files.txt || true

OLD_FILE_COUNT=$(cat /tmp/old-pattern-files.txt | wc -l)
echo "  Files found: $OLD_FILE_COUNT"

if [ "$OLD_FILE_COUNT" -eq 0 ]; then
    echo "  ❌ BROKEN: File excluded (as expected with old pattern)"
else
    echo "  ✓ File included (unexpected with old pattern)"
fi
echo ""

# 3. Test with NEW pattern (should include file)
echo "→ Testing NEW exclusion pattern (FIXED)..."
echo "  Pattern: ! -path '*/src/test/*'"

docker run --rm \
  -v /tmp/test-checkstyle-fix2:/workspace \
  iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-java-v6.0-arm \
  -c "find /workspace -name '*.java' -type f ! -path '*/src/test/*' ! -path '*/src/tests/*'" > /tmp/new-pattern-files.txt || true

NEW_FILE_COUNT=$(cat /tmp/new-pattern-files.txt | wc -l)
echo "  Files found: $NEW_FILE_COUNT"

if [ "$NEW_FILE_COUNT" -eq 1 ]; then
    echo "  ✓ FIXED: File included correctly"
else
    echo "  ❌ ERROR: File still excluded"
fi
echo ""

# 4. Run actual Checkstyle scan with NEW pattern
echo "→ Running Checkstyle with NEW pattern..."

docker run --rm \
  -v /tmp/test-checkstyle-fix2:/workspace \
  iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-java-v6.0-arm \
  -c "find /workspace -name '*.java' -type f ! -path '*/src/test/*' ! -path '*/src/tests/*' -print0 | \
      xargs -0 checkstyle -c /google_checks.xml -f xml 2>&1" > /tmp/checkstyle-results.xml || true

# Parse violations
VIOLATION_COUNT=$(grep -c '<error' /tmp/checkstyle-results.xml || echo "0")

echo "  Violations found: $VIOLATION_COUNT"
echo ""

# 5. Show sample violations
if [ "$VIOLATION_COUNT" -gt 0 ]; then
    echo "→ Sample violations detected:"
    grep '<error' /tmp/checkstyle-results.xml | head -5 | while read -r line; do
        echo "  • $line"
    done
    echo ""
fi

# 6. Summary
echo "════════════════════════════════════════════════════════════════"
echo "  VALIDATION RESULTS"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "Fix #2 Status: Checkstyle Exclusion Pattern"
echo "  OLD Pattern: ! -name '*Test*.java'"
echo "    → Files found: $OLD_FILE_COUNT (excluded file with 'Test' in name)"
echo ""
echo "  NEW Pattern: ! -path '*/src/test/*'"
echo "    → Files found: $NEW_FILE_COUNT (includes file with 'Test' in name)"
echo "    → Violations: $VIOLATION_COUNT"
echo ""

if [ "$NEW_FILE_COUNT" -eq 1 ] && [ "$VIOLATION_COUNT" -gt 5 ]; then
    echo "✅ FIX #2 VALIDATED: Checkstyle now scans files with 'Test' in class name"
    echo "✅ Expected behavior: 10+ violations detected"
    echo "✅ Actual violations: $VIOLATION_COUNT"
    echo ""
    exit 0
else
    echo "❌ FIX #2 FAILED VALIDATION"
    echo "  Expected: 1 file found, 10+ violations"
    echo "  Actual: $NEW_FILE_COUNT files, $VIOLATION_COUNT violations"
    echo ""
    exit 1
fi

REMOTE_SCRIPT
)

# Execute test on Oracle
echo -e "${YELLOW}→ Executing Checkstyle validation on Oracle...${NC}"
echo ""

ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SSH_USER@$ORACLE_IP" "$TEST_SCRIPT"

EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║               ✅ FIX #2 VALIDATION SUCCESSFUL                   ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
else
    echo -e "${RED}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║               ❌ FIX #2 VALIDATION FAILED                       ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════════╝${NC}"
fi

exit $EXIT_CODE
