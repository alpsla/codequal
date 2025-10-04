-- ============================================================================
-- DIAGNOSTIC QUERIES FOR SUPABASE DATABASE
-- Run these in Supabase SQL Editor to check existing schema
-- ============================================================================

-- Query 1: Check if tables already exist
SELECT
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('skill_scores', 'developer_metrics', 'analysis_results')
ORDER BY table_name;

-- Query 2: Check columns in skill_scores table (if it exists)
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'skill_scores'
ORDER BY ordinal_position;

-- Query 3: Check columns in developer_metrics table (if it exists)
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'developer_metrics'
ORDER BY ordinal_position;

-- Query 4: Check columns in analysis_results table (if it exists)
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'analysis_results'
ORDER BY ordinal_position;

-- Query 5: Check all indexes on these tables
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('skill_scores', 'developer_metrics', 'analysis_results')
ORDER BY tablename, indexname;

-- Query 6: Check for any constraints
SELECT
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name IN ('skill_scores', 'developer_metrics', 'analysis_results')
ORDER BY tc.table_name, tc.constraint_type, kcu.column_name;

-- Query 7: Show full schema for all three tables (if they exist)
SELECT
  t.table_name,
  c.column_name,
  c.data_type,
  c.character_maximum_length,
  c.is_nullable,
  c.column_default
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public'
  AND t.table_name IN ('skill_scores', 'developer_metrics', 'analysis_results')
ORDER BY t.table_name, c.ordinal_position;

-- ============================================================================
-- INSTRUCTIONS:
-- 1. Run Query 1 first to see which tables exist
-- 2. If tables exist, run Queries 2-4 to see their current structure
-- 3. Run Query 5 to check indexes
-- 4. Run Query 6 to check constraints
-- 5. Run Query 7 to get complete schema overview
--
-- Send me the results and I'll create the correct migration!
-- ============================================================================
