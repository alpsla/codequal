-- Part 1: Security Fixes (RLS) - Run this first
-- This script safely enables RLS on all tables

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
SELECT * FROM _backup_metadata WHERE backup_date = (SELECT MAX(backup_date) FROM _backup_metadata) LIMIT 10;

-- ================================================
-- APPLY RLS FIXES
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
-- CREATE BASIC POLICIES
-- ================================================

-- Create permissive policies for authenticated users on critical tables
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
            'analysis_results', 'api_usage', 'organizations',
            'vector_store', 'model_versions', 'stripe_customers'
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
-- VERIFICATION
-- ================================================

-- Check final RLS status
SELECT 
    COUNT(*) FILTER (WHERE rowsecurity = true) as "Tables with RLS ✅",
    COUNT(*) FILTER (WHERE rowsecurity = false) as "Tables without RLS ❌",
    COUNT(*) as "Total Tables"
FROM pg_tables 
WHERE schemaname = 'public';

-- Show sample of tables with their RLS status
SELECT 
    tablename as "Table",
    CASE WHEN rowsecurity THEN '✅ Enabled' ELSE '❌ Disabled' END as "RLS Status"
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY rowsecurity DESC, tablename
LIMIT 20;

-- Final message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 Part 1 Complete: RLS Security Fixes Applied!';
    RAISE NOTICE '';
    RAISE NOTICE 'Next: Run Part 2 to create the performance indexes.';
    RAISE NOTICE '';
    RAISE NOTICE 'If you see any permission errors in your app:';
    RAISE NOTICE '1. Check the policies on affected tables';
    RAISE NOTICE '2. You may need more specific policies for write operations';
END $$;