# Supabase Query Optimization Deployment Guide

**Date**: June 3, 2025  
**Estimated Deployment Time**: 2-3 hours

## Pre-Deployment Checklist

- [ ] Backup current database
- [ ] Test optimizations in development environment
- [ ] Notify team about potential brief service interruption
- [ ] Have rollback plan ready

## Deployment Steps

### Step 1: Apply Database Optimizations (30 minutes)

1. **Connect to Supabase SQL Editor**
   ```
   https://app.supabase.com/project/ftjhmbbcuqjqmmbaymqb/editor
   ```

2. **Run optimization scripts in order**:
   - Copy contents from `/docs/database-optimizations/optimization-scripts.sql`
   - Execute each section one by one
   - Verify each step completes successfully

3. **Verify initial optimizations**:
   ```sql
   -- Check timezone cache
   SELECT COUNT(*) FROM cached_timezones;
   
   -- Check performance log table
   SELECT COUNT(*) FROM query_performance_log;
   
   -- Check new indexes
   SELECT indexname FROM pg_indexes 
   WHERE tablename IN ('cached_timezones', 'query_performance_log');
   ```

### Step 2: Deploy Application-Level Changes (20 minutes)

1. **Update database package**:
   ```bash
   cd packages/database
   npm install
   npm run build
   ```

2. **Import optimization service in your app**:
   ```typescript
   import { 
     OptimizedDatabaseService, 
     createOptimizedSupabaseClient 
   } from '@/packages/database/src/optimizations/database-optimizations';
   
   // Initialize
   const supabase = createOptimizedSupabaseClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL!,
     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
   );
   
   const dbService = new OptimizedDatabaseService(supabase);
   ```

3. **Update existing queries to use optimized service**:
   ```typescript
   // Before:
   const { data } = await supabase
     .from('repositories')
     .select('*')
     .eq('id', repoId);
   
   // After:
   const { data } = await dbService.queries.getRepositoryById(repoId);
   ```

### Step 3: Monitor Initial Performance (30 minutes)

1. **Check query performance**:
   ```sql
   -- View slowest queries
   SELECT 
     query_pattern,
     calls_count,
     avg_time_ms,
     last_executed
   FROM query_performance_log
   ORDER BY avg_time_ms DESC
   LIMIT 20;
   ```

2. **Monitor cache hit rates**:
   ```typescript
   // In application console
   console.log(dbService.getStats());
   ```

3. **Check for errors**:
   ```sql
   -- Check for any failed queries
   SELECT * FROM query_performance_log
   WHERE query_pattern LIKE '%ERROR%'
   ORDER BY created_at DESC;
   ```

### Step 4: Progressive Rollout (1 hour)

1. **Enable for specific features first**:
   - Dashboard metadata queries
   - Timezone lookups
   - Repository listings

2. **Monitor each feature**:
   ```typescript
   // Add temporary logging
   const timezones = await dbService.cache.getTimezones();
   console.log('[OPTIMIZATION] Timezone query completed', {
     cached: dbService.cache.getCacheStats()
   });
   ```

3. **Gradually increase usage**:
   - 10% of traffic → Monitor for 15 minutes
   - 50% of traffic → Monitor for 30 minutes
   - 100% of traffic → Continue monitoring

### Step 5: Post-Deployment Verification

1. **Performance metrics**:
   ```sql
   -- Average query times before/after
   SELECT 
     DATE(created_at) as date,
     AVG(avg_time_ms) as daily_avg_ms,
     SUM(calls_count) as total_calls
   FROM query_performance_log
   GROUP BY DATE(created_at)
   ORDER BY date DESC;
   ```

2. **Cache effectiveness**:
   ```typescript
   // Check deduplication stats
   setInterval(() => {
     const stats = dbService.getStats();
     console.log('Cache hit rate:', stats.deduplication.hitRate);
   }, 60000); // Every minute
   ```

3. **Error rate**:
   ```sql
   -- Check for any issues
   SELECT COUNT(*) as error_count
   FROM query_performance_log
   WHERE created_at > NOW() - INTERVAL '1 hour';
   ```

## Rollback Plan

If issues occur, rollback in reverse order:

### 1. Application Rollback
```bash
# Revert to previous deployment
git checkout main
git revert HEAD
npm run deploy
```

### 2. Database Rollback
```sql
-- Drop new objects
DROP TABLE IF EXISTS cached_timezones CASCADE;
DROP TABLE IF EXISTS query_performance_log CASCADE;
DROP FUNCTION IF EXISTS get_timezone_names() CASCADE;
DROP FUNCTION IF EXISTS log_slow_query(text, float) CASCADE;
DROP FUNCTION IF EXISTS cleanup_old_performance_logs() CASCADE;
DROP VIEW IF EXISTS v_active_repositories CASCADE;

-- Remove new indexes
DROP INDEX IF EXISTS idx_repositories_platform_analyzed;
DROP INDEX IF EXISTS idx_repositories_language;
-- ... (other indexes)
```

## Success Criteria

- [ ] Dashboard queries execute in < 500ms (down from 2-3 seconds)
- [ ] Timezone queries execute in < 50ms (down from 100ms)
- [ ] No increase in error rates
- [ ] Cache hit rate > 30% after 1 hour
- [ ] Overall database CPU usage reduced by 20%+

## Long-term Monitoring

### Weekly Tasks
- Review slowest queries
- Adjust cache TTL if needed
- Clean up old performance logs

### Monthly Tasks
- Analyze query patterns
- Consider creating new indexes
- Review and optimize new slow queries

## Troubleshooting

### Issue: High cache miss rate
**Solution**: Increase TTL or pre-warm cache on startup

### Issue: Memory usage increasing
**Solution**: Implement cache size limits or reduce TTL

### Issue: Queries still slow
**Solution**: Check query_performance_log for specific patterns

### Issue: RLS policies failing
**Solution**: Verify all new tables have proper RLS policies

## Contact for Issues

- Database Admin: [admin email]
- On-call Engineer: [on-call rotation]
- Escalation: [escalation process]

## Next Optimization Opportunities

After successful deployment, consider:
1. Materialized views for complex aggregations
2. Redis caching for session data
3. Read replicas for heavy read workloads
4. Partitioning large tables
5. Query result streaming for large datasets
