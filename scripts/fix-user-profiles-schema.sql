-- Fix user_profiles table schema issue
-- The table incorrectly has subscription_tier and status columns

-- Step 1: Verify the problematic columns exist
SELECT 
    'Problematic columns in user_profiles' as check_type,
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'user_profiles'
AND column_name IN ('subscription_tier', 'status', 'organizations', 'primary_organization_id')
ORDER BY ordinal_position;

-- Step 2: Check if we have the correct data in user_billing
SELECT 
    'Correct billing data' as check_type,
    u.email,
    ub.subscription_tier as correct_tier,
    ub.subscription_status as correct_status,
    up.subscription_tier as wrong_tier_in_profiles,
    up.status as wrong_status_in_profiles
FROM auth.users u
LEFT JOIN user_billing ub ON u.id = ub.user_id
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE u.email IN ('rostislav.alpin@gmail.com', 'slavataichi@gmail.com');

-- Step 3: Update the incorrect data in user_profiles (temporary fix)
-- This is a workaround until the schema is properly fixed
UPDATE user_profiles up
SET 
    subscription_tier = COALESCE(ub.subscription_tier, 'free'),
    status = CASE 
        WHEN ub.subscription_status = 'active' THEN 'verified'
        WHEN ub.subscription_status IS NOT NULL THEN ub.subscription_status
        ELSE 'pending_verification'
    END
FROM user_billing ub
WHERE up.user_id = ub.user_id
AND up.user_id IN (
    SELECT id FROM auth.users 
    WHERE email IN ('rostislav.alpin@gmail.com', 'slavataichi@gmail.com')
);

-- Step 4: Specifically update rostislav.alpin@gmail.com
UPDATE user_profiles
SET 
    subscription_tier = 'individual',
    status = 'verified'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'rostislav.alpin@gmail.com');

-- Step 5: Verify the update
SELECT 
    'After update' as check_type,
    email,
    subscription_tier,
    status,
    full_name
FROM user_profiles
WHERE email = 'rostislav.alpin@gmail.com';

-- Step 6: Create a migration to fix the schema properly
-- This should be run after updating all application code to use user_billing
/*
-- MIGRATION: Move subscription data to proper table
-- 1. Ensure all subscription data is in user_billing
INSERT INTO user_billing (user_id, subscription_tier, created_at, updated_at)
SELECT 
    user_id,
    COALESCE(subscription_tier, 'free'),
    NOW(),
    NOW()
FROM user_profiles
WHERE user_id NOT IN (SELECT user_id FROM user_billing)
ON CONFLICT (user_id) DO NOTHING;

-- 2. Update existing billing records with data from profiles
UPDATE user_billing ub
SET 
    subscription_tier = COALESCE(up.subscription_tier, ub.subscription_tier, 'free'),
    updated_at = NOW()
FROM user_profiles up
WHERE ub.user_id = up.user_id
AND up.subscription_tier IS NOT NULL;

-- 3. After updating all code, drop the incorrect columns
-- ALTER TABLE user_profiles DROP COLUMN subscription_tier;
-- ALTER TABLE user_profiles DROP COLUMN status;
-- ALTER TABLE user_profiles DROP COLUMN organizations;
-- ALTER TABLE user_profiles DROP COLUMN primary_organization_id;
*/