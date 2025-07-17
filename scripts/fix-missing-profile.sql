-- Check and fix missing user profile for rostislav.alpin@gmail.com
-- This script only creates the missing profile, doesn't modify existing data

-- First, let's check if the profile really doesn't exist
SELECT 
  'Checking profile for rostislav.alpin@gmail.com' as action,
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = '580e3fe8-094d-477f-86cb-88e4273b589b'
  ) as profile_exists;

-- If the profile doesn't exist, we need to create it
-- This uses data from the auth.users table
DO $$
DECLARE
  auth_user RECORD;
  profile_exists BOOLEAN;
BEGIN
  -- Get the auth user data
  SELECT * INTO auth_user 
  FROM auth.users 
  WHERE id = '580e3fe8-094d-477f-86cb-88e4273b589b';
  
  -- Check if profile exists
  SELECT EXISTS (
    SELECT 1 FROM user_profiles WHERE user_id = auth_user.id
  ) INTO profile_exists;
  
  -- Only create if it doesn't exist
  IF NOT profile_exists AND auth_user.id IS NOT NULL THEN
    INSERT INTO user_profiles (
      id,
      user_id,
      email,
      full_name,
      avatar_url,
      created_at,
      updated_at,
      last_login_at
    ) VALUES (
      gen_random_uuid(),
      auth_user.id,
      auth_user.email,
      COALESCE(
        auth_user.raw_user_meta_data->>'full_name',
        auth_user.raw_user_meta_data->>'name',
        split_part(auth_user.email, '@', 1)
      ),
      COALESCE(
        auth_user.raw_user_meta_data->>'avatar_url',
        auth_user.raw_user_meta_data->>'picture',
        ''
      ),
      COALESCE(auth_user.created_at, NOW()),
      NOW(),
      COALESCE(auth_user.last_sign_in_at, NOW())
    );
    
    RAISE NOTICE 'Created profile for user: %', auth_user.email;
  ELSE
    RAISE NOTICE 'Profile already exists or user not found for: rostislav.alpin@gmail.com';
  END IF;
END $$;

-- Verify the profile now exists
SELECT 
  up.user_id,
  up.email,
  up.full_name,
  up.created_at
FROM user_profiles up
WHERE up.user_id = '580e3fe8-094d-477f-86cb-88e4273b589b';

-- Also check if the trigger exists that should create profiles automatically
SELECT 
  'Checking triggers' as check_type,
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'auth.users'::regclass
AND tgname LIKE '%user%';

-- If no triggers exist, that explains why profiles weren't created automatically