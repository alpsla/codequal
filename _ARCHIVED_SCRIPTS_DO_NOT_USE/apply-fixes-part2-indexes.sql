-- Part 2: Performance Fixes (Indexes) - Run after Part 1
-- Run each CREATE INDEX statement separately to avoid transaction issues

-- ================================================
-- CRITICAL PERFORMANCE INDEXES
-- ================================================

-- IMPORTANT: Run each CREATE INDEX statement one at a time
-- The CONCURRENTLY option prevents table locks but must run outside transactions

-- 1. Vector store composite index (HIGHEST PRIORITY - fixes 6+ second queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vector_store_critical
ON public.vector_store(repository_id, content_type, created_at DESC);

-- 2. API usage composite index (for billing/usage queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_usage_critical
ON public.api_usage(user_id, created_at DESC);

-- 3. PR reviews composite index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pr_reviews_critical
ON public.pr_reviews(repository_id, pr_number, status);

-- 4. Analysis results composite index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analysis_results_critical
ON public.analysis_results(repository_id, pr_number, status);

-- ================================================
-- ADDITIONAL HIGH-IMPACT INDEXES
-- ================================================

-- 5. Vector store repository lookup (very common query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vector_store_repository_id
ON public.vector_store(repository_id);

-- 6. Users email lookup (for authentication)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email
ON public.users(email);

-- 7. Repositories URL lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_repositories_url
ON public.repositories(url);

-- 8. Model versions by role (for model selection)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_model_versions_role
ON public.model_versions(role);

-- ================================================
-- FOREIGN KEY INDEXES (prevent slow joins)
-- ================================================

-- 9. Users organization foreign key
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_users_organization_id
ON public.users(organization_id);

-- 10. Repositories organization foreign key
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_repositories_organization_id
ON public.repositories(organization_id);

-- 11. PR reviews repository foreign key
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_pr_reviews_repository_id
ON public.pr_reviews(repository_id);

-- 12. Analysis results PR review foreign key
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fk_analysis_results_pr_review_id
ON public.analysis_results(pr_review_id);

-- ================================================
-- VERIFICATION QUERIES (Run after all indexes)
-- ================================================

-- Check created indexes
SELECT 
    tablename as "Table",
    indexname as "Index Name",
    pg_size_pretty(pg_relation_size(indexname::regclass)) as "Size"
FROM pg_indexes
WHERE schemaname = 'public'
AND (indexname LIKE 'idx_%critical' OR indexname LIKE 'idx_fk_%')
ORDER BY tablename, indexname;

-- Check index usage stats
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as "Times Used",
    idx_tup_read as "Rows Read",
    idx_tup_fetch as "Rows Fetched"
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY idx_scan DESC
LIMIT 20;

-- Update table statistics for query planner
ANALYZE public.vector_store;
ANALYZE public.api_usage;
ANALYZE public.pr_reviews;
ANALYZE public.analysis_results;
ANALYZE public.users;
ANALYZE public.repositories;

-- Final verification message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 Part 2 Complete: Performance Indexes Created!';
    RAISE NOTICE '';
    RAISE NOTICE 'Expected improvements:';
    RAISE NOTICE '- Vector store queries: 6+ seconds → <1 second';
    RAISE NOTICE '- API usage queries: Much faster';
    RAISE NOTICE '- Join operations: Significantly improved';
    RAISE NOTICE '';
    RAISE NOTICE 'Monitor query performance in Supabase dashboard.';
END $$;