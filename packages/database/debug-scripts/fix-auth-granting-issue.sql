-- Comprehensive fix for "Database error granting user" issue
-- This error typically occurs when there are permission issues or missing database objects

-- 1. First, let's check the current state of the user
SELECT 
    id,
    email,
    email_confirmed_at,
    created_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data
FROM auth.users
WHERE email = 'slavataichi@gmail.com';

-- 2. Check if user profile exists
SELECT * FROM user_profiles WHERE email = 'slavataichi@gmail.com';

-- 3. Check provider accounts (might be causing conflicts)
SELECT * FROM provider_accounts WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'slavataichi@gmail.com'
);

-- 4. Check for any auth hooks that might be failing
SELECT 
    proname AS function_name,
    pg_get_functiondef(oid) AS function_definition
FROM pg_proc
WHERE pronamespace = 'auth'::regnamespace
AND proname LIKE '%grant%' OR proname LIKE '%hook%';

-- 5. Fix: Ensure all necessary permissions are granted
-- Grant permissions on auth schema
GRANT USAGE ON SCHEMA auth TO postgres, authenticated, anon, service_role;

-- Grant permissions on auth tables
GRANT SELECT ON auth.users TO postgres, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON auth.identities TO postgres, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON auth.sessions TO postgres, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON auth.refresh_tokens TO postgres, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON auth.mfa_factors TO postgres, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON auth.mfa_challenges TO postgres, authenticated, service_role;

-- 6. Grant permissions on auth functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO postgres, authenticated, service_role;

-- 7. Ensure RLS is properly configured
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.refresh_tokens ENABLE ROW LEVEL SECURITY;

-- 8. Check if there are any custom RLS policies that might be blocking
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'auth'
ORDER BY tablename, policyname;

-- 9. Create or fix the user profile if missing
DO $$
DECLARE
    user_record RECORD;
BEGIN
    -- Get the user record
    SELECT * INTO user_record 
    FROM auth.users 
    WHERE email = 'slavataichi@gmail.com' 
    LIMIT 1;
    
    IF user_record.id IS NOT NULL THEN
        -- Ensure user profile exists
        INSERT INTO user_profiles (
            id,
            user_id,
            email,
            full_name,
            created_at,
            updated_at,
            last_login_at,
            auth_method,
            email_verified
        ) VALUES (
            gen_random_uuid(),
            user_record.id,
            user_record.email,
            COALESCE(
                user_record.raw_user_meta_data->>'full_name',
                user_record.raw_user_meta_data->>'name',
                split_part(user_record.email, '@', 1)
            ),
            NOW(),
            NOW(),
            NOW(),
            'magic_link',
            true
        )
        ON CONFLICT (user_id) DO UPDATE SET
            email = EXCLUDED.email,
            last_login_at = NOW(),
            updated_at = NOW(),
            auth_method = 'magic_link',
            email_verified = true;
        
        RAISE NOTICE 'User profile created/updated for %', user_record.email;
    ELSE
        RAISE NOTICE 'User not found in auth.users';
    END IF;
END $$;

-- 10. Check for any triggers that might be failing
SELECT 
    trigger_schema,
    trigger_name,
    event_manipulation,
    event_object_schema,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
ORDER BY event_object_table, trigger_name;

-- 11. Test the auth.uid() function
SELECT auth.uid();

-- 12. Check if there are any issues with the JWT verification
SELECT current_setting('request.jwt.claims', true);

-- 13. Ensure the auth schema is in the search path
SHOW search_path;
SET search_path TO public, auth, extensions;

-- 14. Check for any custom auth hooks in the app_metadata
SELECT 
    id,
    email,
    raw_app_meta_data
FROM auth.users
WHERE email = 'slavataichi@gmail.com'
AND raw_app_meta_data ? 'custom_access_token';

-- 15. Clear any potentially corrupted sessions for this user
DELETE FROM auth.sessions 
WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'slavataichi@gmail.com'
);

DELETE FROM auth.refresh_tokens 
WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'slavataichi@gmail.com'
);

-- 16. Check if there's a provider_accounts entry that might be conflicting
DELETE FROM provider_accounts 
WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'slavataichi@gmail.com'
)
AND provider = 'email'; -- Remove email provider if it exists

-- 17. Verify auth.users table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'auth'
AND table_name = 'users'
ORDER BY ordinal_position;

-- 18. Check for any custom database functions that might interfere
SELECT 
    n.nspname as schema,
    p.proname as function_name,
    pg_catalog.pg_get_function_result(p.oid) as result_type,
    pg_catalog.pg_get_function_arguments(p.oid) as arguments
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname LIKE '%grant%' 
   OR p.proname LIKE '%user%'
   OR p.proname LIKE '%auth%'
AND n.nspname NOT IN ('pg_catalog', 'information_schema')
ORDER BY 1, 2;

-- 19. Final check: Ensure the user can be selected
SELECT 
    'Auth user exists' as check_type,
    EXISTS(SELECT 1 FROM auth.users WHERE email = 'slavataichi@gmail.com') as result
UNION ALL
SELECT 
    'Profile exists' as check_type,
    EXISTS(SELECT 1 FROM user_profiles WHERE email = 'slavataichi@gmail.com') as result
UNION ALL
SELECT 
    'Can execute auth.uid()' as check_type,
    auth.uid() IS NOT NULL OR auth.uid() IS NULL as result
UNION ALL
SELECT 
    'Has proper grants' as check_type,
    has_table_privilege('authenticated', 'auth.users', 'SELECT') as result;

-- 20. Alternative: Create a fresh user if all else fails
-- IMPORTANT: Only run this if you want to recreate the user completely
/*
-- First, remove the existing user
DELETE FROM user_profiles WHERE email = 'slavataichi@gmail.com';
DELETE FROM auth.users WHERE email = 'slavataichi@gmail.com';

-- Then use Supabase dashboard to create a new user or use the API
*/