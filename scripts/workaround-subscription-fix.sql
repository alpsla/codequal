-- Workaround for subscription issue without altering ENUM types
-- This approach modifies the application's view of the data

-- Option 1: Create a view that shows correct subscription data
CREATE OR REPLACE VIEW user_profiles_with_billing AS
SELECT 
    up.*,
    -- Override subscription_tier with actual billing data
    COALESCE(ub.subscription_tier, up.subscription_tier) as actual_subscription_tier,
    COALESCE(ub.subscription_status, 'free') as actual_subscription_status
FROM user_profiles up
LEFT JOIN user_billing ub ON up.user_id = ub.user_id;

-- Grant permissions on the view
GRANT SELECT ON user_profiles_with_billing TO authenticated;
GRANT SELECT ON user_profiles_with_billing TO service_role;

-- Test the view
SELECT 
    email,
    subscription_tier as profile_tier,
    actual_subscription_tier,
    actual_subscription_status
FROM user_profiles_with_billing
WHERE email = 'rostislav.alpin@gmail.com';

-- Option 2: Create a function that returns correct subscription status
CREATE OR REPLACE FUNCTION get_user_subscription_tier(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_tier TEXT;
BEGIN
    -- Get tier from user_billing first, fallback to user_profiles
    SELECT COALESCE(ub.subscription_tier, up.subscription_tier, 'free')
    INTO v_tier
    FROM user_profiles up
    LEFT JOIN user_billing ub ON up.user_id = ub.user_id
    WHERE up.user_id = p_user_id;
    
    RETURN v_tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the function
SELECT 
    email,
    get_user_subscription_tier(user_id) as correct_tier
FROM user_profiles
WHERE email = 'rostislav.alpin@gmail.com';

-- Option 3: Update the status field instead (if it has 'verified' value)
-- First check what values are allowed for status
SELECT DISTINCT status FROM user_profiles;

-- If 'verified' is allowed, update it
UPDATE user_profiles
SET status = 'verified'
WHERE email = 'rostislav.alpin@gmail.com'
AND 'verified' IN (
    SELECT enumlabel::TEXT 
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = (
        SELECT udt_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND column_name = 'status'
    )
);

-- Option 4: Direct database fix - Convert column to TEXT temporarily
-- WARNING: This is a more invasive change
/*
-- Convert ENUM to TEXT to allow any value
ALTER TABLE user_profiles 
ALTER COLUMN subscription_tier TYPE TEXT;

-- Update the value
UPDATE user_profiles
SET subscription_tier = 'individual'
WHERE email = 'rostislav.alpin@gmail.com';

-- Optionally convert back to ENUM with all values
-- CREATE TYPE subscription_tier_new AS ENUM ('free', 'individual', 'team');
-- ALTER TABLE user_profiles 
-- ALTER COLUMN subscription_tier TYPE subscription_tier_new 
-- USING subscription_tier::subscription_tier_new;
*/