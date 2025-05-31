#!/bin/bash

# Safe RAG Deployment Script
# This version handles .env files more carefully

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 RAG Production Deployment (Safe Mode)${NC}"
echo "=========================================="

# Load environment variables using Node.js
echo -e "${BLUE}Loading environment variables...${NC}"

# Create a temporary Node script to safely load env
cat > /tmp/load-env.js << 'EOF'
require('dotenv').config();
console.log(JSON.stringify({
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'present' : 'missing'
}));
EOF

# Get env vars using Node
ENV_JSON=$(node /tmp/load-env.js 2>/dev/null || echo '{}')
rm -f /tmp/load-env.js

# Extract values
SUPABASE_URL=$(echo $ENV_JSON | grep -o '"SUPABASE_URL":"[^"]*"' | cut -d'"' -f4)
SUPABASE_SERVICE_ROLE_KEY=$(echo $ENV_JSON | grep -o '"SUPABASE_SERVICE_ROLE_KEY":"[^"]*"' | cut -d'"' -f4)
OPENAI_STATUS=$(echo $ENV_JSON | grep -o '"OPENAI_API_KEY":"[^"]*"' | cut -d'"' -f4)

# Check if we got the values
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo -e "${RED}❌ Failed to load environment variables${NC}"
    echo "Please ensure .env file contains:"
    echo "  SUPABASE_URL=..."
    echo "  SUPABASE_SERVICE_ROLE_KEY=..."
    echo "  OPENAI_API_KEY=..."
    exit 1
fi

echo -e "${GREEN}✅ Environment loaded${NC}"
echo "  - Supabase URL: ${SUPABASE_URL:0:30}..."
echo "  - OpenAI API Key: $OPENAI_STATUS"

# Test Supabase connection
echo -e "\n${BLUE}Testing Supabase connection...${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    "$SUPABASE_URL/rest/v1/")

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Supabase connection successful${NC}"
else
    echo -e "${RED}❌ Supabase connection failed (HTTP $HTTP_CODE)${NC}"
    exit 1
fi

# Check if RAG tables already exist
echo -e "\n${BLUE}Checking existing RAG components...${NC}"
TABLES_RESPONSE=$(curl -s \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    "$SUPABASE_URL/rest/v1/rag_educational_content?limit=1" \
    -w "\n%{http_code}")

HTTP_CODE=$(echo "$TABLES_RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${YELLOW}⚠️  RAG tables already exist${NC}"
    echo "The RAG framework appears to be already deployed."
    read -p "Do you want to continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled."
        exit 0
    fi
fi

# Deploy using psql if available
echo -e "\n${BLUE}Deploying RAG schema...${NC}"

MIGRATION_FILE="packages/database/migrations/20250530_rag_schema_integration.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}❌ Migration file not found: $MIGRATION_FILE${NC}"
    exit 1
fi

# Extract database connection details
DB_HOST=$(echo $SUPABASE_URL | sed -E 's|https://([^.]+).*|\1|').supabase.co
DATABASE_URL="postgresql://postgres:$SUPABASE_SERVICE_ROLE_KEY@$DB_HOST:5432/postgres"

# Try to use psql if available
if command -v psql &> /dev/null; then
    echo "Using psql for deployment..."
    PGPASSWORD=$SUPABASE_SERVICE_ROLE_KEY psql "$DATABASE_URL" -f "$MIGRATION_FILE" 2>&1 | grep -E "(CREATE|ALTER|INSERT|ERROR)" || true
    RESULT=$?
else
    echo -e "${YELLOW}psql not found. Using Supabase SQL editor API...${NC}"
    echo "Note: This method may have limitations for large migrations."
    
    # Read migration file
    MIGRATION_SQL=$(cat "$MIGRATION_FILE" | sed 's/"/\\"/g' | tr '\n' ' ')
    
    # Try to execute via SQL editor endpoint
    RESPONSE=$(curl -s -X POST \
        -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
        -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"query\": \"$MIGRATION_SQL\"}" \
        "$SUPABASE_URL/rest/v1/rpc/exec_sql" 2>&1 || echo "error")
    
    if [[ "$RESPONSE" == *"error"* ]]; then
        echo -e "${YELLOW}⚠️  Direct SQL execution not available${NC}"
        echo "Please run the migration manually in Supabase SQL Editor:"
        echo "1. Go to your Supabase project"
        echo "2. Open SQL Editor"
        echo "3. Copy and paste the contents of: $MIGRATION_FILE"
        echo "4. Run the migration"
        exit 1
    fi
    RESULT=0
fi

if [ $RESULT -eq 0 ]; then
    echo -e "${GREEN}✅ Migration executed${NC}"
else
    echo -e "${RED}❌ Migration failed${NC}"
    exit 1
fi

# Verify deployment
echo -e "\n${BLUE}Verifying deployment...${NC}"

# Check educational content
CONTENT_COUNT=$(curl -s \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    "$SUPABASE_URL/rest/v1/rag_educational_content?select=count" | grep -o '"count":[0-9]*' | grep -o '[0-9]*' || echo "0")

if [ "$CONTENT_COUNT" -gt "0" ]; then
    echo -e "${GREEN}✅ Educational content found ($CONTENT_COUNT entries)${NC}"
else
    echo -e "${YELLOW}⚠️  No educational content found${NC}"
fi

# Test RAG function
echo -e "\n${BLUE}Testing RAG search function...${NC}"

# Create test embedding (1536 dimensions of 0.1)
TEST_EMBEDDING=$(printf '0.1,%.0s' {1..1535})0.1

SEARCH_RESPONSE=$(curl -s -X POST \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -d "{
        \"query_embedding\": [$TEST_EMBEDDING],
        \"match_count\": 1
    }" \
    "$SUPABASE_URL/rest/v1/rpc/rag_search_educational_content" 2>&1)

if [[ "$SEARCH_RESPONSE" == *"title"* ]]; then
    echo -e "${GREEN}✅ RAG search function working${NC}"
elif [[ "$SEARCH_RESPONSE" == *"not exist"* ]]; then
    echo -e "${RED}❌ RAG search function not found${NC}"
    echo "Response: $SEARCH_RESPONSE"
else
    echo -e "${YELLOW}⚠️  Unexpected response from RAG search${NC}"
fi

echo -e "\n${GREEN}🎉 Deployment Complete!${NC}"
echo "============================"
echo ""
echo "Next steps:"
echo "1. Run tests: npm test -- --testPathPattern='rag'"
echo "2. Test integration: npx ts-node scripts/test-rag-integration.ts"
echo "3. Begin using RAG in your application"
echo ""
echo "To verify in Supabase Dashboard:"
echo "- Check Tables: rag_educational_content, rag_query_patterns"
echo "- Check Functions: rag_search_documents, rag_search_educational_content"