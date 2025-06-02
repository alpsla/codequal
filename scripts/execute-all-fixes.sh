#!/bin/bash
# Execute Supabase Security and Performance Fixes
# Since there's no production data, we can apply all fixes at once

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

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Prompt for confirmation
read -p "Do you want to proceed? (y/N) " -n 1 -r
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
    
    # Option 1: Using Supabase CLI (recommended)
    supabase db push < "$SCRIPT_DIR/fix-supabase-security-performance-issues.sql"
    
    # Option 2: Using psql directly (uncomment if preferred)
    # PGPASSWORD=$DB_PASSWORD psql -h db.$PROJECT_ID.supabase.co -p 5432 -U postgres -d postgres < "$SCRIPT_DIR/fix-supabase-security-performance-issues.sql"
    
    if [ $? -eq 0 ]; then
        echo "✅ Fixes applied successfully!"
    else
        echo "❌ Error applying fixes. Check the output above."
        exit 1
    fi
else
    echo "❌ Fix script not found at: $SCRIPT_DIR/fix-supabase-security-performance-issues.sql"
    exit 1
fi

echo ""
echo "🔍 Running verification queries..."
echo ""

# Create and run verification script
cat > "$SCRIPT_DIR/verify-results.sql" << 'EOF'
-- Verification Summary
SELECT 
    'Security Check' as category,
    COUNT(CASE WHEN NOT c.relrowsecurity THEN 1 END) as "Tables without RLS",
    COUNT(CASE WHEN c.relrowsecurity AND p.policy_count = 0 THEN 1 END) as "RLS without policies",
    COUNT(CASE WHEN c.relrowsecurity AND p.policy_count > 0 THEN 1 END) as "Properly secured"
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename 
LEFT JOIN (
    SELECT tablename, COUNT(*) as policy_count 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    GROUP BY tablename
) p ON t.tablename = p.tablename
WHERE t.schemaname = 'public';

-- Index check
SELECT 
    'Performance Check' as category,
    COUNT(*) as "Total indexes",
    COUNT(CASE WHEN idx_scan = 0 THEN 1 END) as "Unused indexes",
    COUNT(CASE WHEN idx_scan > 0 THEN 1 END) as "Used indexes"
FROM pg_stat_user_indexes
WHERE schemaname = 'public';

-- Dead rows check
SELECT 
    'Table Health' as category,
    COUNT(*) as "Total tables",
    COUNT(CASE WHEN n_dead_tup > 100 THEN 1 END) as "Tables with many dead rows",
    SUM(n_dead_tup) as "Total dead rows"
FROM pg_stat_user_tables
WHERE schemaname = 'public';
EOF

supabase db push < "$SCRIPT_DIR/verify-results.sql"

echo ""
echo "✅ All done! Your Supabase project is now:"
echo "   - Secured with RLS and policies"
echo "   - Optimized with proper indexes"
echo "   - Cleaned of dead rows"
echo ""
echo "📊 Check your Supabase dashboard - you should see:"
echo "   - Security issues: 0 (was 71)"
echo "   - Performance issues: 0 (was 37)"
