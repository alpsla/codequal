# Correct Performance Indexes for Your Database

Based on your actual table names, here are the indexes to create. Run each one separately:

## 🚨 Most Critical Indexes (Fix Slow Queries)

### 1. Vector Embeddings - Main Performance Fix
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vector_embeddings_critical
ON public.vector_embeddings(repository_id, content_type, created_at DESC);
```

### 2. Vector Chunks - Secondary Vector Index
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vector_chunks_repository
ON public.vector_chunks(repository_id, created_at DESC);
```

### 3. API Usage - Billing/Usage Queries
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_usage_critical
ON public.api_usage(user_id, created_at DESC);
```

### 4. PR Reviews - Common Lookups
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pr_reviews_critical
ON public.pr_reviews(repository_id, pr_number, status);
```

### 5. Analysis Results - Status Queries
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analysis_results_critical
ON public.analysis_results(repository_id, pr_number, status);
```

## 📊 Repository and Analysis Indexes

### 6. DeepWiki Analysis
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deepwiki_analysis_repo
ON public.deepwiki_analysis(repository_id, created_at DESC);
```

### 7. Repository Analysis
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_repository_analysis_repo
ON public.repository_analysis(repository_id, analyzed_at DESC);
```

### 8. PR Analyses
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pr_analyses_repo
ON public.pr_analyses(repository_id, pr_number);
```

### 9. Analysis Queue
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analysis_queue_status
ON public.analysis_queue(status, created_at);
```

## 👤 User and Authentication Indexes

### 10. Users Email (Login Performance)
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email
ON public.users(email);
```

### 11. User Sessions (Auth Checks)
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_user
ON public.user_sessions(user_id, expires_at);
```

### 12. API Keys (API Authentication)
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_keys_key_hash
ON public.api_keys(key_hash) WHERE revoked_at IS NULL;
```

## 🔗 Foreign Key Indexes

### 13. Users Organization
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_users_organization_id
ON public.users(organization_id) WHERE organization_id IS NOT NULL;
```

### 14. Organization Members
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organization_members_composite
ON public.organization_members(organization_id, user_id);
```

### 15. User Repositories Access
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_repositories_composite
ON public.user_repositories(user_id, repository_id);
```

## 💰 Billing and Usage Indexes

### 16. Stripe Customers
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stripe_customers_user
ON public.stripe_customers(user_id);
```

### 17. User Subscriptions
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_subscriptions_user_status
ON public.user_subscriptions(user_id, status);
```

### 18. API Usage Logs (Heavy Table)
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_usage_logs_created
ON public.api_usage_logs(created_at DESC);
```

## ✅ Verification Query

After creating indexes, run this to see what was created:

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

## 📈 Update Statistics

After all indexes are created:

```sql
ANALYZE public.vector_embeddings;
ANALYZE public.vector_chunks;
ANALYZE public.api_usage;
ANALYZE public.pr_reviews;
ANALYZE public.analysis_results;
ANALYZE public.deepwiki_analysis;
ANALYZE public.users;
ANALYZE public.user_sessions;
```

## Priority Order

1. Start with indexes 1-5 (most critical for performance)
2. Then do 6-9 (analysis tables)
3. Then 10-12 (authentication)
4. Finally 13-18 (foreign keys and billing)

Each index takes 30 seconds to 2 minutes depending on table size.