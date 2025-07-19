-- Check Remaining Security and Performance Issues

-- ================================================
-- 1. SECURITY: Find Tables Still Without RLS
-- ================================================
SELECT 
    'Tables Without RLS' as "Security Issue",
    tablename as "Table Name",
    '❌ Enable RLS' as "Fix Needed"
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = false
ORDER BY tablename;

-- ================================================
-- 2. SECURITY: Check Tables with RLS but No Policies
-- ================================================
SELECT 
    t.tablename as "Table",
    CASE WHEN t.rowsecurity THEN '✅ RLS Enabled' ELSE '❌ RLS Disabled' END as "RLS Status",
    COUNT(p.policyname) as "Policy Count",
    CASE 
        WHEN t.rowsecurity = true AND COUNT(p.policyname) = 0 
        THEN '❌ RLS enabled but NO POLICIES (table is inaccessible!)'
        WHEN t.rowsecurity = true AND COUNT(p.policyname) > 0 
        THEN '✅ Has policies'
        ELSE '❌ No RLS'
    END as "Status"
FROM pg_tables t
LEFT JOIN pg_policies p ON t.schemaname = p.schemaname AND t.tablename = p.tablename
WHERE t.schemaname = 'public'
GROUP BY t.tablename, t.rowsecurity
HAVING t.rowsecurity = true AND COUNT(p.policyname) = 0
ORDER BY t.tablename;

-- ================================================
-- 3. PERFORMANCE: Large Tables Without Any Indexes
-- ================================================
WITH table_sizes AS (
    SELECT 
        schemaname,
        tablename,
        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size_pretty
    FROM pg_tables
    WHERE schemaname = 'public'
),
index_counts AS (
    SELECT 
        tablename,
        COUNT(*) as index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
    GROUP BY tablename
)
SELECT 
    ts.tablename as "Table",
    ts.size_pretty as "Size",
    COALESCE(ic.index_count, 0) as "Index Count",
    CASE 
        WHEN COALESCE(ic.index_count, 0) = 0 THEN '❌ No indexes on large table!'
        WHEN COALESCE(ic.index_count, 0) < 2 THEN '⚠️ Only 1 index'
        ELSE '✅ Has indexes'
    END as "Status"
FROM table_sizes ts
LEFT JOIN index_counts ic ON ts.tablename = ic.tablename
WHERE ts.size_bytes > 1000000 -- Tables larger than 1MB
ORDER BY ts.size_bytes DESC;

-- ================================================
-- 4. PERFORMANCE: Check Missing Foreign Key Indexes
-- ================================================
SELECT DISTINCT
    tc.table_name as "Table",
    kcu.column_name as "FK Column",
    'CREATE INDEX idx_' || tc.table_name || '_' || kcu.column_name || 
    ' ON ' || tc.table_schema || '.' || tc.table_name || '(' || kcu.column_name || ');' as "Missing Index SQL"
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name 
    AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
AND NOT EXISTS (
    SELECT 1 FROM pg_indexes i
    WHERE i.schemaname = tc.table_schema
    AND i.tablename = tc.table_name
    AND i.indexdef LIKE '%' || kcu.column_name || '%'
)
ORDER BY tc.table_name, kcu.column_name
LIMIT 20;

-- ================================================
-- 5. PERFORMANCE: Tables with High Sequential Scans
-- ================================================
SELECT 
    schemaname,
    tablename,
    seq_scan as "Sequential Scans",
    seq_tup_read as "Rows Read via Seq Scan",
    idx_scan as "Index Scans",
    CASE 
        WHEN seq_scan > 0 AND idx_scan = 0 THEN '❌ Only seq scans - needs index!'
        WHEN seq_scan > idx_scan * 10 THEN '⚠️ Too many seq scans'
        ELSE '✅ Good index usage'
    END as "Status"
FROM pg_stat_user_tables
WHERE schemaname = 'public'
AND seq_scan > 1000
ORDER BY seq_scan DESC
LIMIT 15;

-- ================================================
-- 6. SUMMARY: What's Still Needed
-- ================================================
WITH missing_rls AS (
    SELECT COUNT(*) as count FROM pg_tables 
    WHERE schemaname = 'public' AND rowsecurity = false
),
missing_policies AS (
    SELECT COUNT(DISTINCT t.tablename) as count
    FROM pg_tables t
    LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
    WHERE t.schemaname = 'public' AND t.rowsecurity = true
    GROUP BY t.tablename HAVING COUNT(p.policyname) = 0
),
missing_fk_indexes AS (
    SELECT COUNT(DISTINCT tc.table_name || '_' || kcu.column_name) as count
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
    AND NOT EXISTS (
        SELECT 1 FROM pg_indexes i
        WHERE i.tablename = tc.table_name
        AND i.indexdef LIKE '%' || kcu.column_name || '%'
    )
)
SELECT 
    'Remaining Issues Summary' as "Category",
    mr.count as "Tables Without RLS",
    mp.count as "Tables With RLS but No Policies",
    mf.count as "Missing Foreign Key Indexes"
FROM missing_rls mr, missing_policies mp, missing_fk_indexes mf;