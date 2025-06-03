-- VACUUM Commands for Performance
-- Run each command SEPARATELY in the SQL Editor
-- DO NOT run all at once - run one by one

-- 1. Clean dead rows from users table (46 dead rows)
VACUUM ANALYZE public.users;

-- 2. Clean dead rows from repositories table (8 dead rows)
VACUUM ANALYZE public.repositories;

-- 3. Clean dead rows from pr_reviews table (17 dead rows)  
VACUUM ANALYZE public.pr_reviews;

-- 4. Clean dead rows from analysis_chunks table (44 dead rows)
VACUUM ANALYZE public.analysis_chunks;

-- 5. Clean dead rows from model_configurations table (12 dead rows)
VACUUM ANALYZE public.model_configurations;

-- 6. Clean dead rows from user_profiles table (12 dead rows)
VACUUM ANALYZE public.user_profiles;

-- 7. Clean dead rows from organizations table (3 dead rows)
VACUUM ANALYZE public.organizations;

-- 8. Clean dead rows from rate_limits table (9 dead rows)
VACUUM ANALYZE public.rate_limits;

-- 9. Clean dead rows from analysis_queue table (5 dead rows)
VACUUM ANALYZE public.analysis_queue;

-- After running all VACUUM commands, check the results:
SELECT 
    tablename,
    n_live_tup as live_rows,
    n_dead_tup as dead_rows,
    last_vacuum,
    last_autovacuum
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_dead_tup DESC;
