-- Complete fix for user_profiles table authentication issue
-- This handles all cases: missing table, missing columns, missing organizations table

-- Step 1: Check if organizations table exists, create if not
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'organizations'
    ) THEN
        CREATE TABLE public.organizations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            slug TEXT NOT NULL UNIQUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE 'Created organizations table';
    END IF;
END $$;

-- Step 2: Check if user_profiles exists, handle both cases
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles'
    ) THEN
        -- Create the table from scratch
        CREATE TABLE public.user_profiles (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            email TEXT NOT NULL,
            full_name TEXT,
            avatar_url TEXT,
            organization_id UUID REFERENCES organizations(id),
            role TEXT DEFAULT 'user',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(user_id),
            UNIQUE(email)
        );
        RAISE NOTICE 'Created user_profiles table';
    ELSE
        -- Table exists, add missing columns
        -- Add organization_id if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'user_profiles' 
            AND column_name = 'organization_id'
        ) THEN
            ALTER TABLE public.user_profiles ADD COLUMN organization_id UUID;
            -- Try to add foreign key, but don't fail if organizations doesn't exist
            BEGIN
                ALTER TABLE public.user_profiles 
                ADD CONSTRAINT fk_user_profiles_organization 
                FOREIGN KEY (organization_id) REFERENCES organizations(id);
            EXCEPTION
                WHEN OTHERS THEN
                    RAISE NOTICE 'Could not add organization foreign key: %', SQLERRM;
            END;
        END IF;

        -- Add role if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'user_profiles' 
            AND column_name = 'role'
        ) THEN
            ALTER TABLE public.user_profiles ADD COLUMN role TEXT DEFAULT 'user';
        END IF;
    END IF;
END $$;

-- Step 3: Create robust ensure_user_profile function
CREATE OR REPLACE FUNCTION public.ensure_user_profile()
RETURNS TRIGGER AS $$
DECLARE
    v_full_name TEXT;
    v_avatar_url TEXT;
BEGIN
    -- Extract name and avatar from auth metadata
    v_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
    );
    
    v_avatar_url := COALESCE(
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'picture',
        ''
    );

    -- Insert or update profile
    INSERT INTO public.user_profiles (
        user_id,
        email,
        full_name,
        avatar_url,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        v_full_name,
        v_avatar_url,
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        email = EXCLUDED.email,
        full_name = COALESCE(user_profiles.full_name, EXCLUDED.full_name),
        avatar_url = COALESCE(user_profiles.avatar_url, EXCLUDED.avatar_url),
        updated_at = NOW();
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't block authentication
        RAISE WARNING 'ensure_user_profile error for user %: %', NEW.email, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create trigger (remove old ones first)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS ensure_profile_on_user_change ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.ensure_user_profile();

-- Step 5: Enable RLS and create policies
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;

CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Step 6: Grant permissions
GRANT ALL ON public.user_profiles TO authenticated;
GRANT ALL ON public.user_profiles TO service_role;
GRANT USAGE ON SCHEMA public TO authenticated, service_role;

-- Step 7: Create profiles for all existing users
INSERT INTO public.user_profiles (user_id, email, full_name, created_at, updated_at)
SELECT 
    u.id,
    u.email,
    COALESCE(
        u.raw_user_meta_data->>'full_name',
        u.raw_user_meta_data->>'name',
        split_part(u.email, '@', 1)
    ),
    COALESCE(u.created_at, NOW()),
    NOW()
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_profiles p WHERE p.user_id = u.id
)
ON CONFLICT DO NOTHING;

-- Step 8: Verify the fix
DO $$
DECLARE
    v_user_count INTEGER;
    v_profile_count INTEGER;
    v_test_result TEXT;
BEGIN
    -- Count users and profiles
    SELECT COUNT(*) INTO v_user_count FROM auth.users;
    SELECT COUNT(*) INTO v_profile_count FROM public.user_profiles;
    
    RAISE NOTICE 'Users: %, Profiles: %', v_user_count, v_profile_count;
    
    -- Test that the table is accessible
    BEGIN
        SELECT 'accessible' INTO v_test_result FROM public.user_profiles LIMIT 1;
        RAISE NOTICE 'Table access test: SUCCESS';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'Table access test failed: %', SQLERRM;
    END;
    
    -- Test the function
    BEGIN
        -- Simulate trigger execution
        PERFORM public.ensure_user_profile();
        RAISE NOTICE 'Function test: SUCCESS';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'Function test failed: %', SQLERRM;
    END;
    
    IF v_user_count = v_profile_count THEN
        RAISE NOTICE '';
        RAISE NOTICE '✅ SUCCESS: All users have profiles!';
        RAISE NOTICE '✅ The authentication issue should be resolved.';
    ELSE
        RAISE NOTICE '';
        RAISE NOTICE '⚠️  WARNING: % users are missing profiles', v_user_count - v_profile_count;
        RAISE NOTICE 'Run this script again to create missing profiles.';
    END IF;
END $$;