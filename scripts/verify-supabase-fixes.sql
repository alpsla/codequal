-- Supabase Fix Verification Script
-- Run this after applying fixes to verify success

-- =========================================
-- BEFORE/AFTER SUMMARY
-- =========================================
\echo '===== SECURITY STATUS ====='
SELECT 
    'Tables without RLS' as issue_type,
    COUNT(CASE WHEN NOT c.relrowsecurity THEN 1 END) as count,
    CASE 
        WHEN COUNT(CASE WHEN NOT c.relrowsecurity THEN 1 END) = 0 THEN '✅ FIXED'
        ELSE '❌ Still ' || COUNT(CASE WHEN NOT c.relrowsecurity THEN 1 END)::text || ' tables without RLS'
    END as status
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename 
WHERE t.schemaname = 'public'

UNION ALL

SELECT 
    'Tables with RLS but no policies' as issue_type,
    COUNT(CASE WHEN c.relrowsecurity AND NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.tablename = t.tablename) THEN 1 END) as count,
    CASE 
        WHEN COUNT(CASE WHEN c.relrowsecurity AND NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.tablename = t.tablename) THEN 1 END) = 0 THEN '✅ FIXED'
        ELSE '❌ Still ' || COUNT(CASE WHEN c.relrowsecurity AND NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.tablename = t.tablename) THEN 1 END)::text || ' tables need policies'
    END as status
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename 
WHERE t.schemaname = 'public';

\echo ''
\echo '===== PERFORMANCE STATUS ====='
-- Check foreign key indexes
WITH fk_check AS (
    SELECT COUNT(*) as missing_count
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
    )
)
SELECT 
    'Missing FK indexes' as issue_type,
    missing_count as count,
    CASE 
        WHEN missing_count = 0 THEN '✅ FIXED - All FKs indexed'
        ELSE '❌ Still ' || missing_count::text || ' missing FK indexes'
    END as status
FROM fk_check;

-- Check vector indexes
SELECT 
    'Vector similarity indexes' as issue_type,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) >= 3 THEN '✅ FIXED - Vector indexes created'
        ELSE '❌ Only ' || COUNT(*)::text || ' vector indexes found'
    END as status
FROM pg_indexes
WHERE schemaname = 'public'
AND indexdef LIKE '%USING ivfflat%';

-- Check dead rows
SELECT 
    'Tables with >100 dead rows' as issue_type,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) <= 2 THEN '✅ MOSTLY FIXED - Vacuum completed'
        ELSE '⚠️  Still ' || COUNT(*)::text || ' tables need vacuum'
    END as status
FROM pg_stat_user_tables
WHERE schemaname = 'public'
AND n_dead_tup > 100;

\echo ''
\echo '===== DETAILED TABLE STATUS ====='
-- Show all tables with their security status
SELECT 
    t.tablename,
    CASE WHEN c.relrowsecurity THEN '✅' ELSE '❌' END as "RLS",
    COALESCE(p.policy_count, 0) as "Policies",
    CASE 
        WHEN NOT c.relrowsecurity THEN '❌ No RLS'
        WHEN c.relrowsecurity AND COALESCE(p.policy_count, 0) = 0 THEN '⚠️  RLS but no policies'
        ELSE '✅ Secured'
    END as "Status"
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename 
LEFT JOIN (
    SELECT tablename, COUNT(*) as policy_count 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    GROUP BY tablename
) p ON t.tablename = p.tablename
WHERE t.schemaname = 'public'
ORDER BY 
    CASE 
        WHEN NOT c.relrowsecurity THEN 1
        WHEN c.relrowsecurity AND COALESCE(p.policy_count, 0) = 0 THEN 2
        ELSE 3
    END,
    t.tablename;

\echo ''
\echo '===== NEW INDEXES CREATED ====='
-- Show recently created indexes (useful after running fixes)
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname
LIMIT 20;

\echo ''
\echo '===== FINAL SCORE ====='
WITH scores AS (
    SELECT 
        (SELECT COUNT(*) FROM pg_tables t JOIN pg_class c ON c.relname = t.tablename WHERE t.schemaname = 'public' AND NOT c.relrowsecurity) as tables_without_rls,
        (SELECT COUNT(*) FROM pg_tables t JOIN pg_class c ON c.relname = t.tablename WHERE t.schemaname = 'public' AND c.relrowsecurity AND NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.tablename = t.tablename)) as rls_without_policies,
        (SELECT COUNT(*) FROM (SELECT tc.table_name, kcu.column_name FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public') fk WHERE NOT EXISTS (SELECT 1 FROM pg_index i JOIN pg_class t ON t.oid = i.indrelid JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(i.indkey) WHERE t.relname = fk.table_name AND a.attname = fk.column_name)) as missing_fk_indexes,
        (SELECT COUNT(*) FROM pg_stat_user_tables WHERE schemaname = 'public' AND n_dead_tup > 100) as tables_with_dead_rows
)
SELECT 
    'Security Issues' as category,
    tables_without_rls + rls_without_policies as count,
    CASE 
        WHEN tables_without_rls + rls_without_policies = 0 THEN '✅ ALL FIXED!'
        ELSE '❌ ' || (tables_without_rls + rls_without_policies)::text || ' issues remain'
    END as status
FROM scores
UNION ALL
SELECT 
    'Performance Issues' as category,
    missing_fk_indexes + tables_with_dead_rows as count,
    CASE 
        WHEN missing_fk_indexes + tables_with_dead_rows <= 5 THEN '✅ MOSTLY FIXED!'
        ELSE '⚠️  ' || (missing_fk_indexes + tables_with_dead_rows)::text || ' issues remain'
    END as status
FROM scores;
