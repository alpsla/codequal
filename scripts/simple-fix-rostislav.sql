-- Simple fix specifically for rostislav.alpin@gmail.com
-- This avoids complex type comparisons

-- Step 1: Just update the specific user
UPDATE user_profiles
SET subscription_tier = 'individual'
WHERE email = 'rostislav.alpin@gmail.com';

-- Step 2: Verify it worked
SELECT 
    email,
    subscription_tier,
    status
FROM user_profiles
WHERE email = 'rostislav.alpin@gmail.com';

-- Step 3: Check billing vs profile data
SELECT 
    'Billing Comparison' as info,
    u.email,
    up.subscription_tier as profile_tier,
    ub.subscription_tier as billing_tier,
    ub.subscription_status as billing_status,
    pm.stripe_payment_method_id IS NOT NULL as has_payment
FROM auth.users u
JOIN user_profiles up ON u.id = up.user_id
LEFT JOIN user_billing ub ON u.id = ub.user_id
LEFT JOIN payment_methods pm ON u.id = pm.user_id
WHERE u.email = 'rostislav.alpin@gmail.com';

-- Step 4: If needed, update other paid users manually
-- List all users who should have non-free tiers
SELECT 
    'Users needing update' as info,
    u.email,
    up.subscription_tier as current_profile_tier,
    ub.subscription_tier as should_be_tier
FROM auth.users u
JOIN user_profiles up ON u.id = up.user_id
JOIN user_billing ub ON u.id = ub.user_id
WHERE ub.subscription_status = 'active'
  AND ub.subscription_tier IN ('individual', 'team')
  AND up.subscription_tier = 'free';

-- Step 5: Update specific users as needed
-- UPDATE user_profiles SET subscription_tier = 'individual' WHERE email = 'another@example.com';