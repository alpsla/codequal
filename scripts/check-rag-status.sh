#!/bin/bash

# Check RAG Deployment Status
# This script checks what RAG components are already deployed

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory of the script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/.."

# Change to the project root directory
cd "$PROJECT_ROOT"

echo -e "${BLUE}🔍 Checking RAG Deployment Status${NC}"
echo "=========================================="

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
    echo -e "${GREEN}✅ Environment variables loaded${NC}"
else
    echo -e "${RED}❌ .env file not found${NC}"
    exit 1
fi

# Function to execute SQL query via psql
execute_sql() {
    local query=$1
    psql "${DATABASE_URL:-postgresql://postgres:${SUPABASE_DB_PASSWORD:-$SUPABASE_SERVICE_ROLE_KEY}@${SUPABASE_HOST:-db.${SUPABASE_URL#https://}.supabase.co}:5432/postgres}" \
        -t -c "$query" 2>/dev/null || echo "error"
}

# Function to check via Supabase REST API
check_via_api() {
    local table=$1
    local response=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
        -H "Content-Type: application/json" \
        "$SUPABASE_URL/rest/v1/$table?limit=1")
    echo $response
}

echo -e "\n${BLUE}1. Checking Vector Database Foundation${NC}"
echo "----------------------------------------"

# Check analysis_chunks table
response=$(check_via_api "analysis_chunks")
if [ "$response" = "200" ]; then
    echo -e "${GREEN}✅ analysis_chunks table exists${NC}"
else
    echo -e "${RED}❌ analysis_chunks table NOT found (status: $response)${NC}"
fi

echo -e "\n${BLUE}2. Checking RAG-Specific Components${NC}"
echo "----------------------------------------"

# Check RAG tables
for table in "rag_educational_content" "rag_query_patterns"; do
    response=$(check_via_api "$table")
    if [ "$response" = "200" ]; then
        echo -e "${GREEN}✅ $table exists${NC}"
    else
        echo -e "${YELLOW}⚠️  $table NOT found${NC}"
    fi
done

# Check if educational content is seeded
response=$(curl -s \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    "$SUPABASE_URL/rest/v1/rag_educational_content?select=count")

if [[ "$response" == *"count"* ]]; then
    count=$(echo "$response" | grep -o '"count":[0-9]*' | grep -o '[0-9]*')
    if [ -n "$count" ] && [ "$count" -gt 0 ]; then
        echo -e "${GREEN}✅ Educational content seeded ($count entries)${NC}"
    else
        echo -e "${YELLOW}⚠️  No educational content found${NC}"
    fi
fi

echo -e "\n${BLUE}3. Testing RAG Functions${NC}"
echo "----------------------------------------"

# Test if RAG search function exists by calling it
test_embedding='[0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0,0.1,0.2,0.3,0.4,0.5,0.6]'
# Pad to 1536 dimensions
full_embedding="[$(printf '0.1,%.0s' {1..1536} | sed 's/,$//')]"

response=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -d "{
        \"query_embedding\": $full_embedding,
        \"match_count\": 1
    }" \
    "$SUPABASE_URL/rest/v1/rpc/rag_search_educational_content" 2>/dev/null)

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✅ rag_search_educational_content function exists${NC}"
elif [[ "$body" == *"not exist"* ]] || [ "$http_code" = "404" ]; then
    echo -e "${YELLOW}⚠️  rag_search_educational_content function NOT found${NC}"
else
    echo -e "${YELLOW}⚠️  rag_search_educational_content returned: $http_code${NC}"
fi

echo -e "\n${BLUE}4. Summary${NC}"
echo "----------------------------------------"

# Determine deployment status
if [ "$response" = "200" ] && [[ "$body" != *"not exist"* ]]; then
    echo -e "${GREEN}✅ RAG Framework appears to be DEPLOYED${NC}"
    echo -e "${GREEN}   All components are accessible${NC}"
    echo -e "\n${BLUE}Next Steps:${NC}"
    echo "1. Run tests: npm run test -- --testPathPattern='rag'"
    echo "2. Begin using RAG services in your application"
else
    echo -e "${YELLOW}⚠️  RAG Framework NOT fully deployed${NC}"
    echo -e "${YELLOW}   Some components are missing${NC}"
    echo -e "\n${BLUE}Next Steps:${NC}"
    echo "1. Run deployment: npm run deploy:rag"
    echo "2. This will create missing RAG components"
fi

echo -e "\n${BLUE}Environment Status:${NC}"
echo "- SUPABASE_URL: ${SUPABASE_URL:0:30}..."
echo "- OPENAI_API_KEY: ${OPENAI_API_KEY:0:10}..."
echo "- NODE_ENV: ${NODE_ENV:-development}"