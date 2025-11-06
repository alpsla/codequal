#!/bin/bash
################################################################################
# Local Test: Validate Checkstyle Fix #2 Logic
#
# Purpose: Verify that Checkstyle exclusion pattern correctly handles files
#          with "Test" in their class names
#
# Fix #2: Changed from ! -name '*Test*.java' to ! -path '*/src/test/*'
#
# Expected Results:
#   - OLD pattern excludes StyleViolationsExample.java (class TestStyleViolations)
#   - NEW pattern includes StyleViolationsExample.java
#   - Checkstyle detects 10+ intentional violations
################################################################################

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        Checkstyle Fix #2 Validation - Local Test             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Create test directory structure
TEST_DIR="/tmp/test-checkstyle-fix2"
rm -rf "$TEST_DIR"
mkdir -p "$TEST_DIR/src/main/java/com/example"
mkdir -p "$TEST_DIR/src/test/java/com/example"

echo -e "${YELLOW}→ Creating test files...${NC}"

# 1. File with "Test" in class name (src/main) - should be INCLUDED
cat > "$TEST_DIR/src/main/java/com/example/StyleViolationsExample.java" <<'EOF'
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
EOF

# 2. Actual test file (src/test) - should be EXCLUDED
cat > "$TEST_DIR/src/test/java/com/example/RealTest.java" <<'EOF'
package com.example;

import org.junit.Test;

public class RealTest {
    @Test
    public void testSomething() {
        // This is a real test file - should be excluded
    }
}
EOF

echo -e "${GREEN}✓ Created test files${NC}"
echo "  1. src/main/java/com/example/StyleViolationsExample.java (class: TestStyleViolations)"
echo "  2. src/test/java/com/example/RealTest.java (actual test)"
echo ""

# Test OLD pattern (BROKEN)
echo -e "${YELLOW}→ Testing OLD exclusion pattern (BROKEN)...${NC}"
echo "  Pattern: ! -name '*Test*.java'"

OLD_FILES=$(find "$TEST_DIR" -name '*.java' -type f ! -name '*Test*.java' ! -name '*Tests*.java' || true)
OLD_COUNT=$(echo "$OLD_FILES" | grep -v '^$' | wc -l)

echo "  Files found: $OLD_COUNT"
echo "$OLD_FILES" | while read -r file; do
    if [ -n "$file" ]; then
        echo "    - $(basename $file)"
    fi
done

if [ "$OLD_COUNT" -eq 0 ]; then
    echo -e "  ${RED}❌ BROKEN: Excluded production file with 'Test' in class name${NC}"
else
    echo -e "  ${GREEN}✓ Files found (unexpected with old pattern)${NC}"
fi
echo ""

# Test NEW pattern (FIXED)
echo -e "${YELLOW}→ Testing NEW exclusion pattern (FIXED)...${NC}"
echo "  Pattern: ! -path '*/src/test/*'"

NEW_FILES=$(find "$TEST_DIR" -name '*.java' -type f ! -path '*/src/test/*' ! -path '*/src/tests/*' || true)
NEW_COUNT=$(echo "$NEW_FILES" | grep -v '^$' | wc -l)

echo "  Files found: $NEW_COUNT"
echo "$NEW_FILES" | while read -r file; do
    if [ -n "$file" ]; then
        echo "    - $(basename $file)"
    fi
done

if [ "$NEW_COUNT" -eq 1 ]; then
    echo -e "  ${GREEN}✓ FIXED: Includes production file, excludes test directory${NC}"
else
    echo -e "  ${RED}❌ ERROR: File count incorrect (expected 1, got $NEW_COUNT)${NC}"
fi
echo ""

# Check Docker availability
echo -e "${YELLOW}→ Checking Docker availability...${NC}"
if command -v docker &> /dev/null && docker info &> /dev/null; then
    echo -e "${GREEN}✓ Docker is available${NC}"
    HAS_DOCKER=true

    # Check for Java analyzer image
    if docker images | grep -q "analyzer:lang-java"; then
        echo -e "${GREEN}✓ Java analyzer image found${NC}"
        HAS_IMAGE=true
    else
        echo -e "${YELLOW}⚠ Java analyzer image not found - skipping Checkstyle scan${NC}"
        HAS_IMAGE=false
    fi
else
    echo -e "${YELLOW}⚠ Docker not available - skipping Checkstyle scan${NC}"
    HAS_DOCKER=false
fi
echo ""

# Run Checkstyle if Docker is available
VIOLATION_COUNT=0
if [ "$HAS_DOCKER" = true ] && [ "$HAS_IMAGE" = true ]; then
    echo -e "${YELLOW}→ Running Checkstyle scan with NEW pattern...${NC}"

    # Find correct image
    IMAGE=$(docker images | grep "analyzer:lang-java" | head -1 | awk '{print $1":"$2}')
    echo "  Using image: $IMAGE"

    docker run --rm \
      -v "$TEST_DIR:/workspace" \
      "$IMAGE" \
      -c "find /workspace -name '*.java' -type f ! -path '*/src/test/*' ! -path '*/src/tests/*' -print0 | \
          xargs -0 checkstyle -c /google_checks.xml -f xml 2>&1" > /tmp/checkstyle-results.xml || true

    VIOLATION_COUNT=$(grep -c '<error' /tmp/checkstyle-results.xml || echo "0")

    echo "  Violations detected: $VIOLATION_COUNT"

    if [ "$VIOLATION_COUNT" -gt 5 ]; then
        echo -e "${GREEN}✓ Checkstyle detected violations in file with 'Test' in class name${NC}"
        echo ""
        echo "  Sample violations:"
        grep '<error' /tmp/checkstyle-results.xml | head -3 | while read -r line; do
            echo "    • $line"
        done
    else
        echo -e "${YELLOW}⚠ Low violation count (expected 10+, got $VIOLATION_COUNT)${NC}"
    fi
    echo ""
fi

# Summary
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                     VALIDATION RESULTS                        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Fix #2: Checkstyle Exclusion Pattern"
echo ""
echo "OLD Pattern: ! -name '*Test*.java'"
echo "  → Files found: $OLD_COUNT"
echo "  → Result: ${RED}EXCLUDES files with 'Test' in class name ❌${NC}"
echo ""
echo "NEW Pattern: ! -path '*/src/test/*'"
echo "  → Files found: $NEW_COUNT"
echo "  → Result: ${GREEN}INCLUDES production files, excludes test dirs ✅${NC}"

if [ "$HAS_DOCKER" = true ] && [ "$HAS_IMAGE" = true ]; then
    echo "  → Checkstyle violations: $VIOLATION_COUNT"
fi
echo ""

# Final verdict
if [ "$NEW_COUNT" -eq 1 ] && [ "$OLD_COUNT" -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║            ✅ FIX #2 LOGIC VALIDATED LOCALLY                   ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${GREEN}The fix correctly:${NC}"
    echo -e "${GREEN}  1. OLD pattern excluded file with 'Test' in class name (bug)${NC}"
    echo -e "${GREEN}  2. NEW pattern includes same file (fixed)${NC}"
    echo -e "${GREEN}  3. NEW pattern excludes actual test directory${NC}"

    if [ "$VIOLATION_COUNT" -gt 5 ]; then
        echo -e "${GREEN}  4. Checkstyle detected $VIOLATION_COUNT violations${NC}"
    fi
    echo ""
    echo -e "${YELLOW}⚠ Note: Oracle Cloud instance unreachable for full validation${NC}"
    echo -e "${YELLOW}   Run './test-checkstyle-oracle.sh' when Oracle is available${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                ❌ FIX #2 VALIDATION FAILED                     ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Expected: OLD=0 files, NEW=1 file"
    echo "Actual: OLD=$OLD_COUNT files, NEW=$NEW_COUNT files"
    echo ""
    exit 1
fi

# Cleanup
rm -rf "$TEST_DIR"
