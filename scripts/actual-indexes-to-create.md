# Correct Indexes Based on Your Actual Table Structure

Run each CREATE INDEX statement individually in Supabase SQL Editor:

## 🚨 Most Critical Performance Indexes

### 1. Vector Embeddings - Repository Lookup (HIGHEST PRIORITY)
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vector_embeddings_repo_created
ON public.vector_embeddings(repository_id, created_at DESC);
```

### 2. Vector Embeddings - User Access
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vector_embeddings_user
ON public.vector_embeddings(user_id, repository_id);
```

### 3. Vector Embeddings - Content Hash (for deduplication)
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vector_embeddings_hash
ON public.vector_embeddings(content_hash);
```

### 4. API Usage - User Queries
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_usage_user_created
ON public.api_usage(user_id, created_at DESC);
```

### 5. PR Reviews - Repository and PR Lookup
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pr_reviews_repo_pr
ON public.pr_reviews(repository_id, pr_number);
```

## 📊 Additional Important Indexes

### 6. Analysis Results - Repository Lookup
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analysis_results_repo
ON public.analysis_results(repository_id);
```

### 7. DeepWiki Analysis - Repository Lookup
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deepwiki_analysis_repo
ON public.deepwiki_analysis(repository_id);
```

### 8. Vector Chunks - Repository Access
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vector_chunks_repo
ON public.vector_chunks(repository_id);
```

### 9. Users - Email (for authentication)
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email
ON public.users(email);
```

### 10. API Keys - Key Hash Lookup
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_keys_hash
ON public.api_keys(key_hash);
```

## 🔍 Check What Columns PR Reviews Has

Before creating more PR reviews indexes, check its columns:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'pr_reviews'
ORDER BY ordinal_position;
```

## 🔍 Check What Columns Analysis Results Has

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'analysis_results'
ORDER BY ordinal_position;
```

## ✅ After Creating Indexes

### Verify They Were Created:
```sql
SELECT 
    tablename as "Table",
    indexname as "Index",
    pg_size_pretty(pg_relation_size(indexname::regclass)) as "Size"
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY pg_relation_size(indexname::regclass) DESC;
```

### Update Statistics:
```sql
ANALYZE public.vector_embeddings;
ANALYZE public.vector_chunks;
ANALYZE public.api_usage;
ANALYZE public.pr_reviews;
ANALYZE public.analysis_results;
ANALYZE public.users;
```

## 🎯 Expected Impact

After creating these indexes:
- Vector embedding queries: Should be much faster
- API usage tracking: Instant lookups
- Repository-based queries: Significant improvement
- Authentication: Faster email lookups

Start with indexes 1-5 as they address the most common query patterns!