#!/bin/bash
# Execute Supabase Security and Performance Fixes
# Direct PostgreSQL connection version (no Supabase CLI needed)

PROJECT_ID="ftjhmbbcuqjqmmbaymqb"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

echo "========================================="
echo "Supabase Security & Performance Fix"
echo "========================================="
echo ""
echo "Project ID: $PROJECT_ID"
echo "Total Fixes: 108 (71 Security + 37 Performance)"
echo ""
echo "⚠️  This will:"
echo "  - Enable RLS on 17 tables"
echo "  - Add policies to 24+ tables"
echo "  - Create 30+ indexes"
echo "  - Vacuum tables with dead rows"
echo ""

# Database connection details
DB_HOST="db.${PROJECT_ID}.supabase.co"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres"

# Check for database password
if [ -z "$SUPABASE_DB_PASSWORD" ]; then
    echo "Please enter your Supabase database password:"
    echo "(You can find it in Settings > Database in your Supabase dashboard)"
    read -s SUPABASE_DB_PASSWORD
    echo ""
fi

# Test connection
echo "Testing database connection..."
PGPASSWORD=$SUPABASE_DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1" > /dev/null 2>&1

if [ $? -ne 0 ]; then
    echo "❌ Failed to connect to database. Please check your password."
    exit 1
fi

echo "✅ Connected to database successfully!"
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
    echo "⚠️  Verification script not found, creating basic check..."
    
    PGPASSWORD=$SUPABASE_DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << EOF
-- Quick verification
SELECT 
    'Security Issues' as category,
    COUNT(*) as remaining_issues
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename 
WHERE t.schemaname = 'public' 
AND (NOT c.relrowsecurity OR (c.relrowsecurity AND NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.tablename = t.tablename)));

SELECT 
    'Performance Issues' as category,
    COUNT(*) as remaining_issues
FROM (
    SELECT tc.table_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
) fk
WHERE NOT EXISTS (
    SELECT 1 FROM pg_index i
    JOIN pg_class t ON t.oid = i.indrelid
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(i.indkey)
    WHERE t.relname = fk.table_name AND a.attname = fk.column_name
);
EOF
fi

echo ""
echo "✅ All done! Your Supabase project should now be:"
echo "   - Secured with RLS and policies"
echo "   - Optimized with proper indexes"
echo "   - Cleaned of dead rows"
echo ""
echo "📊 Check your Supabase dashboard - security and performance issues should be resolved!"
echo ""
echo "You can also connect directly using:"
echo "PGPASSWORD='your-password' psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"
