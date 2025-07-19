# Apply Database Fixes Guide

This guide helps you apply the critical security and performance fixes identified in the Supabase dashboard.

## 🚨 Critical Issues Summary

- **Security Issues: 29** (Missing Row Level Security)
- **Performance Issues: 95** (Missing indexes, slow queries)

## 📋 Step-by-Step Application Process

### Step 1: Backup Your Database

Before applying any fixes, create a backup using the provided script:

```bash
# Run the backup script
cd /Users/alpinro/Code\ Prjects/codequal
./scripts/backup-database.sh
```

This will:
- Create a timestamped backup in `database-backups/` directory
- Generate a restore script in case you need to rollback
- Verify your Supabase CLI login status

### Step 2: Apply Security Fixes (RLS)

1. Open Supabase Dashboard → SQL Editor
2. Run this query to check tables without RLS:

```sql
-- Check which tables need RLS
SELECT 
  schemaname,
  tablename,
  CASE WHEN rowsecurity THEN '✅ Enabled' ELSE '❌ Disabled' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY rowsecurity, tablename;
```

3. Apply RLS to all tables at once:

```sql
-- Enable RLS on all public tables
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
  LOOP
    EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' ENABLE ROW LEVEL SECURITY';
    counter := counter + 1;
    RAISE NOTICE 'Enabled RLS on table: %', r.tablename;
  END LOOP;
  RAISE NOTICE 'Total tables with RLS enabled: %', counter;
END $$;
```

4. Create basic policies for critical tables:

```sql
-- Basic read policy for authenticated users
CREATE POLICY "authenticated_users_read" ON public.users
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "authenticated_users_read_repos" ON public.repositories
  FOR SELECT TO authenticated
  USING (true); -- Adjust based on your access control needs

CREATE POLICY "authenticated_users_read_api_usage" ON public.api_usage
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
```

### Step 3: Apply Performance Fixes (Indexes)

1. First, check existing indexes:

```sql
-- Check current index count per table
SELECT 
  tablename,
  COUNT(*) as index_count
FROM pg_indexes
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY index_count DESC;
```

2. Apply critical indexes for slow queries:

```sql
-- Vector store indexes (HIGHEST PRIORITY - addresses 6+ second queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vector_store_repository_id 
  ON public.vector_store(repository_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vector_store_composite 
  ON public.vector_store(repository_id, content_type, created_at DESC);

-- API usage indexes (for billing/usage queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_usage_composite 
  ON public.api_usage(user_id, created_at DESC);

-- PR Reviews indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pr_reviews_composite 
  ON public.pr_reviews(repository_id, pr_number, status);

-- Analysis results indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analysis_results_composite 
  ON public.analysis_results(repository_id, pr_number, status);
```

3. Apply foreign key indexes:

```sql
-- Foreign key indexes (prevent slow joins)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_users_organization_id 
  ON public.users(organization_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_repositories_organization_id 
  ON public.repositories(organization_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_pr_reviews_repository_id 
  ON public.pr_reviews(repository_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_analysis_results_pr_review_id 
  ON public.analysis_results(pr_review_id);
```

### Step 4: Update Statistics

```sql
-- Update table statistics for query planner
ANALYZE public.users;
ANALYZE public.repositories;
ANALYZE public.pr_reviews;
ANALYZE public.analysis_results;
ANALYZE public.vector_store;
ANALYZE public.api_usage;
```

### Step 5: Verify Fixes

Run these queries to verify the fixes:

```sql
-- Check security status
SELECT 
  COUNT(*) FILTER (WHERE rowsecurity = true) as "Tables with RLS",
  COUNT(*) FILTER (WHERE rowsecurity = false) as "Tables without RLS",
  COUNT(*) as "Total Tables"
FROM pg_tables 
WHERE schemaname = 'public';

-- Check slow queries (requires pg_stat_statements)
SELECT 
  calls,
  mean_exec_time::numeric(10,2) as avg_ms,
  query
FROM pg_stat_statements
WHERE mean_exec_time > 1000
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan < 100
ORDER BY idx_scan;
```

## 🔄 Apply Using Script

Alternatively, you can apply all fixes at once:

1. Copy the contents of `database-comprehensive-fixes.sql`
2. Paste into Supabase SQL Editor
3. Click "Run"

## ✅ Expected Results

After applying all fixes:

- **Security**: All 29 tables should have RLS enabled
- **Performance**: 
  - Query times should drop from 6+ seconds to < 1 second
  - No more slow query warnings in dashboard
  - Index hit ratio should improve to > 95%

## 🚨 Important Notes

1. **Test in staging first** if you have a staging environment
2. **Monitor application** after applying RLS - you may need to adjust policies
3. **Check logs** for any permission denied errors after enabling RLS
4. **Re-run performance monitor** after 24 hours to see improvements

## 📊 Next Steps

1. Monitor the Supabase dashboard for improvement
2. Run E2E tests to ensure functionality
3. Adjust RLS policies based on your access control needs
4. Set up regular maintenance windows for `VACUUM` and `ANALYZE`