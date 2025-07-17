-- Check RLS policies that might prevent updates

-- 1. Check if RLS is enabled
SELECT 
    'RLS Status' as check_type,
    relname as table_name,
    relrowsecurity as rls_enabled,
    relforcerowsecurity as rls_forced
FROM pg_class
WHERE relname = 'user_profiles';

-- 2. List all policies on user_profiles
SELECT 
    'RLS Policies' as check_type,
    polname as policy_name,
    polcmd as command,
    polpermissive as permissive,
    pg_get_expr(polqual, polrelid) as qual_condition,
    pg_get_expr(polwithcheck, polrelid) as with_check_condition,
    polroles::regrole[] as roles
FROM pg_policy
WHERE polrelid = 'user_profiles'::regclass;

-- 3. Check what role we're using
SELECT 
    'Current User Info' as check_type,
    current_user,
    session_user,
    current_role,
    current_database();

-- 4. Try to bypass RLS (if you have permissions)
-- This requires superuser or bypassrls privilege
SET ROLE postgres; -- or another superuser role

UPDATE user_profiles
SET subscription_tier = 'individual'
WHERE email = 'rostislav.alpin@gmail.com'
RETURNING email, subscription_tier;

-- Reset role
RESET ROLE;

-- 5. Alternative: Update as service_role if available
SET ROLE service_role;

UPDATE user_profiles
SET subscription_tier = 'individual'
WHERE email = 'rostislav.alpin@gmail.com'
RETURNING email, subscription_tier;

RESET ROLE;

-- 6. Check if the update is actually happening but being reverted
BEGIN;
    UPDATE user_profiles
    SET subscription_tier = 'individual'
    WHERE email = 'rostislav.alpin@gmail.com';
    
    -- Check immediately
    SELECT email, subscription_tier 
    FROM user_profiles 
    WHERE email = 'rostislav.alpin@gmail.com';
COMMIT;

-- 7. Try disabling RLS temporarily (requires privileges)
-- ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
-- UPDATE user_profiles SET subscription_tier = 'individual' WHERE email = 'rostislav.alpin@gmail.com';
-- ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;