#!/bin/bash
################################################################################
# Checkstyle Fix #2 Validation
#
# Purpose: Validate that Checkstyle's exclusion pattern correctly handles:
#   1. Production code in src/main (should be scanned)
#   2. Test code in src/test (should be excluded)
#   3. Files with "Test" in filename in production code (edge case)
#
# Fix #2: Changed from filename-based to path-based exclusion
#   OLD: ! -name '*Test*.java' ! -name '*Tests*.java'
#   NEW: ! -path '*/src/test/*' ! -path '*/src/tests/*'
################################################################################

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Checkstyle Fix #2 Validation - Path-Based Exclusion${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""

# Setup test directory
TEST_DIR="/tmp/checkstyle-fix2-validation"
rm -rf "$TEST_DIR"
mkdir -p "$TEST_DIR/src/main/java/com/example"
mkdir -p "$TEST_DIR/src/test/java/com/example"

echo -e "${YELLOW}Step 1: Creating test files${NC}"
echo ""

# Production code (should be INCLUDED)
cat > "$TEST_DIR/src/main/java/com/example/ProductionCode.java" <<'EOF'
package com.example;
public class ProductionCode {
    private String field;
}
EOF
echo "  ✓ Created: src/main/java/com/example/ProductionCode.java"

# Production code with "Test" in filename (edge case - should be INCLUDED)
cat > "$TEST_DIR/src/main/java/com/example/TestUtils.java" <<'EOF'
package com.example;
public class TestUtils {
    private String helper;
}
EOF
echo "  ✓ Created: src/main/java/com/example/TestUtils.java (has 'Test' in filename)"

# Another file with "Test" in filename
cat > "$TEST_DIR/src/main/java/com/example/DataTestRunner.java" <<'EOF'
package com.example;
public class DataTestRunner {
    private String runner;
}
EOF
echo "  ✓ Created: src/main/java/com/example/DataTestRunner.java (has 'Test' in filename)"

# Actual test code (should be EXCLUDED)
cat > "$TEST_DIR/src/test/java/com/example/UnitTest.java" <<'EOF'
package com.example;
public class UnitTest {
    private String test;
}
EOF
echo "  ✓ Created: src/test/java/com/example/UnitTest.java (in test directory)"

echo ""
echo -e "${YELLOW}Step 2: Testing OLD exclusion pattern (filename-based)${NC}"
echo "  Pattern: ! -name '*Test*.java' ! -name '*Tests*.java'"
echo ""

OLD_FILES=$(find "$TEST_DIR" -name '*.java' -type f ! -name '*Test*.java' ! -name '*Tests*.java')
OLD_COUNT=$(echo "$OLD_FILES" | grep -v '^$' | wc -l | tr -d ' ')

echo "  Files found: $OLD_COUNT"
echo "$OLD_FILES" | while read -r file; do
    if [ -n "$file" ]; then
        rel_path=$(echo "$file" | sed "s|$TEST_DIR/||")
        echo "    ✓ $rel_path"
    fi
done

echo ""
if [ "$OLD_COUNT" -eq 1 ]; then
    echo -e "  ${YELLOW}❌ PROBLEM: Excluded 3 files (TestUtils.java, DataTestRunner.java, UnitTest.java)${NC}"
    echo -e "  ${YELLOW}   Only ProductionCode.java included${NC}"
    echo -e "  ${YELLOW}   Issue: Excluded production files with 'Test' in filename${NC}"
else
    echo -e "  ${GREEN}Unexpected result with OLD pattern${NC}"
fi

echo ""
echo -e "${YELLOW}Step 3: Testing NEW exclusion pattern (path-based)${NC}"
echo "  Pattern: ! -path '*/src/test/*' ! -path '*/src/tests/*'"
echo ""

NEW_FILES=$(find "$TEST_DIR" -name '*.java' -type f ! -path '*/src/test/*' ! -path '*/src/tests/*')
NEW_COUNT=$(echo "$NEW_FILES" | grep -v '^$' | wc -l | tr -d ' ')

echo "  Files found: $NEW_COUNT"
echo "$NEW_FILES" | while read -r file; do
    if [ -n "$file" ]; then
        rel_path=$(echo "$file" | sed "s|$TEST_DIR/||")
        echo "    ✓ $rel_path"
    fi
done

echo ""
if [ "$NEW_COUNT" -eq 3 ]; then
    echo -e "  ${GREEN}✅ CORRECT: Includes all production files (ProductionCode.java, TestUtils.java, DataTestRunner.java)${NC}"
    echo -e "  ${GREEN}✅ CORRECT: Excludes test directory (UnitTest.java)${NC}"
else
    echo -e "  ${RED}❌ ERROR: Expected 3 files, got $NEW_COUNT${NC}"
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  VALIDATION SUMMARY${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""

echo "Test Scenario:"
echo "  • 3 production files in src/main/"
echo "    - ProductionCode.java"
echo "    - TestUtils.java (has 'Test' in filename)"
echo "    - DataTestRunner.java (has 'Test' in filename)"
echo "  • 1 test file in src/test/"
echo "    - UnitTest.java"
echo ""

echo "OLD Pattern Results (filename-based):"
echo "  ! -name '*Test*.java'"
echo "  → Files included: $OLD_COUNT / 4"
echo -e "  → ${YELLOW}Problem: Excludes production files with 'Test' in filename${NC}"
echo ""

echo "NEW Pattern Results (path-based):"
echo "  ! -path '*/src/test/*'"
echo "  → Files included: $NEW_COUNT / 4"
if [ "$NEW_COUNT" -eq 3 ]; then
    echo -e "  → ${GREEN}Correct: Includes all production files, excludes test directory${NC}"
fi
echo ""

# Final verdict
if [ "$OLD_COUNT" -eq 1 ] && [ "$NEW_COUNT" -eq 3 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║              ✅ FIX #2 VALIDATED SUCCESSFULLY                   ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${GREEN}Fix Impact:${NC}"
    echo -e "${GREEN}  • OLD pattern: Excluded 2 production files with 'Test' in filename${NC}"
    echo -e "${GREEN}  • NEW pattern: Includes all 3 production files${NC}"
    echo -e "${GREEN}  • Both patterns: Correctly exclude test directory${NC}"
    echo ""
    echo -e "${GREEN}Conclusion: Path-based exclusion is more accurate and robust${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                ❌ FIX #2 VALIDATION FAILED                      ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Expected: OLD=1, NEW=3"
    echo "Actual: OLD=$OLD_COUNT, NEW=$NEW_COUNT"
    echo ""
    exit 1
fi

# Cleanup
rm -rf "$TEST_DIR"
