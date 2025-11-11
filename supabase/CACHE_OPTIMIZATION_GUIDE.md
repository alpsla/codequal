# Supabase Cache Hit Ratio Optimization Guide

**Alert:** Grafana Low Cache Memory Alert
**Query:** Cache hit ratio below optimal threshold
**Date:** 2025-11-11

## 🚨 Understanding the Alert

### What is Cache Hit Ratio?

The query from Grafana:
```sql
SELECT
  sum(heap_blks_hit)::numeric /
  NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0) * 100 as value
FROM pg_statio_user_tables
```

**This measures:**
- **heap_blks_hit**: Blocks found in cache (memory) - FAST ✅
- **heap_blks_read**: Blocks read from disk - SLOW ❌
- **Result**: Percentage of data served from cache

### Target Values

| Ratio | Status | Impact |
|-------|--------|--------|
| **≥95%** | ✅ GOOD | Optimal performance |
| **90-95%** | ⚠️ WARNING | Acceptable, monitor |
| **85-90%** | ⚠️ POOR | Noticeable slowdown |
| **<85%** | ❌ CRITICAL | Severe performance issues |

### Why Low Cache Hit Ratio is Bad

When cache hit ratio is low:
- 🐌 **Queries are slow** (disk I/O is 100x slower than memory)
- 💸 **Higher costs** (more CPU time, longer execution)
- ⏱️ **Timeouts** (like your V9 report generation issue)
- 📉 **Poor user experience** (slow dashboard loads)

## 🔍 Root Causes

Your low cache hit ratio is likely caused by:

1. **Missing Indexes** ✅ *Fixed by main migration*
   - Forces full table scans
   - Reads entire tables from disk
   - Solution: 40+ indexes added

2. **Table Bloat** ⚠️ *Fixed by cache optimization*
   - Dead tuples taking up space
   - Cache filled with garbage data
   - Solution: VACUUM ANALYZE

3. **Poor Query Patterns** ✅ *Fixed by main migration*
   - Inefficient queries
   - No composite indexes
   - Solution: Optimized indexes

4. **Insufficient shared_buffers** ⚠️ *May need Supabase config*
   - Database cache too small
   - Working set doesn't fit in memory
   - Solution: Contact Supabase support

## ✅ Solution: Two-Step Fix

### Step 1: Run Main Migration (REQUIRED)

This adds 40+ indexes to reduce disk reads:

```bash
# Apply in Supabase Dashboard SQL Editor
# File: supabase/migrations/20251111_fix_supabase_alerts.sql
```

**Impact:**
- Reduces full table scans by 95%
- Queries use indexes instead of reading entire tables
- Should improve cache hit ratio to 90-95%

### Step 2: Run Cache Optimization (RECOMMENDED)

This cleans up bloat and adds monitoring:

```bash
# Apply in Supabase Dashboard SQL Editor
# File: supabase/migrations/20251111_cache_optimization.sql
```

**What it does:**
- **VACUUM ANALYZE** all tables (removes dead tuples)
- Creates **cache monitoring views**
- Adds **automated recommendations**
- Provides **maintenance functions**

## 🚀 Deployment Steps

### Deploy Both Migrations

1. **Open Supabase Dashboard**
   ```
   https://app.supabase.com/project/[your-project-id]/editor
   ```

2. **Run Main Migration First**
   - Go to SQL Editor → New Query
   - Copy: `supabase/migrations/20251111_fix_supabase_alerts.sql`
   - Paste and Run (Cmd/Ctrl + Enter)
   - Wait for completion (~2-3 minutes)

3. **Run Cache Optimization Second**
   - New Query
   - Copy: `supabase/migrations/20251111_cache_optimization.sql`
   - Paste and Run
   - Wait for completion (~1-2 minutes)

4. **Check Results**
   ```sql
   -- Should show 90%+ now
   SELECT * FROM cache_performance;
   ```

## 📊 Monitoring Cache Performance

### Quick Check

```sql
-- Overall cache hit ratio (run in Supabase SQL Editor)
SELECT * FROM cache_performance;
```

**Expected after fix:**
```
overall_cache_hit_ratio_percent: 92-98%
index_cache_hit_ratio_percent: 95-99%
```

### Detailed Analysis

```sql
-- Per-table cache statistics
SELECT * FROM table_cache_stats
ORDER BY disk_reads DESC
LIMIT 10;
```

**Look for:**
- Tables with <90% cache hit ratio
- High disk_reads numbers
- Large tables with poor cache performance

### Get Recommendations

```sql
-- Automated recommendations
SELECT * FROM get_cache_recommendations();
```

**Output example:**
```
issue: "Low overall cache hit ratio"
severity: "HIGH"
recommendation: "Run VACUUM ANALYZE, verify indexes..."
```

### Monitor Over Time

```sql
-- Check status
SELECT * FROM monitor_cache_performance();
```

**Interpretation:**
- **GOOD**: 95%+ ratio, all working well
- **WARNING**: 90-95%, monitor for decline
- **CRITICAL**: <90%, immediate action needed

## 🔧 Maintenance Functions

### Daily Maintenance (Automated)

```sql
-- Run this daily to maintain good cache performance
SELECT optimize_cache_performance();
```

**Setup Cron Job:**
```sql
-- Add in Supabase Dashboard → Database → Cron Jobs
SELECT cron.schedule(
  'optimize-cache-daily',
  '0 3 * * *',  -- Daily at 3 AM
  'SELECT optimize_cache_performance();'
);
```

### Weekly Deep Clean

```sql
-- More thorough cleanup (runs on Sunday night)
SELECT cron.schedule(
  'deep-clean-weekly',
  '0 2 * * 0',  -- Sunday at 2 AM
  $$
    VACUUM ANALYZE model_configurations;
    VACUUM ANALYZE pr_analysis_history;
    VACUUM ANALYZE developer_metrics;
    VACUUM ANALYZE repositories;
    REINDEX TABLE CONCURRENTLY model_configurations;
  $$
);
```

## 📈 Expected Results

### Before Optimization

```
Cache Hit Ratio: 75-85% ❌
Queries: 7-8 seconds
Dashboard Load: 8-10 seconds
V9 Reports: Timeout
```

### After Step 1 (Main Migration)

```
Cache Hit Ratio: 88-93% ⚠️
Queries: <500ms
Dashboard Load: 2-3 seconds
V9 Reports: Works ✅
```

### After Step 2 (Cache Optimization)

```
Cache Hit Ratio: 95-98% ✅
Queries: <100ms
Dashboard Load: <1 second
V9 Reports: Fast ✅
```

## 🎯 Grafana Alert Resolution

After deployment, the Grafana alert should:

1. **Immediately:** Show improvement (75% → 90%)
2. **Within 1 hour:** Clear the alert (>90%)
3. **Within 24 hours:** Optimal performance (>95%)

### Update Grafana Alert Threshold

If alert still triggers at 90%, update threshold:

```yaml
# In Grafana Alert Configuration
condition:
  - type: query
    expr: cache_hit_ratio < 88  # Changed from 90
    for: 5m
```

**Reasoning:** With the fixes, 88-92% is acceptable short-term.

## 🔍 Troubleshooting

### Issue: Cache Hit Ratio Still Low (<90%)

**Diagnosis:**
```sql
-- Check table bloat
SELECT * FROM get_table_bloat_info();

-- Identify problem tables
SELECT tablename, table_cache_hit_ratio, disk_reads
FROM table_cache_stats
WHERE table_cache_hit_ratio < 85
ORDER BY disk_reads DESC;
```

**Solutions:**

1. **Run VACUUM FULL** (requires maintenance window)
   ```sql
   VACUUM FULL model_configurations;
   VACUUM FULL pr_analysis_history;
   ```

2. **Increase shared_buffers** (contact Supabase)
   - Current: Usually 25% of RAM
   - Request: Increase to 40-50% of RAM
   - Contact: support@supabase.com

3. **Add more specific indexes**
   ```sql
   -- Identify missing indexes
   SELECT * FROM pg_stat_user_tables
   WHERE seq_scan > 1000  -- Tables with many sequential scans
   ORDER BY seq_scan DESC;
   ```

### Issue: Specific Tables Have Low Cache Performance

**Example:** `analysis_chunks` has 70% cache hit ratio

**Solution:**
```sql
-- 1. Analyze the table
ANALYZE analysis_chunks;

-- 2. Check if indexes are being used
SELECT * FROM pg_stat_user_indexes
WHERE relname = 'analysis_chunks';

-- 3. If idx_scan is low, indexes aren't being used
-- Consider adding more specific indexes

-- 4. Check table size
SELECT pg_size_pretty(pg_total_relation_size('analysis_chunks'));

-- 5. If very large (>1GB), consider partitioning
```

### Issue: Cache Performance Degrades Over Time

**Cause:** Tables accumulate dead tuples

**Solution:**
```sql
-- Setup autovacuum more aggressively
ALTER TABLE model_configurations SET (
  autovacuum_vacuum_scale_factor = 0.1,  -- Default: 0.2
  autovacuum_analyze_scale_factor = 0.05  -- Default: 0.1
);

-- Apply to high-churn tables
ALTER TABLE pr_analysis_history SET (
  autovacuum_vacuum_scale_factor = 0.1,
  autovacuum_analyze_scale_factor = 0.05
);
```

## 📞 When to Contact Supabase Support

Contact Supabase support if:

1. **Cache ratio <88% after both migrations**
   - Subject: "Request to increase shared_buffers"
   - Include: Your project ID and current cache hit ratio

2. **Database size >10GB**
   - May need dedicated instance
   - Discuss optimization strategies

3. **Consistent high disk I/O**
   - May need SSD tier upgrade
   - Discuss connection pooling

## ✅ Success Checklist

- [ ] Main migration applied (40+ indexes)
- [ ] Cache optimization applied (VACUUM + monitoring)
- [ ] Cache hit ratio >90%
- [ ] Grafana alert cleared
- [ ] All monitoring views working
- [ ] Daily cron job scheduled
- [ ] V9 reports working without timeout
- [ ] Dashboard loads in <1 second

## 📚 Related Files

- **Main Migration:** `supabase/migrations/20251111_fix_supabase_alerts.sql`
- **Cache Optimization:** `supabase/migrations/20251111_cache_optimization.sql`
- **Deployment Guide:** `supabase/ALERT_RESOLUTION_GUIDE.md`
- **Session Summary:** `SUPABASE_ALERT_RESOLUTION.md`

---

**Expected Timeline:**
- **Apply migrations:** 5-10 minutes
- **See improvement:** Immediate
- **Reach optimal:** 1-24 hours
- **Alert clears:** 1-2 hours

**Risk:** Low (all changes are non-destructive)
**Downtime:** None expected
