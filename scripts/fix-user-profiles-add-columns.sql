-- Fix for existing user_profiles table missing columns
-- This handles the case where the table exists but is missing newer columns

-- Step 1: Check which columns exist and add missing ones
DO $$
BEGIN
    -- Add organization_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN organization_id UUID;
        RAISE NOTICE 'Added organization_id column';
    END IF;

    -- Add role if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND column_name = 'role'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN role TEXT DEFAULT 'user';
        RAISE NOTICE 'Added role column';
    END IF;

    -- Add github_username if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND column_name = 'github_username'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN github_username TEXT;
        RAISE NOTICE 'Added github_username column';
    END IF;

    -- Add github_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND column_name = 'github_id'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN github_id TEXT;
        RAISE NOTICE 'Added github_id column';
    END IF;

    -- Add gitlab_username if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND column_name = 'gitlab_username'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN gitlab_username TEXT;
        RAISE NOTICE 'Added gitlab_username column';
    END IF;

    -- Add gitlab_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND column_name = 'gitlab_id'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN gitlab_id TEXT;
        RAISE NOTICE 'Added gitlab_id column';
    END IF;

    -- Add bio if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND column_name = 'bio'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN bio TEXT;
        RAISE NOTICE 'Added bio column';
    END IF;

    -- Add location if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND column_name = 'location'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN location TEXT;
        RAISE NOTICE 'Added location column';
    END IF;

    -- Add website if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND column_name = 'website'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN website TEXT;
        RAISE NOTICE 'Added website column';
    END IF;

    -- Add company if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND column_name = 'company'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN company TEXT;
        RAISE NOTICE 'Added company column';
    END IF;

    -- Add preferred_language if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND column_name = 'preferred_language'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN preferred_language TEXT DEFAULT 'en';
        RAISE NOTICE 'Added preferred_language column';
    END IF;

    -- Add theme if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND column_name = 'theme'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN theme TEXT DEFAULT 'light';
        RAISE NOTICE 'Added theme column';
    END IF;

    -- Add email_notifications if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND column_name = 'email_notifications'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN email_notifications BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added email_notifications column';
    END IF;

    -- Add last_login_at if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND column_name = 'last_login_at'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN last_login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added last_login_at column';
    END IF;
END $$;

-- Step 2: Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_organization_id ON public.user_profiles(organization_id);

-- Step 3: Enable RLS (safe to run even if already enabled)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies (drop and recreate)
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;

CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Step 5: Fix the ensure_user_profile function to handle the columns that exist
CREATE OR REPLACE FUNCTION public.ensure_user_profile()
RETURNS TRIGGER AS $$
DECLARE
    v_columns TEXT[];
    v_insert_columns TEXT;
    v_insert_values TEXT;
BEGIN
    -- Get list of columns that exist in the table
    SELECT array_agg(column_name::TEXT)
    INTO v_columns
    FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles'
    AND column_name IN (
        'user_id', 'email', 'full_name', 'avatar_url', 
        'github_username', 'github_id', 'gitlab_username', 'gitlab_id',
        'bio', 'location', 'website', 'company', 
        'preferred_language', 'theme', 'email_notifications',
        'created_at', 'updated_at', 'last_login_at'
    );

    -- Build dynamic INSERT statement based on existing columns
    v_insert_columns := 'user_id, email';
    v_insert_values := format('%L, %L', NEW.id, NEW.email);

    -- Add optional columns if they exist
    IF 'full_name' = ANY(v_columns) THEN
        v_insert_columns := v_insert_columns || ', full_name';
        v_insert_values := v_insert_values || format(', %L', COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            split_part(NEW.email, '@', 1)
        ));
    END IF;

    IF 'avatar_url' = ANY(v_columns) THEN
        v_insert_columns := v_insert_columns || ', avatar_url';
        v_insert_values := v_insert_values || format(', %L', COALESCE(
            NEW.raw_user_meta_data->>'avatar_url',
            NEW.raw_user_meta_data->>'picture',
            ''
        ));
    END IF;

    -- Execute dynamic INSERT
    EXECUTE format(
        'INSERT INTO public.user_profiles (%s) VALUES (%s) ON CONFLICT (user_id) DO UPDATE SET last_login_at = NOW()',
        v_insert_columns,
        v_insert_values
    );
    
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

-- Step 8: Create profiles for existing users
INSERT INTO public.user_profiles (user_id, email, created_at, updated_at)
SELECT 
    u.id,
    u.email,
    COALESCE(u.created_at, NOW()),
    NOW()
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_profiles p WHERE p.user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;

-- Step 9: Show current table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- Step 10: Verify everything is working
DO $$
DECLARE
    user_count INTEGER;
    profile_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM auth.users;
    SELECT COUNT(*) INTO profile_count FROM public.user_profiles;
    
    RAISE NOTICE 'Total users: %, Total profiles: %', user_count, profile_count;
    
    IF user_count = profile_count THEN
        RAISE NOTICE 'SUCCESS: All users have profiles!';
    ELSE
        RAISE NOTICE 'Warning: % users are missing profiles', user_count - profile_count;
    END IF;
END $$;