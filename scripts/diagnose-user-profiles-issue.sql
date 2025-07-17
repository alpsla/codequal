-- Quick diagnostic script for user_profiles table issue
-- Run each section separately in Supabase SQL editor to identify the problem

-- SECTION 1: Check if table exists
SELECT 
    'Table exists in public schema' as check_type,
    EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles'
    ) as result;

-- SECTION 2: Check all schemas for user_profiles
SELECT 
    'user_profiles location' as check_type,
    table_schema,
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name = 'user_profiles';

-- SECTION 3: Check the function and its search path
SELECT 
    'ensure_user_profile function' as check_type,
    n.nspname as schema,
    p.proname as function_name,
    p.prosrc as function_source
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'ensure_user_profile';

-- SECTION 4: Check current search path
SHOW search_path;

-- SECTION 5: Check trigger configuration
SELECT 
    'Trigger configuration' as check_type,
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    tgfoid::regproc as function_name,
    tgenabled as enabled
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

-- SECTION 6: Test direct access to the table
-- This will show if it's a permissions issue
DO $$
BEGIN
    PERFORM 1 FROM public.user_profiles LIMIT 1;
    RAISE NOTICE 'Successfully accessed public.user_profiles';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error accessing public.user_profiles: %', SQLERRM;
END $$;

-- SECTION 7: Check if there's a view instead of a table
SELECT 
    'Views named user_profiles' as check_type,
    schemaname,
    viewname,
    definition
FROM pg_views
WHERE viewname = 'user_profiles';