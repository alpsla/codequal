-- Fix automatic user profile creation for all auth methods
-- This ensures profiles are created for Magic Link, OAuth, and password auth

-- Drop the existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_oauth_user();

-- Create an improved function that handles all auth methods
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  full_name TEXT;
  avatar_url TEXT;
  provider TEXT;
BEGIN
  -- Extract user metadata
  full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1) -- Use email prefix as fallback
  );
  
  avatar_url := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture',
    '' -- Empty string if no avatar
  );
  
  -- Determine auth provider
  provider := COALESCE(
    NEW.raw_app_meta_data->>'provider',
    CASE 
      WHEN NEW.raw_user_meta_data->>'iss' = 'https://api.github.com' THEN 'github'
      WHEN NEW.raw_user_meta_data->>'iss' LIKE '%gitlab%' THEN 'gitlab'
      WHEN NEW.email_confirmed_at IS NOT NULL THEN 'email'
      ELSE 'magic_link'
    END
  );
  
  -- Create or update user profile
  INSERT INTO user_profiles (
    id,
    user_id,
    email,
    full_name,
    avatar_url,
    github_username,
    github_id,
    gitlab_username,
    gitlab_id,
    created_at,
    updated_at,
    last_login_at
  ) VALUES (
    gen_random_uuid(),
    NEW.id,
    NEW.email,
    full_name,
    avatar_url,
    CASE WHEN provider = 'github' THEN NEW.raw_user_meta_data->>'user_name' END,
    CASE WHEN provider = 'github' THEN NEW.raw_user_meta_data->>'provider_id' END,
    CASE WHEN provider = 'gitlab' THEN NEW.raw_user_meta_data->>'nickname' END,
    CASE WHEN provider = 'gitlab' THEN NEW.raw_user_meta_data->>'provider_id' END,
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(user_profiles.full_name, EXCLUDED.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, user_profiles.avatar_url),
    github_username = COALESCE(EXCLUDED.github_username, user_profiles.github_username),
    github_id = COALESCE(EXCLUDED.github_id, user_profiles.github_id),
    gitlab_username = COALESCE(EXCLUDED.gitlab_username, user_profiles.gitlab_username),
    gitlab_id = COALESCE(EXCLUDED.gitlab_id, user_profiles.gitlab_id),
    last_login_at = NOW(),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new users
CREATE TRIGGER on_auth_user_created_or_updated
  AFTER INSERT OR UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Also create a function to sync existing users
CREATE OR REPLACE FUNCTION sync_existing_auth_users()
RETURNS void AS $$
DECLARE
  auth_user RECORD;
  profile_exists BOOLEAN;
BEGIN
  -- Loop through all auth users
  FOR auth_user IN SELECT * FROM auth.users
  LOOP
    -- Check if profile exists
    SELECT EXISTS (
      SELECT 1 FROM user_profiles WHERE user_id = auth_user.id
    ) INTO profile_exists;
    
    -- If no profile exists, create one
    IF NOT profile_exists THEN
      INSERT INTO user_profiles (
        id,
        user_id,
        email,
        full_name,
        avatar_url,
        github_username,
        github_id,
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
        CASE 
          WHEN auth_user.raw_app_meta_data->>'provider' = 'github' 
          THEN auth_user.raw_user_meta_data->>'user_name' 
        END,
        CASE 
          WHEN auth_user.raw_app_meta_data->>'provider' = 'github' 
          THEN auth_user.raw_user_meta_data->>'provider_id' 
        END,
        COALESCE(auth_user.created_at, NOW()),
        NOW(),
        COALESCE(auth_user.last_sign_in_at, NOW())
      );
      
      RAISE NOTICE 'Created profile for user: %', auth_user.email;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the sync function to create profiles for existing users
SELECT sync_existing_auth_users();

-- Create a more robust profile sync for sign-ins
CREATE OR REPLACE FUNCTION ensure_profile_exists()
RETURNS TRIGGER AS $$
BEGIN
  -- This runs on every sign-in (when last_sign_in_at is updated)
  IF NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at THEN
    -- Update last login time if profile exists
    UPDATE user_profiles 
    SET last_login_at = NOW()
    WHERE user_id = NEW.id;
    
    -- If no rows were updated, the profile doesn't exist
    IF NOT FOUND THEN
      -- Create the profile
      PERFORM handle_new_user() FROM auth.users WHERE id = NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add a policy to allow users to read their own profile
CREATE POLICY "Users can view own profile after creation" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Ensure the RLS is enabled
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON user_profiles TO authenticated;

-- Test the sync for your specific user
DO $$
BEGIN
  -- Check if slavataichi's profile exists
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = '9ea0c2a9-8b33-409a-a45e-fe218d13d65e'
  ) THEN
    RAISE NOTICE 'Creating profile for slavataichi@gmail.com';
    
    INSERT INTO user_profiles (
      id,
      user_id,
      email,
      full_name,
      avatar_url,
      github_username,
      github_id,
      created_at,
      updated_at,
      last_login_at
    ) VALUES (
      gen_random_uuid(),
      '9ea0c2a9-8b33-409a-a45e-fe218d13d65e',
      'slavataichi@gmail.com',
      'Slava Taichi',
      'https://avatars.githubusercontent.com/u/202361394?v=4',
      'slavataichi',
      '202361394',
      NOW(),
      NOW(),
      NOW()
    );
  ELSE
    RAISE NOTICE 'Profile already exists for slavataichi@gmail.com';
  END IF;
END $$;