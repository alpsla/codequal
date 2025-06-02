# Direct PostgreSQL Commands for Supabase Fixes
# Copy and paste these commands to apply fixes

# 1. Set your connection variables
export DB_HOST="db.ftjhmbbcuqjqmmbaymqb.supabase.co"
export DB_PORT="5432"
export DB_NAME="postgres"
export DB_USER="postgres"
export PGPASSWORD="your-database-password-here"

# 2. Apply all fixes (run from the scripts directory)
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f fix-supabase-security-performance-issues.sql

# 3. Verify the fixes
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f verify-supabase-fixes.sql

# Alternative: If you prefer to use the Supabase connection string directly
# psql "postgresql://postgres:your-password@db.ftjhmbbcuqjqmmbaymqb.supabase.co:5432/postgres" -f fix-supabase-security-performance-issues.sql

# Alternative: Using transaction for safety (can rollback if needed)
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << EOF
BEGIN;
\i fix-supabase-security-performance-issues.sql
-- Check results, then either:
-- COMMIT;  -- to apply changes
-- ROLLBACK;  -- to undo changes
EOF
