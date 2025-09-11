-- Script to diagnose and fix the user_profiles table issue
-- Run this in your Supabase SQL editor

-- 1. First, check if the table exists
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles'
) as table_exists;

-- 2. Check if there are any user_profiles in other schemas
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_name = 'user_profiles';

-- 3. Check the ensure_user_profile function definition
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'ensure_user_profile';

-- 4. If the table doesn't exist, create it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles'
    ) THEN
        -- Create the user_profiles table based on the migration
        CREATE TABLE public.user_profiles (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
            email TEXT,
            full_name TEXT,
            avatar_url TEXT,
            organization_id UUID REFERENCES organizations(id),
            role TEXT DEFAULT 'user',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
        );

        -- Create indexes
        CREATE INDEX idx_user_profiles_user_id ON public.user_profiles(user_id);
        CREATE INDEX idx_user_profiles_email ON public.user_profiles(email);
        CREATE INDEX idx_user_profiles_organization_id ON public.user_profiles(organization_id);

        -- Enable RLS
        ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

        -- Create RLS policies
        CREATE POLICY "Users can view own profile" ON public.user_profiles
            FOR SELECT USING (auth.uid() = user_id);

        CREATE POLICY "Users can update own profile" ON public.user_profiles
            FOR UPDATE USING (auth.uid() = user_id);

        RAISE NOTICE 'user_profiles table created successfully';
    ELSE
        RAISE NOTICE 'user_profiles table already exists';
    END IF;
END $$;

-- 5. Verify the trigger exists and is properly connected
SELECT 
    t.trigger_name,
    t.event_manipulation,
    t.event_object_schema,
    t.event_object_table,
    t.action_statement
FROM information_schema.triggers t
WHERE t.trigger_name = 'on_auth_user_created'
OR t.event_object_table = 'users';

-- 6. Check if the function can access the table
DO $$
DECLARE
    test_user_id UUID := '00000000-0000-0000-0000-000000000000';
    profile_exists BOOLEAN;
BEGIN
    -- Test the same query used in ensure_user_profile function
    SELECT EXISTS (
        SELECT 1 FROM public.user_profiles WHERE user_id = test_user_id
    ) INTO profile_exists;
    
    RAISE NOTICE 'Test query executed successfully. Profile exists: %', profile_exists;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error testing query: %', SQLERRM;
END $$;

-- 7. If needed, recreate the ensure_user_profile function with explicit schema
CREATE OR REPLACE FUNCTION public.ensure_user_profile()
RETURNS TRIGGER AS $$
DECLARE
    profile_exists BOOLEAN;
BEGIN
    -- Check if profile already exists (with explicit schema)
    SELECT EXISTS (
        SELECT 1 FROM public.user_profiles WHERE user_id = NEW.id
    ) INTO profile_exists;

    IF NOT profile_exists THEN
        -- Create new profile (with explicit schema)
        INSERT INTO public.user_profiles (
            user_id,
            email,
            created_at,
            updated_at
        ) VALUES (
            NEW.id,
            NEW.email,
            NOW(),
            NOW()
        );
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the auth process
        RAISE WARNING 'ensure_user_profile error: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Ensure the trigger is properly set up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.ensure_user_profile();

-- 9. Test with existing users - create profiles for any missing ones
INSERT INTO public.user_profiles (user_id, email, created_at, updated_at)
SELECT 
    u.id,
    u.email,
    COALESCE(u.created_at, NOW()),
    NOW()
FROM auth.users u
LEFT JOIN public.user_profiles p ON u.id = p.user_id
WHERE p.user_id IS NULL;

-- 10. Final verification
SELECT 
    COUNT(*) as total_auth_users,
    COUNT(p.user_id) as users_with_profiles,
    COUNT(*) - COUNT(p.user_id) as users_missing_profiles
FROM auth.users u
LEFT JOIN public.user_profiles p ON u.id = p.user_id;