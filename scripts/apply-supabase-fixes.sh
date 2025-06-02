#!/bin/bash
# Supabase Security and Performance Fix Implementation
# This script helps apply fixes in a controlled manner

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ID="ftjhmbbcuqjqmmbaymqb"

echo "========================================="
echo "Supabase Security & Performance Fix Tool"
echo "========================================="
echo ""
echo "Project ID: $PROJECT_ID"
echo "Total Issues: 108 (71 Security + 37 Performance)"
echo ""

# Function to execute SQL and check result
execute_sql() {
    local phase=$1
    local description=$2
    local sql_file=$3
    
    echo "Phase $phase: $description"
    echo "Executing: $sql_file"
    
    # Here you would use Supabase CLI or API to execute
    # For now, we'll create the SQL files
    echo "Created SQL file: $sql_file"
    echo ""
}

# Create phase-specific SQL files
cat > "$SCRIPT_DIR/fix-phase-1-critical-security.sql" << 'EOF'
-- Phase 1: Critical Security Fixes
-- Enable RLS on unprotected tables (HIGH PRIORITY)

BEGIN;

-- Enable RLS on critical tables containing sensitive data
ALTER TABLE public.analysis_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repository_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repository_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vector_embeddings ENABLE ROW LEVEL SECURITY;

-- Add basic "authenticated users only" policies as a safety net
CREATE POLICY "Authenticated users only" ON public.analysis_chunks
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users only" ON public.analysis_results
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users only" ON public.repository_analysis
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users only" ON public.repository_access_logs
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users only" ON public.vector_embeddings
    FOR SELECT USING (auth.uid() IS NOT NULL);

COMMIT;
EOF

cat > "$SCRIPT_DIR/fix-phase-2-performance-quick.sql" << 'EOF'
-- Phase 2: Performance Quick Wins
-- Add missing indexes and vacuum tables

BEGIN;

-- Add critical missing foreign key indexes
CREATE INDEX IF NOT EXISTS idx_analysis_queue_pr_review_id ON public.analysis_queue(pr_review_id);
CREATE INDEX IF NOT EXISTS idx_analysis_queue_repository_id ON public.analysis_queue(repository_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_repository_access_logs_organization_id ON public.repository_access_logs(organization_id);

-- Add indexes for vector similarity search (critical for RAG)
CREATE INDEX IF NOT EXISTS idx_analysis_chunks_embedding ON public.analysis_chunks USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_educational_patterns_embedding ON public.educational_patterns USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_embedding ON public.knowledge_items USING ivfflat (embedding vector_cosine_ops);

-- Add time-based indexes for common queries
CREATE INDEX IF NOT EXISTS idx_analysis_chunks_created_at ON public.analysis_chunks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_repositories_last_analyzed_at ON public.repositories(last_analyzed_at DESC);

COMMIT;

-- Vacuum tables with high dead row counts
VACUUM ANALYZE public.users;
VACUUM ANALYZE public.analysis_chunks;
VACUUM ANALYZE public.pr_reviews;
VACUUM ANALYZE public.model_configurations;
VACUUM ANALYZE public.repositories;
EOF

cat > "$SCRIPT_DIR/fix-phase-3-granular-policies.sql" << 'EOF'
-- Phase 3: Granular Security Policies
-- Add proper access control policies

BEGIN;

-- Fix tables with RLS enabled but no policies
-- user_skills policies
CREATE POLICY "Users can view their own skills" ON public.user_skills
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own skills" ON public.user_skills
    FOR ALL USING (user_id = auth.uid());

-- search_cache policies  
CREATE POLICY "Users can view their own search cache" ON public.search_cache
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own search cache" ON public.search_cache
    FOR ALL USING (user_id = auth.uid());

-- educational_patterns policies (public read)
CREATE POLICY "Anyone can view educational patterns" ON public.educational_patterns
    FOR SELECT USING (true);

-- knowledge_items policies (public read)
CREATE POLICY "Anyone can view knowledge items" ON public.knowledge_items
    FOR SELECT USING (true);

-- Repository-based access control
DROP POLICY IF EXISTS "Authenticated users only" ON public.analysis_chunks;
CREATE POLICY "Users can view analysis for accessible repos" ON public.analysis_chunks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.repositories r
            WHERE r.id = analysis_chunks.repository_id
            AND (
                r.is_private = false OR
                EXISTS (
                    SELECT 1 FROM public.repository_access_logs ral
                    WHERE ral.repository_id = r.id
                    AND ral.user_id = auth.uid()
                    AND ral.revoked_at IS NULL
                )
            )
        )
    );

COMMIT;
EOF

cat > "$SCRIPT_DIR/fix-phase-4-remaining-tables.sql" << 'EOF'
-- Phase 4: Remaining Security and Performance Fixes
-- Complete the security model and add remaining indexes

BEGIN;

-- Enable RLS on remaining tables
ALTER TABLE public.calibration_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calibration_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calibration_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chunk_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.combined_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_collection_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repository_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repository_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Add admin-only policies for calibration tables
CREATE POLICY "Admins only" ON public.calibration_runs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role = 'admin'
        )
    );

-- Add remaining performance indexes
CREATE INDEX IF NOT EXISTS idx_calibration_data_analysis_id ON public.calibration_data(analysis_id);
CREATE INDEX IF NOT EXISTS idx_organization_memberships_invited_by ON public.organization_memberships(invited_by);
CREATE INDEX IF NOT EXISTS idx_repository_access_logs_granted_by ON public.repository_access_logs(granted_by);
CREATE INDEX IF NOT EXISTS idx_repository_access_logs_revoked_by ON public.repository_access_logs(revoked_by);
CREATE INDEX IF NOT EXISTS idx_subscriptions_organization_id ON public.subscriptions(organization_id);

-- Add composite indexes
CREATE INDEX IF NOT EXISTS idx_repositories_owner_name ON public.repositories(owner, name);
CREATE INDEX IF NOT EXISTS idx_pr_reviews_repository_id_number ON public.pr_reviews(repository_id, number);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id_created_at ON public.security_events(user_id, created_at DESC);

COMMIT;
EOF

# Create verification script
cat > "$SCRIPT_DIR/verify-fixes.sql" << 'EOF'
-- Verification Queries

-- 1. Check RLS Status
SELECT 
    t.tablename,
    CASE WHEN c.relrowsecurity THEN '✅ Enabled' ELSE '❌ Disabled' END as rls_status,
    COUNT(p.policyname) as policy_count,
    CASE 
        WHEN c.relrowsecurity AND COUNT(p.policyname) = 0 THEN '⚠️  No Policies!'
        WHEN c.relrowsecurity AND COUNT(p.policyname) > 0 THEN '✅ Has Policies'
        ELSE '❌ No RLS'
    END as status
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename 
    AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = t.schemaname)
LEFT JOIN pg_policies p ON p.tablename = t.tablename AND p.schemaname = t.schemaname
WHERE t.schemaname = 'public'
GROUP BY t.tablename, c.relrowsecurity
ORDER BY status DESC, t.tablename;

-- 2. Check Missing Indexes
WITH foreign_keys AS (
    SELECT
        tc.table_name,
        kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
),
indexed_columns AS (
    SELECT
        t.relname AS table_name,
        a.attname AS column_name
    FROM pg_index i
    JOIN pg_class t ON t.oid = i.indrelid
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(i.indkey)
    WHERE t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
)
SELECT 
    fk.table_name,
    fk.column_name,
    CASE WHEN ic.column_name IS NULL THEN '❌ Missing Index' ELSE '✅ Indexed' END as status
FROM foreign_keys fk
LEFT JOIN indexed_columns ic ON fk.table_name = ic.table_name AND fk.column_name = ic.column_name
ORDER BY status DESC, fk.table_name;

-- 3. Check Dead Rows
SELECT 
    schemaname,
    relname as tablename,
    n_live_tup as live_rows,
    n_dead_tup as dead_rows,
    CASE 
        WHEN n_live_tup > 0 THEN ROUND((n_dead_tup::numeric / n_live_tup::numeric) * 100, 2)
        ELSE 0
    END as dead_percent,
    CASE 
        WHEN n_dead_tup > 100 THEN '⚠️  High Dead Rows'
        ELSE '✅ OK'
    END as status
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_dead_tup DESC;
EOF

echo "Phase SQL files created:"
echo "1. fix-phase-1-critical-security.sql"
echo "2. fix-phase-2-performance-quick.sql"
echo "3. fix-phase-3-granular-policies.sql"
echo "4. fix-phase-4-remaining-tables.sql"
echo "5. verify-fixes.sql"
echo ""
echo "To apply fixes:"
echo "1. Review each phase SQL file"
echo "2. Test in development environment first"
echo "3. Create a database backup"
echo "4. Apply phases one by one, verifying after each"
echo ""
echo "Example using Supabase CLI:"
echo "supabase db push --db-url postgresql://postgres:[password]@db.$PROJECT_ID.supabase.co:5432/postgres < fix-phase-1-critical-security.sql"
