-- Diagnostic script to find the root cause of "Database error granting user"
-- Run each section to identify the issue

-- 1. Check user status
SELECT 
    '=== USER STATUS ===' as section;

SELECT 
    id,
    email,
    email_confirmed_at,
    created_at,
    last_sign_in_at,
    updated_at,
    CASE 
        WHEN email_confirmed_at IS NULL THEN 'Email not confirmed!'
        ELSE 'Email confirmed'
    END as email_status
FROM auth.users
WHERE email = 'slavataichi@gmail.com';

-- 2. Check user profile
SELECT 
    '=== USER PROFILE ===' as section;

SELECT 
    user_id,
    email,
    created_at,
    EXISTS(SELECT 1 FROM auth.users u WHERE u.id = user_profiles.user_id) as user_exists
FROM user_profiles
WHERE email = 'slavataichi@gmail.com';

-- 3. Check for duplicate profiles or constraints
SELECT 
    '=== PROFILE CONSTRAINTS ===' as section;

SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'user_profiles'::regclass;

-- 4. Check all triggers on auth.users
SELECT 
    '=== AUTH TRIGGERS ===' as section;

SELECT 
    tgname as trigger_name,
    tgtype,
    tgenabled,
    proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE t.tgrelid = 'auth.users'::regclass
ORDER BY tgname;

-- 5. Check auth functions that might be failing
SELECT 
    '=== AUTH FUNCTIONS ===' as section;

SELECT 
    n.nspname as schema,
    p.proname as function_name,
    p.pronargs as arg_count
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname LIKE '%grant%' 
   OR p.proname LIKE '%session%'
   OR p.proname LIKE '%auth%hook%'
AND n.nspname IN ('auth', 'extensions', 'public')
ORDER BY n.nspname, p.proname;

-- 6. Check RLS policies
SELECT 
    '=== RLS POLICIES ===' as section;

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname IN ('auth', 'public')
AND tablename IN ('users', 'sessions', 'user_profiles', 'refresh_tokens')
ORDER BY schemaname, tablename, policyname;

-- 7. Check auth schema permissions
SELECT 
    '=== SCHEMA PERMISSIONS ===' as section;

SELECT 
    nspname as schema_name,
    array_agg(
        (privilege_type || ' to ' || grantee)::text 
        ORDER BY grantee, privilege_type
    ) as permissions
FROM information_schema.usage_privileges
WHERE object_schema IN ('auth', 'public')
GROUP BY nspname;

-- 8. Check table permissions
SELECT 
    '=== TABLE PERMISSIONS ===' as section;

SELECT 
    table_schema,
    table_name,
    grantee,
    string_agg(privilege_type, ', ' ORDER BY privilege_type) as privileges
FROM information_schema.table_privileges
WHERE table_schema IN ('auth', 'public')
AND table_name IN ('users', 'sessions', 'user_profiles', 'refresh_tokens')
GROUP BY table_schema, table_name, grantee
ORDER BY table_schema, table_name, grantee;

-- 9. Check for custom auth hooks
SELECT 
    '=== CUSTOM HOOKS ===' as section;

-- This varies by Supabase version, try both approaches
-- Approach 1: Check pg_proc for hook-like functions
SELECT 
    p.proname as function_name,
    n.nspname as schema_name,
    pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname LIKE '%hook%'
AND n.nspname = 'public';

-- 10. Check auth config
SELECT 
    '=== AUTH CONFIG ===' as section;

SELECT * FROM auth.config;

-- 11. Quick fix attempt - ensure all basics are in place
SELECT 
    '=== APPLYING QUICK FIX ===' as section;

-- Ensure email is confirmed
UPDATE auth.users 
SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
WHERE email = 'slavataichi@gmail.com';

-- Ensure profile exists
INSERT INTO user_profiles (user_id, email)
SELECT id, email
FROM auth.users
WHERE email = 'slavataichi@gmail.com'
ON CONFLICT (user_id) DO NOTHING;

-- Grant basic permissions
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT SELECT ON auth.users TO authenticated;

-- Show final status
SELECT 
    '=== FINAL STATUS ===' as section;

SELECT 
    u.id,
    u.email,
    u.email_confirmed_at IS NOT NULL as email_confirmed,
    p.user_id IS NOT NULL as has_profile,
    CASE 
        WHEN u.id IS NULL THEN '❌ User does not exist'
        WHEN u.email_confirmed_at IS NULL THEN '❌ Email not confirmed'
        WHEN p.user_id IS NULL THEN '❌ Profile missing'
        ELSE '✅ Basic setup looks correct - issue might be in auth flow'
    END as diagnosis
FROM auth.users u
LEFT JOIN user_profiles p ON p.user_id = u.id
WHERE u.email = 'slavataichi@gmail.com';