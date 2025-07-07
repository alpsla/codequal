-- Diagnostic query to check auth setup
-- Run this in Supabase SQL Editor to diagnose the issue

-- 1. Check if user exists in auth.users
SELECT 
    id,
    email,
    email_confirmed_at,
    created_at,
    last_sign_in_at
FROM auth.users
WHERE email = 'slavataichi@gmail.com';

-- 2. Check if user profile exists
SELECT 
    id,
    user_id,
    email,
    created_at
FROM user_profiles
WHERE email = 'slavataichi@gmail.com';

-- 3. Check auth schema permissions
SELECT 
    schemaname,
    tablename,
    tableowner,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables
WHERE schemaname = 'auth'
AND tablename = 'users';

-- 4. Check if our trigger exists
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'auth'
AND trigger_name = 'ensure_profile_on_user_change';

-- 5. Check for any auth flow logs (if available)
SELECT 
    id,
    user_id,
    created_at,
    type
FROM auth.flow_state
WHERE created_at > NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC
LIMIT 10;

-- 6. Check RLS policies on user_profiles
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
WHERE tablename = 'user_profiles';