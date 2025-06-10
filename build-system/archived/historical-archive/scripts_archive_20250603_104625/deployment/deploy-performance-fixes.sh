#!/bin/bash

# Supabase Performance Fix Deployment Script
# This script applies the performance fixes to your Supabase database

set -e

echo "🚀 Supabase Performance Fix Deployment"
echo "====================================="

# Check if project ID is provided
if [ -z "$1" ]; then
    echo "❌ Error: Please provide your Supabase project ID"
    echo "Usage: ./deploy-performance-fixes.sh <project-id>"
    echo "Example: ./deploy-performance-fixes.sh ftjhmbbcuqjqmmbaymqb"
    exit 1
fi

PROJECT_ID=$1
SQL_FILE="database/migrations/fix-slow-queries.sql"

echo "📋 Project ID: $PROJECT_ID"
echo "📁 SQL File: $SQL_FILE"

# Function to execute SQL
execute_sql() {
    local sql_content=$1
    local description=$2
    
    echo ""
    echo "🔧 Applying: $description"
    echo "-----------------------------------"
    
    # You'll need to set SUPABASE_DB_URL environment variable
    if [ -z "$SUPABASE_DB_URL" ]; then
        echo "❌ Error: SUPABASE_DB_URL environment variable not set"
        echo "Please set it with your database connection string"
        exit 1
    fi
    
    psql "$SUPABASE_DB_URL" -c "$sql_content"
    
    if [ $? -eq 0 ]; then
        echo "✅ Success: $description"
    else
        echo "⚠️  Warning: Failed to apply $description (may require higher privileges)"
    fi
}

# Step 1: Create materialized view for timezone names (HIGHEST PRIORITY)
echo ""
echo "📊 Step 1: Creating materialized view for timezone names"
echo "This will reduce 131 queries to just 1!"

execute_sql "
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_timezone_names AS
SELECT name FROM pg_timezone_names;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_timezone_names_name 
ON mv_timezone_names(name);

REFRESH MATERIALIZED VIEW mv_timezone_names;

GRANT SELECT ON mv_timezone_names TO authenticated;
" "Timezone materialized view"

# Step 2: Create application-specific indexes
echo ""
echo "📊 Step 2: Creating application indexes"

# Vector search indexes
execute_sql "
CREATE INDEX IF NOT EXISTS idx_analysis_chunks_embedding ON analysis_chunks 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);
" "Analysis chunks vector index"

execute_sql "
CREATE INDEX IF NOT EXISTS idx_educational_patterns_embedding ON educational_patterns 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 50);
" "Educational patterns vector index"

execute_sql "
CREATE INDEX IF NOT EXISTS idx_knowledge_items_embedding ON knowledge_items 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 50);
" "Knowledge items vector index"

# Repository indexes
execute_sql "
CREATE INDEX IF NOT EXISTS idx_repositories_github_id ON repositories(github_id);
CREATE INDEX IF NOT EXISTS idx_repositories_owner_name ON repositories(owner, name);
CREATE INDEX IF NOT EXISTS idx_repositories_last_analyzed ON repositories(last_analyzed_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_repositories_platform ON repositories(platform);
" "Repository indexes"

# PR Reviews indexes
execute_sql "
CREATE INDEX IF NOT EXISTS idx_pr_reviews_repository_id ON pr_reviews(repository_id);
CREATE INDEX IF NOT EXISTS idx_pr_reviews_number ON pr_reviews(repository_id, number);
CREATE INDEX IF NOT EXISTS idx_pr_reviews_state ON pr_reviews(state);
CREATE INDEX IF NOT EXISTS idx_pr_reviews_created_at ON pr_reviews(created_at DESC);
" "PR Reviews indexes"

# Analysis Queue indexes
execute_sql "
CREATE INDEX IF NOT EXISTS idx_analysis_queue_status ON analysis_queue(status);
CREATE INDEX IF NOT EXISTS idx_analysis_queue_repository_id ON analysis_queue(repository_id);
CREATE INDEX IF NOT EXISTS idx_analysis_queue_pr_review_id ON analysis_queue(pr_review_id);
CREATE INDEX IF NOT EXISTS idx_analysis_queue_priority ON analysis_queue(priority DESC, created_at ASC);
" "Analysis Queue indexes"

# Step 3: Update table statistics
echo ""
echo "📊 Step 3: Updating table statistics"

execute_sql "
ANALYZE repositories;
ANALYZE pr_reviews;
ANALYZE analysis_queue;
ANALYZE analysis_chunks;
ANALYZE educational_patterns;
ANALYZE knowledge_items;
" "Table statistics"

# Step 4: Create maintenance functions
echo ""
echo "📊 Step 4: Creating maintenance functions"

execute_sql "
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS \$\$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_timezone_names;
END;
\$\$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION maintain_indexes()
RETURNS void AS \$\$
BEGIN
    REINDEX TABLE CONCURRENTLY analysis_chunks;
    REINDEX TABLE CONCURRENTLY chunk_relationships;
END;
\$\$ LANGUAGE plpgsql;
" "Maintenance functions"

echo ""
echo "====================================="
echo "✅ Performance fix deployment complete!"
echo ""
echo "📈 Expected improvements:"
echo "   - Timezone queries: 99.6% faster (13,241ms → ~50ms)"
echo "   - Vector searches: 50-90% faster"
echo "   - Repository lookups: 80% faster"
echo ""
echo "🔄 Next steps:"
echo "   1. Monitor query performance in Supabase Dashboard"
echo "   2. Set up daily refresh for materialized views"
echo "   3. Schedule weekly index maintenance"
echo ""
echo "💡 To refresh materialized view manually:"
echo "   SELECT refresh_materialized_views();"
