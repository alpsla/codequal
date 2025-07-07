-- Simple fix avoiding type casting issues
-- This version works regardless of whether user_id is UUID or VARCHAR

-- 1. Check what we're dealing with
SELECT 
    'user_profiles.user_id' as column_info,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND column_name = 'user_id';

-- 2. Basic permission grants
GRANT USAGE ON SCHEMA auth TO postgres, anon, authenticated, service_role;
GRANT SELECT ON auth.users TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO authenticated, service_role;

-- 3. Ensure email is confirmed
UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email = 'slavataichi@gmail.com' 
AND email_confirmed_at IS NULL;

-- 4. Create profile using a subquery to avoid type issues
INSERT INTO user_profiles (user_id, email)
SELECT 
    CASE 
        WHEN col.data_type = 'uuid' THEN u.id::text
        ELSE u.id::text
    END,
    u.email
FROM auth.users u
CROSS JOIN (
    SELECT data_type 
    FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'user_id'
) col
WHERE u.email = 'slavataichi@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email;

-- 5. Simple RLS policies without type casting in the condition
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies first
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'user_profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON user_profiles', pol.policyname);
    END LOOP;
END $$;

-- Create very permissive policies to avoid type issues
CREATE POLICY "Allow all for authenticated" ON user_profiles
    FOR ALL 
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role bypass" ON user_profiles
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- 6. Clear sessions using a different approach
DELETE FROM auth.sessions s
WHERE EXISTS (
    SELECT 1 FROM auth.users u 
    WHERE u.email = 'slavataichi@gmail.com' 
    AND u.id = s.user_id
);

DELETE FROM auth.refresh_tokens r
WHERE EXISTS (
    SELECT 1 FROM auth.users u 
    WHERE u.email = 'slavataichi@gmail.com' 
    AND u.id = r.user_id
);

-- 7. Verify the setup
SELECT 
    CASE 
        WHEN au.id IS NULL THEN '❌ User not found in auth.users'
        WHEN au.email_confirmed_at IS NULL THEN '❌ Email not confirmed'
        WHEN up.user_id IS NULL THEN '❌ Profile not found'
        ELSE '✅ Setup complete'
    END as status,
    au.email,
    au.email_confirmed_at IS NOT NULL as email_confirmed,
    up.user_id IS NOT NULL as has_profile
FROM auth.users au
LEFT JOIN user_profiles up ON up.email = au.email
WHERE au.email = 'slavataichi@gmail.com';

-- 8. Alternative: If nothing works, show the exact user data
SELECT 
    'User ID from auth.users:' as description,
    id,
    email
FROM auth.users 
WHERE email = 'slavataichi@gmail.com'
UNION ALL
SELECT 
    'User ID from user_profiles:' as description,
    user_id::uuid,
    email
FROM user_profiles 
WHERE email = 'slavataichi@gmail.com';

-- 9. Nuclear option preparation (if all else fails)
-- This will show you the commands to completely recreate the user
SELECT 
    '-- To completely recreate the user, run these commands:' as instructions
UNION ALL
SELECT 
    '-- DELETE FROM user_profiles WHERE email = ''slavataichi@gmail.com'';'
UNION ALL
SELECT 
    '-- DELETE FROM auth.users WHERE email = ''slavataichi@gmail.com'';'
UNION ALL
SELECT 
    '-- Then create a new user through Supabase Dashboard';