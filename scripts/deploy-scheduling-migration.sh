#!/bin/bash

# Deploy scheduling migration to Supabase
# This script applies the repository scheduling tables to the database

set -e  # Exit on error

echo "🚀 Deploying Repository Scheduling Migration..."

# Load environment variables
source .env

# Check if Supabase URL and key are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
    echo "❌ Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env"
    exit 1
fi

# Path to migration file
MIGRATION_FILE="packages/database/migrations/20250615_repository_scheduling.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Error: Migration file not found: $MIGRATION_FILE"
    exit 1
fi

echo "📄 Applying migration: $MIGRATION_FILE"

# Apply migration using Supabase CLI or direct connection
if command -v supabase &> /dev/null; then
    echo "Using Supabase CLI..."
    supabase db push --db-url "$SUPABASE_URL"
else
    echo "Using direct PostgreSQL connection..."
    # Extract database connection from Supabase URL
    DB_URL=$(echo $SUPABASE_URL | sed 's/https:\/\//postgresql:\/\/postgres:/')
    DB_URL="${DB_URL/\.supabase\.co/.supabase.co:5432/postgres}"
    
    # Apply migration
    psql "$DB_URL" < "$MIGRATION_FILE"
fi

echo "✅ Repository Scheduling migration applied successfully!"

# Test the tables were created
echo "🔍 Verifying tables..."
cat << EOF | psql "$DB_URL" -t
SELECT 
    'repository_schedules' as table_name,
    COUNT(*) as row_count
FROM repository_schedules
UNION ALL
SELECT 
    'schedule_runs' as table_name,
    COUNT(*) as row_count
FROM schedule_runs;
EOF

echo "✅ Scheduling system is ready to use!"
echo ""
echo "📝 Next steps:"
echo "1. Run the API server: npm run dev"
echo "2. Trigger a PR analysis to auto-create a schedule"
echo "3. Check schedules at: GET /api/schedules"
echo "4. View schedule API docs in: /docs/api/scheduling-endpoints.md"
