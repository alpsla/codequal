-- Immediate workaround without changing ENUM types
-- This converts the column to TEXT temporarily

-- Option 1: Convert subscription_tier to TEXT (immediate fix)
ALTER TABLE user_profiles 
ALTER COLUMN subscription_tier TYPE TEXT 
USING subscription_tier::TEXT;

-- Now update the values
UPDATE user_profiles up
SET subscription_tier = COALESCE(ub.subscription_tier::TEXT, 'free')
FROM user_billing ub
WHERE up.user_id = ub.user_id
AND ub.subscription_tier IS NOT NULL;

-- Specifically fix rostislav.alpin@gmail.com
UPDATE user_profiles
SET subscription_tier = 'individual'
WHERE email = 'rostislav.alpin@gmail.com';

-- Verify the update
SELECT 
    email,
    subscription_tier,
    status
FROM user_profiles
WHERE email = 'rostislav.alpin@gmail.com';

-- Show all users with non-free subscriptions
SELECT 
    u.email,
    up.subscription_tier as profile_tier,
    ub.subscription_tier as billing_tier,
    ub.subscription_status
FROM auth.users u
JOIN user_profiles up ON u.id = up.user_id
JOIN user_billing ub ON u.id = ub.user_id
WHERE ub.subscription_tier != 'free'
ORDER BY u.email;

-- Option 2: If you want to restore ENUM later with all values
/*
-- Create new ENUM with all values
CREATE TYPE subscription_tier_new AS ENUM ('free', 'individual', 'team');

-- Convert column to use new ENUM
ALTER TABLE user_profiles 
ALTER COLUMN subscription_tier TYPE subscription_tier_new 
USING subscription_tier::subscription_tier_new;

-- Drop old type if needed
-- DROP TYPE IF EXISTS [old_type_name];
*/