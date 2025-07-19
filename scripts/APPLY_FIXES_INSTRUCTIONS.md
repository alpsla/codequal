# How to Apply Database Fixes

The fixes are now split into two parts to avoid transaction issues:

## Part 1: Security Fixes (RLS)

1. Go to **Supabase Dashboard → SQL Editor**
2. Copy the entire contents of `apply-fixes-part1-rls.sql`
3. Paste and click **Run**
4. You should see:
   - Tables being enabled for RLS
   - Basic policies being created
   - Final verification showing "Tables with RLS ✅"

**Expected time**: 1-2 minutes

## Part 2: Performance Fixes (Indexes)

Due to `CREATE INDEX CONCURRENTLY` limitations, you have two options:

### Option A: Run All at Once (Recommended)
1. Copy the entire contents of `apply-fixes-part2-indexes.sql`
2. Paste in SQL Editor
3. Click **Run**
4. If you get transaction errors, use Option B

### Option B: Run Each Index Separately
1. Copy each `CREATE INDEX` statement one at a time
2. Run each one individually
3. This ensures no transaction issues

**Expected time**: 3-5 minutes per index

## Verification

After both parts complete:

### Check Security Status:
```sql
SELECT 
    COUNT(*) FILTER (WHERE rowsecurity = true) as "RLS Enabled",
    COUNT(*) FILTER (WHERE rowsecurity = false) as "RLS Disabled"
FROM pg_tables WHERE schemaname = 'public';
```

Expected: RLS Enabled = 29+, RLS Disabled = 0

### Check Performance:
1. Go to Supabase Dashboard
2. Check the performance tab
3. Slow queries should now be much faster

## If Issues Occur

### Permission Errors:
- Your app may need updated policies
- The basic policies are permissive (read-only for authenticated users)
- Add write policies as needed

### Rollback RLS (if needed):
```sql
-- Disable RLS on a specific table
ALTER TABLE public.table_name DISABLE ROW LEVEL SECURITY;
```

### Drop an Index:
```sql
DROP INDEX IF EXISTS idx_name;
```

## Summary

- **Part 1**: Fixes all 29 security issues
- **Part 2**: Adds 12 critical indexes for performance
- **Total time**: ~10 minutes
- **Risk**: Minimal (all reversible)