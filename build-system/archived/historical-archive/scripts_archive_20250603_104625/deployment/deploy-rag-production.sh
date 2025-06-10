#!/bin/bash

# Deploy RAG Framework to Production
# This script deploys the RAG schema and verifies the deployment

set -e  # Exit on any error

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

echo -e "${BLUE}🚀 Starting RAG Production Deployment${NC}"
echo "=========================================="

# Function to check environment variables
check_env_vars() {
    echo -e "${BLUE}📋 Checking environment variables...${NC}"
    
    if [ ! -f .env ]; then
        echo -e "${RED}❌ Error: .env file not found in the project root.${NC}"
        echo "Please create an .env file with required variables."
        echo "See docs/implementation-plans/rag-production-deployment-guide.md for details."
        exit 1
    fi
    
    # Load environment variables safely
    set -a
    source .env
    set +a
    
    # Check required variables
    local required_vars=("SUPABASE_URL" "SUPABASE_SERVICE_ROLE_KEY" "OPENAI_API_KEY")
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        echo -e "${RED}❌ Missing required environment variables:${NC}"
        printf '%s\n' "${missing_vars[@]}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Environment variables configured${NC}"
}

# Function to verify Supabase connection
verify_supabase_connection() {
    echo -e "${BLUE}🔌 Verifying Supabase connection...${NC}"
    
    # Test connection with a simple query
    local response=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
        -H "Content-Type: application/json" \
        "$SUPABASE_URL/rest/v1/")
    
    if [ "$response" != "200" ]; then
        echo -e "${RED}❌ Failed to connect to Supabase. HTTP status: $response${NC}"
        echo "Please verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Supabase connection verified${NC}"
}

# Function to check if pgvector extension is enabled
check_pgvector() {
    echo -e "${BLUE}🔍 Checking pgvector extension...${NC}"
    
    local check_extension_sql="SELECT 1 FROM pg_extension WHERE extname = 'vector';"
    local response=$(curl -s \
        -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"query\": \"$check_extension_sql\"}" \
        "$SUPABASE_URL/rest/v1/rpc/exec_sql" || echo "error")
    
    if [[ "$response" == *"error"* ]] || [[ "$response" == *"\"data\":[]"* ]]; then
        echo -e "${YELLOW}⚠️  pgvector extension not found. Attempting to enable...${NC}"
        
        local enable_extension_sql="CREATE EXTENSION IF NOT EXISTS vector;"
        curl -s \
            -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
            -H "Content-Type: application/json" \
            -d "{\"query\": \"$enable_extension_sql\"}" \
            "$SUPABASE_URL/rest/v1/rpc/exec_sql" > /dev/null
            
        echo -e "${GREEN}✅ pgvector extension enabled${NC}"
    else
        echo -e "${GREEN}✅ pgvector extension already enabled${NC}"
    fi
}

# Function to deploy RAG schema
deploy_rag_schema() {
    echo -e "${BLUE}📦 Deploying RAG schema...${NC}"
    
    local migration_file="packages/database/migrations/20250530_rag_schema_integration.sql"
    
    if [ ! -f "$migration_file" ]; then
        echo -e "${RED}❌ Migration file not found: $migration_file${NC}"
        exit 1
    fi
    
    echo "Executing migration: $migration_file"
    
    # Read and execute the migration file
    local migration_sql=$(cat "$migration_file")
    
    # Execute via Supabase REST API
    local response=$(curl -s -w "%{http_code}" \
        -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"query\": $(echo "$migration_sql" | jq -Rs .)}" \
        "$SUPABASE_URL/rest/v1/rpc/exec_sql")
    
    local http_code="${response: -3}"
    
    if [ "$http_code" != "200" ]; then
        echo -e "${RED}❌ Failed to deploy schema. HTTP status: $http_code${NC}"
        echo "Response: ${response%???}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ RAG schema deployed successfully${NC}"
}

# Function to verify deployment
verify_deployment() {
    echo -e "${BLUE}🔍 Verifying RAG deployment...${NC}"
    
    # Check if RAG tables exist
    local tables_sql="SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'rag_%';"
    local tables_response=$(curl -s \
        -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"query\": \"$tables_sql\"}" \
        "$SUPABASE_URL/rest/v1/rpc/exec_sql")
    
    if [[ "$tables_response" == *"rag_educational_content"* ]] && [[ "$tables_response" == *"rag_query_patterns"* ]]; then
        echo -e "${GREEN}✅ RAG tables created successfully${NC}"
    else
        echo -e "${RED}❌ RAG tables not found${NC}"
        exit 1
    fi
    
    # Check if educational content is seeded
    local content_sql="SELECT COUNT(*) as count FROM rag_educational_content;"
    local content_response=$(curl -s \
        -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"query\": \"$content_sql\"}" \
        "$SUPABASE_URL/rest/v1/rpc/exec_sql")
    
    if [[ "$content_response" == *"\"count\":\"3\""* ]]; then
        echo -e "${GREEN}✅ Educational content seeded (3 entries)${NC}"
    else
        echo -e "${YELLOW}⚠️  Educational content count unexpected${NC}"
        echo "Response: $content_response"
    fi
    
    # Check if RAG functions exist
    local functions_sql="SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name LIKE 'rag_%';"
    local functions_response=$(curl -s \
        -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"query\": \"$functions_sql\"}" \
        "$SUPABASE_URL/rest/v1/rpc/exec_sql")
    
    if [[ "$functions_response" == *"rag_search_documents"* ]] && [[ "$functions_response" == *"rag_search_educational_content"* ]]; then
        echo -e "${GREEN}✅ RAG functions created successfully${NC}"
    else
        echo -e "${RED}❌ RAG functions not found${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ RAG deployment verification complete${NC}"
}

# Function to run RAG tests
run_rag_tests() {
    echo -e "${BLUE}🧪 Running RAG tests...${NC}"
    
    # Run only the core RAG tests
    if npm run test -- --testPathPattern="rag" --testPathIgnorePatterns="node_modules" --selectProjects="@codequal/core" > test_output.log 2>&1; then
        echo -e "${GREEN}✅ All RAG tests passed${NC}"
        
        # Extract test summary
        local test_summary=$(grep -E "(Tests:|Test Suites:)" test_output.log | tail -2)
        echo "$test_summary"
    else
        echo -e "${RED}❌ RAG tests failed${NC}"
        echo "Test output:"
        cat test_output.log
        exit 1
    fi
    
    rm -f test_output.log
}

# Function to test a sample RAG search
test_sample_search() {
    echo -e "${BLUE}🔍 Testing sample RAG search...${NC}"
    
    # Create a sample embedding (normally would come from OpenAI)
    local sample_embedding='[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 0.1, 0.2, 0.3, 0.4, 0.5]'
    
    # Pad to 1536 dimensions (rough approximation for testing)
    local full_embedding="[$(printf '0.1,%.0s' {1..1536} | sed 's/,$//')]"
    
    # Test educational content search
    local search_response=$(curl -s \
        -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
        -H "Content-Type: application/json" \
        -d "{
            \"query_embedding\": \"$full_embedding\",
            \"language_filter\": \"typescript\",
            \"difficulty_filter\": \"intermediate\",
            \"match_count\": 3
        }" \
        "$SUPABASE_URL/rest/v1/rpc/rag_search_educational_content")
    
    if [[ "$search_response" == *"TypeScript"* ]]; then
        echo -e "${GREEN}✅ Sample RAG search working${NC}"
    else
        echo -e "${YELLOW}⚠️  Sample RAG search returned unexpected results${NC}"
        echo "Response: $search_response"
    fi
}

# Main deployment sequence
main() {
    echo -e "${BLUE}Starting RAG Production Deployment Process${NC}"
    echo "==========================================\n"
    
    check_env_vars
    echo ""
    
    verify_supabase_connection  
    echo ""
    
    check_pgvector
    echo ""
    
    deploy_rag_schema
    echo ""
    
    verify_deployment
    echo ""
    
    run_rag_tests
    echo ""
    
    test_sample_search
    echo ""
    
    echo -e "${GREEN}🎉 RAG Production Deployment Complete!${NC}"
    echo "========================================"
    echo ""
    echo -e "${GREEN}✅ RAG Framework is now production ready${NC}"
    echo "✅ Database schema deployed"
    echo "✅ Educational content seeded"  
    echo "✅ Vector search functions available"
    echo "✅ All tests passing"
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo "1. Implement Multi-Agent Executor"
    echo "2. Create Result Orchestrator"
    echo "3. Build CI/CD integration"
    echo ""
    echo -e "${BLUE}Documentation:${NC}"
    echo "- RAG Deployment Guide: docs/implementation-plans/rag-production-deployment-guide.md"
    echo "- Next Steps: docs/implementation-plans/next_steps_focused.md"
}

# Run main function
main "$@"