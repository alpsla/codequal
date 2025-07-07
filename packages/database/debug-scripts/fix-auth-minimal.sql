-- Minimal fix for "Database error granting user"
-- This focuses on the core permission issues without assuming table structure

-- 1. First, let's see what we're working with
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;

-- 2. Check if the user exists
SELECT 
    id,
    email,
    email_confirmed_at,
    created_at,
    raw_app_meta_data,
    raw_user_meta_data
FROM auth.users
WHERE email = 'slavataichi@gmail.com';

-- 3. Core permission fixes
BEGIN;

-- Grant essential permissions
GRANT USAGE ON SCHEMA auth TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO postgres, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA auth TO postgres, service_role;

-- Ensure authenticated users can read from auth.users
GRANT SELECT ON auth.users TO authenticated;

-- Fix permissions on public schema
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

-- 4. Ensure email is confirmed (critical for magic link)
UPDATE auth.users 
SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
WHERE email = 'slavataichi@gmail.com';

-- 5. Create minimal user profile
DO $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'slavataichi@gmail.com';
    
    IF v_user_id IS NOT NULL THEN
        -- Insert with only the columns that exist
        INSERT INTO user_profiles (user_id, email)
        VALUES (v_user_id, 'slavataichi@gmail.com')
        ON CONFLICT (user_id) DO NOTHING;
        
        RAISE NOTICE 'Profile ensured for user %', v_user_id;
    END IF;
END $$;

-- 6. Check and fix RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'user_profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON user_profiles', pol.policyname);
    END LOOP;
END $$;

-- Create simple, permissive policies
CREATE POLICY "Enable read for all authenticated users" ON user_profiles
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for users based on user_id" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Allow service role full access
CREATE POLICY "Service role bypass" ON user_profiles
    USING (auth.jwt() ->> 'role' = 'service_role');

-- 7. Clear any corrupted sessions
DELETE FROM auth.sessions 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'slavataichi@gmail.com');

DELETE FROM auth.refresh_tokens 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'slavataichi@gmail.com');

COMMIT;

-- 8. Diagnostic query to verify everything is set up
WITH user_check AS (
    SELECT 
        u.id,
        u.email,
        u.email_confirmed_at,
        EXISTS(SELECT 1 FROM user_profiles p WHERE p.user_id = u.id) as has_profile
    FROM auth.users u
    WHERE u.email = 'slavataichi@gmail.com'
)
SELECT 
    CASE 
        WHEN id IS NULL THEN '❌ User not found'
        WHEN email_confirmed_at IS NULL THEN '❌ Email not confirmed'
        WHEN NOT has_profile THEN '❌ Profile missing'
        ELSE '✅ User setup looks good'
    END as status,
    id,
    email,
    email_confirmed_at,
    has_profile
FROM user_check;

-- 9. Check for any auth flow blockers
SELECT 
    'Auth functions accessible' as check_type,
    has_function_privilege('authenticated', 'auth.uid()', 'EXECUTE') as result
UNION ALL
SELECT 
    'Can read auth.users' as check_type,
    has_table_privilege('authenticated', 'auth.users', 'SELECT') as result
UNION ALL
SELECT 
    'Can read user_profiles' as check_type,
    has_table_privilege('authenticated', 'user_profiles', 'SELECT') as result;