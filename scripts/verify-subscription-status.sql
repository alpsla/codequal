-- Verify the actual current status of rostislav.alpin@gmail.com

-- 1. Direct query with no caching
SELECT 
    NOW() as query_time,
    id,
    email,
    subscription_tier,
    subscription_tier::TEXT as tier_as_text,
    user_id
FROM user_profiles
WHERE email = 'rostislav.alpin@gmail.com';

-- 2. Query using user_id to double-check
SELECT 
    'By user_id' as query_method,
    email,
    subscription_tier
FROM user_profiles
WHERE user_id = '580e3fe8-094d-477f-86cb-88e4273b589b';

-- 3. Force a fresh read by using aggregate
SELECT 
    'Aggregate check' as method,
    MAX(email) as email,
    MAX(subscription_tier::TEXT) as subscription_tier,
    COUNT(*) as row_count
FROM user_profiles
WHERE email = 'rostislav.alpin@gmail.com'
GROUP BY user_id;

-- 4. Check all non-free subscriptions
SELECT 
    'All non-free users' as check_type,
    email,
    subscription_tier,
    user_id
FROM user_profiles
WHERE subscription_tier != 'free'
ORDER BY email;

-- 5. Compare with billing data again
SELECT 
    'Final comparison' as check_type,
    up.email,
    up.subscription_tier as profile_tier,
    ub.subscription_tier as billing_tier,
    up.subscription_tier = 'individual' as profile_is_individual,
    ub.subscription_tier = 'individual' as billing_is_individual
FROM user_profiles up
LEFT JOIN user_billing ub ON up.user_id = ub.user_id
WHERE up.email = 'rostislav.alpin@gmail.com';

-- 6. If you're using a pooled connection, this forces a fresh connection
-- DISCARD ALL;

-- 7. Raw table scan to ensure no view/cache issues
SELECT 
    email,
    subscription_tier
FROM ONLY user_profiles
WHERE email = 'rostislav.alpin@gmail.com';