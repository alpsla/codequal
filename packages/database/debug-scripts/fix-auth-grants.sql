-- Fix potential auth grants issues
-- Run this in Supabase SQL Editor with admin privileges

-- Grant necessary permissions on auth schema
GRANT USAGE ON SCHEMA auth TO postgres, authenticated, anon, service_role;

-- Grant permissions on auth.users table
GRANT SELECT ON auth.users TO postgres, authenticated, service_role;

-- Ensure RLS is enabled properly
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Grant permissions on user_profiles
GRANT ALL ON user_profiles TO authenticated;
GRANT ALL ON user_profiles TO anon;
GRANT ALL ON user_profiles TO service_role;

-- Check if there are any issues with the auth.uid() function
SELECT auth.uid();

-- Verify grants
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants
WHERE table_schema = 'auth'
AND table_name = 'users'
ORDER BY grantee, privilege_type;