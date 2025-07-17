-- Comprehensive billing data verification for rostislav.alpin@gmail.com

-- Step 1: Check the actual user_billing table data
SELECT 
    'Direct user_billing check' as check_type,
    user_id,
    subscription_tier,
    subscription_status,
    stripe_customer_id,
    stripe_subscription_id,
    trial_ends_at,
    created_at,
    updated_at
FROM user_billing
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'rostislav.alpin@gmail.com');

-- Step 2: Check if there are any views that might show different data
SELECT 
    'Check for billing-related views' as check_type,
    schemaname,
    viewname
FROM pg_views
WHERE viewname LIKE '%billing%' OR viewname LIKE '%subscription%';

-- Step 3: Check RLS policies that might affect the data
SELECT 
    'RLS policies on user_billing' as check_type,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'user_billing';

-- Step 4: Check if there's any caching or materialized views
SELECT 
    'Materialized views check' as check_type,
    schemaname,
    matviewname
FROM pg_matviews
WHERE matviewname LIKE '%billing%' OR matviewname LIKE '%user%';

-- Step 5: Force update the user_billing record with explicit values
UPDATE user_billing
SET 
    subscription_tier = 'individual',
    subscription_status = 'active',
    updated_at = NOW()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'rostislav.alpin@gmail.com')
RETURNING *;

-- Step 6: Verify the update took effect
SELECT 
    'After update verification' as check_type,
    ub.*,
    u.email
FROM user_billing ub
JOIN auth.users u ON u.id = ub.user_id
WHERE u.email = 'rostislav.alpin@gmail.com';

-- Step 7: Check if there's a second billing record (duplicate)
SELECT 
    'Duplicate billing records check' as check_type,
    COUNT(*) as billing_record_count,
    array_agg(subscription_tier) as all_tiers,
    array_agg(subscription_status) as all_statuses,
    array_agg(id) as record_ids
FROM user_billing
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'rostislav.alpin@gmail.com');

-- Step 8: Check trial limits and scans
SELECT 
    'Trial usage check' as check_type,
    ub.user_id,
    ub.subscription_tier,
    ub.trial_scans_used,
    ub.trial_scans_limit,
    ub.trial_ends_at
FROM user_billing ub
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'rostislav.alpin@gmail.com');