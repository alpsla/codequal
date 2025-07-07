-- First, let's check the actual structure of user_profiles table
\d user_profiles

-- Check what columns actually exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;

-- Now let's fix the authentication issue without the missing columns
BEGIN;

-- Step 1: Grant permissions (this part should still work)
DO $$
BEGIN
    -- Grant usage on auth schema
    EXECUTE 'GRANT USAGE ON SCHEMA auth TO postgres, anon, authenticated, service_role';
    
    -- Grant permissions on auth sequences
    EXECUTE 'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA auth TO postgres, anon, authenticated, service_role';
    
    -- Grant permissions on auth tables
    EXECUTE 'GRANT SELECT ON auth.users TO anon, authenticated, service_role';
    EXECUTE 'GRANT ALL ON auth.identities TO authenticated, service_role';
    EXECUTE 'GRANT ALL ON auth.sessions TO authenticated, service_role';
    EXECUTE 'GRANT ALL ON auth.refresh_tokens TO authenticated, service_role';
    
    -- Grant execute on auth functions
    EXECUTE 'GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon, authenticated, service_role';
    
    RAISE NOTICE 'Permissions granted successfully';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error granting permissions: %', SQLERRM;
END $$;

-- Step 2: Fix the user profile with only existing columns
DO $$
DECLARE
    v_user_id UUID;
    v_email TEXT := 'slavataichi@gmail.com';
BEGIN
    -- Get the user ID
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE 'User % not found in auth.users', v_email;
    ELSE
        -- Insert/update user profile with only existing columns
        -- We'll check which columns exist first
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'user_profiles' 
            AND column_name = 'full_name'
        ) THEN
            -- Version with full_name column
            INSERT INTO user_profiles (
                id,
                user_id,
                email,
                full_name,
                created_at,
                updated_at
            ) VALUES (
                gen_random_uuid(),
                v_user_id,
                v_email,
                'Slava Taichi',
                NOW(),
                NOW()
            )
            ON CONFLICT (user_id) DO UPDATE SET
                email = EXCLUDED.email,
                updated_at = NOW();
        ELSE
            -- Minimal version
            INSERT INTO user_profiles (
                id,
                user_id,
                email,
                created_at,
                updated_at
            ) VALUES (
                gen_random_uuid(),
                v_user_id,
                v_email,
                NOW(),
                NOW()
            )
            ON CONFLICT (user_id) DO UPDATE SET
                email = EXCLUDED.email,
                updated_at = NOW();
        END IF;
        
        RAISE NOTICE 'User profile created/updated for %', v_email;
        
        -- Clear any existing sessions/tokens
        DELETE FROM auth.sessions WHERE user_id = v_user_id;
        DELETE FROM auth.refresh_tokens WHERE user_id = v_user_id;
        
        RAISE NOTICE 'Cleared existing sessions for user %', v_email;
    END IF;
END $$;

-- Step 3: Update RLS policies
DO $$
BEGIN
    -- Enable RLS
    ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
    DROP POLICY IF EXISTS "Service role has full access" ON user_profiles;
    DROP POLICY IF EXISTS "Enable profile creation on signup" ON user_profiles;
    
    -- Create permissive policies
    CREATE POLICY "Users can view own profile" ON user_profiles
        FOR SELECT USING (auth.uid() = user_id);
    
    CREATE POLICY "Users can update own profile" ON user_profiles
        FOR UPDATE USING (auth.uid() = user_id);
    
    CREATE POLICY "Service role has full access" ON user_profiles
        FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
    
    CREATE POLICY "Enable profile creation on signup" ON user_profiles
        FOR INSERT WITH CHECK (auth.uid() = user_id);
        
    RAISE NOTICE 'RLS policies updated';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error updating policies: %', SQLERRM;
END $$;

-- Step 4: Create a simpler auth trigger that works with existing columns
CREATE OR REPLACE FUNCTION public.handle_auth_user_new()
RETURNS TRIGGER AS $$
DECLARE
    profile_columns TEXT[];
    insert_query TEXT;
BEGIN
    -- Get available columns in user_profiles
    SELECT ARRAY_AGG(column_name) INTO profile_columns
    FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name IN ('id', 'user_id', 'email', 'full_name', 'created_at', 'updated_at');
    
    -- Build dynamic insert based on available columns
    IF 'full_name' = ANY(profile_columns) THEN
        INSERT INTO public.user_profiles (id, user_id, email, full_name, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            NEW.id,
            NEW.email,
            COALESCE(
                NEW.raw_user_meta_data->>'full_name',
                NEW.raw_user_meta_data->>'name',
                split_part(NEW.email, '@', 1)
            ),
            NOW(),
            NOW()
        )
        ON CONFLICT (user_id) DO UPDATE SET
            email = EXCLUDED.email,
            updated_at = NOW();
    ELSE
        INSERT INTO public.user_profiles (id, user_id, email, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            NEW.id,
            NEW.email,
            NOW(),
            NOW()
        )
        ON CONFLICT (user_id) DO UPDATE SET
            email = EXCLUDED.email,
            updated_at = NOW();
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the auth flow
        RAISE WARNING 'Error in handle_auth_user_new: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_auth_user_new();

-- Step 5: Ensure email confirmation is set
UPDATE auth.users 
SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
WHERE email = 'slavataichi@gmail.com';

-- Step 6: Test the fix
DO $$
DECLARE
    v_user_id UUID;
    v_profile_exists BOOLEAN;
    v_email_confirmed BOOLEAN;
BEGIN
    -- Check user exists and email is confirmed
    SELECT id, email_confirmed_at IS NOT NULL 
    INTO v_user_id, v_email_confirmed 
    FROM auth.users 
    WHERE email = 'slavataichi@gmail.com';
    
    IF v_user_id IS NOT NULL THEN
        RAISE NOTICE 'User found with ID: %', v_user_id;
        RAISE NOTICE 'Email confirmed: %', v_email_confirmed;
        
        -- Check profile exists
        SELECT EXISTS(SELECT 1 FROM user_profiles WHERE user_id = v_user_id) INTO v_profile_exists;
        
        IF v_profile_exists THEN
            RAISE NOTICE '✅ User profile exists';
        ELSE
            RAISE NOTICE '❌ User profile missing';
        END IF;
    ELSE
        RAISE NOTICE '❌ User not found';
    END IF;
END $$;

COMMIT;

-- Additional checks for auth flow
-- Check if there are any custom auth hooks that might be failing
SELECT 
    n.nspname as schema,
    p.proname as function_name,
    pg_catalog.pg_get_function_arguments(p.oid) as arguments
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname LIKE '%auth%' 
AND n.nspname IN ('auth', 'extensions', 'public')
ORDER BY 1, 2;

-- Check auth configuration
SELECT 
    key,
    value
FROM auth.config
WHERE key IN ('external_email_enabled', 'mailer_autoconfirm', 'sms_autoconfirm');

-- List all RLS policies to ensure nothing is blocking
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE schemaname IN ('auth', 'public')
AND tablename IN ('users', 'user_profiles')
ORDER BY schemaname, tablename;