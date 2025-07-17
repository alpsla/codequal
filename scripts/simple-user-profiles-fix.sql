-- Simple fix for user_profiles table and authentication
-- This script handles existing tables with missing columns

-- Step 1: Show current table structure
SELECT 
    'Current table structure:' as info,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- Step 2: Add only the missing columns that are referenced
DO $$
BEGIN
    -- Check and add organization_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN organization_id UUID;
        RAISE NOTICE 'Added organization_id column';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error adding organization_id: %', SQLERRM;
END $$;

-- Step 3: Create a simplified ensure_user_profile function
CREATE OR REPLACE FUNCTION public.ensure_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- Simple insert that only uses columns we know exist
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
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        updated_at = NOW();
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Don't fail authentication, just log the error
        RAISE WARNING 'Profile creation failed: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Recreate the trigger
DROP TRIGGER IF EXISTS ensure_profile_on_user_change ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.ensure_user_profile();

-- Step 5: Grant permissions
GRANT ALL ON public.user_profiles TO authenticated;
GRANT ALL ON public.user_profiles TO service_role;

-- Step 6: Create profiles for any existing users without them
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

-- Step 7: Test the function
DO $$
DECLARE
    test_count INTEGER;
BEGIN
    -- Count profiles
    SELECT COUNT(*) INTO test_count FROM public.user_profiles;
    RAISE NOTICE 'Profile count: %', test_count;
    
    -- Test that we can query the table
    PERFORM * FROM public.user_profiles LIMIT 1;
    RAISE NOTICE 'Table is accessible';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error accessing table: %', SQLERRM;
END $$;

-- Step 8: Show final status
SELECT 
    'Final status:' as info,
    (SELECT COUNT(*) FROM auth.users) as total_users,
    (SELECT COUNT(*) FROM public.user_profiles) as total_profiles,
    (SELECT COUNT(*) FROM auth.users u WHERE NOT EXISTS (
        SELECT 1 FROM public.user_profiles p WHERE p.user_id = u.id
    )) as users_without_profiles;