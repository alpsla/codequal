#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Comprehensive PR Analysis Test with Full Monitoring ===${NC}"
echo ""

# Create test results directory
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
TEST_DIR="test-results/comprehensive-$TIMESTAMP"
mkdir -p "$TEST_DIR"

echo -e "${YELLOW}Test results will be saved to: $TEST_DIR${NC}"
echo ""

# Check if server is running
echo -e "${BLUE}Checking if API server is running...${NC}"
if ! curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${RED}API server is not running on port 3001${NC}"
    echo "Please start the server first with: npm run dev"
    exit 1
fi
echo -e "${GREEN}✓ API server is running${NC}"
echo ""

# Start enhanced monitoring
echo -e "${BLUE}Starting enhanced monitoring...${NC}"
cat > "$TEST_DIR/monitor-config.json" << EOF
{
  "logFile": "$TEST_DIR/data-flow-monitor.log",
  "checkpoints": [
    "PR Context Extraction",
    "DeepWiki Analysis",
    "MCP Tool Execution",
    "Agent Analysis",
    "Report Generation"
  ],
  "captureDetails": true
}
EOF

# Start monitoring with enhanced logging
./monitor-data-flow.sh > "$TEST_DIR/data-flow-monitor.log" 2>&1 &
MONITOR_PID=$!
echo -e "${GREEN}✓ Monitor started (PID: $MONITOR_PID)${NC}"
sleep 2

# Function to run analysis
run_analysis() {
    local REPO_URL=$1
    local PR_NUMBER=$2
    local AUTH_TOKEN=$3
    local TEST_NAME=$4
    
    echo ""
    echo -e "${BLUE}Running analysis: $TEST_NAME${NC}"
    echo "Repository: $REPO_URL"
    echo "PR Number: $PR_NUMBER"
    echo ""
    
    # Create specific test directory
    mkdir -p "$TEST_DIR/$TEST_NAME"
    
    # Run the analysis
    START_TIME=$(date +%s)
    
    curl -X POST http://localhost:3001/api/analyze-pr \
      -H "Authorization: Bearer $AUTH_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{
        \"repositoryUrl\": \"$REPO_URL\",
        \"prNumber\": $PR_NUMBER,
        \"analysisMode\": \"comprehensive\"
      }" \
      -w "\n\nHTTP Status: %{http_code}\nTime: %{time_total}s\n" \
      -o "$TEST_DIR/$TEST_NAME/response.json" \
      > "$TEST_DIR/$TEST_NAME/curl-output.txt" 2>&1
    
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    
    # Extract key metrics
    if [ -f "$TEST_DIR/$TEST_NAME/response.json" ]; then
        echo -e "${GREEN}✓ Analysis completed in ${DURATION}s${NC}"
        
        # Extract results using jq if available
        if command -v jq &> /dev/null; then
            # Extract DeepWiki results
            echo "" > "$TEST_DIR/$TEST_NAME/deepwiki-summary.json"
            jq '.deepWikiData // {}' "$TEST_DIR/$TEST_NAME/response.json" > "$TEST_DIR/$TEST_NAME/deepwiki-summary.json"
            
            # Extract tool results
            echo "" > "$TEST_DIR/$TEST_NAME/tool-results.json"
            jq '.debugInfo.toolResults // {}' "$TEST_DIR/$TEST_NAME/response.json" > "$TEST_DIR/$TEST_NAME/tool-results.json"
            
            # Extract findings by category
            echo "" > "$TEST_DIR/$TEST_NAME/findings-summary.json"
            jq '.findings // {}' "$TEST_DIR/$TEST_NAME/response.json" > "$TEST_DIR/$TEST_NAME/findings-summary.json"
            
            # Create summary
            jq '{
                analysisId: .analysisId,
                status: .status,
                duration: "'$DURATION's",
                repository: .repository,
                prNumber: .prNumber,
                processingSteps: .processingSteps,
                totalFindings: (.findings | to_entries | map(.value | length) | add),
                deepWikiAvailable: (.deepWikiData != null),
                toolsExecuted: (.debugInfo.toolResults | keys),
                recommendations: (.recommendations | length)
            }' "$TEST_DIR/$TEST_NAME/response.json" > "$TEST_DIR/$TEST_NAME/summary.json"
            
            echo -e "${BLUE}Summary saved to: $TEST_NAME/summary.json${NC}"
        fi
    else
        echo -e "${RED}✗ Analysis failed${NC}"
        cat "$TEST_DIR/$TEST_NAME/curl-output.txt"
    fi
}

# Get auth token
if [ -z "$1" ]; then
    echo -e "${RED}Please provide auth token as argument${NC}"
    echo "Usage: $0 <auth-token>"
    kill $MONITOR_PID 2>/dev/null
    exit 1
fi

AUTH_TOKEN=$1

# Run test with real PR
echo -e "${YELLOW}Starting comprehensive test...${NC}"
run_analysis "https://github.com/facebook/react" "28298" "$AUTH_TOKEN" "react-pr-28298"

# Wait a bit for any async operations
sleep 5

# Stop monitoring
echo ""
echo -e "${BLUE}Stopping monitor...${NC}"
kill $MONITOR_PID 2>/dev/null

# Generate comprehensive report
echo ""
echo -e "${BLUE}Generating comprehensive validation report...${NC}"

cat > "$TEST_DIR/validation-report.md" << EOF
# Comprehensive PR Analysis Validation Report
Generated: $(date)

## Test Configuration
- Repository: https://github.com/facebook/react
- PR Number: 28298
- Analysis Mode: comprehensive
- Test Directory: $TEST_DIR

## Monitoring Checkpoints

### 1. PR Context Extraction
\`\`\`
$(grep "Extract PR Context" "$TEST_DIR/data-flow-monitor.log" | tail -5 || echo "No PR context logs found")
\`\`\`

### 2. DeepWiki Analysis
\`\`\`
$(grep -E "DeepWiki|Trigger.*DeepWiki" "$TEST_DIR/data-flow-monitor.log" | tail -10 || echo "No DeepWiki logs found")
\`\`\`

### 3. MCP Tool Execution
\`\`\`
$(grep -E "MCP Tools|Execute.*Tools|eslint|semgrep|npm-audit|madge|dependency-cruiser" "$TEST_DIR/data-flow-monitor.log" | tail -20 || echo "No MCP tool logs found")
\`\`\`

### 4. Agent Analysis
\`\`\`
$(grep -E "Agent|security|architecture|performance|codeQuality|dependency" "$TEST_DIR/data-flow-monitor.log" | grep -v "Tool" | tail -15 || echo "No agent logs found")
\`\`\`

### 5. Report Generation
\`\`\`
$(grep -E "Report|Educational|Compilation" "$TEST_DIR/data-flow-monitor.log" | tail -10 || echo "No report logs found")
\`\`\`

## Results Summary

EOF

# Add results if jq is available
if command -v jq &> /dev/null && [ -f "$TEST_DIR/react-pr-28298/summary.json" ]; then
    echo "### Analysis Results" >> "$TEST_DIR/validation-report.md"
    echo '```json' >> "$TEST_DIR/validation-report.md"
    cat "$TEST_DIR/react-pr-28298/summary.json" >> "$TEST_DIR/validation-report.md"
    echo '```' >> "$TEST_DIR/validation-report.md"
    
    echo "" >> "$TEST_DIR/validation-report.md"
    echo "### DeepWiki Recommendations" >> "$TEST_DIR/validation-report.md"
    echo '```json' >> "$TEST_DIR/validation-report.md"
    jq '.recommendations // {}' "$TEST_DIR/react-pr-28298/deepwiki-summary.json" 2>/dev/null | head -20 >> "$TEST_DIR/validation-report.md"
    echo '```' >> "$TEST_DIR/validation-report.md"
    
    echo "" >> "$TEST_DIR/validation-report.md"
    echo "### Tool Findings Count" >> "$TEST_DIR/validation-report.md"
    echo '```' >> "$TEST_DIR/validation-report.md"
    jq -r 'to_entries | .[] | "\(.key): \(.value.toolResults | length) findings"' "$TEST_DIR/react-pr-28298/tool-results.json" 2>/dev/null >> "$TEST_DIR/validation-report.md"
    echo '```' >> "$TEST_DIR/validation-report.md"
fi

echo ""
echo -e "${GREEN}=== Test Complete ===${NC}"
echo ""
echo -e "${BLUE}Results saved to: $TEST_DIR${NC}"
echo ""
echo "Key files:"
echo "  - Full response: $TEST_DIR/react-pr-28298/response.json"
echo "  - Monitor logs: $TEST_DIR/data-flow-monitor.log"
echo "  - Validation report: $TEST_DIR/validation-report.md"
echo "  - DeepWiki data: $TEST_DIR/react-pr-28298/deepwiki-summary.json"
echo "  - Tool results: $TEST_DIR/react-pr-28298/tool-results.json"
echo ""
echo -e "${YELLOW}To view colored monitor output:${NC}"
echo "cat $TEST_DIR/data-flow-monitor.log"
echo ""
echo -e "${YELLOW}To view validation report:${NC}"
echo "cat $TEST_DIR/validation-report.md"