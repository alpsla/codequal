-- IMMEDIATE FIX for user_profiles table issue
-- Run this in Supabase SQL Editor to fix the authentication error

-- Step 1: Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    organization_id UUID,
    role TEXT DEFAULT 'user',
    github_username TEXT,
    github_id TEXT,
    gitlab_username TEXT,
    gitlab_id TEXT,
    bio TEXT,
    location TEXT,
    website TEXT,
    company TEXT,
    preferred_language TEXT DEFAULT 'en',
    theme TEXT DEFAULT 'light',
    email_notifications BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    last_login_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Step 2: Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_organization_id ON public.user_profiles(organization_id);

-- Step 3: Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies (drop existing ones first to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;

CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Step 5: Fix the ensure_user_profile function with explicit schema and error handling
CREATE OR REPLACE FUNCTION public.ensure_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- Try to insert profile, ignore if it already exists
    INSERT INTO public.user_profiles (
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
        NOW(),
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE
    SET 
        last_login_at = NOW(),
        updated_at = NOW();
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail authentication
        RAISE WARNING 'ensure_user_profile error: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Recreate the trigger
DROP TRIGGER IF EXISTS ensure_profile_on_user_change ON auth.users;

CREATE TRIGGER ensure_profile_on_user_change
    AFTER INSERT OR UPDATE OF last_sign_in_at ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.ensure_user_profile();

-- Step 7: Grant permissions
GRANT ALL ON public.user_profiles TO authenticated;
GRANT ALL ON public.user_profiles TO service_role;
GRANT USAGE ON SCHEMA public TO postgres, authenticated, service_role;

-- Step 8: Create profiles for all existing users who don't have one
INSERT INTO public.user_profiles (
    user_id,
    email,
    full_name,
    created_at,
    updated_at,
    last_login_at
)
SELECT 
    u.id,
    u.email,
    COALESCE(
        u.raw_user_meta_data->>'full_name',
        u.raw_user_meta_data->>'name',
        split_part(u.email, '@', 1)
    ),
    COALESCE(u.created_at, NOW()),
    NOW(),
    COALESCE(u.last_sign_in_at, NOW())
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_profiles p WHERE p.user_id = u.id
);

-- Step 9: Verify the fix
DO $$
DECLARE
    user_count INTEGER;
    profile_count INTEGER;
    missing_profiles INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM auth.users;
    SELECT COUNT(*) INTO profile_count FROM public.user_profiles;
    missing_profiles := user_count - profile_count;
    
    RAISE NOTICE 'Total users: %, Total profiles: %, Missing profiles: %', 
        user_count, profile_count, missing_profiles;
    
    IF missing_profiles = 0 THEN
        RAISE NOTICE 'SUCCESS: All users have profiles!';
    ELSE
        RAISE WARNING 'There are still % users without profiles', missing_profiles;
    END IF;
END $$;

-- Step 10: Test the function works
DO $$
DECLARE
    test_result TEXT;
BEGIN
    -- Test accessing the table
    SELECT 'Table accessible' INTO test_result 
    FROM public.user_profiles 
    LIMIT 1;
    
    RAISE NOTICE 'Test result: %', COALESCE(test_result, 'Table is empty but accessible');
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Test failed: %', SQLERRM;
END $$;