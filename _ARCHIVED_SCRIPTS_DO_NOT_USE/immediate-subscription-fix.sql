-- Immediate fix for rostislav.alpin@gmail.com subscription issue
-- The problem: user_profiles table has subscription_tier='free' but user_billing has 'individual'

-- Step 1: Update user_profiles with correct subscription data
UPDATE user_profiles
SET 
    subscription_tier = 'individual',
    status = 'verified'
WHERE email = 'rostislav.alpin@gmail.com';

-- Step 2: Verify the update
SELECT 
    'Updated profile' as info,
    email,
    subscription_tier,
    status,
    full_name
FROM user_profiles
WHERE email = 'rostislav.alpin@gmail.com';

-- Step 3: Sync all user_profiles with user_billing data
UPDATE user_profiles up
SET 
    subscription_tier = COALESCE(ub.subscription_tier, up.subscription_tier, 'free'),
    status = CASE 
        WHEN ub.subscription_status = 'active' THEN 'verified'
        WHEN ub.subscription_status = 'canceled' THEN 'canceled'
        WHEN ub.subscription_status = 'past_due' THEN 'past_due'
        WHEN up.email_verified = true THEN 'verified'
        ELSE 'pending_verification'
    END
FROM user_billing ub
WHERE up.user_id = ub.user_id
AND ub.subscription_tier IS NOT NULL
RETURNING up.email, up.subscription_tier, up.status;

-- Step 4: Show final status for all users with billing records
SELECT 
    'Final Status' as info,
    u.email,
    up.subscription_tier as profile_tier,
    up.status as profile_status,
    ub.subscription_tier as billing_tier,
    ub.subscription_status as billing_status,
    pm.stripe_payment_method_id IS NOT NULL as has_payment_method
FROM auth.users u
JOIN user_profiles up ON u.id = up.user_id
LEFT JOIN user_billing ub ON u.id = ub.user_id
LEFT JOIN payment_methods pm ON u.id = pm.user_id
WHERE ub.user_id IS NOT NULL
ORDER BY u.email;