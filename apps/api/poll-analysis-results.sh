#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

if [ -z "$1" ] || [ -z "$2" ]; then
    echo -e "${RED}Usage: $0 <auth-token> <analysis-id>${NC}"
    echo "Example: $0 YOUR_TOKEN analysis_1752684396770_9jl5eh7d1"
    exit 1
fi

AUTH_TOKEN=$1
ANALYSIS_ID=$2
MAX_ATTEMPTS=60  # 5 minutes with 5-second intervals
ATTEMPT=0

echo -e "${BLUE}=== Polling for Analysis Results ===${NC}"
echo "Analysis ID: $ANALYSIS_ID"
echo ""

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    ATTEMPT=$((ATTEMPT + 1))
    
    echo -ne "${YELLOW}Attempt $ATTEMPT/$MAX_ATTEMPTS...${NC}"
    
    # Check status
    RESPONSE=$(curl -s -X GET "http://localhost:3001/api/result-orchestrator/analysis/$ANALYSIS_ID/progress" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -H "Content-Type: application/json")
    
    STATUS=$(echo "$RESPONSE" | jq -r '.status' 2>/dev/null)
    
    if [ "$STATUS" = "complete" ]; then
        echo -e " ${GREEN}✓ Analysis completed!${NC}"
        echo ""
        echo -e "${BLUE}Saving full results...${NC}"
        
        # The results are included in the progress response when complete
        echo "$RESPONSE" > "analysis-results-$ANALYSIS_ID.json"
        
        echo -e "${GREEN}Results saved to: analysis-results-$ANALYSIS_ID.json${NC}"
        
        # Show summary if jq is available
        if command -v jq &> /dev/null; then
            echo ""
            echo -e "${BLUE}=== Summary ===${NC}"
            jq '{
                analysisId: .analysisId,
                status: .status,
                repository: .repository,
                prNumber: .prNumber,
                deepWikiAvailable: (.deepWikiData != null),
                totalFindings: (.findings | to_entries | map(.value | length) | add),
                processingSteps: .processingSteps
            }' "analysis-results-$ANALYSIS_ID.json"
        fi
        
        exit 0
    elif [ "$STATUS" = "failed" ]; then
        echo -e " ${RED}✗ Analysis failed${NC}"
        echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
        exit 1
    elif [ "$STATUS" = "processing" ] || [ "$STATUS" = "queued" ]; then
        PROGRESS=$(echo "$RESPONSE" | jq -r '.progress // 0' 2>/dev/null)
        CURRENT_STEP=$(echo "$RESPONSE" | jq -r '.currentStep // ""' 2>/dev/null)
        echo -e " Status: $STATUS ($PROGRESS%) - $CURRENT_STEP"
    else
        echo -e " ${RED}Unknown status or error${NC}"
        echo "$RESPONSE"
    fi
    
    sleep 5
done

echo -e "${RED}✗ Analysis did not complete within 5 minutes${NC}"
exit 1