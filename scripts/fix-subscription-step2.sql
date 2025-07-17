-- STEP 2: Update user subscription data
-- Run this AFTER step 1 has been committed

-- Verify ENUM values are available
SELECT 
    'Available subscription_tier values' as info,
    string_agg(enumlabel, ', ') as values
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = (
    SELECT udt_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles' 
    AND column_name = 'subscription_tier'
);

-- Update rostislav.alpin@gmail.com
UPDATE user_profiles
SET subscription_tier = 'individual'
WHERE email = 'rostislav.alpin@gmail.com'
RETURNING email, subscription_tier, status;

-- Sync all users who have active subscriptions in user_billing
UPDATE user_profiles up
SET subscription_tier = ub.subscription_tier
FROM user_billing ub
WHERE up.user_id = ub.user_id
AND ub.subscription_tier != 'free'
AND ub.subscription_status = 'active'
AND up.subscription_tier != ub.subscription_tier
RETURNING up.email, up.subscription_tier as new_tier, ub.subscription_tier as billing_tier;

-- Verify the fix
SELECT 
    'Final Status' as info,
    u.email,
    up.subscription_tier as profile_tier,
    up.status as profile_status,
    ub.subscription_tier as billing_tier,
    ub.subscription_status as billing_status,
    CASE 
        WHEN up.subscription_tier = ub.subscription_tier THEN '✓ Synced'
        ELSE '✗ Mismatch'
    END as sync_status
FROM auth.users u
JOIN user_profiles up ON u.id = up.user_id
LEFT JOIN user_billing ub ON u.id = ub.user_id
WHERE u.email IN ('rostislav.alpin@gmail.com', 'slavataichi@gmail.com')
OR ub.subscription_tier != 'free'
ORDER BY u.email;