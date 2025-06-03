#!/bin/bash
# Execute Supabase Security and Performance Fixes
# Reads database password from .env file

PROJECT_ID="ftjhmbbcuqjqmmbaymqb"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "========================================="
echo "Supabase Security & Performance Fix"
echo "========================================="
echo ""
echo "Project ID: $PROJECT_ID"
echo "Total Fixes: 108 (71 Security + 37 Performance)"
echo ""

# Load .env file
if [ -f "$PROJECT_ROOT/.env" ]; then
    echo "Loading database credentials from .env file..."
    # Extract the password from .env
    export SUPABASE_DB_PASSWORD=$(grep "^SUPABASE_DB_PASSWORD=" "$PROJECT_ROOT/.env" | cut -d '=' -f2)
    
    if [ -z "$SUPABASE_DB_PASSWORD" ]; then
        echo "❌ SUPABASE_DB_PASSWORD not found in .env file"
        exit 1
    fi
else
    echo "❌ .env file not found at $PROJECT_ROOT/.env"
    exit 1
fi

# Database connection details
# Note: Using direct connection (port 5432) instead of pooler (port 6543) for DDL operations
DB_HOST="db.${PROJECT_ID}.supabase.co"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres"

echo "Database Host: $DB_HOST"
echo "Database Port: $DB_PORT (direct connection for DDL)"
echo "Database User: $DB_USER"
echo ""

# Test connection
echo "Testing database connection..."
PGPASSWORD=$SUPABASE_DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT version();" > /dev/null 2>&1

if [ $? -ne 0 ]; then
    echo "❌ Failed to connect to database."
    echo ""
    echo "Debugging connection..."
    echo "Trying connection with verbose output:"
    PGPASSWORD=$SUPABASE_DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1"
    echo ""
    echo "Note: Make sure you're using the direct connection (port 5432) not the pooler (port 6543)"
    exit 1
fi

echo "✅ Connected to database successfully!"
echo ""

echo "⚠️  This will:"
echo "  - Enable RLS on 17 tables"
echo "  - Add policies to 24+ tables"
echo "  - Create 30+ indexes"
echo "  - Vacuum tables with dead rows"
echo ""

# Prompt for confirmation
read -p "Do you want to apply all fixes? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo "🔧 Applying all fixes..."
echo ""

# Execute the main fix script
if [ -f "$SCRIPT_DIR/fix-supabase-security-performance-issues.sql" ]; then
    echo "Executing fix-supabase-security-performance-issues.sql..."
    
    PGPASSWORD=$SUPABASE_DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$SCRIPT_DIR/fix-supabase-security-performance-issues.sql"
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Fixes applied successfully!"
    else
        echo ""
        echo "❌ Error applying fixes. Check the output above."
        exit 1
    fi
else
    echo "❌ Fix script not found at: $SCRIPT_DIR/fix-supabase-security-performance-issues.sql"
    exit 1
fi

echo ""
echo "🔍 Running verification..."
echo ""

# Run verification
if [ -f "$SCRIPT_DIR/verify-supabase-fixes.sql" ]; then
    PGPASSWORD=$SUPABASE_DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$SCRIPT_DIR/verify-supabase-fixes.sql"
else
    echo "⚠️  Verification script not found"
fi

echo ""
echo "✅ All done! Check your Supabase dashboard for updated security and performance metrics."
echo ""
echo "Connection used:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
