#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

if [ -z "$1" ]; then
    echo -e "${RED}Usage: $0 <auth-token>${NC}"
    exit 1
fi

AUTH_TOKEN=$1
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo -e "${BLUE}=== Starting Fresh PR Analysis ===${NC}"
echo "Timestamp: $TIMESTAMP"
echo ""

# Start a new analysis
echo -e "${YELLOW}Submitting PR analysis request...${NC}"
RESPONSE=$(curl -s -X POST "http://localhost:3001/api/analyze-pr" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "repositoryUrl": "https://github.com/facebook/react",
        "prNumber": 28298,
        "analysisMode": "comprehensive"
    }')

# Extract analysis ID
ANALYSIS_ID=$(echo "$RESPONSE" | jq -r '.analysisId' 2>/dev/null)
STATUS=$(echo "$RESPONSE" | jq -r '.status' 2>/dev/null)

if [ "$ANALYSIS_ID" = "null" ] || [ -z "$ANALYSIS_ID" ]; then
    echo -e "${RED}Failed to start analysis${NC}"
    echo "Response:"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
    exit 1
fi

echo -e "${GREEN}✓ Analysis started successfully${NC}"
echo "Analysis ID: $ANALYSIS_ID"
echo "Status: $STATUS"
echo ""

# Save initial response
echo "$RESPONSE" > "analysis-$ANALYSIS_ID-initial.json"

# Now poll for results
echo -e "${BLUE}Polling for results...${NC}"
echo ""

MAX_ATTEMPTS=60
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    ATTEMPT=$((ATTEMPT + 1))
    
    echo -ne "${YELLOW}Attempt $ATTEMPT/$MAX_ATTEMPTS...${NC}"
    
    # Try to get progress
    PROGRESS_RESPONSE=$(curl -s -X GET "http://localhost:3001/api/result-orchestrator/analysis/$ANALYSIS_ID/progress" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -H "Content-Type: application/json")
    
    # Check if it's an error response
    if echo "$PROGRESS_RESPONSE" | grep -q "Cannot GET"; then
        # The progress endpoint doesn't exist or analysis is complete
        # Try to check if analysis completed in a different way
        echo -e " ${YELLOW}Progress endpoint not available${NC}"
        
        # Since the analysis might be complete, let's save what we have
        echo "$PROGRESS_RESPONSE" > "analysis-$ANALYSIS_ID-final.json"
        
        # Check if we can find any logs
        echo ""
        echo -e "${BLUE}Checking server logs for analysis activity...${NC}"
        
        # You might need to check server console output manually
        echo -e "${YELLOW}Please check the server console for any output related to:${NC}"
        echo "- Analysis ID: $ANALYSIS_ID"
        echo "- DeepWiki processing"
        echo "- MCP tool execution"
        echo "- Agent analysis"
        
        break
    fi
    
    STATUS=$(echo "$PROGRESS_RESPONSE" | jq -r '.status' 2>/dev/null)
    
    if [ "$STATUS" = "complete" ]; then
        echo -e " ${GREEN}✓ Analysis completed!${NC}"
        echo "$PROGRESS_RESPONSE" > "analysis-$ANALYSIS_ID-final.json"
        
        echo ""
        echo -e "${BLUE}=== Analysis Summary ===${NC}"
        jq '{
            analysisId: .analysisId,
            status: .status,
            totalFindings: (.results.findings | to_entries | map(.value | length) | add),
            deepWikiAvailable: (.results.deepWikiData != null),
            processingSteps: .results.processingSteps
        }' "analysis-$ANALYSIS_ID-final.json" 2>/dev/null || echo "Could not parse results"
        
        exit 0
    elif [ "$STATUS" = "failed" ]; then
        echo -e " ${RED}✗ Analysis failed${NC}"
        echo "$PROGRESS_RESPONSE" | jq '.' 2>/dev/null || echo "$PROGRESS_RESPONSE"
        exit 1
    elif [ "$STATUS" = "processing" ] || [ "$STATUS" = "queued" ]; then
        PROGRESS=$(echo "$PROGRESS_RESPONSE" | jq -r '.progress // 0' 2>/dev/null)
        CURRENT_STEP=$(echo "$PROGRESS_RESPONSE" | jq -r '.currentStep // ""' 2>/dev/null)
        echo -e " Status: $STATUS ($PROGRESS%) - $CURRENT_STEP"
    else
        echo -e " ${RED}Unknown status${NC}"
        echo "Response: $PROGRESS_RESPONSE"
    fi
    
    sleep 5
done

echo ""
echo -e "${RED}Analysis did not complete within 5 minutes${NC}"
echo -e "${YELLOW}Files saved:${NC}"
echo "- Initial: analysis-$ANALYSIS_ID-initial.json"
echo "- Final: analysis-$ANALYSIS_ID-final.json"