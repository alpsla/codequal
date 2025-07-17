#!/bin/bash

echo "=== Running Granular Process Validation ==="
echo ""
echo "This will validate:"
echo "1. DeepWiki analysis and recommendations"
echo "2. Each MCP tool execution individually" 
echo "3. Full PR analysis with branch resolution"
echo "4. Complete data flow from DeepWiki → Tools → Agents → Report"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Build the project first
echo -e "${YELLOW}Building project...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}Build failed! Please fix build errors first.${NC}"
    exit 1
fi

echo -e "${GREEN}Build successful!${NC}"
echo ""

# Create output directory for reports
mkdir -p validation-reports
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Run granular validation
echo -e "${YELLOW}Starting granular validation...${NC}"
echo "This will take several minutes as it runs each component separately."
echo ""

# Capture output to file and console
npx ts-node test-granular-validation.ts 2>&1 | tee "validation-reports/validation-${TIMESTAMP}.log"

# Check if validation report was created
if [ -f "validation-report.json" ]; then
    mv validation-report.json "validation-reports/validation-report-${TIMESTAMP}.json"
    echo ""
    echo -e "${GREEN}Validation complete!${NC}"
    echo "Reports saved to:"
    echo "- validation-reports/validation-${TIMESTAMP}.log"
    echo "- validation-reports/validation-report-${TIMESTAMP}.json"
else
    echo ""
    echo -e "${RED}Validation failed - no report generated${NC}"
    exit 1
fi

# Summary
echo ""
echo "=== Quick Summary ==="
grep -A 20 "FINAL VALIDATION REPORT" "validation-reports/validation-${TIMESTAMP}.log" | head -30

echo ""
echo -e "${GREEN}Full details available in the log file.${NC}"