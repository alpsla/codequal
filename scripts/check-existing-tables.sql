-- Check what tables actually exist in your database
-- Run this to see all tables and identify which need indexes

-- List all tables in public schema
SELECT 
    tablename as "Table Name",
    CASE WHEN rowsecurity THEN '✅ RLS Enabled' ELSE '❌ RLS Disabled' END as "Security Status"
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check if vector-related tables exist with different names
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
AND (
    tablename LIKE '%vector%' 
    OR tablename LIKE '%embed%' 
    OR tablename LIKE '%store%'
    OR tablename LIKE '%analysis%'
    OR tablename LIKE '%pr_review%'
    OR tablename LIKE '%api_usage%'
);

-- Check table sizes to identify large tables that need indexes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;