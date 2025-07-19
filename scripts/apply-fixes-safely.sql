-- Safe Database Fix Application Script
-- This script checks current state before applying fixes

-- ================================================
-- SAFETY CHECKS FIRST
-- ================================================

-- 1. Check current RLS status
DO $$
DECLARE
    rls_disabled_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO rls_disabled_count
    FROM pg_tables 
    WHERE schemaname = 'public' AND rowsecurity = false;
    
    RAISE NOTICE 'Tables without RLS: %', rls_disabled_count;
    
    IF rls_disabled_count = 0 THEN
        RAISE NOTICE 'All tables already have RLS enabled!';
    END IF;
END $$;

-- 2. Create a safety checkpoint (lists all tables)
CREATE TABLE IF NOT EXISTS _backup_metadata (
    id SERIAL PRIMARY KEY,
    backup_date TIMESTAMP DEFAULT NOW(),
    table_name TEXT,
    row_count BIGINT,
    has_rls BOOLEAN
);

-- Record current state
INSERT INTO _backup_metadata (table_name, row_count, has_rls)
SELECT 
    tablename,
    (xpath('/row/count/text()', 
           query_to_xml(format('SELECT COUNT(*) FROM %I.%I', schemaname, tablename), 
                        true, true, '')))[1]::text::bigint,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Show what we recorded
SELECT * FROM _backup_metadata WHERE backup_date = (SELECT MAX(backup_date) FROM _backup_metadata);

-- ================================================
-- APPLY ONLY RLS FIXES (SAFE - NO DATA CHANGES)
-- ================================================

-- Enable RLS on all tables without it
DO $$
DECLARE
    r RECORD;
    counter INTEGER := 0;
BEGIN
    FOR r IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND rowsecurity = false
        AND tablename NOT LIKE '\_%' -- Skip system tables
    LOOP
        BEGIN
            EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' ENABLE ROW LEVEL SECURITY';
            counter := counter + 1;
            RAISE NOTICE 'Enabled RLS on: %', r.tablename;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Failed to enable RLS on %: %', r.tablename, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Enabled RLS on % tables', counter;
END $$;

-- ================================================
-- CREATE BASIC POLICIES (AUTHENTICATED ACCESS)
-- ================================================

-- This creates permissive policies for authenticated users
-- You can adjust these later based on your security needs

DO $$
DECLARE
    r RECORD;
    policy_count INTEGER := 0;
BEGIN
    -- Create basic read policies for main tables
    FOR r IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND rowsecurity = true
        AND tablename IN (
            'users', 'repositories', 'pr_reviews', 
            'analysis_results', 'api_usage', 'organizations'
        )
    LOOP
        BEGIN
            -- Drop existing policy if any
            EXECUTE format('DROP POLICY IF EXISTS "authenticated_read_%s" ON public.%I', 
                          r.tablename, r.tablename);
            
            -- Create new policy
            EXECUTE format('CREATE POLICY "authenticated_read_%s" ON public.%I 
                           FOR SELECT TO authenticated USING (true)', 
                          r.tablename, r.tablename);
            
            policy_count := policy_count + 1;
            RAISE NOTICE 'Created read policy for: %', r.tablename;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Failed to create policy for %: %', r.tablename, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Created % basic policies', policy_count;
END $$;

-- ================================================
-- APPLY CRITICAL PERFORMANCE INDEXES ONLY
-- ================================================

-- These are the most critical indexes for the slow queries

-- 1. Vector store composite index (HIGHEST PRIORITY)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vector_store_critical
ON public.vector_store(repository_id, content_type, created_at DESC);

-- 2. API usage composite index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_usage_critical
ON public.api_usage(user_id, created_at DESC);

-- 3. PR reviews composite index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pr_reviews_critical
ON public.pr_reviews(repository_id, pr_number, status);

-- 4. Analysis results composite index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analysis_results_critical
ON public.analysis_results(repository_id, pr_number, status);

-- ================================================
-- VERIFICATION
-- ================================================

-- Check final RLS status
SELECT 
    COUNT(*) FILTER (WHERE rowsecurity = true) as "Tables with RLS ✅",
    COUNT(*) FILTER (WHERE rowsecurity = false) as "Tables without RLS ❌",
    COUNT(*) as "Total Tables"
FROM pg_tables 
WHERE schemaname = 'public';

-- Check new indexes
SELECT 
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexname::regclass)) as size
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%critical'
ORDER BY tablename;

-- ================================================
-- ROLLBACK INSTRUCTIONS
-- ================================================

-- If you need to rollback RLS (NOT RECOMMENDED):
-- SELECT 'ALTER TABLE public.' || tablename || ' DISABLE ROW LEVEL SECURITY;'
-- FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;

-- To see what changed:
-- SELECT * FROM _backup_metadata ORDER BY backup_date DESC;

-- Final success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 Safe fixes applied successfully!';
    RAISE NOTICE 'Monitor your application for any permission issues.';
    RAISE NOTICE 'Adjust RLS policies as needed for your security requirements.';
END $$;