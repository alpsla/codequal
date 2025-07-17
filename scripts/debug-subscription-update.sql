-- Debug why subscription_tier update isn't working

-- 1. Check if there are triggers preventing the update
SELECT 
    'Triggers on user_profiles' as check_type,
    tgname as trigger_name,
    tgtype,
    proname as function_name,
    tgenabled as enabled
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'user_profiles'::regclass;

-- 2. Check if there are rules on the table
SELECT 
    'Rules on user_profiles' as check_type,
    rulename,
    ev_type,
    is_instead
FROM pg_rules
WHERE tablename = 'user_profiles';

-- 3. Try update with explicit returning to see what happens
UPDATE user_profiles
SET subscription_tier = 'individual'
WHERE email = 'rostislav.alpin@gmail.com'
RETURNING 
    id,
    email,
    subscription_tier,
    user_id,
    ctid; -- physical row location

-- 4. Check if there are multiple rows for this email
SELECT 
    'Row count check' as check_type,
    COUNT(*) as row_count,
    array_agg(id) as profile_ids,
    array_agg(subscription_tier) as tiers
FROM user_profiles
WHERE email = 'rostislav.alpin@gmail.com';

-- 5. Try updating by user_id instead of email
UPDATE user_profiles
SET subscription_tier = 'individual'
WHERE user_id = (
    SELECT id FROM auth.users WHERE email = 'rostislav.alpin@gmail.com'
)
RETURNING email, subscription_tier;

-- 6. Force update with no conditions to test
-- WARNING: This updates ALL rows - use with caution
-- UPDATE user_profiles
-- SET subscription_tier = 'individual'
-- WHERE user_id = '580e3fe8-094d-477f-86cb-88e4273b589b';

-- 7. Check the exact data type and constraints
SELECT 
    'Column details' as check_type,
    column_name,
    data_type,
    udt_name,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'user_profiles'
AND column_name = 'subscription_tier';

-- 8. Try a different approach - use a CASE statement
UPDATE user_profiles
SET subscription_tier = CASE 
    WHEN email = 'rostislav.alpin@gmail.com' THEN 'individual'::text
    ELSE subscription_tier
END
WHERE email = 'rostislav.alpin@gmail.com';

-- 9. Final verification with explicit cast
SELECT 
    id,
    email,
    subscription_tier::text as tier_text,
    subscription_tier,
    user_id
FROM user_profiles
WHERE email = 'rostislav.alpin@gmail.com';