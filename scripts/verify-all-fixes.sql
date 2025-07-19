-- Verify All Database Fixes Were Applied Successfully

-- ================================================
-- 1. SECURITY CHECK - RLS Status
-- ================================================
SELECT 
    'Security Status' as "Check",
    COUNT(*) FILTER (WHERE rowsecurity = true) as "Tables with RLS ✅",
    COUNT(*) FILTER (WHERE rowsecurity = false) as "Tables without RLS ❌",
    CASE 
        WHEN COUNT(*) FILTER (WHERE rowsecurity = false) <= 1 THEN '✅ PASSED'
        ELSE '❌ FAILED'
    END as "Status"
FROM pg_tables 
WHERE schemaname = 'public';

-- ================================================
-- 2. PERFORMANCE CHECK - Created Indexes
-- ================================================
SELECT 
    'Indexes Created' as "Check",
    COUNT(*) as "Total Custom Indexes",
    COUNT(*) FILTER (WHERE indexname LIKE 'idx_%') as "idx_ Indexes",
    pg_size_pretty(SUM(pg_relation_size(indexname::regclass))) as "Total Index Size"
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%';

-- List all custom indexes with sizes
SELECT 
    tablename as "Table",
    indexname as "Index Name",
    pg_size_pretty(pg_relation_size(indexname::regclass)) as "Size"
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY pg_relation_size(indexname::regclass) DESC
LIMIT 10;

-- ================================================
-- 3. QUERY PERFORMANCE CHECK
-- ================================================
-- This requires pg_stat_statements extension
-- Check if any queries are still slow
SELECT 
    'Slow Queries Check' as "Check",
    COUNT(*) FILTER (WHERE mean_exec_time > 1000) as "Queries > 1s",
    COUNT(*) FILTER (WHERE mean_exec_time > 5000) as "Queries > 5s",
    CASE 
        WHEN COUNT(*) FILTER (WHERE mean_exec_time > 5000) = 0 THEN '✅ PASSED'
        ELSE '❌ Still have very slow queries'
    END as "Status"
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%';

-- ================================================
-- 4. CRITICAL TABLES CHECK
-- ================================================
SELECT 
    tablename as "Table",
    CASE WHEN rowsecurity THEN '✅' ELSE '❌' END as "RLS",
    (SELECT COUNT(*) FROM pg_indexes i 
     WHERE i.tablename = t.tablename 
     AND i.schemaname = 'public' 
     AND indexname LIKE 'idx_%') as "Custom Indexes"
FROM pg_tables t
WHERE schemaname = 'public'
AND tablename IN (
    'vector_embeddings', 'vector_chunks', 'api_usage', 
    'pr_reviews', 'analysis_results', 'users',
    'deepwiki_analysis', 'repositories'
)
ORDER BY tablename;

-- ================================================
-- 5. SUMMARY REPORT
-- ================================================
WITH security_stats AS (
    SELECT COUNT(*) FILTER (WHERE rowsecurity = false) as tables_without_rls
    FROM pg_tables WHERE schemaname = 'public'
),
index_stats AS (
    SELECT COUNT(*) as custom_indexes
    FROM pg_indexes 
    WHERE schemaname = 'public' AND indexname LIKE 'idx_%'
)
SELECT 
    'FINAL STATUS' as "Database Health Check",
    CASE 
        WHEN s.tables_without_rls <= 1 AND i.custom_indexes >= 5 
        THEN '✅ All Critical Fixes Applied Successfully!'
        ELSE '⚠️ Some fixes may be missing'
    END as "Result",
    s.tables_without_rls as "Tables Missing RLS",
    i.custom_indexes as "Performance Indexes Created"
FROM security_stats s, index_stats i;