-- Safe version of profile creation fix
-- This handles cases where some objects may already exist

-- First, let's check if the constraint is incorrect
DO $$
BEGIN
  -- Check if the problematic constraint exists
  IF EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'user_profiles_id_fkey' 
    AND conrelid = 'user_profiles'::regclass
  ) THEN
    -- Drop the incorrect constraint
    ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;
    RAISE NOTICE 'Dropped incorrect user_profiles_id_fkey constraint';
  END IF;
END $$;

-- Ensure the id column has a proper default
ALTER TABLE user_profiles 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Ensure user_id references auth.users correctly
ALTER TABLE user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_user_id_fkey;

ALTER TABLE user_profiles 
ADD CONSTRAINT user_profiles_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create or replace the function for automatic profile creation
CREATE OR REPLACE FUNCTION ensure_user_profile()
RETURNS TRIGGER AS $$
DECLARE
  profile_exists BOOLEAN;
BEGIN
  -- Check if profile already exists
  SELECT EXISTS (
    SELECT 1 FROM user_profiles WHERE user_id = NEW.id
  ) INTO profile_exists;
  
  IF NOT profile_exists THEN
    INSERT INTO user_profiles (
      user_id,
      email,
      full_name,
      avatar_url,
      github_username,
      github_id,
      gitlab_username,
      gitlab_id,
      bio,
      location,
      website,
      company,
      preferred_language,
      theme,
      email_notifications,
      created_at,
      updated_at,
      last_login_at
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
      ),
      COALESCE(
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'picture',
        ''
      ),
      CASE 
        WHEN NEW.raw_app_meta_data->>'provider' = 'github' 
          OR NEW.raw_user_meta_data->>'iss' = 'https://api.github.com'
        THEN NEW.raw_user_meta_data->>'user_name' 
      END,
      CASE 
        WHEN NEW.raw_app_meta_data->>'provider' = 'github' 
          OR NEW.raw_user_meta_data->>'iss' = 'https://api.github.com'
        THEN NEW.raw_user_meta_data->>'provider_id' 
      END,
      CASE 
        WHEN NEW.raw_app_meta_data->>'provider' = 'gitlab' 
        THEN NEW.raw_user_meta_data->>'nickname' 
      END,
      CASE 
        WHEN NEW.raw_app_meta_data->>'provider' = 'gitlab' 
        THEN NEW.raw_user_meta_data->>'provider_id' 
      END,
      '', -- bio
      '', -- location  
      '', -- website
      '', -- company
      'en', -- preferred_language
      'light', -- theme
      true, -- email_notifications
      NOW(),
      NOW(),
      NOW()
    );
    
    RAISE NOTICE 'Created profile for user %', NEW.email;
  ELSE
    -- Update last login time
    UPDATE user_profiles 
    SET last_login_at = NOW()
    WHERE user_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers (won't error if they don't exist)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_or_updated ON auth.users;
DROP TRIGGER IF EXISTS ensure_profile_on_signin ON auth.users;
DROP TRIGGER IF EXISTS ensure_profile_on_user_change ON auth.users;

-- Create new trigger that fires on insert and when last_sign_in_at changes
CREATE TRIGGER ensure_profile_on_user_change
  AFTER INSERT OR UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION ensure_user_profile();

-- Now create the profile for your specific user if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = '9ea0c2a9-8b33-409a-a45e-fe218d13d65e'
  ) THEN
    INSERT INTO user_profiles (
      user_id,
      email,
      full_name,
      avatar_url,
      github_username,
      github_id,
      bio,
      location,
      website,
      company,
      preferred_language,
      theme,
      email_notifications,
      created_at,
      updated_at,
      last_login_at
    ) VALUES (
      '9ea0c2a9-8b33-409a-a45e-fe218d13d65e',
      'slavataichi@gmail.com',
      'Slava Taichi',
      'https://avatars.githubusercontent.com/u/202361394?v=4',
      'slavataichi',
      '202361394',
      'Developer testing CodeQual',
      '',
      '',
      '',
      'en',
      'light',
      true,
      NOW(),
      NOW(),
      NOW()
    );
    
    RAISE NOTICE 'Created profile for slavataichi@gmail.com';
  ELSE
    RAISE NOTICE 'Profile already exists for slavataichi@gmail.com';
  END IF;
END $$;

-- Grant necessary permissions
GRANT ALL ON user_profiles TO authenticated;
GRANT ALL ON user_profiles TO service_role;

-- Verify the profile was created
SELECT 
  id,
  user_id,
  email,
  full_name,
  github_username,
  created_at
FROM user_profiles 
WHERE email = 'slavataichi@gmail.com';