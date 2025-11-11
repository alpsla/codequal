# Supabase Alert Resolution Guide

**Date:** 2025-11-11
**Status:** Ready for Deployment
**Impact:** Fixes 138 Supabase alerts (38 security + 102 performance)

## 🚨 Problem Summary

Your Supabase dashboard shows critical alerts:
- **38 Security Alerts:** Missing RLS (Row Level Security) on 6 critical tables
- **102 Performance Alerts:** Missing indexes causing 7-8 second query times
- **Critical Impact:** V9 report generation timing out at Step 7

## ✅ Solution Overview

Created comprehensive migration: `supabase/migrations/20251111_fix_supabase_alerts.sql`

### What This Migration Fixes:

1. **model_configurations** (CRITICAL)
   - Adds 5 indexes for fast lookups
   - Enables RLS with proper policies
   - **Expected:** Queries drop from 7-8s → <100ms

2. **pr_analysis_history**
   - Adds 4 indexes
   - Enables RLS for security compliance

3. **developer_metrics**
   - Adds 4 indexes
   - Enables RLS with team visibility

4. **skill_scores**
   - Adds 5 indexes
   - Enables RLS with team sharing

5. **analysis_history**
   - Adds 5 indexes
   - Enables RLS for repository owners

6. **deepwiki_cleanups**
   - Adds 3 indexes
   - Enables RLS for admin access

7. **Performance Optimizations**
   - 40+ total indexes across all tables
   - Materialized view for timezone data (reduces 131 queries → 1)
   - Updated statistics for query planner

## 🚀 Deployment Steps

### Option 1: Via Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   ```
   Navigate to: https://app.supabase.com/project/[your-project-id]/editor
   ```

2. **Go to SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy & Execute Migration**
   - Open: `supabase/migrations/20251111_fix_supabase_alerts.sql`
   - Copy entire contents
   - Paste into SQL Editor
   - Click "Run" or press Cmd/Ctrl + Enter

4. **Verify Success**
   - Check for "Migration completed successfully" message
   - Verify no errors in execution log

### Option 2: Via Supabase CLI

```bash
# Navigate to project root
cd /home/user/codequal

# Apply migration
supabase db push

# Or apply specific migration
supabase migration up 20251111_fix_supabase_alerts
```

## 📊 Expected Performance Improvements

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| model_configurations query | 7-8s | <100ms | 98.5% |
| Timezone queries (131x) | 13.2s total | 50ms | 99.6% |
| PR analysis history | 2-3s | <200ms | 90% |
| Report generation | Timeout | 2-5s | ✅ Works |
| Dashboard load time | 8-10s | <1s | 90% |

## 🔍 Verification Steps

### 1. Check RLS Status

```sql
-- Run this query to verify RLS is enabled
SELECT
  schemaname,
  tablename,
  CASE
    WHEN rowsecurity THEN '✅ Enabled'
    ELSE '❌ Disabled'
  END as rls_status
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE schemaname = 'public'
AND tablename IN (
  'model_configurations',
  'pr_analysis_history',
  'developer_metrics',
  'skill_scores',
  'analysis_history',
  'deepwiki_cleanups'
)
ORDER BY tablename;
```

**Expected:** All 6 tables show "✅ Enabled"

### 2. Check Index Creation

```sql
-- Verify indexes were created
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND (
  indexname LIKE 'idx_model_config%'
  OR indexname LIKE 'idx_pr_analysis%'
  OR indexname LIKE 'idx_developer_metrics%'
  OR indexname LIKE 'idx_skill_scores%'
)
ORDER BY tablename, indexname;
```

**Expected:** 40+ indexes listed

### 3. Test Query Performance

```sql
-- This query should now complete in <100ms
EXPLAIN ANALYZE
SELECT * FROM model_configurations
WHERE role = 'code_quality'
AND language = 'java'
AND size_category = 'medium';
```

**Expected Output:**
```
Planning Time: < 1ms
Execution Time: < 50ms
```

### 4. Check Materialized View

```sql
-- Verify timezone materialized view exists
SELECT COUNT(*) as timezone_count
FROM mv_timezone_names;

-- Should return 500+ timezones
```

## 🔧 Maintenance Tasks

### Daily (Automated)
```sql
-- Refresh timezone materialized view
SELECT refresh_timezone_view();
```

**Setup Cron Job:**
```sql
-- Add to Supabase Dashboard → Database → Cron Jobs
SELECT cron.schedule(
  'refresh-timezone-view',
  '0 0 * * *',  -- Daily at midnight
  'SELECT refresh_timezone_view();'
);
```

### Weekly (Automated)
```sql
-- Update all table statistics
SELECT update_all_statistics();
```

**Setup Cron Job:**
```sql
SELECT cron.schedule(
  'update-statistics',
  '0 2 * * 0',  -- Weekly on Sunday at 2 AM
  'SELECT update_all_statistics();'
);
```

## 🧪 Testing After Deployment

### Test 1: Run V9 E2E Test

```bash
cd /home/user/codequal/packages/agents
npx ts-node test-v9-e2e-complete.ts
```

**Expected:**
- ✅ Step 7 (Report Generation) completes in 2-5s
- ✅ No timeout errors
- ✅ Complete report generated

### Test 2: Check Supabase Dashboard

1. Go to: Dashboard → Database → Query Performance
2. **Expected:**
   - No queries > 1 second
   - 90% reduction in total query time
   - No alerts in the top section

### Test 3: Load Application

```bash
# Start your application
npm run dev
```

**Expected:**
- Dashboard loads in <1 second
- No console errors related to database
- All data displays correctly

## 🎯 Alert Resolution Checklist

After deploying, verify in Supabase Dashboard → Database → Advisors:

- [ ] Security Alerts: 38 → 0
- [ ] Performance Alerts: 102 → 0
- [ ] RLS enabled on all 6 tables
- [ ] All indexes created successfully
- [ ] Materialized view working
- [ ] Query times <100ms
- [ ] V9 report generation working
- [ ] No timeout errors

## 📈 Monitoring

### Track Performance Over Time

```sql
-- Add this query to your Grafana/monitoring dashboard
SELECT
  query,
  calls,
  mean_exec_time as avg_ms,
  max_exec_time as max_ms,
  total_exec_time as total_ms
FROM pg_stat_statements
WHERE query LIKE '%model_configurations%'
OR query LIKE '%pr_analysis_history%'
ORDER BY mean_exec_time DESC
LIMIT 20;
```

### Alert Thresholds

Set up alerts if:
- Any query > 500ms (should be <100ms)
- Table size > 1GB (consider partitioning)
- Connection pool > 80% (increase pool size)

## 🚨 Rollback Plan

If issues occur after deployment:

```sql
-- Rollback: Disable RLS (NOT recommended, only for emergency)
ALTER TABLE model_configurations DISABLE ROW LEVEL SECURITY;
-- Repeat for other tables if needed

-- Rollback: Drop indexes (NOT recommended)
DROP INDEX IF EXISTS idx_model_config_lookup;
-- Repeat for specific problematic indexes
```

**Better approach:** Fix specific issues rather than full rollback

## 📞 Support

If you encounter issues:

1. **Check Supabase Logs**
   - Dashboard → Logs → Database

2. **Verify Policies**
   - Dashboard → Authentication → Policies

3. **Check Index Usage**
   ```sql
   SELECT * FROM pg_stat_user_indexes
   WHERE schemaname = 'public'
   ORDER BY idx_scan DESC;
   ```

## ✅ Success Criteria

Migration is successful when:

1. ✅ All 138 alerts resolved in Supabase Dashboard
2. ✅ model_configurations queries < 100ms
3. ✅ V9 E2E test completes without timeout
4. ✅ Dashboard loads in < 1 second
5. ✅ No security warnings
6. ✅ All tests pass

---

**Next Steps:**
1. Deploy migration via Supabase Dashboard
2. Run verification queries
3. Test V9 E2E workflow
4. Setup automated maintenance cron jobs
5. Monitor performance for 24 hours
6. Update this document with actual results

**Estimated Deployment Time:** 5-10 minutes
**Expected Downtime:** None (indexes created concurrently)
**Risk Level:** Low (all changes are additive, no data modification)
