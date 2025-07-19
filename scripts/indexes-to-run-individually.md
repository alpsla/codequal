# Performance Indexes - Run Each One Separately

Copy and run each CREATE INDEX statement one at a time in Supabase SQL Editor:

## 🚨 Most Critical (Run These First)

### 1. Vector Store - Fixes 6+ Second Queries
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vector_store_critical
ON public.vector_store(repository_id, content_type, created_at DESC);
```

### 2. API Usage - For Billing Queries
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_usage_critical
ON public.api_usage(user_id, created_at DESC);
```

### 3. PR Reviews - Common Lookups
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pr_reviews_critical
ON public.pr_reviews(repository_id, pr_number, status);
```

### 4. Analysis Results
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analysis_results_critical
ON public.analysis_results(repository_id, pr_number, status);
```

## 📈 Additional Important Indexes

### 5. Vector Store Repository Only
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vector_store_repository_id
ON public.vector_store(repository_id);
```

### 6. Users Email (Authentication)
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email
ON public.users(email);
```

### 7. Repositories URL
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_repositories_url
ON public.repositories(url);
```

### 8. Model Versions
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_model_versions_role
ON public.model_versions(role);
```

## 🔗 Foreign Key Indexes

### 9. Users Organization
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_users_organization_id
ON public.users(organization_id);
```

### 10. Repositories Organization
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_repositories_organization_id
ON public.repositories(organization_id);
```

### 11. PR Reviews Repository
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_pr_reviews_repository_id
ON public.pr_reviews(repository_id);
```

### 12. Analysis Results PR Review
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_analysis_results_pr_review_id
ON public.analysis_results(pr_review_id);
```

## ✅ After Creating All Indexes

Run this to verify they were created:

```sql
SELECT 
    tablename as "Table",
    indexname as "Index Name",
    pg_size_pretty(pg_relation_size(indexname::regclass)) as "Size"
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
```

Run this to update statistics:

```sql
ANALYZE public.vector_store;
ANALYZE public.api_usage;
ANALYZE public.pr_reviews;
ANALYZE public.analysis_results;
ANALYZE public.users;
ANALYZE public.repositories;
```

## ⏱️ Expected Time

- Each index: 30 seconds to 2 minutes (depending on table size)
- Total: ~15-20 minutes for all indexes

## 💡 Tips

1. Start with indexes 1-4 (most critical)
2. Watch for any errors - "already exists" errors are OK
3. The `CONCURRENTLY` option prevents blocking other queries
4. You can monitor progress in another SQL Editor tab