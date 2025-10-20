# Supabase Performance Issues - Fix Guide

## 🚨 Problem Identified (October 13, 2025)

**Symptoms:**
- Report generation hangs at Step 7
- Supabase dashboard shows 138 issues (38 security, 102 performance)
- Queries taking 7-8 seconds (should be < 100ms)
- RLS not enabled on critical tables

**Impact:**
- V9 report generation times out
- Category scoring fails
- Skill tracking unavailable

---

## 🔍 Root Cause Analysis

### 1. Slow Queries (7-8 seconds)
```sql
-- These queries from v9-grouped-report-formatter.ts are timing out:
SELECT * FROM model_configurations 
WHERE role = 'code_quality' 
AND language = 'java' 
AND size_category = 'medium'
```

**Why slow:**
- Missing indexes on `role`, `language`, `size_category`
- Possibly table bloat
- No query optimization

### 2. RLS Not Enabled
Tables without RLS:
- `public.pr_analysis_history`
- `public.developer_metrics`
- `public.skill_scores`
- `public.model_configurations` ⚠️ **CRITICAL**
- `public.deepwiki_cleanups`
- `public.analysis_history`

---

## ✅ Fix Plan (Priority Order)

### PRIORITY 1: Enable Indexes (IMMEDIATE - 5 min)

```sql
-- Enable indexes on model_configurations for fast lookups
CREATE INDEX IF NOT EXISTS idx_model_config_role 
ON model_configurations(role);

CREATE INDEX IF NOT EXISTS idx_model_config_language 
ON model_configurations(language);

CREATE INDEX IF NOT EXISTS idx_model_config_size 
ON model_configurations(size_category);

-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_model_config_lookup 
ON model_configurations(role, language, size_category);

-- Analyze table to update statistics
ANALYZE model_configurations;
```

**Expected Impact:** Queries from 7-8s → < 100ms

### PRIORITY 2: Enable RLS (MEDIUM - 10 min)

```sql
-- Enable RLS on model_configurations
ALTER TABLE model_configurations ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role access
CREATE POLICY "Allow service role full access"
ON model_configurations
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create policy for authenticated users (read-only)
CREATE POLICY "Allow authenticated users to read"
ON model_configurations
FOR SELECT
TO authenticated
USING (true);
```

### PRIORITY 3: Check for Table Bloat (MEDIUM - 15 min)

```sql
-- Check table size and bloat
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- If bloat found, run VACUUM
VACUUM ANALYZE model_configurations;
```

### PRIORITY 4: Optimize Other Tables (LOW - 30 min)

Repeat index creation for:
- `pr_analysis_history`
- `developer_metrics`
- `skill_scores`

---

## 🚀 Quick Fix Script

Run this in Supabase SQL Editor:

```sql
-- QUICK FIX: Indexes + RLS for model_configurations
BEGIN;

-- 1. Create indexes
CREATE INDEX IF NOT EXISTS idx_model_config_role ON model_configurations(role);
CREATE INDEX IF NOT EXISTS idx_model_config_language ON model_configurations(language);
CREATE INDEX IF NOT EXISTS idx_model_config_size ON model_configurations(size_category);
CREATE INDEX IF NOT EXISTS idx_model_config_lookup ON model_configurations(role, language, size_category);

-- 2. Enable RLS
ALTER TABLE model_configurations ENABLE ROW LEVEL SECURITY;

-- 3. Create policies
CREATE POLICY "Allow service role full access" ON model_configurations
FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read" ON model_configurations
FOR SELECT TO authenticated USING (true);

-- 4. Optimize
ANALYZE model_configurations;

COMMIT;
```

---

## 📊 Verification

After applying fixes, run this query to verify speed:

```sql
-- Should complete in < 100ms
EXPLAIN ANALYZE
SELECT * FROM model_configurations 
WHERE role = 'code_quality' 
AND language = 'java' 
AND size_category = 'medium';
```

Expected output:
```
Planning Time: < 1ms
Execution Time: < 50ms
```

---

## 🎯 Testing After Fix

1. Run the diagnostic:
```bash
cd /Users/alpinro/Code\ Prjects/codequal/packages/agents
npx ts-node test-supabase-connection.ts
```

Expected output:
```
✅ Query successful (50ms)  # Was 7000ms+
```

2. Re-run E2E test:
```bash
./oracle-run-test-with-env.sh
```

Expected output:
```
📝 STEP 7: V9 Report Generation
   ✅ Complete V9 report generated: (should complete now!)
```

---

## 📈 Performance Targets

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| model_configurations query | 7-8s | < 100ms | < 50ms |
| Report generation | Timeout | 2-5s | < 5s |
| Total E2E test | Hung | 5-8 min | < 6 min |

---

## 🔍 Monitoring

Add these queries to Supabase dashboard:

```sql
-- Slow queries (> 1s)
SELECT query, calls, mean_exec_time, max_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 1000
ORDER BY mean_exec_time DESC;

-- Table sizes
SELECT tablename, pg_size_pretty(pg_total_relation_size('public.'||tablename))
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size('public.'||tablename) DESC;
```

---

**Status:** PENDING - Awaiting SQL execution in Supabase dashboard
**Impact:** CRITICAL - Blocks all V9 report generation
**Estimated Fix Time:** 5-15 minutes
**Next Step:** Run PRIORITY 1 SQL in Supabase SQL Editor



