#!/bin/bash

# Script to debug only the testing package and show detailed errors
set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'
BOLD='\033[1m'

echo -e "${PURPLE}${BOLD}🧪 Testing Package Detailed Debug${NC}"
echo "================================="

cd packages/testing

echo -e "\n${BLUE}Running tests and capturing output...${NC}"

# Run tests and capture output
OUTPUT_FILE="/tmp/testing-output.txt"
if npm test 2>&1 | tee "$OUTPUT_FILE"; then
    echo -e "\n${GREEN}✅ All tests passed!${NC}"
else
    echo -e "\n${RED}❌ Tests failed!${NC}"
    
    # Extract and display failures
    echo -e "\n${YELLOW}${BOLD}Failed Test Files:${NC}"
    grep "FAIL" "$OUTPUT_FILE" | grep -v "npm error" | while read -r line; do
        if [[ $line =~ FAIL[[:space:]]+(.*) ]]; then
            echo -e "  ${RED}•${NC} ${BASH_REMATCH[1]}"
        fi
    done
    
    # Extract TypeScript errors
    echo -e "\n${YELLOW}${BOLD}TypeScript Errors:${NC}"
    grep -A 3 "error TS" "$OUTPUT_FILE" | head -30
    
    # Show test summary
    echo -e "\n${YELLOW}${BOLD}Test Summary:${NC}"
    grep -E "(Test Suites:|Tests:|Snapshots:|Time:)" "$OUTPUT_FILE" | tail -10
    
    # Show specific errors for educational agent tests
    if grep -q "educational-agent" "$OUTPUT_FILE"; then
        echo -e "\n${YELLOW}${BOLD}Educational Agent Test Errors:${NC}"
        grep -B 2 -A 5 "educational-agent.*error TS" "$OUTPUT_FILE" | head -50
    fi
fi

echo -e "\n${BLUE}${BOLD}Quick Fix Commands:${NC}"
echo -e "${GREEN}1. Fix all Educational Agent tests:${NC}"
echo "   ./ultimate-fix-educational-tests.sh"
echo ""
echo -e "${GREEN}2. Run only Educational Agent tests:${NC}"
echo "   npm test -- src/integration/educational-agent/ --no-coverage"
echo ""
echo -e "${GREEN}3. Run a specific test file:${NC}"
echo "   npm test -- src/integration/educational-agent/tool-educational-integration.test.ts"
echo ""
echo -e "${GREEN}4. Check TypeScript errors only:${NC}"
echo "   npx tsc --noEmit"
