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

echo -e "${BLUE}=== Debugging Authentication ===${NC}"
echo ""

# Test 1: Try a simple authenticated endpoint
echo -e "${YELLOW}1. Testing simple authenticated endpoint...${NC}"
curl -v -X GET "http://localhost:3001/api/users/profile" \
    -H "Authorization: Bearer $AUTH_TOKEN" 2>&1 | grep -E "(< HTTP|< |{|error|Error)"
echo ""

# Test 2: Try without auth header
echo -e "${YELLOW}2. Testing without auth header...${NC}"
curl -s -X POST "http://localhost:3001/api/result-orchestrator/analyze-pr" \
    -H "Content-Type: application/json" \
    -d '{
        "repositoryUrl": "https://github.com/facebook/react",
        "prNumber": 28298,
        "analysisMode": "comprehensive"
    }' | jq '.' 2>/dev/null || echo "No response"
echo ""

# Test 3: Try with malformed auth header
echo -e "${YELLOW}3. Testing with malformed auth header...${NC}"
curl -s -X POST "http://localhost:3001/api/result-orchestrator/analyze-pr" \
    -H "Authorization: $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "repositoryUrl": "https://github.com/facebook/react",
        "prNumber": 28298,
        "analysisMode": "comprehensive"
    }' | jq '.' 2>/dev/null || echo "No response"
echo ""

# Test 4: Check if we can decode the JWT
echo -e "${YELLOW}4. Decoding JWT token...${NC}"
# Extract the payload (second part of JWT)
PAYLOAD=$(echo "$AUTH_TOKEN" | cut -d'.' -f2)
# Add padding if needed
PAYLOAD_PADDED=$(printf '%s' "$PAYLOAD" | awk '{l=length($0); p=(4-l%4)%4; for(i=0;i<p;i++) $0=$0"="; print $0}')
# Decode
echo "$PAYLOAD_PADDED" | base64 -d 2>/dev/null | jq '.' 2>/dev/null || echo "Could not decode JWT"
echo ""

echo -e "${BLUE}=== Debug Complete ===${NC}"